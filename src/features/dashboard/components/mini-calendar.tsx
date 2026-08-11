import Link from "next/link";
import type {
  CalendarEntry,
  CalendarStay,
} from "@/features/calendar/services/calendar-service";

/**
 * The month at a glance, one square per day.
 *
 * Not the calendar in miniature: there is no room for a villa's name at this
 * size, and pretending otherwise gives six lines of ellipsis. It answers one
 * question — which days have something on them — and hands over to the real
 * calendar for the rest.
 *
 * A day carrying an arrival or a departure is marked apart from one merely
 * occupied: those are the days with work in them.
 */

const DAY_NAMES = ["L", "M", "M", "J", "V", "S", "D"];

function key(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}
function localKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function MiniCalendar({
  month,
  stays,
  events,
}: {
  month: Date;
  stays: CalendarStay[];
  events: CalendarEntry[];
}) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const lead = (first.getDay() + 6) % 7;
  const start = new Date(first);
  start.setDate(start.getDate() - lead);

  // Stored dates are read in UTC; the grid's own days are local. Comparing
  // them as strings keeps the two conventions from crossing.
  const moves = new Set<string>();
  const busy = new Set<string>();
  for (const s of stays) {
    moves.add(key(s.checkIn));
    moves.add(key(s.checkOut));
    for (
      let d = new Date(s.checkIn);
      d <= s.checkOut;
      d.setUTCDate(d.getUTCDate() + 1)
    ) {
      busy.add(key(d));
    }
  }
  for (const e of events) {
    for (
      let d = new Date(e.startsOn);
      d <= e.endsOn;
      d.setUTCDate(d.getUTCDate() + 1)
    ) {
      busy.add(key(d));
    }
  }

  const today = localKey(new Date());
  const cells = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d;
  });

  return (
    <div className="space-y-2">
      <div className="text-muted-foreground grid grid-cols-7 gap-1 text-center text-[10px]">
        {DAY_NAMES.map((d, i) => (
          <div key={i}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day) => {
          const k = localKey(day);
          const outside = day.getMonth() !== month.getMonth();
          return (
            <Link
              key={k}
              href={`/calendar/${k}`}
              className={[
                "relative flex aspect-square items-center justify-center rounded text-xs tabular-nums transition-colors",
                k === today
                  ? "bg-primary text-primary-foreground font-medium"
                  : busy.has(k)
                    ? "bg-primary/10 hover:bg-primary/20"
                    : "hover:bg-accent",
                outside ? "text-muted-foreground/40" : "",
              ].join(" ")}
            >
              {day.getDate()}
              {moves.has(k) && k !== today ? (
                <span
                  aria-hidden="true"
                  className="bg-primary absolute bottom-0.5 size-1 rounded-full"
                />
              ) : null}
            </Link>
          );
        })}
      </div>
      <p className="text-muted-foreground flex items-center gap-3 text-[10px]">
        <span className="flex items-center gap-1">
          <span className="bg-primary/10 size-2 rounded-sm" /> occupé
        </span>
        <span className="flex items-center gap-1">
          <span className="bg-primary size-1.5 rounded-full" /> arrivée ou
          départ
        </span>
      </p>
    </div>
  );
}
