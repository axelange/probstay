import Link from "next/link";
import {
  ArrowRight,
  Building2,
  Clock,
  FileSignature,
  TriangleAlert,
  Undo2,
  Wallet,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { listMonth } from "@/features/calendar/services/calendar-service";
import { MiniCalendar } from "@/features/dashboard/components/mini-calendar";
import {
  agencyFigures,
  listTasks,
} from "@/features/dashboard/services/dashboard-service";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

const MONEY = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const TASK_ICON = {
  RETURN_DEPOSIT: Undo2,
  SIGN_CONTRACT: FileSignature,
  AWAITING_CLIENT: Clock,
  OVERDUE_PAYMENT: Wallet,
} as const;

const TASK_LABEL = {
  RETURN_DEPOSIT: "Caution",
  SIGN_CONTRACT: "Contrat",
  AWAITING_CLIENT: "En attente",
  OVERDUE_PAYMENT: "Paiement",
} as const;

export default async function DashboardPage() {
  // The layout has already established there is a user; this only reads them.
  const user = await getCurrentUser();
  if (!user) return null;

  const now = new Date();
  const canSeeFigures = hasPermission(user, "VIEW_FINANCIALS");

  const [tasks, month, figures] = await Promise.all([
    listTasks(user),
    listMonth(
      user,
      new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1)),
      new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999))
    ),
    canSeeFigures ? agencyFigures(now.getFullYear()) : Promise.resolve(null),
  ]);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold tracking-tight">
          Bonjour {user.fullName.split(" ")[0]}
        </h2>
        <p className="text-muted-foreground text-sm">
          {tasks.length === 0
            ? "Rien ne vous attend pour le moment."
            : `${tasks.length} point${tasks.length > 1 ? "s" : ""} à traiter.`}
        </p>
      </div>

      {/* Figures are the agency's, so they are gated on VIEW_FINANCIALS rather
          than on a role: a moderator who runs the bookings without seeing the
          money falls into place on his own. */}
      {figures ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Figure
            label={`Commission ${figures.year} — acquise`}
            value={MONEY.format(figures.earned)}
            hint={`${figures.counts.closed} location${figures.counts.closed > 1 ? "s" : ""} soldée${figures.counts.closed > 1 ? "s" : ""}, caution rendue`}
          />
          <Figure
            label="Commission — à venir"
            value={MONEY.format(figures.pending)}
            hint={`${figures.counts.open} location${figures.counts.open > 1 ? "s" : ""} en cours, non acquise`}
          />
          <Figure
            label="Régularisations et dépenses"
            value={`${figures.regularised > 0 ? "+" : ""}${MONEY.format(figures.regularised - figures.expenses)}`}
            hint={`${MONEY.format(figures.regularised)} de trop-perçu · ${MONEY.format(figures.expenses)} à charge`}
          />
          <Figure
            label="Biens au mandat"
            value={`${figures.properties.rentals + figures.properties.sales}`}
            hint={`${figures.properties.rentals} en location · ${figures.properties.sales} en vente`}
            icon
          />
        </div>
      ) : null}

      {/* Not folded into the figures: a booking whose payments do not match
          its total is a question, and answering it with a number would hide
          the question. */}
      {figures && figures.suspect.length > 0 ? (
        <div className="space-y-1 rounded-lg border border-amber-600/40 bg-amber-600/5 p-4 text-sm">
          <p className="flex items-center gap-1.5 font-medium text-amber-700 dark:text-amber-500">
            <TriangleAlert aria-hidden="true" className="size-4" />
            {figures.suspect.length} location
            {figures.suspect.length > 1 ? "s" : ""} à vérifier — non comptée
            {figures.suspect.length > 1 ? "s" : ""} dans la commission
          </p>
          <ul className="text-muted-foreground space-y-0.5 text-xs">
            {figures.suspect.map((r) => (
              <li key={r.reference} className="tabular-nums">
                Réf. {r.reference} — {MONEY.format(r.paid)} encaissés pour{" "}
                {MONEY.format(r.owed)} dus
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-medium">À faire</h3>
            {tasks.length > 8 ? (
              <span className="text-muted-foreground text-xs">
                8 sur {tasks.length}
              </span>
            ) : null}
          </div>

          {tasks.length === 0 ? (
            <p className="text-muted-foreground rounded-lg border border-dashed px-4 py-8 text-center text-sm">
              Aucune action en attente. Les cautions à rendre, les contrats non
              signés et les paiements en retard apparaîtront ici.
            </p>
          ) : (
            <ul className="divide-y rounded-lg border">
              {tasks.slice(0, 8).map((task) => {
                const Icon = TASK_ICON[task.kind];
                return (
                  <li key={task.key}>
                    <Link
                      href={task.href}
                      className="hover:bg-accent flex items-center gap-3 px-4 py-2.5 text-sm transition-colors"
                    >
                      <Icon
                        aria-hidden="true"
                        className={
                          task.kind === "RETURN_DEPOSIT" ||
                          task.kind === "OVERDUE_PAYMENT"
                            ? "size-4 shrink-0 text-amber-600"
                            : "text-muted-foreground size-4 shrink-0"
                        }
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">
                          {task.label}
                        </span>
                        <span className="text-muted-foreground block truncate text-xs">
                          {task.detail}
                        </span>
                      </span>
                      <Badge variant="secondary" className="shrink-0 font-normal">
                        {TASK_LABEL[task.kind]}
                      </Badge>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-medium">Ce mois-ci</h3>
            <Button
              variant="ghost"
              size="sm"
              nativeButton={false}
              render={<Link href="/calendar" />}
            >
              Calendrier
              <ArrowRight aria-hidden="true" />
            </Button>
          </div>
          <div className="rounded-lg border p-3">
            <MiniCalendar
              month={now}
              stays={month.stays}
              events={month.events}
            />
          </div>
        </section>
      </div>
    </div>
  );
}

function Figure({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string;
  hint: string;
  icon?: boolean;
}) {
  return (
    <div className="space-y-1 rounded-lg border p-4">
      <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
        {icon ? <Building2 aria-hidden="true" className="size-3.5" /> : null}
        {label}
      </p>
      <p className="text-xl font-semibold tabular-nums">{value}</p>
      <p className="text-muted-foreground text-xs">{hint}</p>
    </div>
  );
}
