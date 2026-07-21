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
import type { RentalBookingStatus } from "@/generated/prisma/enums";
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

type ServiceDraft = { label: string; amount: string };

function villaLabel(p: {
  marketingName: string | null;
  city: string | null;
}): string {
  return [p.marketingName ?? p.city ?? "Sans nom", p.city]
    .filter(Boolean)
    .join(" — ");
}

export type FunnelProperty = {
  id: string;
  marketingName: string | null;
  city: string | null;
  reference: number | null;
  includedServices: string[];
};

export type FunnelRental = {
  id: string;
  bookingStatus: RentalBookingStatus;
  propertyId: string;
  checkIn: string;
  checkOut: string;
  guests: number | null;
  grossAmount: number | null;
  depositAmount: number | null;
  securityDepositAmount: number | null;
  depositStatus: string;
  balanceStatus: string;
  securityDepositStatus: string;
  additionalServices: { label: string; amount: number }[];
  ownerConfirmedAt: Date | null;
  ownerConfirmedByName: string | null;
  contractSignedAt: Date | null;
  contractSignedByName: string | null;
  securityDepositReturnedAt: Date | null;
  identityDocumentCount: number;
  notes: string | null;
};

const NEXT: Partial<Record<RentalBookingStatus, RentalBookingStatus>> = {
  INQUIRY: "CONTRACT",
  CONTRACT: "FINALISATION",
  FINALISATION: "CHECK_IN",
  CHECK_IN: "CHECK_OUT",
};

const ADVANCE_LABEL: Partial<Record<RentalBookingStatus, string>> = {
  INQUIRY: "Passer au contrat",
  CONTRACT: "Passer à la finalisation",
  FINALISATION: "Démarrer le séjour",
  CHECK_IN: "Terminer le séjour",
};

function Stepper({ current }: { current: RentalBookingStatus }) {
  const cancelled = current === "CANCELLED";
  const currentIdx = BOOKING_PIPELINE.indexOf(current);
  return (
    <ol className="flex flex-wrap items-center gap-x-1 gap-y-2 text-xs">
      {BOOKING_PIPELINE.map((stage, i) => {
        const done = !cancelled && i < currentIdx;
        const active = !cancelled && i === currentIdx;
        return (
          <li key={stage} className="flex items-center gap-1">
            <span
              className={[
                "flex items-center gap-1.5 rounded-full px-2.5 py-1",
                active
                  ? "bg-primary text-primary-foreground font-medium"
                  : done
                    ? "bg-primary/10 text-foreground"
                    : "bg-muted text-muted-foreground",
              ].join(" ")}
            >
              <span className="flex size-4 items-center justify-center rounded-full border text-[10px]">
                {done ? <Check aria-hidden="true" className="size-3" /> : i + 1}
              </span>
              {bookingStatusLabel(stage)}
            </span>
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
}: {
  rental: FunnelRental;
  canManage: boolean;
  properties: FunnelProperty[];
  taxRatesByCity: Record<string, number>;
}) {
  const router = useRouter();

  const [propertyId, setPropertyId] = React.useState(rental.propertyId);
  const [checkIn, setCheckIn] = React.useState(rental.checkIn);
  const [checkOut, setCheckOut] = React.useState(rental.checkOut);
  const [guests, setGuests] = React.useState(rental.guests?.toString() ?? "");
  const [grossAmount, setGrossAmount] = React.useState(
    rental.grossAmount?.toString() ?? ""
  );
  const [showDeposit, setShowDeposit] = React.useState(
    rental.depositAmount !== null
  );
  const [depositAmount, setDepositAmount] = React.useState(
    rental.depositAmount?.toString() ?? ""
  );
  const [securityDepositAmount, setSecurityDepositAmount] = React.useState(
    rental.securityDepositAmount?.toString() ?? ""
  );
  const [extras, setExtras] = React.useState<ServiceDraft[]>(
    rental.additionalServices.map((s) => ({
      label: s.label,
      amount: s.amount.toString(),
    }))
  );
  const [notes, setNotes] = React.useState(rental.notes ?? "");
  const [depositStatus, setDepositStatus] = React.useState(rental.depositStatus);
  const [balanceStatus, setBalanceStatus] = React.useState(rental.balanceStatus);
  const [securityDepositStatus, setSecurityDepositStatus] = React.useState(
    rental.securityDepositStatus
  );
  const [confirmOwner, setConfirmOwner] = React.useState(false);
  const [signContract, setSignContract] = React.useState(false);
  const [returnSecurityDeposit, setReturnSecurityDeposit] =
    React.useState(false);
  const [isPending, startTransition] = React.useTransition();

  const stage = rental.bookingStatus;
  const ownerConfirmed = rental.ownerConfirmedAt !== null;
  const contractSigned = rental.contractSignedAt !== null;
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
  const taxRate = selectedProperty?.city
    ? (taxRatesByCity[selectedProperty.city.toLowerCase()] ?? null)
    : null;
  const touristTax =
    taxRate !== null && guestCount > 0 && nights > 0
      ? taxRate * guestCount * nights
      : null;

  const stay = Number(grossAmount) || 0;
  // The stay amount is the agent's figure and IS the total the client
  // pays — the tourist tax and the services are already inside it, not
  // added on top. The breakdown below is informational.
  const total = grossAmount.trim() === "" ? null : stay;

  // Overlap warning at enquiry, when the villa or dates change.
  const [overlaps, setOverlaps] = React.useState<{
    key: string;
    data: OverlapSummary;
  } | null>(null);
  const stayKey = `${propertyId}|${checkIn}|${checkOut}`;
  React.useEffect(() => {
    if (stage !== "INQUIRY" || !propertyId || !checkIn || !checkOut) return;
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
        grossAmount,
        depositAmount: showDeposit ? depositAmount : "",
        securityDepositAmount,
        additionalServices: extras
          .filter((s) => s.label.trim() !== "")
          .map((s) => ({ label: s.label, amount: Number(s.amount) || 0 })),
        depositStatus,
        balanceStatus,
        securityDepositStatus,
        confirmOwner,
        signContract,
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
      setConfirmOwner(false);
      setSignContract(false);
      setReturnSecurityDeposit(false);
      router.refresh();
    });
  }

  const next = NEXT[stage];
  const missing = next
    ? missingToReach(next, {
        ownerConfirmed: ownerConfirmed || confirmOwner,
        contractSigned: contractSigned || signContract,
        hasAmount: grossAmount.trim() !== "",
      })
    : [];

  const deposit = showDeposit ? Number(depositAmount) || 0 : 0;
  const balance = grossAmount.trim() === "" ? null : stay - deposit;

  if (!canManage) {
    return (
      <div className="space-y-4">
        <Stepper current={stage} />
        <p className="text-muted-foreground flex items-center gap-1.5 text-sm">
          <Lock aria-hidden="true" className="size-4" />
          Lecture seule — vous ne gérez pas ce bien.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Stepper current={stage} />

      {stage === "CANCELLED" ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm">
          <p className="flex items-center gap-2 font-medium">
            <Ban aria-hidden="true" className="size-4 text-destructive" />
            Location annulée.
          </p>
        </div>
      ) : (
        <div className="space-y-5 rounded-lg border p-4">
          {stage === "INQUIRY" ? (
            <>
              <StagePanelHeader
                title="Demande"
                hint="L'agent ajuste la villa, les dates et le nombre de personnes, puis obtient l'accord des trois parties."
              />

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

              <div className="grid gap-3 sm:grid-cols-3">
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
              </div>

              {overlap && overlap.total > 0 ? (
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
              ) : null}

              {/* The agent's figure — authoritative, never recomputed. */}
              <Field label="Montant du séjour (fait foi)">
                <NumberInput value={grossAmount} onChange={setGrossAmount} disabled={isPending} />
              </Field>

              {/* Composition shown below the stay amount. */}
              <div className="space-y-3 rounded-md bg-muted/40 p-3 text-sm">
                <div className="space-y-1">
                  <p className="text-muted-foreground text-xs">Services inclus</p>
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
                    Services supplémentaires
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
                        placeholder="Ménage supplémentaire, transfert…"
                        disabled={isPending}
                        className="flex-1"
                      />
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
                        className="w-28 text-right tabular-nums"
                      />
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
                      setExtras((list) => [...list, { label: "", amount: "" }])
                    }
                    disabled={isPending}
                  >
                    <Plus aria-hidden="true" />
                    Ajouter un service
                  </Button>
                </div>

                <div className="flex items-center justify-between border-t pt-2 text-xs">
                  <span className="text-muted-foreground">
                    Taxe de séjour
                    {taxRate !== null
                      ? ` (${taxRate.toFixed(2)} € × ${guestCount || "?"} pers. × ${nights || "?"} nuits)`
                      : ""}
                  </span>
                  <span className="tabular-nums">
                    {touristTax !== null
                      ? formatAmount(touristTax)
                      : taxRate === null
                        ? "taux manquant"
                        : "—"}
                  </span>
                </div>

                {total !== null ? (
                  <div className="flex items-center justify-between border-t pt-2 font-medium">
                    <span>
                      Total client
                      <span className="text-muted-foreground ml-1 text-xs font-normal">
                        = montant du séjour, taxe et services compris
                      </span>
                    </span>
                    <span className="tabular-nums">{formatAmount(total)}</span>
                  </div>
                ) : null}
              </div>

              <GateCheckbox
                checked={confirmOwner}
                onChange={setConfirmOwner}
                disabled={isPending}
                title="Accord trouvé (agent + client + propriétaire)"
                hint="Réserve ces dates : aucune autre location ne pourra être confirmée sur ce bien pour cette période."
              />
            </>
          ) : null}

          {stage === "CONTRACT" ? (
            <>
              <StagePanelHeader
                title="Contrat"
                hint="Le contrat de location. La génération du PDF arrivera avec le module documents."
              />
              <ConfirmedLine
                when={rental.ownerConfirmedAt}
                who={rental.ownerConfirmedByName}
                label="Accord du propriétaire"
              />
              <GateCheckbox
                checked={signContract}
                onChange={setSignContract}
                disabled={isPending}
                title="Contrat signé par toutes les parties"
                hint="Fige le propriétaire et l'agent de cette location."
              />
            </>
          ) : null}

          {stage === "FINALISATION" ? (
            <>
              <StagePanelHeader
                title="Finalisation"
                hint="Pièces d'identité et paiements avant l'arrivée."
              />
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
                grossAmount={grossAmount}
                setGrossAmount={setGrossAmount}
                showDeposit={showDeposit}
                setShowDeposit={setShowDeposit}
                depositAmount={depositAmount}
                setDepositAmount={setDepositAmount}
                securityDepositAmount={securityDepositAmount}
                setSecurityDepositAmount={setSecurityDepositAmount}
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
                disabled={isPending}
              />
            </>
          ) : null}

          {stage === "CHECK_IN" ? (
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
                disabled={isPending}
              />
            </>
          ) : null}

          {stage === "CHECK_OUT" ? (
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

          <div className="flex flex-wrap items-center gap-3 border-t pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => run(stage)}
              disabled={isPending}
            >
              Enregistrer
            </Button>
            {next ? (
              <Button
                type="button"
                onClick={() => run(next)}
                disabled={isPending || missing.length > 0}
              >
                {ADVANCE_LABEL[stage]}
                <ArrowRight aria-hidden="true" />
              </Button>
            ) : null}
            <button
              type="button"
              onClick={() => run("CANCELLED")}
              disabled={isPending}
              className="text-muted-foreground hover:text-destructive ml-auto cursor-pointer text-xs"
            >
              Annuler la location
            </button>
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

function MoneyBlock(props: {
  grossAmount: string;
  setGrossAmount: (v: string) => void;
  showDeposit: boolean;
  setShowDeposit: (v: boolean) => void;
  depositAmount: string;
  setDepositAmount: (v: string) => void;
  securityDepositAmount: string;
  setSecurityDepositAmount: (v: string) => void;
  balance: number | null;
  disabled: boolean;
}) {
  return (
    <div className="space-y-2">
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Séjour">
          <NumberInput
            value={props.grossAmount}
            onChange={props.setGrossAmount}
            disabled={props.disabled}
          />
        </Field>
        {props.showDeposit ? (
          <Field label="Acompte">
            <NumberInput
              value={props.depositAmount}
              onChange={props.setDepositAmount}
              disabled={props.disabled}
            />
          </Field>
        ) : (
          <div className="flex items-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => props.setShowDeposit(true)}
              disabled={props.disabled}
            >
              Ajouter un acompte
            </Button>
          </div>
        )}
        <Field label="Dépôt de garantie">
          <NumberInput
            value={props.securityDepositAmount}
            onChange={props.setSecurityDepositAmount}
            disabled={props.disabled}
          />
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

function PaymentBlock(props: {
  depositStatus: string;
  setDepositStatus: (v: string) => void;
  balanceStatus: string;
  setBalanceStatus: (v: string) => void;
  securityDepositStatus: string;
  setSecurityDepositStatus: (v: string) => void;
  disabled: boolean;
}) {
  const rows = [
    ["Acompte", props.depositStatus, props.setDepositStatus],
    ["Solde", props.balanceStatus, props.setBalanceStatus],
    [
      "Dépôt de garantie",
      props.securityDepositStatus,
      props.setSecurityDepositStatus,
    ],
  ] as const;
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Paiements</p>
      <div className="grid gap-3 sm:grid-cols-3">
        {rows.map(([label, value, setter]) => (
          <Field key={label} label={label}>
            <Select
              value={value}
              onValueChange={(v) => v !== null && setter(v)}
              items={PAYMENT_STATUSES.map((s) => ({
                value: s,
                label: paymentStatusLabel(s),
              }))}
              disabled={props.disabled}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {paymentStatusLabel(s)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        ))}
      </div>
    </div>
  );
}
