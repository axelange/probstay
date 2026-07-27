import type { RentalBookingStatus } from "@/generated/prisma/enums";

/**
 * The pipeline's hard gates — and only the hard ones.
 *
 * INQUIRY is pure information (villa, dates, party size, notes) and
 * FINANCIAL is where the money is settled, so:
 *   • reaching CONTRACT needs the amount (the money stage is validated
 *     before the contract opens);
 *   • reaching FINALISATION needs the contract signed by all parties —
 *     the single commitment kept as a wall. The owner's agreement
 *     (ownerConfirmedAt) still exists on the contract stage, but as the
 *     optional date-lock, no longer a gate.
 *
 * Past that, nothing is walled: a booking may move to CHECK_IN with
 * payments or identity still outstanding. Those are surfaced as advice,
 * never as a block. This is the "gates, not walls" rule — the deliberate
 * commitments block, the housekeeping does not.
 *
 * CANCELLED, and any move back down the pipeline, carry no prerequisite.
 */
const PIPELINE: RentalBookingStatus[] = [
  "INQUIRY",
  "FINANCIAL",
  "CONTRACT",
  "FINALISATION",
  "CHECK_IN",
  "CHECK_OUT",
];

export type GateInputs = {
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

  // CONTRACT and everything after it: the money stage is complete.
  if (step >= PIPELINE.indexOf("CONTRACT") && !inputs.hasAmount) {
    missing.push("le loyer (net propriétaire)");
  }
  // FINALISATION and everything after it: the signed contract.
  if (step >= PIPELINE.indexOf("FINALISATION") && !inputs.contractSigned) {
    missing.push("le contrat signé");
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
