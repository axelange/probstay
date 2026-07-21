"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateRentalSchema } from "@/features/rentals/schemas/update-rental-schema";
import { canManageRental } from "@/features/rentals/services/rental-service";
import { missingToReach } from "@/features/rentals/utils/rental-gates";

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
      ownerConfirmedAt: true,
      contractSignedAt: true,
      property: { select: { id: true, ownerId: true, agentId: true } },
    },
  });
  if (!rental) return { status: "error", message: "Cette location n'existe plus." };

  if (!canManageRental(user, rental)) {
    return { status: "error", message: "Vous ne gérez pas ce bien." };
  }

  // The gate checkboxes may be satisfied in this same save, so the gate
  // is evaluated against the would-be state, not only the stored one.
  const willConfirmOwner = data.confirmOwner || rental.ownerConfirmedAt !== null;
  const willSignContract = data.signContract || rental.contractSignedAt !== null;

  const missing = missingToReach(data.bookingStatus, {
    ownerConfirmed: willConfirmOwner,
    contractSigned: willSignContract,
    hasAmount: data.grossAmount !== undefined,
  });
  if (missing.length > 0) {
    return {
      status: "error",
      message: `Il manque ${missing.join(", ")} pour atteindre cette étape.`,
    };
  }

  const update: Prisma.RentalUncheckedUpdateInput = {
    bookingStatus: data.bookingStatus,
    grossAmount: data.grossAmount ?? null,
    depositAmount: data.depositAmount ?? null,
    securityDepositAmount: data.securityDepositAmount ?? null,
    depositStatus: data.depositStatus,
    balanceStatus: data.balanceStatus,
    securityDepositStatus: data.securityDepositStatus,
    notes: data.notes || null,
  };

  // Gate 1: the owner's agreement. Sets the exclusivity lock the
  // exclusion constraint keys on. One-way — never cleared here.
  if (data.confirmOwner && rental.ownerConfirmedAt === null) {
    update.ownerConfirmedAt = new Date();
    update.ownerConfirmedById = user.id;
  }

  // Gate 2: the signed contract. This is the moment the booking matches
  // a real document, so the owner/agent snapshot is frozen here — not on
  // entering the CONTRACT stage. Captured from the property's current
  // values and never touched again.
  if (data.signContract && rental.contractSignedAt === null) {
    update.contractSignedAt = new Date();
    update.contractSignedById = user.id;
    update.ownerId = rental.property.ownerId;
    update.agentId = rental.property.agentId;
  }

  // The one thing left after check-out. Ticking it settles the security
  // deposit as refunded in the same stroke.
  if (data.returnSecurityDeposit) {
    update.securityDepositReturnedAt = new Date();
    update.securityDepositStatus = "REFUNDED";
  }

  try {
    await prisma.rental.update({ where: { id: rental.id }, data: update });
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
