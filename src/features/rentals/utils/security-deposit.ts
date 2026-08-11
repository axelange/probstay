/**
 * How much caution the agency is actually holding.
 *
 * Two sources, in order of precision. The receipts journal is the truth when
 * it has anything in it: it says what came in and when. But a status can be
 * set to "paid" without anyone itemising the transfer — which is how most
 * bookings are handled — and reading only the journal then reports that
 * nothing is held, and that nothing is owed back.
 *
 * So an unitemised caution falls back on the agreed figure. A partial one does
 * not: "partially paid" without a single receipt gives no amount to work from,
 * and guessing at one here would put a number on a refund nobody computed.
 */
export type DepositHeld = {
  amount: number;
  /** Where the figure came from, so the screen can say so. */
  source: "receipts" | "agreed" | "unknown";
};

export function securityDepositHeld({
  receipts,
  agreed,
  status,
}: {
  receipts: number[];
  agreed: number | null;
  status: string;
}): DepositHeld {
  if (receipts.length > 0) {
    return { amount: receipts.reduce((sum, r) => sum + r, 0), source: "receipts" };
  }
  if (status === "PAID" && agreed !== null && agreed > 0) {
    return { amount: agreed, source: "agreed" };
  }
  return { amount: 0, source: "unknown" };
}
