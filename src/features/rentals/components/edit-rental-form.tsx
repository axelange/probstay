"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CircleCheck } from "lucide-react";
import { toast } from "sonner";
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

export type EditableRental = {
  id: string;
  bookingStatus: string;
  grossAmount: number | null;
  depositAmount: number | null;
  securityDepositAmount: number | null;
  depositStatus: string;
  balanceStatus: string;
  securityDepositStatus: string;
  ownerConfirmedAt: Date | null;
  ownerConfirmedByName: string | null;
  notes: string | null;
};

const CONTRACT_STAGES = ["CONTRACT", "KYC", "CHECK_IN", "CHECK_OUT"];

export function EditRentalForm({ rental }: { rental: EditableRental }) {
  const router = useRouter();

  const [bookingStatus, setBookingStatus] = React.useState(
    rental.bookingStatus
  );
  const [confirmOwner, setConfirmOwner] = React.useState(false);
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

  const alreadyConfirmed = rental.ownerConfirmedAt !== null;
  const willBeConfirmed = alreadyConfirmed || confirmOwner;
  const wantsContract = CONTRACT_STAGES.includes(bookingStatus);
  const leavingEnquiry =
    bookingStatus !== "INQUIRY" && bookingStatus !== "CANCELLED";

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
        depositStatus,
        balanceStatus,
        securityDepositStatus,
        confirmOwner,
      });
      if (result.status === "error") {
        toast.error(result.message);
        return;
      }
      toast.success("Location enregistrée.");
      setConfirmOwner(false);
      router.refresh();
    });
  }

  // The button explains the block before the server has to: contract
  // needs an amount and a confirmed owner.
  const blocked =
    (leavingEnquiry && form.grossAmount.trim() === "") ||
    (wantsContract && !willBeConfirmed);

  return (
    <form onSubmit={save} className="space-y-6">
      <section className="space-y-3">
        <h3 className="text-sm font-medium">Avancement</h3>
        <div className="space-y-2">
          <Label htmlFor="status">Statut</Label>
          <Select
            value={bookingStatus}
            onValueChange={(v) => v !== null && setBookingStatus(v)}
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
        </div>

        {/* Owner confirmation is the exclusivity lock and the agency's
            evidence, so it is a deliberate act with its own control —
            not a side-effect of moving a dropdown. Once recorded it is a
            fact with a date, not a toggle. */}
        {alreadyConfirmed ? (
          <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
            <CircleCheck aria-hidden="true" className="size-3.5" />
            Propriétaire confirmé le {formatDate(rental.ownerConfirmedAt!)}
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
              Enregistrer l&apos;accord du propriétaire
              <span className="text-muted-foreground block text-xs">
                Réserve ces dates : aucune autre location ne pourra être
                confirmée sur ce bien pour cette période.
              </span>
            </span>
          </label>
        )}
      </section>

      <Separator />

      <section className="space-y-3">
        <h3 className="text-sm font-medium">Montants</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="grossAmount">
              Séjour {leavingEnquiry ? "*" : ""}
            </Label>
            <Input
              id="grossAmount"
              type="number"
              min={0}
              step="0.01"
              value={form.grossAmount}
              onChange={(e) => set("grossAmount", e.target.value)}
              disabled={isPending}
              placeholder={leavingEnquiry ? "" : "Facultatif"}
            />
          </div>
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
        {form.grossAmount.trim() !== "" ? (
          <p className="text-muted-foreground text-xs">
            Solde calculé :{" "}
            {formatAmount(
              Number(form.grossAmount) - (Number(form.depositAmount) || 0)
            )}
            . Le dépôt de garantie est restitué, jamais un revenu.
          </p>
        ) : null}
      </section>

      <Separator />

      <section className="space-y-3">
        <h3 className="text-sm font-medium">Paiements</h3>
        {/* Three independent axes: deposit, balance and security deposit
            settle separately from each other and from the pipeline. */}
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

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isPending || blocked}>
          {isPending ? "Enregistrement…" : "Enregistrer"}
        </Button>
        {wantsContract && !willBeConfirmed ? (
          <span className="text-muted-foreground text-xs">
            Confirmez d&apos;abord le propriétaire.
          </span>
        ) : null}
      </div>
    </form>
  );
}
