import Link from "next/link";
import type {
  CalendarEntry,
  CalendarStay,
} from "@/features/calendar/services/calendar-service";

/**
 * The month, with each stay drawn as one continuous bar.
 *
 * A booking is one thing, so it is one shape: a bar spanning from the arrival
 * to the departure, cut only where a week ends. Repeating a pill in every cell
 * made a ten-night stay look like ten separate events, and left the eye to
 * work out that they were the same booking.
 *
 * Weeks start on Monday, as they do everywhere in France, and days from the
 * neighbouring months are drawn faintly rather than left blank — a stay across
 * the turn of the month is the normal case here.
 *
 * Two of these sit side by side, and both are given the same stays over the
 * whole two-month window rather than their own month's. That is what keeps a
 * booking the same colour on the same row as it crosses from one to the other;
 * filtering per month first would let each grid number and colour them
 * independently.
 *
 * Rendered on the server: it holds no state, and the window is already loaded.
 */

const DAY_NAMES = ["lun", "mar", "mer", "jeu", "ven", "sam", "dim"];

export const MONTH_NAMES = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];

/**
 * Colours are assigned in date order and cycle, so no stay ever shares a
 * colour with the one before or after it. Written out in full rather than
 * composed, because Tailwind only keeps the class names it can see.
 */
const STAY_COLOURS = [
  "bg-sky-100 text-sky-900 hover:bg-sky-200 dark:bg-sky-900/40 dark:text-sky-100 dark:hover:bg-sky-900/60",
  "bg-amber-100 text-amber-900 hover:bg-amber-200 dark:bg-amber-900/40 dark:text-amber-100 dark:hover:bg-amber-900/60",
  "bg-emerald-100 text-emerald-900 hover:bg-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-100 dark:hover:bg-emerald-900/60",
  "bg-violet-100 text-violet-900 hover:bg-violet-200 dark:bg-violet-900/40 dark:text-violet-100 dark:hover:bg-violet-900/60",
  "bg-rose-100 text-rose-900 hover:bg-rose-200 dark:bg-rose-900/40 dark:text-rose-100 dark:hover:bg-rose-900/60",
];

const DAY = 86_400_000;

/**
 * Cell geometry, in rem.
 *
 * A day is roomy by default rather than only as tall as its contents: in high
 * season several villas are let over the same nights, and a grid that grows
 * one bar at a time makes every week a different height as the eye moves down
 * it. The floor holds four bars, which covers an ordinary week.
 */
const HEADER = 2;
const BAND = 1.5;
const MIN_CELL = HEADER + BAND * 4;

/** Local midnight, so a comparison is not shifted by a time zone. */
function atMidnight(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function key(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function daysBetween(a: Date, b: Date): number {
  return Math.round((atMidnight(b).getTime() - atMidnight(a).getTime()) / DAY);
}

type Band = {
  id: string;
  label: string;
  title: string;
  href: string | null;
  from: Date;
  to: Date;
  colour: string;
  /** Whether the real start and end fall inside the month being drawn. */
  opensLeft: boolean;
  closesRight: boolean;
};

/**
 * Stacks bands so overlapping ones never sit on the same row.
 *
 * A greedy pass in date order: each band takes the first row whose last
 * occupant has already ended. Rows are computed across the whole month rather
 * than per week, so a stay keeps its row from one week to the next instead of
 * jumping as the eye follows it.
 */
function assignRows(bands: Band[]): Map<string, number> {
  const rows: Date[] = [];
  const placed = new Map<string, number>();

  for (const band of bands) {
    let row = rows.findIndex((busyUntil) => busyUntil < band.from);
    if (row === -1) {
      rows.push(band.to);
      row = rows.length - 1;
    } else {
      rows[row] = band.to;
    }
    placed.set(band.id, row);
  }
  return placed;
}

export function MonthGrid({
  month,
  stays,
  events,
}: {
  month: Date;
  stays: CalendarStay[];
  events: CalendarEntry[];
}) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  // getDay() gives 0 for Sunday, which would start the week on the wrong day.
  const lead = (first.getDay() + 6) % 7;
  const gridStart = new Date(first);
  gridStart.setDate(gridStart.getDate() - lead);
  const gridEnd = new Date(gridStart);
  gridEnd.setDate(gridEnd.getDate() + 41);

  const ordered = [...stays].sort(
    (a, b) => a.checkIn.getTime() - b.checkIn.getTime()
  );

  const bands: Band[] = [
    ...ordered.map((s, i) => ({
      id: `stay-${s.id}`,
      label: s.property,
      title: [s.property, s.tenant, `réf. ${s.reference}`]
        .filter(Boolean)
        .join(" — "),
      href: `/rentals/${s.id}`,
      from: atMidnight(s.checkIn),
      to: atMidnight(s.checkOut),
      // Consecutive stays never share a colour: the index is the position in
      // date order, and the palette is longer than two.
      colour: STAY_COLOURS[i % STAY_COLOURS.length] as string,
      opensLeft: true,
      closesRight: true,
    })),
    ...events.map((e) => ({
      id: `event-${e.id}`,
      label: e.title,
      title: [e.title, e.property, e.notes].filter(Boolean).join(" — "),
      href: null,
      from: atMidnight(e.startsOn),
      to: atMidnight(e.endsOn),
      // Deliberately neutral: an agency entry is context around the bookings,
      // not another booking.
      colour:
        "bg-muted text-muted-foreground border border-dashed hover:bg-muted/80",
      opensLeft: true,
      closesRight: true,
    })),
  ];

  const rows = assignRows(bands);
  const today = key(new Date());

  const weeks = Array.from({ length: 6 }, (_, w) => {
    const start = new Date(gridStart);
    start.setDate(start.getDate() + w * 7);
    return start;
  });

  return (
    <div className="overflow-hidden rounded-lg border">
      <div className="border-b px-3 py-2 text-sm font-medium">
        {MONTH_NAMES[month.getMonth()]} {month.getFullYear()}
      </div>
      <div className="text-muted-foreground grid grid-cols-7 border-b text-center text-xs">
        {DAY_NAMES.map((d) => (
          <div key={d} className="py-2">
            {d}
          </div>
        ))}
      </div>

      {weeks.map((weekStart) => {
        const days = Array.from({ length: 7 }, (_, i) => {
          const d = new Date(weekStart);
          d.setDate(d.getDate() + i);
          return d;
        });
        const weekEnd = days[6] as Date;

        // Only the part of each band that falls inside this week, so a long
        // stay is one bar per week rather than one bar overall.
        const segments = bands
          .filter((b) => b.from <= weekEnd && b.to >= weekStart)
          .map((b) => {
            const from = b.from < weekStart ? weekStart : b.from;
            const to = b.to > weekEnd ? weekEnd : b.to;
            return {
              band: b,
              row: rows.get(b.id) ?? 0,
              column: daysBetween(weekStart, from) + 1,
              span: daysBetween(from, to) + 1,
              startsHere: key(from) === key(b.from),
              endsHere: key(to) === key(b.to),
            };
          });

        // Each week is as tall as it needs to be, never as tall as the busiest
        // week of the month: a single crowded fortnight in August should not
        // stretch every other row of the year to match.
        const usedRows = segments.reduce((max, s) => Math.max(max, s.row + 1), 0);
        const height = Math.max(MIN_CELL, HEADER + BAND * usedRows);

        return (
          <div key={key(weekStart)} className="relative border-b last:border-b-0">
            {/* The day numbers and the vertical rules, under the bars. */}
            <div className="grid grid-cols-7">
              {days.map((day) => (
                <div
                  key={key(day)}
                  className={[
                    "border-r p-1.5 last:border-r-0",
                    day.getMonth() === month.getMonth() ? "" : "bg-muted/30",
                  ].join(" ")}
                  style={{ minHeight: `${height}rem` }}
                >
                  <span
                    className={[
                      "text-xs tabular-nums",
                      key(day) === today
                        ? "bg-primary text-primary-foreground inline-flex size-5 items-center justify-center rounded-full font-medium"
                        : day.getMonth() === month.getMonth()
                          ? "text-muted-foreground"
                          : "text-muted-foreground/60",
                    ].join(" ")}
                  >
                    {day.getDate()}
                  </span>
                </div>
              ))}
            </div>

            {/* The bars, laid over the week on the same seven columns. */}
            <div
              className="pointer-events-none absolute inset-x-0 grid grid-cols-7 px-1"
              style={{ top: `${HEADER}rem`, gridAutoRows: `${BAND}rem` }}
            >
              {segments.map((s) => (
                <div
                  key={`${s.band.id}-${key(weekStart)}`}
                  style={{
                    gridColumnStart: s.column,
                    gridColumnEnd: `span ${s.span}`,
                    gridRowStart: s.row + 1,
                  }}
                  // Not a flex container: a block child fills the width it
                  // is given, which is what makes the bar span its days. Under
                  // `flex` it shrank to the width of its own text.
                  className="pointer-events-auto min-w-0 px-0.5 py-[3px]"
                >
                  {s.band.href ? (
                    <Link
                      href={s.band.href}
                      title={s.band.title}
                      className={[
                        "block truncate px-1.5 py-0.5 text-[11px] leading-tight transition-colors",
                        s.band.colour,
                        // Rounded only where the stay actually begins or ends,
                        // so a bar cut by the end of a week reads as continuing.
                        s.startsHere ? "rounded-l" : "",
                        s.endsHere ? "rounded-r" : "",
                      ].join(" ")}
                    >
                      {s.startsHere ? "" : "… "}
                      {s.band.label}
                    </Link>
                  ) : (
                    <div
                      title={s.band.title}
                      className={[
                        "truncate px-1.5 py-0.5 text-[11px] leading-tight",
                        s.band.colour,
                        s.startsHere ? "rounded-l" : "",
                        s.endsHere ? "rounded-r" : "",
                      ].join(" ")}
                    >
                      {s.startsHere ? "" : "… "}
                      {s.band.label}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
