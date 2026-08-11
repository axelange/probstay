/**
 * Whether a booking starts with an acompte, and how much of one.
 *
 * The balance falls due sixty days before arrival — that is the date both
 * documents print. A booking made inside that window has a balance already
 * due, so splitting the price into an instalment and a remainder describes
 * nothing: the whole amount is payable. Outside it, the agency's usual terms
 * are half up front.
 *
 * A default, not a rule the app enforces. An agent may ask for an acompte on a
 * late booking, or waive one on an early booking, and both are ordinary — this
 * only decides what a new rental starts with, and what the funnel suggests.
 */
export const BALANCE_NOTICE_DAYS = 60;

/** The agency's usual share when the booking is made in good time. */
export const STANDARD_DEPOSIT_PERCENT = 50;

/** Whole days from `from` to `checkIn`, negative once the stay has started. */
export function daysUntil(checkIn: Date, from: Date = new Date()): number {
  const startOfDay = (d: Date) =>
    Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.round((startOfDay(checkIn) - startOfDay(from)) / 86_400_000);
}

export function defaultDepositPercent(
  checkIn: Date,
  from: Date = new Date()
): number {
  return daysUntil(checkIn, from) < BALANCE_NOTICE_DAYS
    ? 0
    : STANDARD_DEPOSIT_PERCENT;
}
