import type { RentalBookingStatus } from "@/generated/prisma/enums";

/**
 * The pipeline's hard gates — and only the hard ones.
 *
 * INQUIRY is pure information (villa, dates, party size, notes), so moving
 * off it carries no prerequisite. The commitments all live on the CONTRACT
 * stage and gate the move *out* of it:
 *   • reaching FINALISATION needs an agreed amount, the agreement
 *     (ownerConfirmedAt) that locks the dates against other agents, and the
 *     contract signed (contractSignedAt) — everything the contract step
 *     captures.
 *
 * Past that, nothing is walled: a booking may move to CHECK_IN with
 * payments or identity still outstanding. Those are surfaced as advice
 * (see financeReadiness), never as a block. This is the "gates, not
 * walls" rule — the deliberate commitments block, the housekeeping does
 * not.
 *
 * CANCELLED, and any move back down the pipeline, carry no prerequisite.
 */
const PIPELINE: RentalBookingStatus[] = [
  "INQUIRY",
  "CONTRACT",
  "FINALISATION",
  "CHECK_IN",
  "CHECK_OUT",
];

export type GateInputs = {
  ownerConfirmed: boolean;
  contractSigned: boolean;
  hasAmount: boolean;
};

/**
 * What is still missing before a rental may reach `target`, as a list of
 * human phrases. Empty means the move is allowed. The checkbox that
 * satisfies a gate may be ticked in the same save, so callers pass the
 * would-be state, not only the stored one.
 */
export function missingToReach(
  target: RentalBookingStatus,
  inputs: GateInputs
): string[] {
  if (target === "CANCELLED") return [];

  const step = PIPELINE.indexOf(target);
  const missing: string[] = [];

  // FINALISATION and everything after it — the whole contract step must be
  // complete: an amount, the owner's agreement, and the signed contract.
  if (step >= PIPELINE.indexOf("FINALISATION")) {
    if (!inputs.hasAmount) missing.push("le montant du séjour");
    if (!inputs.ownerConfirmed) missing.push("l'accord du propriétaire");
    if (!inputs.contractSigned) missing.push("le contrat signé");
  }

  return missing;
}

/** Whether reaching `target` is a step up the pipeline (gates apply) or not. */
export function isForward(
  from: RentalBookingStatus,
  to: RentalBookingStatus
): boolean {
  return PIPELINE.indexOf(to) > PIPELINE.indexOf(from);
}
