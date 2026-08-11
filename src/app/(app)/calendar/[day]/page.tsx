import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ArrowRight, CalendarDays, LogIn, LogOut, Moon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AddEventDialog } from "@/features/calendar/components/add-event-dialog";
import {
  listAttachableRentals,
  listDay,
} from "@/features/calendar/services/calendar-service";
import { MONTH_NAMES } from "@/features/calendar/components/month-grid";
import { listBookableProperties } from "@/features/rentals/services/rental-service";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

export const metadata = { title: "Journée — BSTAY PRO" };

/**
 * The hours the agency actually works.
 *
 * A villa is not handed over at four in the morning, and twenty-four rows of
 * empty clock push everything that matters below the fold. Anything falling
 * outside is still shown — under "hors plage" — rather than hidden.
 */
const FIRST_HOUR = 7;
const LAST_HOUR = 21;

const WEEKDAYS = [
  "dimanche", "lundi", "mardi", "mercredi",
  "jeudi", "vendredi", "samedi",
];

function dayParam(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** "16h00" → 16. Anything unparseable sorts outside the working hours. */
function hourOf(time: string | null): number | null {
  const m = /^(\d{1,2})/.exec(time ?? "");
  return m ? Number(m[1]) : null;
}

export default async function DayPage({
  params,
}: {
  // Next 16: params is a promise.
  params: Promise<{ day: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { day: raw } = await params;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (!match) notFound();
  const day = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));

  const previous = new Date(day);
  previous.setDate(previous.getDate() - 1);
  const next = new Date(day);
  next.setDate(next.getDate() + 1);

  const canAdd = hasPermission(user, "MANAGE_RENTALS");
  const [{ timed, allDay }, properties, attachable] = await Promise.all([
    listDay(user, day),
    canAdd ? listBookableProperties() : Promise.resolve([]),
    canAdd ? listAttachableRentals(user) : Promise.resolve([]),
  ]);

  const hours = Array.from(
    { length: LAST_HOUR - FIRST_HOUR + 1 },
    (_, i) => FIRST_HOUR + i
  );
  const outside = timed.filter((i) => {
    const h = hourOf(i.time);
    return h === null || h < FIRST_HOUR || h > LAST_HOUR;
  });

  return (
    <div className="space-y-6">
      <div>
        <Button
          variant="ghost"
          size="sm"
          nativeButton={false}
          render={
            <Link
              href={`/calendar?month=${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}`}
            />
          }
        >
          <ArrowLeft aria-hidden="true" />
          Retour au calendrier
        </Button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold tracking-tight">
          {WEEKDAYS[day.getDay()]} {day.getDate()}{" "}
          {MONTH_NAMES[day.getMonth()]} {day.getFullYear()}
        </h2>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href={`/calendar/${dayParam(previous)}`} />}
          >
            <ArrowLeft aria-hidden="true" />
            Veille
          </Button>
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href={`/calendar/${dayParam(next)}`} />}
          >
            Lendemain
            <ArrowRight aria-hidden="true" />
          </Button>
          {canAdd ? (
            <AddEventDialog
              defaultDate={dayParam(day)}
              rentals={attachable}
              properties={properties.map((p) => ({
                value: p.id,
                label: p.marketingName ?? p.city ?? "Sans nom",
                ...(p.city ? { hint: p.city } : {}),
              }))}
            />
          ) : null}
        </div>
      </div>

      {/* Occupied villas and undated entries: context for the day rather than
          a moment in it. */}
      {allDay.length > 0 ? (
        <section className="space-y-2">
          <h3 className="text-muted-foreground text-xs font-medium">
            Sur la journée
          </h3>
          <ul className="divide-y rounded-lg border">
            {allDay.map((item) => {
              const row = (
                <span className="flex items-center gap-3 px-4 py-2 text-sm">
                  {item.type === "STAY" ? (
                    <Moon aria-hidden="true" className="text-muted-foreground size-4 shrink-0" />
                  ) : (
                    <CalendarDays aria-hidden="true" className="text-muted-foreground size-4 shrink-0" />
                  )}
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  {item.detail ? (
                    <span className="text-muted-foreground shrink-0 text-xs">
                      {item.detail}
                    </span>
                  ) : null}
                  <Badge variant="secondary" className="shrink-0 font-normal">
                    {item.type === "STAY" ? "Séjour en cours" : "Événement"}
                  </Badge>
                </span>
              );
              return (
                <li key={item.key}>
                  {item.href ? (
                    <Link href={item.href} className="hover:bg-accent block transition-colors">
                      {row}
                    </Link>
                  ) : (
                    row
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <section className="overflow-hidden rounded-lg border">
        {hours.map((hour) => {
          const items = timed.filter((i) => hourOf(i.time) === hour);
          return (
            <div key={hour} className="flex items-start gap-3 border-b px-4 py-2 last:border-b-0">
              <span className="text-muted-foreground w-12 shrink-0 pt-0.5 text-xs tabular-nums">
                {String(hour).padStart(2, "0")}h
              </span>
              <div className="min-w-0 flex-1 space-y-1">
                {items.length === 0 ? (
                  <span className="text-muted-foreground/40 text-xs">—</span>
                ) : (
                  items.map((item) => (
                    <DayRow key={item.key} item={item} />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </section>

      {outside.length > 0 ? (
        <section className="space-y-2">
          <h3 className="text-muted-foreground text-xs font-medium">
            Hors plage {String(FIRST_HOUR).padStart(2, "0")}h–
            {String(LAST_HOUR).padStart(2, "0")}h
          </h3>
          <div className="space-y-1 rounded-lg border p-3">
            {outside.map((item) => (
              <DayRow key={item.key} item={item} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function DayRow({
  item,
}: {
  item: Awaited<ReturnType<typeof listDay>>["timed"][number];
}) {
  const body = (
    <span className="flex items-center gap-2 text-sm">
      {item.type === "CHECK_IN" ? (
        <LogIn aria-hidden="true" className="size-4 shrink-0 text-emerald-600" />
      ) : item.type === "CHECK_OUT" ? (
        <LogOut aria-hidden="true" className="text-muted-foreground size-4 shrink-0" />
      ) : (
        <CalendarDays aria-hidden="true" className="text-muted-foreground size-4 shrink-0" />
      )}
      <span className="text-muted-foreground w-24 shrink-0 text-xs tabular-nums">
        {item.time}
        {item.endTime ? ` – ${item.endTime}` : ""}
      </span>
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      {item.detail ? (
        <span className="text-muted-foreground hidden shrink-0 text-xs sm:block">
          {item.detail}
        </span>
      ) : null}
      <Badge variant="secondary" className="shrink-0 font-normal">
        {item.type === "CHECK_IN"
          ? "Arrivée"
          : item.type === "CHECK_OUT"
            ? "Départ"
            : "Événement"}
      </Badge>
    </span>
  );

  return item.href ? (
    <Link href={item.href} className="hover:bg-accent -mx-1 block rounded px-1 transition-colors">
      {body}
    </Link>
  ) : (
    body
  );
}
