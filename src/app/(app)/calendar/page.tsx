import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ArrowRight, LogIn, LogOut, CalendarDays } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AddEventDialog } from "@/features/calendar/components/add-event-dialog";
import { MonthGrid, MONTH_NAMES } from "@/features/calendar/components/month-grid";
import {
  listMonth,
  listUpcoming,
} from "@/features/calendar/services/calendar-service";
import { listBookableProperties } from "@/features/rentals/services/rental-service";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

export const metadata = { title: "Calendrier — BSTAY PRO" };

/** How far ahead the movements list looks. */
const UPCOMING_DAYS = 30;

const DATE = new Intl.DateTimeFormat("fr-FR", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: "Europe/Paris",
});

/** yyyy-mm for the month links, so a URL survives being shared. */
function monthParam(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default async function CalendarPage({
  searchParams,
}: {
  // Next 16: searchParams is a promise.
  searchParams: Promise<{ month?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { month: requested } = await searchParams;
  // The month comes from the URL so a view can be linked to and refreshed;
  // anything unparseable falls back to now rather than erroring.
  const match = /^(\d{4})-(\d{2})$/.exec(requested ?? "");
  const now = new Date();
  const month = match
    ? new Date(Number(match[1]), Number(match[2]) - 1, 1)
    : new Date(now.getFullYear(), now.getMonth(), 1);

  // Two months at a time: a booking is very often being placed against the
  // month after the one being looked at, and flipping back and forth to see
  // both ends of a stay is how double bookings happen.
  const second = new Date(month.getFullYear(), month.getMonth() + 1, 1);
  const from = new Date(month.getFullYear(), month.getMonth(), 1);
  const to = new Date(month.getFullYear(), month.getMonth() + 2, 0);
  // Stepping by one month, not two: the pair slides, so the month on the right
  // becomes the month on the left rather than disappearing unseen.
  const previous = new Date(month.getFullYear(), month.getMonth() - 1, 1);
  const next = second;
  // The arrows name the month that will *appear*, not the one they land on:
  // stepping forward from août–septembre reveals octobre, and labelling that
  // button "septembre" would point at a month already on screen.
  const revealed = new Date(month.getFullYear(), month.getMonth() + 2, 1);

  const canAdd = hasPermission(user, "MANAGE_RENTALS");
  const [{ stays, events }, upcoming, properties] = await Promise.all([
    listMonth(user, from, to),
    listUpcoming(user, new Date(now.getFullYear(), now.getMonth(), now.getDate()), UPCOMING_DAYS),
    canAdd ? listBookableProperties() : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold tracking-tight">Calendrier</h2>
          <p className="text-muted-foreground text-sm">
            Les séjours et ce que l&apos;agence a prévu, par bien.
          </p>
        </div>
        {canAdd ? (
          <AddEventDialog
            properties={properties.map((p) => ({
              value: p.id,
              label: p.marketingName ?? p.city ?? "Sans nom",
              ...(p.city ? { hint: p.city } : {}),
            }))}
          />
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          render={<Link href={`/calendar?month=${monthParam(previous)}`} />}
        >
          <ArrowLeft aria-hidden="true" />
          {MONTH_NAMES[previous.getMonth()]}
        </Button>
        <span className="text-sm font-medium">
          {MONTH_NAMES[month.getMonth()]}
          {month.getFullYear() === second.getFullYear()
            ? ""
            : ` ${month.getFullYear()}`}{" "}
          – {MONTH_NAMES[second.getMonth()]} {second.getFullYear()}
        </span>
        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          render={<Link href={`/calendar?month=${monthParam(next)}`} />}
        >
          {MONTH_NAMES[revealed.getMonth()]}
          <ArrowRight aria-hidden="true" />
        </Button>
        {monthParam(month) !== monthParam(now) ? (
          <Button
            variant="ghost"
            size="sm"
            nativeButton={false}
            render={<Link href="/calendar" />}
          >
            Aujourd&apos;hui
          </Button>
        ) : null}
        <span className="text-muted-foreground ml-auto text-xs">
          {stays.length} séjour{stays.length > 1 ? "s" : ""} · {events.length}{" "}
          événement{events.length > 1 ? "s" : ""}
        </span>
      </div>

      {/* Both grids get the whole window, not their own month: that is what
          keeps a stay the same colour and row as it crosses between them. */}
      <div className="grid gap-4 xl:grid-cols-2">
        <MonthGrid month={month} stays={stays} events={events} />
        <MonthGrid month={second} stays={stays} events={events} />
      </div>

      <section className="space-y-3">
        <h3 className="text-sm font-medium">
          À venir{" "}
          <span className="text-muted-foreground text-xs font-normal">
            — {UPCOMING_DAYS} prochains jours
          </span>
        </h3>

        {upcoming.length === 0 ? (
          <p className="text-muted-foreground rounded-lg border border-dashed px-4 py-6 text-sm">
            Aucune arrivée, aucun départ et aucun événement d&apos;ici là.
          </p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {upcoming.map((m) => {
              const row = (
                <span className="flex items-center gap-3 px-4 py-2.5 text-sm">
                  {m.type === "CHECK_IN" ? (
                    <LogIn aria-hidden="true" className="size-4 shrink-0 text-emerald-600" />
                  ) : m.type === "CHECK_OUT" ? (
                    <LogOut aria-hidden="true" className="text-muted-foreground size-4 shrink-0" />
                  ) : (
                    <CalendarDays aria-hidden="true" className="text-muted-foreground size-4 shrink-0" />
                  )}
                  <span className="text-muted-foreground w-28 shrink-0 text-xs tabular-nums">
                    {DATE.format(m.on)}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{m.label}</span>
                  {m.detail ? (
                    <span className="text-muted-foreground hidden shrink-0 text-xs sm:block">
                      {m.detail}
                    </span>
                  ) : null}
                  <Badge variant="secondary" className="shrink-0 font-normal">
                    {m.type === "CHECK_IN"
                      ? "Arrivée"
                      : m.type === "CHECK_OUT"
                        ? "Départ"
                        : "Événement"}
                  </Badge>
                </span>
              );
              return (
                <li key={m.key}>
                  {m.href ? (
                    <Link href={m.href} className="hover:bg-accent block transition-colors">
                      {row}
                    </Link>
                  ) : (
                    row
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
