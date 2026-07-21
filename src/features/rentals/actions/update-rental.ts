"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateRentalSchema } from "@/features/rentals/schemas/update-rental-schema";
import {
  canBookProperty,
  canManageRental,
} from "@/features/rentals/services/rental-service";
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

  // Property, dates and guests may be changed only while the booking is an
  // enquiry — that is the stage the agent reshapes a request against, and
  // it is safe there because no owner is confirmed (no date lock) and no
  // snapshot is frozen yet. Silently ignored past then rather than errored,
  // since the funnel simply stops offering them.
  const isEnquiry = rental.bookingStatus === "INQUIRY";
  let targetPropertyId = rental.property.id;

  if (isEnquiry && data.propertyId && data.propertyId !== rental.property.id) {
    const property = await prisma.property.findFirst({
      where: { id: data.propertyId, archivedAt: null },
      select: { id: true, agentId: true },
    });
    if (!property) {
      return { status: "error", message: "Ce bien n'existe plus." };
    }
    // An agent may only move the booking onto a property they manage.
    if (!canBookProperty(user, property)) {
      return { status: "error", message: "Vous ne gérez pas ce bien." };
    }
    targetPropertyId = property.id;
  }

  if (isEnquiry && data.checkIn && data.checkOut) {
    if (new Date(data.checkOut) <= new Date(data.checkIn)) {
      return {
        status: "error",
        message: "Le départ doit être postérieur à l'arrivée.",
      };
    }
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
    guests: data.guests ?? null,
    grossAmount: data.grossAmount ?? null,
    depositAmount: data.depositAmount ?? null,
    securityDepositAmount: data.securityDepositAmount ?? null,
    depositStatus: data.depositStatus,
    balanceStatus: data.balanceStatus,
    securityDepositStatus: data.securityDepositStatus,
    notes: data.notes || null,
  };

  if (isEnquiry) {
    update.propertyId = targetPropertyId;
    if (data.checkIn) update.checkIn = new Date(data.checkIn);
    if (data.checkOut) update.checkOut = new Date(data.checkOut);
  }

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
    // The rental and its extra services move together: reconciled by
    // replacing the whole set, which a small hand-edited list makes simple
    // and keeps consistent even if a label was renamed.
    await prisma.$transaction([
      prisma.rental.update({ where: { id: rental.id }, data: update }),
      prisma.rentalService.deleteMany({ where: { rentalId: rental.id } }),
      prisma.rentalService.createMany({
        data: data.additionalServices.map((s) => ({
          rentalId: rental.id,
          label: s.label,
          amount: s.amount,
        })),
      }),
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
