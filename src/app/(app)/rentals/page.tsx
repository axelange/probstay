import { redirect } from "next/navigation";
import { RentalsList } from "@/features/rentals/components/rentals-list";
import { listRentals } from "@/features/rentals/services/rental-service";
import { getCurrentUser } from "@/lib/auth";

export const metadata = { title: "Locations — BSTAY PRO" };

export default async function RentalsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // No gate on the page: Agents are read-all on rentals. What they may
  // change is decided per rental, against the property they manage. A
  // rental only exists once a demande has been converted into one.
  const rentals = await listRentals();

  const active = rentals.filter(
    (r) => !["CHECK_OUT", "CANCELLED"].includes(r.bookingStatus)
  ).length;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold tracking-tight">Locations</h2>
        <p className="text-muted-foreground text-sm">
          Demandes converties en réservations.
          {active > 0 ? ` ${active} en cours.` : ""}
        </p>
      </div>

      <RentalsList rentals={rentals} />
    </div>
  );
}
