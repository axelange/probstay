import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CreateRentalForm } from "@/features/rentals/components/create-rental-form";
import {
  listBookableProperties,
  listTenantCandidates,
} from "@/features/rentals/services/rental-service";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

export const metadata = { title: "Nouvelle location — BSTAY PRO" };

export default async function NewRentalPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const canManageAll = hasPermission(user, "MANAGE_RENTALS");
  if (!canManageAll && user.role !== "AGENT") notFound();

  const [allProperties, tenants] = await Promise.all([
    listBookableProperties(),
    listTenantCandidates(),
  ]);

  // An Agent may only book the properties they manage, so offering the
  // rest would produce a form that refuses on submit. The action
  // re-checks regardless — a filtered list is not permission.
  const properties = canManageAll
    ? allProperties
    : allProperties.filter((p) => p.agentId === user.id);

  return (
    <div className="space-y-6">
      <div>
        {/* nativeButton={false}: this renders an <a>, not a <button>. */}
        <Button
          variant="ghost"
          size="sm"
          nativeButton={false}
          render={<Link href="/rentals" />}
        >
          <ArrowLeft aria-hidden="true" />
          Toutes les locations
        </Button>
      </div>

      <div className="space-y-1">
        <h2 className="text-xl font-semibold tracking-tight">
          Nouvelle location
        </h2>
        <p className="text-muted-foreground text-sm">
          Une demande n&apos;exige qu&apos;un bien, des dates et un locataire.
          Le reste se complète en avançant.
        </p>
      </div>

      {properties.length === 0 ? (
        <p className="text-muted-foreground rounded-lg border border-dashed px-4 py-8 text-center text-sm">
          Aucun bien ne vous est assigné — vous ne pouvez pas encore créer de
          location.
        </p>
      ) : (
        <CreateRentalForm properties={properties} tenants={tenants} />
      )}
    </div>
  );
}
