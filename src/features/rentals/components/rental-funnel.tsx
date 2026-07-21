"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Ban, Check, CircleCheck, IdCard, Lock } from "lucide-react";
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
  BOOKING_PIPELINE,
  PAYMENT_STATUSES,
  bookingStatusLabel,
  formatAmount,
  formatDate,
  paymentStatusLabel,
} from "@/features/rentals/components/rental-labels";
import { missingToReach } from "@/features/rentals/utils/rental-gates";

export type FunnelRental = {
  id: string;
  bookingStatus: RentalBookingStatus;
  guests: number | null;
  grossAmount: number | null;
  depositAmount: number | null;
  securityDepositAmount: number | null;
  depositStatus: string;
  balanceStatus: string;
  securityDepositStatus: string;
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
}: {
  rental: FunnelRental;
  canManage: boolean;
}) {
  const router = useRouter();

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

  function run(target: RentalBookingStatus) {
    startTransition(async () => {
      const result = await updateRental({
        id: rental.id,
        bookingStatus: target,
        guests,
        grossAmount,
        depositAmount: showDeposit ? depositAmount : "",
        securityDepositAmount,
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

  const gross = Number(grossAmount) || 0;
  const deposit = showDeposit ? Number(depositAmount) || 0 : 0;
  const balance = grossAmount.trim() === "" ? null : gross - deposit;

  // The read-only view for anyone who doesn't manage this booking.
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
          {/* ---- DEMANDE ---- */}
          {stage === "INQUIRY" ? (
            <>
              <StagePanelHeader
                title="Demande"
                hint="L'agent affine la demande : dates, montant, puis obtient l'accord des trois parties."
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Montant du séjour">
                  <NumberInput value={grossAmount} onChange={setGrossAmount} disabled={isPending} />
                </Field>
                <Field label="Nombre de personnes">
                  <NumberInput value={guests} onChange={setGuests} disabled={isPending} />
                </Field>
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

          {/* ---- CONTRAT ---- */}
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

          {/* ---- FINALISATION ---- */}
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

          {/* ---- SÉJOUR ---- */}
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

          {/* ---- DÉPART ---- */}
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

          {/* Actions: save this stage, advance to the next, or cancel. */}
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
