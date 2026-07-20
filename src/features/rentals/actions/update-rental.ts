"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateRentalSchema } from "@/features/rentals/schemas/update-rental-schema";
import { canManageRental } from "@/features/rentals/services/rental-service";
import { isContractSigned } from "@/features/rentals/utils/rental-snapshot";

export type UpdateRentalResult =
  | { status: "success" }
  | { status: "error"; message: string };

/**
 * Whether this error is the no-overlapping-confirmed exclusion firing.
 *
 * Matched on the constraint name across the whole error, not on a Prisma
 * error code: verified against the live database, the exclusion surfaces
 * as a DriverAdapterError, not a PrismaClientKnownRequestError, so a
 * code check would miss it and the user would get the generic failure
 * message instead of the real reason.
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
  if (!user) {
    return { status: "error", message: "Session expirée." };
  }

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
      property: {
        select: { id: true, ownerId: true, agentId: true },
      },
    },
  });
  if (!rental) {
    return { status: "error", message: "Cette location n'existe plus." };
  }

  // Write access follows the property's current agent, not the rental's
  // snapshot — the RLS rule, restated because Prisma bypasses RLS.
  if (!canManageRental(user, rental)) {
    return { status: "error", message: "Vous ne gérez pas ce bien." };
  }

  const leavingEnquiry =
    data.bookingStatus !== "INQUIRY" && data.bookingStatus !== "CANCELLED";

  // The database enforces this too; caught here for a sentence rather
  // than a constraint error.
  if (leavingEnquiry && data.grossAmount === undefined) {
    return {
      status: "error",
      message: "Le montant du séjour est obligatoire au-delà de la demande.",
    };
  }

  const confirmingOwner = data.confirmOwner && rental.ownerConfirmedAt === null;
  const willBeConfirmed = rental.ownerConfirmedAt !== null || confirmingOwner;

  // The agency's rule: the owner is always confirmed before a contract.
  // The confirmation is what locks the dates against other agents, so a
  // contract without it would mean a signed lease nothing protects.
  if (isContractSigned(data.bookingStatus) && !willBeConfirmed) {
    return {
      status: "error",
      message:
        "Confirmez d'abord l'accord du propriétaire : c'est lui qui réserve les dates.",
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

  if (confirmingOwner) {
    update.ownerConfirmedAt = new Date();
    update.ownerConfirmedById = user.id;
  }

  // Snapshot owner and agent on the transition *into* a signed contract,
  // and only then. Never on the way back out, so cancelling a signed
  // rental keeps who it belonged to. Captured from the property's
  // current values, which at signing match the document.
  const enteringSigned =
    isContractSigned(data.bookingStatus) &&
    !isContractSigned(rental.bookingStatus);
  if (enteringSigned) {
    update.ownerId = rental.property.ownerId;
    update.agentId = rental.property.agentId;
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
