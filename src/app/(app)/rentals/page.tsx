import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RentalsList } from "@/features/rentals/components/rentals-list";
import { listRentals } from "@/features/rentals/services/rental-service";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

export const metadata = { title: "Locations — BSTAY PRO" };

export default async function RentalsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // No gate on the page: Agents are read-all on rentals. What they may
  // change is decided per rental, against the property they manage.
  const rentals = await listRentals();

  // An Agent with no assigned property can book nothing, so the button
  // would lead to a form that refuses every submission.
  const canCreate =
    hasPermission(user, "MANAGE_RENTALS") || user.role === "AGENT";

  const confirmed = rentals.filter((r) => r.ownerConfirmedAt !== null).length;
  const awaiting = rentals.filter(
    (r) => r.bookingStatus === "BOOKING_CONFIRMATION" && !r.ownerConfirmedAt
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold tracking-tight">Locations</h2>
          {/* The running total lives with the list, which recounts as you
              filter. What belongs here is what a count cannot say: how
              many are secured, and how many are waiting on an owner —
              the step that actually blocks the pipeline. */}
          <p className="text-muted-foreground text-sm">
            {confirmed > 0 ? `${confirmed} confirmées par le propriétaire` : "Aucune confirmation propriétaire"}
            {awaiting > 0 ? `, ${awaiting} en attente de réponse.` : "."}
          </p>
        </div>

        {canCreate ? (
          <Button
            size="sm"
            nativeButton={false}
            render={<Link href="/rentals/new" />}
          >
            <Plus aria-hidden="true" />
            Nouvelle location
          </Button>
        ) : null}
      </div>

      <RentalsList rentals={rentals} />
    </div>
  );
}
