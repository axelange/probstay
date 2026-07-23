import { redirect } from "next/navigation";
import { CreateRentalDialog } from "@/features/rentals/components/create-rental-dialog";
import { RentalsList } from "@/features/rentals/components/rentals-list";
import {
  listBookableProperties,
  listBookingTenantCandidates,
  listRentals,
} from "@/features/rentals/services/rental-service";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

export const metadata = { title: "Locations — BSTAY PRO" };

export default async function RentalsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Agents see only the rentals they are an agent or co-agent of; admins
  // see all. A rental exists once a demande is converted, or when opened
  // directly here.
  const rentals = await listRentals(user);

  // Only the properties this user may book against — their own for an
  // agent, any for MANAGE_RENTALS — so an agent cannot open a booking on a
  // villa they don't manage.
  const canManageAll = hasPermission(user, "MANAGE_RENTALS");
  const [allProperties, tenants] = await Promise.all([
    listBookableProperties(),
    listBookingTenantCandidates(),
  ]);
  const properties = canManageAll
    ? allProperties
    : allProperties.filter((p) => p.agentId === user.id);
  const canCreate = properties.length > 0;

  const active = rentals.filter(
    (r) => !["CHECK_OUT", "CANCELLED"].includes(r.bookingStatus)
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold tracking-tight">Locations</h2>
          <p className="text-muted-foreground text-sm">
            Réservations, issues d&apos;une demande ou créées directement.
            {active > 0 ? ` ${active} en cours.` : ""}
          </p>
        </div>
        {canCreate ? (
          <CreateRentalDialog properties={properties} tenants={tenants} />
        ) : null}
      </div>

      <RentalsList rentals={rentals} />
    </div>
  );
}
