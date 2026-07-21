import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RentalsList } from "@/features/rentals/components/rentals-list";
import { listRentals } from "@/features/rentals/services/rental-service";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

export const metadata = { title: "Demandes — BSTAY PRO" };

export default async function DemandesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Demandes are bookings not yet converted — the first contact, still a
  // request or lost as one. Confirming one turns it into a Location.
  const demandes = await listRentals("demandes");

  const canCreate =
    hasPermission(user, "MANAGE_RENTALS") || user.role === "AGENT";

  const pending = demandes.filter((d) => d.bookingStatus === "INQUIRY").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold tracking-tight">Demandes</h2>
          <p className="text-muted-foreground text-sm">
            Premier contact d&apos;un client, avant confirmation.
            {pending > 0 ? ` ${pending} en attente.` : ""}
          </p>
        </div>

        {canCreate ? (
          <Button
            size="sm"
            nativeButton={false}
            render={<Link href="/demandes/new" />}
          >
            <Plus aria-hidden="true" />
            Nouvelle demande
          </Button>
        ) : null}
      </div>

      <RentalsList rentals={demandes} variant="demandes" />
    </div>
  );
}
