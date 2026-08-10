"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Ban,
  Check,
  CircleCheck,
  IdCard,
  Lock,
  Plus,
  TriangleAlert,
  X,
} from "lucide-react";
import { toast } from "sonner";
import type {
  DepositBasis,
  PropertyPresentation,
  RentalBookingStatus,
  RentalPaymentKind,
} from "@/generated/prisma/enums";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { setRentalPresentation } from "@/features/rentals/actions/set-rental-presentation";
import { updateRental } from "@/features/rentals/actions/update-rental";
import {
  checkOverlaps,
  type OverlapSummary,
} from "@/features/rentals/actions/check-overlaps";
import {
  BOOKING_PIPELINE,
  PAYMENT_STATUSES,
  bookingStatusLabel,
  formatAmount,
  formatDate,
  nights as countNights,
  paymentStatusLabel,
} from "@/features/rentals/components/rental-labels";
import { missingToReach } from "@/features/rentals/utils/rental-gates";
import { Money } from "@/features/rentals/components/money";

type ServiceDraft = {
  label: string;
  amount: string;
  includedInStay: boolean;
};

function villaLabel(p: {
  marketingName: string | null;
  city: string | null;
}): string {
  return [p.marketingName ?? p.city ?? "Sans nom", p.city]
    .filter(Boolean)
    .join(" — ");
}

/**
 * How the property was shown to the tenant before signature.
 *
 * The contract prints all three and ticks this one. It is the agent's to
 * record and the tenant's to accept by signing the last page, so it is asked
 * here rather than left as three empty boxes for someone to fill in by hand.
 */
const PRESENTATIONS: { value: PropertyPresentation; label: string }[] = [
  { value: "IN_PERSON", label: "Visité en personne par le locataire" },
  {
    value: "THIRD_PARTY",
    label: "Visité par un tiers pour le compte du locataire",
  },
  {
    value: "REMOTE",
    label: "Présenté à distance (supports de commercialisation, photographies)",
  },
];

/**
 * The hours this stay starts and ends on.
 *
 * Pre-filled from the property as a placeholder rather than as a value: an
 * empty field means "as the property", so editing the villa's hours still
 * reaches every booking that never asked for anything different. Typing here
 * is an override, and it is what the contract prints.
 */
function StayTimes({
  checkInTime,
  checkOutTime,
  onCheckInTime,
  onCheckOutTime,
  propertyCheckInTime,
  propertyCheckOutTime,
  disabled,
}: {
  checkInTime: string;
  checkOutTime: string;
  onCheckInTime: (next: string) => void;
  onCheckOutTime: (next: string) => void;
  propertyCheckInTime: string;
  propertyCheckOutTime: string;
  disabled: boolean;
}) {
  const overridden = checkInTime !== "" || checkOutTime !== "";

  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">Horaires du séjour</legend>
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Arrivée à partir de">
          <Input
            value={checkInTime}
            onChange={(e) => onCheckInTime(e.target.value)}
            disabled={disabled}
            placeholder={propertyCheckInTime}
            className="w-28 tabular-nums"
          />
        </Field>
        <Field label="Départ avant">
          <Input
            value={checkOutTime}
            onChange={(e) => onCheckOutTime(e.target.value)}
            disabled={disabled}
            placeholder={propertyCheckOutTime}
            className="w-28 tabular-nums"
          />
        </Field>
        {overridden ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled}
            onClick={() => {
              onCheckInTime("");
              onCheckOutTime("");
            }}
          >
            Reprendre les horaires du bien
          </Button>
        ) : null}
      </div>
      <p className="text-muted-foreground text-xs">
        {overridden
          ? `Le contrat imprimera ces horaires. Le bien est réglé sur ${propertyCheckInTime} / ${propertyCheckOutTime}.`
          : `Vide : le contrat reprend les horaires du bien (${propertyCheckInTime} / ${propertyCheckOutTime}).`}
      </p>
    </fieldset>
  );
}

function PresentationChoice({
  rentalId,
  initial,
  disabled,
}: {
  rentalId: string;
  initial: PropertyPresentation;
  disabled: boolean;
}) {
  const router = useRouter();
  const [value, setValue] = React.useState<PropertyPresentation>(initial);
  const [isSaving, startSaving] = React.useTransition();

  function choose(next: PropertyPresentation) {
    const previous = value;
    setValue(next);
    startSaving(async () => {
      const result = await setRentalPresentation({ rentalId, presentation: next });
      if (result.status === "error") {
        // Put the radio back where it was: leaving it on a choice that was
        // never stored is worse than not moving at all.
        setValue(previous);
        toast.error(result.message);
        return;
      }
      router.refresh();
    });
  }

  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">Présentation du bien</legend>
      <p className="text-muted-foreground text-xs">
        Coché sur le contrat, à l&apos;article 2.5. Le locataire l&apos;accepte
        en signant la dernière page. Enregistré dès la sélection.
      </p>
      <div className="space-y-1.5">
        {PRESENTATIONS.map((option) => (
          <label
            key={option.value}
            className="flex items-start gap-2 text-sm leading-snug"
          >
            <input
              type="radio"
              name="presentation"
              className="mt-0.5"
              value={option.value}
              checked={value === option.value}
              onChange={() => choose(option.value)}
              disabled={disabled || isSaving}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export type FunnelProperty = {
  id: string;
  marketingName: string | null;
  city: string | null;
  reference: number | null;
  includedServices: string[];
  checkInTime: string;
  checkOutTime: string;
  /** What a new rental's caution is seeded with, in euros. */
  defaultSecurityDeposit: number | null;
};

export type FunnelRental = {
  id: string;
  bookingStatus: RentalBookingStatus;
  propertyId: string;
  checkIn: string;
  checkOut: string;
  guests: number | null;
  children: number | null;
  /** Null means the property's own hours — the ordinary case. */
  checkInTime: string | null;
  checkOutTime: string | null;
  /** Always set: the column defaults to REMOTE and is not nullable. */
  presentation: PropertyPresentation;
  netOwnerAmount: number | null;
  commissionAmount: number | null;
  /** Frozen at contract signature; null before. */
  touristTaxAmount: number | null;
  touristTaxRate: number | null;
  grossAmount: number | null;
  depositAmount: number | null;
  depositBasis: DepositBasis;
  depositPercent: number;
  securityDepositAmount: number | null;
  depositStatus: string;
  balanceStatus: string;
  securityDepositStatus: string;
  additionalServices: {
    label: string;
    amount: number;
    includedInStay: boolean;
  }[];
  payments: {
    kind: RentalPaymentKind;
    amount: number;
    paidAt: Date | null;
    note: string | null;
  }[];
  ownerConfirmedAt: Date | null;
  ownerConfirmedByName: string | null;
  contractSignedAt: Date | null;
  contractSignedByName: string | null;
  securityDepositReturnedAt: Date | null;
  identityDocumentCount: number;
  notes: string | null;
};

const NEXT: Partial<Record<RentalBookingStatus, RentalBookingStatus>> = {
  INQUIRY: "FINANCIAL",
  FINANCIAL: "CONTRACT",
  CONTRACT: "FINALISATION",
  FINALISATION: "CHECK_IN",
  CHECK_IN: "CHECK_OUT",
};

const ADVANCE_LABEL: Partial<Record<RentalBookingStatus, string>> = {
  INQUIRY: "Passer au financier",
  FINANCIAL: "Passer au contrat",
  CONTRACT: "Passer à la finalisation",
  FINALISATION: "Démarrer le séjour",
  CHECK_IN: "Terminer le séjour",
};

/**
 * The pipeline, and the way back through it.
 *
 * A step already reached can be opened again: before signature to correct it,
 * after signature to read what was agreed. Steps ahead of the booking are not
 * reachable — there is nothing there yet.
 *
 * `current` is where the booking actually is; `viewing` is which panel is
 * open. They differ whenever someone has stepped back, which is why the two
 * are marked differently: a ring for what you are looking at, a filled chip
 * for where the booking stands.
 */
function Stepper({
  current,
  viewing,
  onSelect,
}: {
  current: RentalBookingStatus;
  viewing: RentalBookingStatus;
  onSelect: (stage: RentalBookingStatus) => void;
}) {
  const cancelled = current === "CANCELLED";
  const currentIdx = BOOKING_PIPELINE.indexOf(current);
  return (
    <ol className="flex flex-wrap items-center gap-x-1 gap-y-2 text-xs">
      {BOOKING_PIPELINE.map((stage, i) => {
        const done = !cancelled && i < currentIdx;
        const active = !cancelled && i === currentIdx;
        const reachable = !cancelled && i <= currentIdx;
        const open = stage === viewing;
        return (
          <li key={stage} className="flex items-center gap-1">
            <button
              type="button"
              disabled={!reachable}
              onClick={() => onSelect(stage)}
              aria-current={open ? "step" : undefined}
              className={[
                "flex items-center gap-1.5 rounded-full px-2.5 py-1 transition-colors",
                reachable ? "cursor-pointer" : "cursor-default",
                open ? "ring-primary/60 ring-2 ring-offset-1" : "",
                active
                  ? "bg-primary text-primary-foreground font-medium"
                  : done
                    ? "bg-primary/10 text-foreground hover:bg-primary/20"
                    : "bg-muted text-muted-foreground",
              ].join(" ")}
            >
              <span className="flex size-4 items-center justify-center rounded-full border text-[10px]">
                {done ? <Check aria-hidden="true" className="size-3" /> : i + 1}
              </span>
              {bookingStatusLabel(stage)}
            </button>
            {i < BOOKING_PIPELINE.length - 1 ? (
              <span aria-hidden="true" className="text-muted-foreground">
                ·
              </span>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

export function RentalFunnel({
  rental,
  canManage,
  properties,
  taxRatesByCity,
  contractStep,
  documentsStep,
  signedStep,
  intakeStep,
  occupantsStep,
  contractReady = false,
  hasSignedConfirmation = false,
  hasSignedContract = false,
}: {
  rental: FunnelRental;
  canManage: boolean;
  properties: FunnelProperty[];
  taxRatesByCity: Record<string, number>;
  /** The contract stage's completion form, server-assembled (RSC slot). */
  contractStep?: React.ReactNode;
  /** Generation and the documents already produced, from the contract stage on. */
  documentsStep?: React.ReactNode;
  /** The signed copies that came back, uploaded against this rental. */
  signedStep?: React.ReactNode;
  /** The client's own identification link, offered at the contract step. */
  intakeStep?: React.ReactNode;
  /** The other adults on the stay, chased at finalisation. */
  occupantsStep?: React.ReactNode;
  /**
   * Which documents have a signed copy on file. Both of them present is the
   * evidence behind gate 2, and satisfies it on its own.
   */
  hasSignedConfirmation?: boolean;
  hasSignedContract?: boolean;
  /** Whether every field the documents require is filled. */
  contractReady?: boolean;
}) {
  const router = useRouter();

  const [propertyId, setPropertyId] = React.useState(rental.propertyId);
  const [checkIn, setCheckIn] = React.useState(rental.checkIn);
  const [checkOut, setCheckOut] = React.useState(rental.checkOut);
  const [guests, setGuests] = React.useState(rental.guests?.toString() ?? "");
  const [children, setChildren] = React.useState(
    rental.children?.toString() ?? ""
  );
  // Left blank unless this stay departs from the property's hours, so a
  // correction on the property still reaches the bookings nobody overrode.
  const [checkInTime, setCheckInTime] = React.useState(
    rental.checkInTime ?? ""
  );
  const [checkOutTime, setCheckOutTime] = React.useState(
    rental.checkOutTime ?? ""
  );
  const [netOwner, setNetOwner] = React.useState(
    rental.netOwnerAmount?.toString() ?? ""
  );
  const [commission, setCommission] = React.useState(
    rental.commissionAmount?.toString() ?? ""
  );
  // The acompte is either a figure or a share of the client total, defaulting
  // to half. A share is resolved into an amount when the funnel saves, so it
  // follows the total while the booking is still moving and the documents
  // still read one settled figure.
  const [depositBasis, setDepositBasis] = React.useState<DepositBasis>(
    rental.depositBasis
  );
  const [depositPercent, setDepositPercent] = React.useState(
    rental.depositPercent.toString()
  );
  const [depositAmount, setDepositAmount] = React.useState(
    rental.depositAmount?.toString() ?? ""
  );
  // The caution the rental carries, or the property's default offered to a
  // booking that has none — the one-way copy, for rentals created before the
  // property had a default or before the seeding existed. Pre-filled, not
  // silently applied: it becomes the rental's own figure only once saved.
  const [payments, setPayments] = React.useState<PaymentDraft[]>(() =>
    rental.payments.map((p) => ({
      kind: p.kind,
      amount: p.amount.toString(),
      paidAt: p.paidAt ? p.paidAt.toISOString().slice(0, 10) : "",
      note: p.note ?? "",
    }))
  );
  const [securityDepositAmount, setSecurityDepositAmount] = React.useState(
    () =>
      rental.securityDepositAmount?.toString() ??
      properties
        .find((p) => p.id === rental.propertyId)
        ?.defaultSecurityDeposit?.toString() ??
      ""
  );
  const [extras, setExtras] = React.useState<ServiceDraft[]>(
    rental.additionalServices.map((s) => ({
      label: s.label,
      amount: s.amount.toString(),
      includedInStay: s.includedInStay,
    }))
  );
  const [notes, setNotes] = React.useState(rental.notes ?? "");
  const [depositStatus, setDepositStatus] = React.useState(rental.depositStatus);
  const [balanceStatus, setBalanceStatus] = React.useState(rental.balanceStatus);
  const [securityDepositStatus, setSecurityDepositStatus] = React.useState(
    rental.securityDepositStatus
  );
  const [signContract, setSignContract] = React.useState(false);
  const [returnSecurityDeposit, setReturnSecurityDeposit] =
    React.useState(false);
  const [isPending, startTransition] = React.useTransition();

  const stage = rental.bookingStatus;
  // Which panel is open, as opposed to where the booking is. Steps already
  // reached can be reopened; advancing moves the view along with the booking.
  const [view, setView] = React.useState<RentalBookingStatus>(stage);
  const contractSigned = rental.contractSignedAt !== null;
  // The signature closes the terms. Before it, stepping back to Informations
  // or Financier means correcting them; after it, it means reading them. The
  // server enforces the same rule — this only stops the form offering what
  // would be discarded.
  const termsLocked = contractSigned;
  // Both signed copies on file is the signature itself, so it satisfies gate 2
  // without a checkbox: an agent who has attached the paperwork has already
  // said everything ticking a box would say.
  const bothSigned = hasSignedConfirmation && hasSignedContract;
  const returned = rental.securityDepositReturnedAt !== null;

  const selectedProperty =
    properties.find((p) => p.id === propertyId) ?? null;

  // Live tourist tax for the chosen villa, so changing it updates the
  // breakdown before saving.
  const nights =
    checkIn && checkOut
      ? countNights(new Date(checkIn), new Date(checkOut))
      : 0;
  const guestCount = Number(guests) || 0;
  // Children are exempt from the taxe de séjour, so it is charged on the
  // adults only. Clamped at zero: more children than occupants is refused on
  // save, but the figure on screen must not go negative on the way there.
  const taxableGuests = Math.max(0, guestCount - (Number(children) || 0));
  // Frozen at contract signature — after that the stored figures are
  // authoritative and a rate change in settings must not move the total.
  const frozen = rental.touristTaxAmount !== null;
  const liveRate = selectedProperty?.city
    ? (taxRatesByCity[selectedProperty.city.toLowerCase()] ?? null)
    : null;
  const taxRate = frozen ? rental.touristTaxRate : liveRate;
  const touristTax = frozen
    ? rental.touristTaxAmount
    : taxRate !== null && taxableGuests > 0 && nights > 0
      ? taxRate * taxableGuests * nights
      : null;

  // The stay amount ("Loyer") is the owner's net plus the commission. A
  // service is either billed (an amount, added to the client total on top)
  // or included (a label, no amount, already covered by the loyer). The
  // tourist tax is added too. `hasAmount` (a net is set) gates the pipeline
  // and the DB.
  const hasAmount = netOwner.trim() !== "";
  const amount = (v: string) => Number(v) || 0;
  const billedExtrasTotal = extras
    .filter((s) => !s.includedInStay)
    .reduce((sum, s) => sum + amount(s.amount), 0);
  const stay = amount(netOwner) + amount(commission);
  const total = hasAmount
    ? stay + billedExtrasTotal + (touristTax ?? 0)
    : null;

  // Overlap warning at enquiry, when the villa or dates change.
  const [overlaps, setOverlaps] = React.useState<{
    key: string;
    data: OverlapSummary;
  } | null>(null);
  const stayKey = `${propertyId}|${checkIn}|${checkOut}`;
  React.useEffect(() => {
    // Warn about overlapping stays until the date-lock (accord) is dealt
    // with — that is, on every stage up to and including the contract.
    if (
      (stage !== "INQUIRY" && stage !== "FINANCIAL" && stage !== "CONTRACT") ||
      !propertyId ||
      !checkIn ||
      !checkOut
    )
      return;
    let cancelled = false;
    checkOverlaps(propertyId, checkIn, checkOut, rental.id).then((data) => {
      if (!cancelled) setOverlaps({ key: stayKey, data });
    });
    return () => {
      cancelled = true;
    };
  }, [stage, stayKey, propertyId, checkIn, checkOut, rental.id]);
  const overlap = overlaps?.key === stayKey ? overlaps.data : null;

  function run(target: RentalBookingStatus) {
    startTransition(async () => {
      const result = await updateRental({
        id: rental.id,
        bookingStatus: target,
        propertyId,
        checkIn,
        checkOut,
        guests,
        children,
        checkInTime,
        checkOutTime,
        netOwnerAmount: netOwner,
        commissionAmount: commission,
        // The resolved figure, not the percentage: everything downstream wants
        // one amount, and it is the one on screen at the moment of saving.
        depositAmount: deposit > 0 ? deposit.toString() : "",
        depositBasis,
        depositPercent,
        securityDepositAmount,
        additionalServices: extras
          .filter((s) => s.label.trim() !== "")
          .map((s) => ({
            label: s.label,
            // Included = a label with no amount of its own.
            amount: s.includedInStay ? 0 : Number(s.amount) || 0,
            includedInStay: s.includedInStay,
          })),
        // Blank rows are drafts an agent opened and left: dropped rather than
        // refused, so a stray "+" never blocks a save.
        payments: payments
          .filter((p) => Number(p.amount) > 0)
          .map((p) => ({
            kind: p.kind,
            amount: Number(p.amount),
            paidAt: p.paidAt,
            note: p.note,
          })),
        depositStatus,
        balanceStatus,
        securityDepositStatus,
        // The uploads stand in for the checkbox, and go through the same
        // server path — so the owner/agent snapshot and the tourist tax are
        // frozen the one way, whichever satisfied the gate.
        signContract: signContract || bothSigned,
        returnSecurityDeposit,
        notes,
      });
      if (result.status === "error") {
        toast.error(result.message);
        return;
      }
      toast.success(
        target === stage ? "Enregistré." : `${bookingStatusLabel(target)}.`
      );
      // Follow the booking rather than leaving the agent on the step they
      // just left behind.
      if (target !== stage) setView(target);
      setSignContract(false);
      setReturnSecurityDeposit(false);
      router.refresh();
    });
  }

  const next = NEXT[stage];
  const missing = next
    ? missingToReach(next, {
        contractSigned: contractSigned || signContract || bothSigned,
        hasAmount,
      })
    : [];

  // What the tenant pays up front, whichever way it was decided. This is the
  // figure that gets stored and that both documents quote.
  const deposit =
    depositBasis === "PERCENT"
      ? total !== null && total > 0
        ? Math.round(total * (Number(depositPercent) || 0)) / 100
        : 0
      : Number(depositAmount) || 0;
  // Solde = total client − acompte, matching the tenant's Contrat.
  const balance = total !== null ? total - deposit : null;

  if (!canManage) {
    return (
      <div className="space-y-4">
        <Stepper current={stage} viewing={view} onSelect={setView} />
        <p className="text-muted-foreground flex items-center gap-1.5 text-sm">
          <Lock aria-hidden="true" className="size-4" />
          Lecture seule — vous ne gérez pas ce bien.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Stepper current={stage} viewing={view} onSelect={setView} />

      {stage === "CANCELLED" ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm">
          <p className="flex items-center gap-2 font-medium">
            <Ban aria-hidden="true" className="size-4 text-destructive" />
            Location annulée.
          </p>
        </div>
      ) : (
        <div className="space-y-5 rounded-lg border p-4">
          {view === "INQUIRY" ? (
            <fieldset disabled={termsLocked} className="min-w-0 space-y-5">
              <StagePanelHeader
                title="Informations"
                hint="La villa, les dates et le nombre de personnes. Le montant, l'accord des parties et le contrat se règlent à l'étape suivante."
              />

              <LockedNotice shown={termsLocked} />

              <div className="space-y-2">
                <Label htmlFor="villa">Villa</Label>
                {/* items lets Base UI resolve the selected label without
                    opening the popup — otherwise the trigger shows the
                    raw id until first interaction. */}
                <Select
                  value={propertyId}
                  onValueChange={(v) => v !== null && setPropertyId(v)}
                  items={properties.map((p) => ({
                    value: p.id,
                    label: villaLabel(p),
                  }))}
                  disabled={isPending}
                >
                  <SelectTrigger id="villa" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {properties.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {villaLabel(p)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Field label="Arrivée">
                  <Input
                    type="date"
                    value={checkIn}
                    onChange={(e) => setCheckIn(e.target.value)}
                    disabled={isPending}
                  />
                </Field>
                <Field label="Départ">
                  <Input
                    type="date"
                    value={checkOut}
                    onChange={(e) => setCheckOut(e.target.value)}
                    disabled={isPending}
                  />
                </Field>
                <Field label="Personnes">
                  <NumberInput value={guests} onChange={setGuests} disabled={isPending} />
                </Field>
                {/* Counted within the total above, not added to it — the
                    contract prints "6 personnes, dont 2 enfants". */}
                <Field label="dont enfants">
                  <NumberInput
                    value={children}
                    onChange={setChildren}
                    disabled={isPending}
                  />
                </Field>
              </div>

              {/* Beside the dates they qualify: an arrival date and the hour
                  it starts are one piece of information, and the agent enters
                  them in the same breath. */}
              <StayTimes
                checkInTime={checkInTime}
                checkOutTime={checkOutTime}
                onCheckInTime={setCheckInTime}
                onCheckOutTime={setCheckOutTime}
                propertyCheckInTime={selectedProperty?.checkInTime ?? "16h00"}
                propertyCheckOutTime={selectedProperty?.checkOutTime ?? "10h00"}
                disabled={isPending}
              />

              <OverlapWarning overlap={overlap} />
            </fieldset>
          ) : null}

          {view === "FINANCIAL" ? (
            <fieldset disabled={termsLocked} className="min-w-0 space-y-5">
              <StagePanelHeader
                title="Financier"
                hint="Le net propriétaire, la commission et les services. Les montants validés ouvrent l'étape contrat."
              />

              <LockedNotice shown={termsLocked} />

              {/* The two figures the stay amount is built from. */}
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Net propriétaire">
                  <NumberInput value={netOwner} onChange={setNetOwner} disabled={isPending} />
                </Field>
                <Field label="Commission">
                  <NumberInput value={commission} onChange={setCommission} disabled={isPending} />
                </Field>
              </div>

              {/* Services box: what the villa includes, plus priced lines. */}
              <div className="space-y-3 rounded-md bg-muted/40 p-3 text-sm">
                <div className="space-y-1">
                  <p className="text-muted-foreground text-xs">
                    Services inclus du bien
                  </p>
                  {selectedProperty && selectedProperty.includedServices.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {selectedProperty.includedServices.map((s) => (
                        <Badge key={s} variant="secondary" className="font-normal">
                          {s}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-xs">
                      Aucun — à renseigner sur la fiche du bien.
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <p className="text-muted-foreground text-xs">
                    Services (ménage, extras) — coché « Inclus » = compris dans
                    le loyer, sinon facturé en plus.
                  </p>
                  {extras.map((s, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Input
                        value={s.label}
                        onChange={(e) =>
                          setExtras((list) =>
                            list.map((x, j) =>
                              j === i ? { ...x, label: e.target.value } : x
                            )
                          )
                        }
                        placeholder="Ménage, transfert…"
                        disabled={isPending}
                        className="flex-1"
                      />
                      {/* Included is a label only — no amount of its own, so
                          the field is dropped and the label (flex-1) grows to
                          fill the space up to the Inclus checkbox. */}
                      {s.includedInStay ? null : (
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          value={s.amount}
                          onChange={(e) =>
                            setExtras((list) =>
                              list.map((x, j) =>
                                j === i ? { ...x, amount: e.target.value } : x
                              )
                            )
                          }
                          placeholder="€"
                          disabled={isPending}
                          className="w-24 text-right tabular-nums"
                        />
                      )}
                      <label className="text-muted-foreground flex items-center gap-1 whitespace-nowrap text-xs">
                        <input
                          type="checkbox"
                          className="size-3.5 cursor-pointer"
                          checked={s.includedInStay}
                          onChange={(e) =>
                            setExtras((list) =>
                              list.map((x, j) =>
                                j === i
                                  ? { ...x, includedInStay: e.target.checked }
                                  : x
                              )
                            )
                          }
                          disabled={isPending}
                        />
                        Inclus
                      </label>
                      <button
                        type="button"
                        aria-label="Retirer"
                        onClick={() =>
                          setExtras((list) => list.filter((_, j) => j !== i))
                        }
                        disabled={isPending}
                        className="text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        <X aria-hidden="true" className="size-4" />
                      </button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setExtras((list) => [
                        ...list,
                        { label: "", amount: "", includedInStay: false },
                      ])
                    }
                    disabled={isPending}
                  >
                    <Plus aria-hidden="true" />
                    Ajouter un service
                  </Button>
                </div>
              </div>

              {/* Calcul box: the breakdown, read as a sum down to the total. */}
              <div className="space-y-2 rounded-md bg-muted/40 p-3 text-sm">
                {hasAmount ? (
                  <div className="flex items-center justify-between border-t pt-2">
                    <span>
                      Loyer
                      <span className="text-muted-foreground ml-1 text-xs font-normal">
                        = net + commission
                      </span>
                    </span>
                    <span className="tabular-nums">
                      <Money value={stay} />
                    </span>
                  </div>
                ) : null}

                {/* Each billed (non-included) service is its own recap line,
                    so the client total reads as a sum. */}
                {extras
                  .filter((s) => !s.includedInStay && s.label.trim() !== "")
                  .map((s, i) => (
                    <div
                      key={`billed-${i}`}
                      className="flex items-center justify-between border-t pt-2"
                    >
                      <span className="text-muted-foreground">{s.label}</span>
                      <span className="tabular-nums">
                        <Money value={amount(s.amount)} />
                      </span>
                    </div>
                  ))}

                {/* Its own recap line — same size as Loyer, detail kept small
                    alongside, amount at the same size as the other amounts. */}
                <div className="flex items-center justify-between border-t pt-2">
                  <span>
                    Taxe de séjour
                    {taxRate !== null ? (
                      <span className="text-muted-foreground ml-1 text-xs font-normal">
                        ({taxRate.toFixed(2)} € × {taxableGuests || "?"} pers.
                        {Number(children) > 0 ? " hors enfants" : ""} ×{" "}
                        {nights || "?"} nuits)
                      </span>
                    ) : null}
                  </span>
                  <span className="tabular-nums">
                    {touristTax !== null ? (
                      <Money value={touristTax} />
                    ) : taxRate === null ? (
                      "taux manquant"
                    ) : (
                      "—"
                    )}
                  </span>
                </div>

                {hasAmount ? (
                  <div className="flex items-center justify-between border-t pt-2 font-medium">
                    <span>
                      Total client
                      <span className="text-muted-foreground ml-1 text-xs font-normal">
                        = loyer + services facturés + taxe
                      </span>
                    </span>
                    <span className="tabular-nums">
                      <Money value={total} />
                    </span>
                  </div>
                ) : null}
              </div>

              {/* The split of that total. Settled here, not at finalisation:
                  the contract quotes the acompte and its share of the total,
                  and it is generated at the step before — so an amount entered
                  later would print as a document with no deposit at all. */}
              <SplitFields
                depositBasis={depositBasis}
                setDepositBasis={setDepositBasis}
                depositPercent={depositPercent}
                setDepositPercent={setDepositPercent}
                depositAmount={depositAmount}
                setDepositAmount={setDepositAmount}
                deposit={deposit}
                securityDepositAmount={securityDepositAmount}
                setSecurityDepositAmount={setSecurityDepositAmount}
                total={total}
                balance={balance}
                disabled={isPending}
              />

              <OverlapWarning overlap={overlap} />
            </fieldset>
          ) : null}

          {view === "CONTRACT" ? (
            <>
              <StagePanelHeader
                title="Contrat"
                hint="L'identification du client, les informations des parties, la génération des documents, puis la signature."
              />

              {/* Identifying the client comes first: the LCB-FT obligation
                  applies before entering into the relationship, and what the
                  client declares here fills exactly the fields the contract
                  requires — address, nationality, birth, identity document.
                  Left outside the lock below on purpose: the signature freezes
                  the contract's terms, not who the client is, and an answer
                  may well arrive after it. */}
              {intakeStep}

              {/* Once signed, this step is only somewhere to fetch and file
                  paperwork: the presentation and the parties are terms the
                  document now states. */}
              {termsLocked ? null : (
                <PresentationChoice
                  rentalId={rental.id}
                  initial={rental.presentation}
                  disabled={isPending}
                />
              )}

              {/* The same control as the financial step, not a copy of the
                  value: this is where the document quoting it is produced, so
                  a split that turned out wrong has to be fixable without
                  walking the booking back a stage. */}
              {/* The acompte and the caution are settled at the financial
                  step and nowhere else. They were repeated here so a booking
                  already at this stage could still reach them; the stepper
                  makes that unnecessary, and one figure with two places to
                  edit it is one figure too many. */}

              {/* The completion form: every field the documents require,
                  server-assembled and written back to contact/rental. */}
              {termsLocked ? null : contractStep}

              {documentsStep}

              {signedStep}

              {contractReady || bothSigned ? (
                <>
                  {/* THE gate: the signed contract, which freezes
                      owner + agent and opens the finalisation. */}
                  {contractSigned ? (
                    <ConfirmedLine
                      when={rental.contractSignedAt}
                      who={rental.contractSignedByName}
                      label="Contrat signé"
                    />
                  ) : bothSigned ? (
                    <SatisfiedLine
                      title="Contrat signé par toutes les parties"
                      hint="Les deux exemplaires signés sont joints. Passer à la finalisation fige le propriétaire et l'agent de cette location."
                    />
                  ) : (
                    <GateCheckbox
                      checked={signContract}
                      onChange={setSignContract}
                      disabled={isPending}
                      title="Contrat signé par toutes les parties"
                      hint={
                        hasSignedContract || hasSignedConfirmation
                          ? "Joindre les deux exemplaires signés coche cette étape d'office. Sinon, la cocher fige le propriétaire et l'agent, et ouvre la finalisation."
                          : "Fige le propriétaire et l'agent de cette location, et ouvre la finalisation. Joindre les deux exemplaires signés ci-dessus la coche d'office."
                      }
                    />
                  )}
                </>
              ) : null}
            </>
          ) : null}

          {view === "FINALISATION" ? (
            <>
              <StagePanelHeader
                title="Finalisation"
                hint="Les autres occupants, les pièces d'identité et les paiements avant l'arrivée."
              />

              {occupantsStep}
              <ConfirmedLine
                when={rental.contractSignedAt}
                who={rental.contractSignedByName}
                label="Contrat signé"
              />
              <div className="rounded-md border border-dashed px-3 py-2.5 text-sm">
                <p className="flex items-center gap-1.5 font-medium">
                  <IdCard aria-hidden="true" className="size-4" />
                  Pièces d&apos;identité
                  <Badge variant="secondary" className="font-normal">
                    {rental.identityDocumentCount}
                  </Badge>
                </p>
                <p className="text-muted-foreground text-xs">
                  Import des pièces (passeport, CNI, permis) — à venir.
                </p>
              </div>
              <MoneyBlock
                netOwner={netOwner}
                setNetOwner={setNetOwner}
                commission={commission}
                setCommission={setCommission}
                stay={stay}
                hasAmount={hasAmount}
                total={total}
                depositAmount={depositAmount}
                securityDepositAmount={securityDepositAmount}
                balance={balance}
                disabled={isPending}
              />
              <PaymentBlock
                depositStatus={depositStatus}
                setDepositStatus={setDepositStatus}
                balanceStatus={balanceStatus}
                setBalanceStatus={setBalanceStatus}
                securityDepositStatus={securityDepositStatus}
                setSecurityDepositStatus={setSecurityDepositStatus}
                payments={payments}
                setPayments={setPayments}
                due={{
                  DEPOSIT: deposit > 0 ? deposit : null,
                  BALANCE: balance,
                  SECURITY_DEPOSIT: Number(securityDepositAmount) || null,
                }}
                disabled={isPending}
              />
            </>
          ) : null}

          {view === "CHECK_IN" ? (
            <>
              <StagePanelHeader
                title="Séjour"
                hint="Le client est sur place. Facturation de services et documents — à venir."
              />
              <PaymentBlock
                depositStatus={depositStatus}
                setDepositStatus={setDepositStatus}
                balanceStatus={balanceStatus}
                setBalanceStatus={setBalanceStatus}
                securityDepositStatus={securityDepositStatus}
                setSecurityDepositStatus={setSecurityDepositStatus}
                payments={payments}
                setPayments={setPayments}
                due={{
                  DEPOSIT: deposit > 0 ? deposit : null,
                  BALANCE: balance,
                  SECURITY_DEPOSIT: Number(securityDepositAmount) || null,
                }}
                disabled={isPending}
              />
            </>
          ) : null}

          {view === "CHECK_OUT" ? (
            <>
              <StagePanelHeader
                title="Départ"
                hint="Le séjour est terminé. Il ne reste que la caution."
              />
              {returned ? (
                <ConfirmedLine
                  when={rental.securityDepositReturnedAt}
                  who={null}
                  label="Caution rendue"
                />
              ) : (
                <GateCheckbox
                  checked={returnSecurityDeposit}
                  onChange={setReturnSecurityDeposit}
                  disabled={isPending}
                  title="Caution rendue au client"
                  hint="Marque le dépôt de garantie comme remboursé."
                />
              )}
            </>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="notes">Notes internes</Label>
            <Input
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isPending}
            />
          </div>

          {/* Where the booking stands, when that is not what is on screen. */}
          {view !== stage ? (
            <p className="text-muted-foreground text-xs">
              Vous consultez l&apos;étape «&nbsp;{bookingStatusLabel(view)}
              &nbsp;». La location est à l&apos;étape «&nbsp;
              {bookingStatusLabel(stage)}&nbsp;».{" "}
              <button
                type="button"
                onClick={() => setView(stage)}
                className="cursor-pointer underline underline-offset-2"
              >
                Revenir à l&apos;étape en cours
              </button>
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-3 border-t pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => run(stage)}
              disabled={isPending}
            >
              Enregistrer
            </Button>
            {/* Advancing and cancelling act on the booking, so they belong to
                the step it is actually on — not to one being read back. */}
            {next && view === stage ? (
              <Button
                type="button"
                onClick={() => run(next)}
                disabled={isPending || missing.length > 0}
              >
                {ADVANCE_LABEL[stage]}
                <ArrowRight aria-hidden="true" />
              </Button>
            ) : null}
            {/* A finished rental with its deposit returned is closed for
                good — no cancelling after that. */}
            {returned || view !== stage ? null : (
              <button
                type="button"
                onClick={() => run("CANCELLED")}
                disabled={isPending}
                className="text-muted-foreground hover:text-destructive ml-auto cursor-pointer text-xs"
              >
                Annuler la location
              </button>
            )}
          </div>

          {next && missing.length > 0 ? (
            <p className="text-xs text-amber-600">
              Pour avancer, il manque {missing.join(", ")}.
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}

function OverlapWarning({ overlap }: { overlap: OverlapSummary | null }) {
  if (!overlap || overlap.total === 0) return null;
  return (
    <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 px-3 py-2.5 text-sm">
      <p className="flex items-center gap-2 font-medium">
        <TriangleAlert
          aria-hidden="true"
          className="size-4 shrink-0 text-amber-600"
        />
        {overlap.total === 1
          ? "1 autre réservation sur ces dates"
          : `${overlap.total} autres réservations sur ces dates`}
        {overlap.confirmed > 0 ? (
          <Badge variant="outline" className="font-normal">
            dont {overlap.confirmed} confirmée
            {overlap.confirmed > 1 ? "s" : ""}
          </Badge>
        ) : null}
      </p>
      <ul className="text-muted-foreground mt-1.5 space-y-0.5 text-xs">
        {overlap.lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </div>
  );
}

/**
 * A gate already met, by something other than ticking it.
 *
 * Reads like the checkbox it replaces so the step is recognisable, but there
 * is nothing to click: the signed copies on file are what satisfied it.
 */
function SatisfiedLine({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="flex items-start gap-2 rounded-md border p-3">
      <CircleCheck
        aria-hidden="true"
        className="mt-0.5 size-4 shrink-0 text-emerald-600"
      />
      <div className="space-y-0.5">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-muted-foreground text-xs">{hint}</p>
      </div>
    </div>
  );
}

/** Why a step that used to be editable no longer is. */
function LockedNotice({ shown }: { shown: boolean }) {
  if (!shown) return null;
  return (
    <p className="text-muted-foreground flex items-start gap-1.5 text-xs">
      <Lock aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
      Le contrat est signé&nbsp;: ces informations sont celles que les parties
      ont signées et ne peuvent plus être modifiées.
    </p>
  );
}

function StagePanelHeader({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="space-y-0.5">
      <h3 className="font-medium">{title}</h3>
      <p className="text-muted-foreground text-sm">{hint}</p>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function NumberInput({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
}) {
  return (
    <Input
      type="number"
      min={0}
      step="0.01"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
    />
  );
}

function GateCheckbox({
  checked,
  onChange,
  disabled,
  title,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled: boolean;
  title: string;
  hint: string;
}) {
  return (
    <label className="flex items-start gap-2 rounded-md bg-muted/50 p-3 text-sm">
      <input
        type="checkbox"
        className="mt-0.5 size-4 cursor-pointer"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
      />
      <span>
        {title}
        <span className="text-muted-foreground block text-xs">{hint}</span>
      </span>
    </label>
  );
}

function ConfirmedLine({
  when,
  who,
  label,
}: {
  when: Date | null;
  who: string | null;
  label: string;
}) {
  if (!when) return null;
  return (
    <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
      <CircleCheck aria-hidden="true" className="size-3.5" />
      {label} le {formatDate(when)}
      {who ? ` par ${who}` : ""}
    </p>
  );
}

/**
 * The acompte's share of the client total, as the contract prints it.
 *
 * Empty when there is nothing to divide: a percentage of an unknown total is
 * noise, and an acompte of zero is not a 0 % split — it is a booking where the
 * tenant settles the balance directly, which the contract states differently.
 */
function depositShare(depositAmount: string, total: number | null): string {
  const deposit = Number(depositAmount) || 0;
  if (total === null || total <= 0 || deposit <= 0) return "";
  return `≈ ${Math.round((deposit / total) * 100)} % du total client`;
}

/**
 * How the client total is split between the acompte and the balance.
 *
 * The percentage is the one the contract will print — computed from the two
 * amounts, never assumed. The 50 % that pre-fills the field is only a starting
 * point, and it is shown as such until the agent settles on a figure.
 */
function SplitFields(props: {
  depositBasis: DepositBasis;
  setDepositBasis: (v: DepositBasis) => void;
  depositPercent: string;
  setDepositPercent: (v: string) => void;
  depositAmount: string;
  setDepositAmount: (v: string) => void;
  /** The resolved acompte, whichever basis produced it. */
  deposit: number;
  securityDepositAmount: string;
  setSecurityDepositAmount: (v: string) => void;
  total: number | null;
  balance: number | null;
  disabled: boolean;
}) {
  const byPercent = props.depositBasis === "PERCENT";
  const share =
    props.total !== null && props.total > 0 && props.deposit > 0
      ? Math.round((props.deposit / props.total) * 100)
      : null;

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Échéancier</p>

      {/* Which way the acompte is decided. A share follows the total as
          services and the taxe de séjour move it; a figure stays put. */}
      <div className="flex flex-wrap gap-4 text-sm">
        {(
          [
            ["PERCENT", "Pourcentage du total"],
            ["AMOUNT", "Montant fixe"],
          ] as const
        ).map(([value, label]) => (
          <label key={value} className="flex items-center gap-2">
            <input
              type="radio"
              name="deposit-basis"
              checked={props.depositBasis === value}
              onChange={() => props.setDepositBasis(value)}
              disabled={props.disabled}
            />
            <span>{label}</span>
          </label>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={byPercent ? "Acompte (%)" : "Acompte"}>
          {byPercent ? (
            <NumberInput
              value={props.depositPercent}
              onChange={props.setDepositPercent}
              disabled={props.disabled}
            />
          ) : (
            <NumberInput
              value={props.depositAmount}
              onChange={props.setDepositAmount}
              disabled={props.disabled}
            />
          )}
          <p className="text-muted-foreground text-xs">
            {byPercent
              ? props.deposit > 0
                ? `Soit ${formatAmount(props.deposit)} du total client.`
                : "Part du total client. 0 % si le locataire règle le solde directement."
              : share !== null
                ? `≈ ${share} % du total client.`
                : "Montant fixe. Laisser vide si le locataire règle le solde directement."}
          </p>
        </Field>
        <Field label="Solde">
          <p className="pt-2 text-sm tabular-nums">
            {props.balance !== null ? (
              <>
                {formatAmount(props.balance)}
                {share !== null ? (
                  <span className="text-muted-foreground ml-1 text-xs">
                    ≈ {100 - share} %
                  </span>
                ) : null}
              </>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </p>
        </Field>
      </div>
      <p className="text-muted-foreground text-xs">
        Repris tel quel sur le contrat, avec ces pourcentages.
      </p>

      {/* Not part of the total above: it is held and given back, never
          earned. Every rental carries one, so an empty field is a gap to
          fill rather than a variant of the booking. */}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Dépôt de garantie">
          <NumberInput
            value={props.securityDepositAmount}
            onChange={props.setSecurityDepositAmount}
            disabled={props.disabled}
          />
          {Number(props.securityDepositAmount) > 0 ? (
            <p className="text-muted-foreground text-xs">
              Restitué après le séjour — jamais un revenu, et hors total client.
            </p>
          ) : (
            <p className="text-xs text-amber-600">
              Requis&nbsp;: aucune location ne se signe sans dépôt de garantie.
            </p>
          )}
        </Field>
      </div>
    </div>
  );
}

function MoneyBlock(props: {
  netOwner: string;
  setNetOwner: (v: string) => void;
  commission: string;
  setCommission: (v: string) => void;
  stay: number;
  hasAmount: boolean;
  total: number | null;
  depositAmount: string;
  securityDepositAmount: string;
  balance: number | null;
  disabled: boolean;
}) {
  return (
    <div className="space-y-2">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Net propriétaire">
          <NumberInput
            value={props.netOwner}
            onChange={props.setNetOwner}
            disabled={props.disabled}
          />
        </Field>
        <Field label="Commission">
          <NumberInput
            value={props.commission}
            onChange={props.setCommission}
            disabled={props.disabled}
          />
        </Field>
      </div>
      {props.hasAmount ? (
        <p className="text-muted-foreground text-xs">
          Loyer : {formatAmount(props.stay)} (net + commission).
        </p>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        {/* Read-only here: the acompte is set at the financial step and
            printed on a contract the parties have since signed, so this shows
            what was agreed rather than offering to contradict it. */}
        <Field label="Acompte">
          <p className="text-sm tabular-nums">
            {Number(props.depositAmount) > 0 ? (
              <>
                {formatAmount(Number(props.depositAmount))}
                <span className="text-muted-foreground ml-1 text-xs">
                  {depositShare(props.depositAmount, props.total)}
                </span>
              </>
            ) : (
              <span className="text-muted-foreground">
                Aucun acompte — solde réglé directement.
              </span>
            )}
          </p>
        </Field>
        <Field label="Dépôt de garantie">
          <p className="text-sm tabular-nums">
            {Number(props.securityDepositAmount) > 0 ? (
              formatAmount(Number(props.securityDepositAmount))
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </p>
        </Field>
      </div>
      {props.balance !== null ? (
        <p className="text-muted-foreground text-xs">
          Solde calculé : {formatAmount(props.balance)}. Le dépôt de garantie
          est restitué, jamais un revenu.
        </p>
      ) : null}
    </div>
  );
}

type PaymentDraft = {
  kind: RentalPaymentKind;
  amount: string;
  paidAt: string;
  note: string;
};

/**
 * The three sums a booking carries, and what has actually come in against each.
 *
 * A status alone said "partially paid" without saying how much, and a client
 * settling in three instalments had nowhere to put the second and the third.
 * The receipts sit under their status: they appear once it stops being unpaid,
 * because an unpaid line has nothing to detail.
 *
 * The status stays the agent's own call rather than being derived from the
 * sums. A transfer announced but not yet cleared, a cheque in hand — the
 * figures and the judgement are not the same thing, and the pipeline reads the
 * judgement.
 */
function PaymentBlock(props: {
  depositStatus: string;
  setDepositStatus: (v: string) => void;
  balanceStatus: string;
  setBalanceStatus: (v: string) => void;
  securityDepositStatus: string;
  setSecurityDepositStatus: (v: string) => void;
  payments: PaymentDraft[];
  setPayments: React.Dispatch<React.SetStateAction<PaymentDraft[]>>;
  /** What each is owed, so the receipts can be read against something. */
  due: Record<RentalPaymentKind, number | null>;
  disabled: boolean;
}) {
  const rows = [
    ["DEPOSIT", "Acompte", props.depositStatus, props.setDepositStatus],
    ["BALANCE", "Solde", props.balanceStatus, props.setBalanceStatus],
    [
      "SECURITY_DEPOSIT",
      "Dépôt de garantie",
      props.securityDepositStatus,
      props.setSecurityDepositStatus,
    ],
  ] as const;

  const patch = (index: number, field: keyof PaymentDraft, value: string) =>
    props.setPayments((list) =>
      list.map((p, i) => (i === index ? { ...p, [field]: value } : p))
    );

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">Paiements</p>

      {rows.map(([kind, label, value, setter]) => {
        const entries = props.payments
          .map((p, index) => ({ p, index }))
          .filter(({ p }) => p.kind === kind);
        const received = entries.reduce(
          (sum, { p }) => sum + (Number(p.amount) || 0),
          0
        );
        const owed = props.due[kind];
        const outstanding = owed === null ? null : owed - received;

        return (
          <div key={kind} className="space-y-2 rounded-md border p-3">
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-44 flex-1">
                <Field label={label}>
                  <Select
                    value={value}
                    onValueChange={(v) => v !== null && setter(v)}
                    items={PAYMENT_STATUSES.map((st) => ({
                      value: st,
                      label: paymentStatusLabel(st),
                    }))}
                    disabled={props.disabled}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_STATUSES.map((st) => (
                        <SelectItem key={st} value={st}>
                          {paymentStatusLabel(st)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <p className="text-muted-foreground pb-2 text-xs tabular-nums">
                {owed === null ? "—" : `Dû ${formatAmount(owed)}`}
                {entries.length > 0
                  ? ` · reçu ${formatAmount(received)}`
                  : ""}
                {outstanding !== null && entries.length > 0 && outstanding !== 0
                  ? ` · reste ${formatAmount(outstanding)}`
                  : ""}
              </p>
            </div>

            {value === "UNPAID" ? null : (
              <div className="space-y-2">
                {entries.map(({ p, index }) => (
                  <div key={index} className="flex flex-wrap items-end gap-2">
                    <div className="w-32">
                      <Field label="Montant">
                        <NumberInput
                          value={p.amount}
                          onChange={(v) => patch(index, "amount", v)}
                          disabled={props.disabled}
                        />
                      </Field>
                    </div>
                    <div className="w-40">
                      <Field label="Date">
                        <Input
                          type="date"
                          value={p.paidAt}
                          onChange={(e) => patch(index, "paidAt", e.target.value)}
                          disabled={props.disabled}
                        />
                      </Field>
                    </div>
                    <div className="min-w-40 flex-1">
                      <Field label="Référence">
                        <Input
                          value={p.note}
                          onChange={(e) => patch(index, "note", e.target.value)}
                          placeholder="Virement, chèque n°…"
                          disabled={props.disabled}
                        />
                      </Field>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      aria-label="Retirer ce versement"
                      disabled={props.disabled}
                      onClick={() =>
                        props.setPayments((list) =>
                          list.filter((_, i) => i !== index)
                        )
                      }
                    >
                      <X aria-hidden="true" />
                    </Button>
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={props.disabled}
                  onClick={() =>
                    props.setPayments((list) => [
                      ...list,
                      { kind, amount: "", paidAt: "", note: "" },
                    ])
                  }
                >
                  <Plus aria-hidden="true" />
                  Ajouter un versement
                </Button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
