import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DemandesList } from "@/features/demandes/components/demandes-list";
import { listDemandes } from "@/features/demandes/services/demande-service";
import { demandeStatus } from "@/features/demandes/components/demande-labels";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

export const metadata = { title: "Demandes — BSTAY PRO" };

export default async function DemandesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const demandes = await listDemandes(user);
  const canCreate = hasPermission(user, "MANAGE_RENTALS");

  const pending = demandes.filter((d) => demandeStatus(d) === "pending").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold tracking-tight">Demandes</h2>
          <p className="text-muted-foreground text-sm">
            Premier contact d&apos;un client. Une demande peut être convertie
            en location.
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

      <DemandesList demandes={demandes} />
    </div>
  );
}
