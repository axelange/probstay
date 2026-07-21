"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CircleCheck } from "lucide-react";
import { toast } from "sonner";
import type { RentalBookingStatus } from "@/generated/prisma/enums";
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
import { Separator } from "@/components/ui/separator";
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

export type EditableRental = {
  id: string;
  bookingStatus: RentalBookingStatus;
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
  notes: string | null;
};

export function EditRentalForm({ rental }: { rental: EditableRental }) {
  const router = useRouter();

  const [bookingStatus, setBookingStatus] = React.useState<RentalBookingStatus>(
    rental.bookingStatus
  );
  const [confirmOwner, setConfirmOwner] = React.useState(false);
  const [signContract, setSignContract] = React.useState(false);
  const [returnSecurityDeposit, setReturnSecurityDeposit] =
    React.useState(false);
  const [showDeposit, setShowDeposit] = React.useState(
    rental.depositAmount !== null
  );
  const [form, setForm] = React.useState({
    grossAmount: rental.grossAmount?.toString() ?? "",
    depositAmount: rental.depositAmount?.toString() ?? "",
    securityDepositAmount: rental.securityDepositAmount?.toString() ?? "",
    notes: rental.notes ?? "",
  });
  const [depositStatus, setDepositStatus] = React.useState(rental.depositStatus);
  const [balanceStatus, setBalanceStatus] = React.useState(rental.balanceStatus);
  const [securityDepositStatus, setSecurityDepositStatus] = React.useState(
    rental.securityDepositStatus
  );
  const [isPending, startTransition] = React.useTransition();

  const ownerConfirmed = rental.ownerConfirmedAt !== null;
  const contractSigned = rental.contractSignedAt !== null;
  const returned = rental.securityDepositReturnedAt !== null;

  // What the target stage still needs, given what this save would also
  // set. Empty means the move is allowed — the gate explains itself.
  const missing = missingToReach(bookingStatus, {
    ownerConfirmed: ownerConfirmed || confirmOwner,
    contractSigned: contractSigned || signContract,
    hasAmount: form.grossAmount.trim() !== "",
  });

  function set(field: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function save(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await updateRental({
        id: rental.id,
        bookingStatus,
        ...form,
        depositAmount: showDeposit ? form.depositAmount : "",
        depositStatus,
        balanceStatus,
        securityDepositStatus,
        confirmOwner,
        signContract,
        returnSecurityDeposit,
      });
      if (result.status === "error") {
        toast.error(result.message);
        return;
      }
      toast.success("Location enregistrée.");
      setConfirmOwner(false);
      setSignContract(false);
      setReturnSecurityDeposit(false);
      router.refresh();
    });
  }

  const gross = Number(form.grossAmount) || 0;
  const deposit = showDeposit ? Number(form.depositAmount) || 0 : 0;
  const balance = form.grossAmount.trim() === "" ? null : gross - deposit;

  return (
    <form onSubmit={save} className="space-y-6">
      <section className="space-y-3">
        <h3 className="text-sm font-medium">Avancement</h3>
        <div className="space-y-2">
          <Label htmlFor="status">Étape</Label>
          <Select
            value={bookingStatus}
            onValueChange={(v) =>
              v !== null && setBookingStatus(v as RentalBookingStatus)
            }
            disabled={isPending}
          >
            <SelectTrigger id="status" className="w-full sm:max-w-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BOOKING_PIPELINE.map((s) => (
                <SelectItem key={s} value={s}>
                  {bookingStatusLabel(s)}
                </SelectItem>
              ))}
              <SelectItem value="CANCELLED">
                {bookingStatusLabel("CANCELLED")}
              </SelectItem>
            </SelectContent>
          </Select>
          {missing.length > 0 ? (
            <p className="text-xs text-amber-600">
              Pour cette étape, il manque {missing.join(", ")}.
            </p>
          ) : null}
        </div>

        {/* Gate 1 — the tri-party agreement. Locks the dates against
            other agents. A dated fact once recorded, not a toggle. */}
        {ownerConfirmed ? (
          <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
            <CircleCheck aria-hidden="true" className="size-3.5" />
            Accord du propriétaire enregistré le{" "}
            {formatDate(rental.ownerConfirmedAt!)}
            {rental.ownerConfirmedByName
              ? ` par ${rental.ownerConfirmedByName}`
              : ""}
          </p>
        ) : (
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-0.5 size-4 cursor-pointer"
              checked={confirmOwner}
              onChange={(e) => setConfirmOwner(e.target.checked)}
              disabled={isPending}
            />
            <span>
              Accord trouvé (agent + client + propriétaire)
              <span className="text-muted-foreground block text-xs">
                Réserve ces dates : aucune autre location ne pourra être
                confirmée sur ce bien pour cette période.
              </span>
            </span>
          </label>
        )}

        {/* Gate 2 — the signed contract. Freezes the owner/agent
            snapshot. Only offered once the owner has agreed. */}
        {contractSigned ? (
          <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
            <CircleCheck aria-hidden="true" className="size-3.5" />
            Contrat signé le {formatDate(rental.contractSignedAt!)}
            {rental.contractSignedByName
              ? ` par ${rental.contractSignedByName}`
              : ""}
          </p>
        ) : ownerConfirmed || confirmOwner ? (
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-0.5 size-4 cursor-pointer"
              checked={signContract}
              onChange={(e) => setSignContract(e.target.checked)}
              disabled={isPending}
            />
            <span>
              Contrat signé par toutes les parties
              <span className="text-muted-foreground block text-xs">
                Fige le propriétaire et l&apos;agent de cette location.
              </span>
            </span>
          </label>
        ) : null}
      </section>

      <Separator />

      <section className="space-y-3">
        <h3 className="text-sm font-medium">Montants</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="grossAmount">Séjour</Label>
            <Input
              id="grossAmount"
              type="number"
              min={0}
              step="0.01"
              value={form.grossAmount}
              onChange={(e) => set("grossAmount", e.target.value)}
              disabled={isPending}
            />
          </div>

          {/* No deposit by default — the balance is the whole stay. The
              button reveals the field, and entering an amount lowers the
              derived balance. */}
          {showDeposit ? (
            <div className="space-y-2">
              <Label htmlFor="depositAmount">Acompte</Label>
              <Input
                id="depositAmount"
                type="number"
                min={0}
                step="0.01"
                value={form.depositAmount}
                onChange={(e) => set("depositAmount", e.target.value)}
                disabled={isPending}
              />
            </div>
          ) : (
            <div className="flex items-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowDeposit(true)}
                disabled={isPending}
              >
                Ajouter un acompte
              </Button>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="securityDepositAmount">Dépôt de garantie</Label>
            <Input
              id="securityDepositAmount"
              type="number"
              min={0}
              step="0.01"
              value={form.securityDepositAmount}
              onChange={(e) => set("securityDepositAmount", e.target.value)}
              disabled={isPending}
            />
          </div>
        </div>
        {balance !== null ? (
          <p className="text-muted-foreground text-xs">
            Solde calculé : {formatAmount(balance)}. Le dépôt de garantie est
            restitué, jamais un revenu.
          </p>
        ) : null}
      </section>

      <Separator />

      <section className="space-y-3">
        <h3 className="text-sm font-medium">Paiements</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          {(
            [
              ["Acompte", depositStatus, setDepositStatus],
              ["Solde", balanceStatus, setBalanceStatus],
              [
                "Dépôt de garantie",
                securityDepositStatus,
                setSecurityDepositStatus,
              ],
            ] as const
          ).map(([label, value, setter]) => (
            <div key={label} className="space-y-2">
              <Label>{label}</Label>
              <Select
                value={value}
                onValueChange={(v) => v !== null && setter(v)}
                disabled={isPending}
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
            </div>
          ))}
        </div>

        {/* After check-out, the one thing left. */}
        {bookingStatus === "CHECK_OUT" ? (
          returned ? (
            <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
              <CircleCheck aria-hidden="true" className="size-3.5" />
              Caution rendue le {formatDate(rental.securityDepositReturnedAt!)}
            </p>
          ) : (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="size-4 cursor-pointer"
                checked={returnSecurityDeposit}
                onChange={(e) => setReturnSecurityDeposit(e.target.checked)}
                disabled={isPending}
              />
              Caution rendue au client
            </label>
          )
        ) : null}
      </section>

      <Separator />

      <section className="space-y-2">
        <Label htmlFor="notes">Notes internes</Label>
        <Input
          id="notes"
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
          disabled={isPending}
        />
      </section>

      <Button type="submit" disabled={isPending || missing.length > 0}>
        {isPending ? "Enregistrement…" : "Enregistrer"}
      </Button>
    </form>
  );
}
