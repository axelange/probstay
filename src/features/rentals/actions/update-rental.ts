"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateRentalSchema } from "@/features/rentals/schemas/update-rental-schema";
import {
  canBookProperty,
  isLettableProperty,
  canManageRental,
} from "@/features/rentals/services/rental-service";
import { missingToReach } from "@/features/rentals/utils/rental-gates";
import { securityDepositHeld } from "@/features/rentals/utils/security-deposit";
import { nights } from "@/features/rentals/components/rental-labels";

export type UpdateRentalResult =
  | { status: "success" }
  | { status: "error"; message: string };

/**
 * Whether this error is the no-overlapping-confirmed exclusion firing.
 * Matched on the constraint name across the whole error: verified live,
 * it surfaces as a DriverAdapterError, not a Prisma error code.
 */
function isOverlapViolation(error: unknown): boolean {
  const text =
    error instanceof Error
      ? `${error.message} ${JSON.stringify((error as { meta?: unknown }).meta ?? {})}`
      : String(error);
  return text.includes("rentals_no_overlapping_confirmed");
}

export async function updateRental(
  input: unknown
): Promise<UpdateRentalResult> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "Session expirée." };

  const parsed = updateRentalSchema.safeParse(input);
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Données invalides.",
    };
  }
  const data = parsed.data;

  const rental = await prisma.rental.findFirst({
    where: { id: data.id, archivedAt: null },
    select: {
      id: true,
      bookingStatus: true,
      ownerId: true,
      agentId: true,
      checkIn: true,
      checkOut: true,
      ownerConfirmedAt: true,
      contractSignedAt: true,
      securityDepositReturnedAt: true,
      securityDepositReturnedAmount: true,
      securityDepositAmount: true,
      securityDepositStatus: true,
      tenantAgentId: true,
      property: {
        select: { id: true, ownerId: true, agentId: true, city: true },
      },
    },
  });
  if (!rental) return { status: "error", message: "Cette location n'existe plus." };

  if (!canManageRental(user, rental)) {
    return { status: "error", message: "Vous ne gérez pas ce bien." };
  }

  // A finished rental whose deposit has been returned is closed for good:
  // it can no longer be cancelled. Everything is settled and the money is
  // back with the client.
  if (
    data.bookingStatus === "CANCELLED" &&
    rental.securityDepositReturnedAt !== null
  ) {
    return {
      status: "error",
      message:
        "Cette location est terminée et sa caution rendue : elle ne peut plus être annulée.",
    };
  }

  // The signature is what closes the booking to changes, not the stage.
  //
  // Until the contract is signed nothing is committed: no document quotes the
  // figures, the owner/agent snapshot is not frozen and the date-lock is not
  // taken, so an agent may walk back to Informations or Financier and correct
  // whatever was wrong. After it, the villa, the dates, the party, the hours
  // and every amount are what the parties put their names to, and this refuses
  // to move them.
  //
  // Read from the stored state, not the would-be one: a save that sets the
  // final figures and ticks the signature in the same stroke is still editing
  // an unsigned booking, and must be allowed to.
  //
  // Payment statuses, the deposit's return and the notes stay open — those are
  // the work that happens after signature, not the terms of it.
  const unsigned = rental.contractSignedAt === null;
  let targetPropertyId = rental.property.id;

  if (unsigned && data.propertyId && data.propertyId !== rental.property.id) {
    const property = await prisma.property.findFirst({
      where: { id: data.propertyId, archivedAt: null },
      select: { id: true, agentId: true, category: true },
    });
    if (!property) {
      return { status: "error", message: "Ce bien n'existe plus." };
    }
    // An agent may only move the booking onto a property they manage.
    if (!canBookProperty(user, property)) {
      return { status: "error", message: "Vous ne gérez pas ce bien." };
    }
    if (!isLettableProperty(property)) {
      return {
        status: "error",
        message: "Ce bien est en vente et ne peut pas être loué.",
      };
    }
    targetPropertyId = property.id;
  }

  if (unsigned && data.checkIn && data.checkOut) {
    if (new Date(data.checkOut) <= new Date(data.checkIn)) {
      return {
        status: "error",
        message: "Le départ doit être postérieur à l'arrivée.",
      };
    }
  }

  // The gate checkbox may be satisfied in this same save, so the gate is
  // evaluated against the would-be state, not only the stored one. The
  // owner's agreement is no longer a gate — it remains the optional
  // date-lock, set on the contract stage.
  const willSignContract = data.signContract || rental.contractSignedAt !== null;

  // The stay amount ("Loyer") is derived, not entered: the owner's net take
  // plus the agency commission. A service is either billed (an amount added
  // to the client total on top) or included (a label only, no amount).
  // Null until a net is set — that is the "no amount yet" state the gate and
  // the grossAmount CHECK both read.
  const grossAmount =
    data.netOwnerAmount === undefined
      ? null
      : data.netOwnerAmount + (data.commissionAmount ?? 0);

  const missing = missingToReach(data.bookingStatus, {
    contractSigned: willSignContract,
    hasAmount: data.netOwnerAmount !== undefined,
  });
  if (missing.length > 0) {
    return {
      status: "error",
      message: `Il manque ${missing.join(", ")} pour atteindre cette étape.`,
    };
  }

  // Always writable: where the booking is in the pipeline, how the money has
  // actually been paid, and the internal notes.
  const update: Prisma.RentalUncheckedUpdateInput = {
    bookingStatus: data.bookingStatus,
    depositStatus: data.depositStatus,
    balanceStatus: data.balanceStatus,
    securityDepositStatus: data.securityDepositStatus,
    // Notes are saved on their own, beside the fixed information: they belong
    // to the whole booking rather than to the step being edited.
  };

  // The terms. Silently ignored once signed rather than errored: the funnel
  // stops offering them, so anything still arriving is a stale form, not an
  // attempt worth reporting.
  if (unsigned) {
    update.propertyId = targetPropertyId;
    if (data.checkIn) update.checkIn = new Date(data.checkIn);
    if (data.checkOut) update.checkOut = new Date(data.checkOut);

    update.guests = data.guests ?? null;
    update.children = data.children ?? null;
    update.checkInTime = data.checkInTime ?? null;
    update.checkOutTime = data.checkOutTime ?? null;
    update.netOwnerAmount = data.netOwnerAmount ?? null;
    update.commissionAmount = data.commissionAmount ?? null;
    update.commissionBasis = data.commissionBasis;
    update.commissionRate = data.commissionRate ?? null;
    update.grossAmount = grossAmount;
    update.depositAmount = data.depositAmount ?? null;
    update.depositBasis = data.depositBasis;
    update.depositPercent = data.depositPercent;
    update.securityDepositAmount = data.securityDepositAmount ?? null;
  }

  // The owner's agreement, which sets the exclusivity lock the exclusion
  // constraint keys on. One-way — never cleared here.
  //
  // No longer declared on its own in the funnel: the signed contract is the
  // only gate there now, and it says more than this one ever did, so a booking
  // that reaches signature carries the agreement with it (below). The flag
  // stays honoured for any caller that does send it.
  if (data.confirmOwner && rental.ownerConfirmedAt === null) {
    update.ownerConfirmedAt = new Date();
    update.ownerConfirmedById = user.id;
  }

  // The gate: the signed contract. This is the moment the booking matches
  // a real document, so the owner/agent snapshot is frozen here — not on
  // entering the CONTRACT stage. Captured from the property's current
  // values and never touched again.
  if (data.signContract && rental.contractSignedAt === null) {
    update.contractSignedAt = new Date();
    update.contractSignedById = user.id;
    update.ownerId = rental.property.ownerId;
    update.agentId = rental.property.agentId;

    // A signed contract implies the owner agreed, so the date-lock is taken
    // here if it was not already. Without this the exclusion constraint would
    // never engage now that nothing else sets it, and two agents could confirm
    // the same villa for the same week.
    if (rental.ownerConfirmedAt === null) {
      update.ownerConfirmedAt = new Date();
      update.ownerConfirmedById = user.id;
    }

    // The tourist tax joins the frozen record: amount and the rate it was
    // computed with, from the city's rate at this moment. Dates are locked
    // past the enquiry, guests come from this same save. A commune
    // revising its rate later must never rewrite a signed contract.
    const taxRow = rental.property.city
      ? await prisma.$queryRaw<{ amount: number }[]>`
          SELECT amount::float8 AS amount FROM tourist_taxes
          WHERE lower(city) = lower(${rental.property.city}) LIMIT 1`
      : [];
    const rate = taxRow[0]?.amount ?? null;
    // Minors are exempt, so the tax is frozen on the adults only — the same
    // basis the funnel showed and both documents print.
    const taxableGuests = Math.max(
      0,
      (data.guests ?? 0) - (data.children ?? 0)
    );
    const stayNights = nights(rental.checkIn, rental.checkOut);
    if (rate !== null && taxableGuests > 0) {
      update.touristTaxRate = rate;
      update.touristTaxAmount = rate * taxableGuests * stayNights;
    }
  }

  // The one thing left after check-out. Ticking it settles the security
  // deposit as refunded in the same stroke, and freezes what was handed back.
  if (data.returnSecurityDeposit && rental.securityDepositReturnedAt === null) {
    // What the client is owed: the caution actually received, less whatever
    // was charged to them during the stay.
    //
    // Computed here rather than trusted from the form, and over the entries
    // already recorded *plus* those arriving in this same save — an agent
    // routinely notes the breakage and returns the balance in one go.
    const [receipts, charged] = await Promise.all([
      prisma.rentalPayment.findMany({
        where: { rentalId: rental.id, kind: "SECURITY_DEPOSIT" },
        select: { amount: true },
      }),
      // Only what is actually withheld: a tenant's expense invoiced separately
      // is settled on its own and must not be taken twice.
      prisma.rentalExpense.aggregate({
        where: { rentalId: rental.id, bearer: "CLIENT", settlement: "DEPOSIT" },
        _sum: { amount: true },
      }),
    ]);

    const held = securityDepositHeld({
      receipts: [
        ...receipts.map((r) => r.amount.toNumber()),
        ...data.payments
          .filter((p) => p.kind === "SECURITY_DEPOSIT")
          .map((p) => p.amount),
      ],
      agreed:
        data.securityDepositAmount ??
        rental.securityDepositAmount?.toNumber() ??
        null,
      status: data.securityDepositStatus,
    });

    const chargedNow = data.expenses
      .filter((e) => e.bearer === "CLIENT" && e.settlement === "DEPOSIT")
      .reduce((sum, e) => sum + e.amount, 0);

    const returned =
      held.amount - ((charged._sum.amount?.toNumber() ?? 0) + chargedNow);

    update.securityDepositReturnedAt = new Date();
    update.securityDepositStatus = "REFUNDED";
    // Never negative: a client owing more than their caution covers is a debt
    // to chase, not a refund of less than nothing.
    update.securityDepositReturnedAmount = Math.max(0, returned);
  }

  try {
    // The rental and its extra services move together: reconciled by
    // replacing the whole set, which a small hand-edited list makes simple
    // and keeps consistent even if a label was renamed.
    await prisma.$transaction([
      prisma.rental.update({ where: { id: rental.id }, data: update }),
      // Receipts are appended, never reconciled: a saved entry is definitive,
      // and a mistake is put right by a further entry that offsets it. So this
      // only ever adds what the form has newly typed — nothing here can touch
      // or remove what is already recorded.
      //
      // They are not terms either: they are the work that happens after
      // signature, so they are written whatever the contract's state.
      prisma.rentalPayment.createMany({
        data: data.payments.map((p) => ({
          rentalId: rental.id,
          kind: p.kind,
          amount: p.amount,
          paidAt: p.paidAt ? new Date(p.paidAt) : null,
          note: p.note || null,
          recordedById: user.id,
        })),
      }),
      prisma.rentalExpense.createMany({
        data: data.expenses.map((e) => ({
          rentalId: rental.id,
          label: e.label,
          amount: e.amount,
          bearer: e.bearer,
          settlement: e.settlement,
          spentAt: e.spentAt ? new Date(e.spentAt) : null,
          storagePath: e.storagePath || null,
          fileName: e.fileName || null,
          recordedById: user.id,
        })),
      }),
      // The services are terms as well — they are priced on the contract — so
      // they are reconciled only while it is unsigned. Replacing the whole set
      // is what keeps it consistent when a label is renamed.
      ...(unsigned
        ? [
            prisma.rentalService.deleteMany({ where: { rentalId: rental.id } }),
            prisma.rentalService.createMany({
              data: data.additionalServices.map((s) => ({
                rentalId: rental.id,
                label: s.label,
                // Included = a label with no amount of its own.
                amount: s.includedInStay ? 0 : s.amount,
                includedInStay: s.includedInStay,
              })),
            }),
          ]
        : []),
    ]);
    revalidatePath("/rentals");
    revalidatePath(`/rentals/${rental.id}`);
    return { status: "success" };
  } catch (error) {
    if (isOverlapViolation(error)) {
      return {
        status: "error",
        message:
          "Une autre location confirmée occupe déjà ce bien sur ces dates.",
      };
    }
    console.error("updateRental failed", error);
    return { status: "error", message: "Enregistrement impossible." };
  }
}
