import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CreateDemandeForm } from "@/features/demandes/components/create-demande-form";
import { listProspectCandidates } from "@/features/demandes/services/demande-service";
import { listBookableProperties } from "@/features/rentals/services/rental-service";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

export const metadata = { title: "Nouvelle demande — BSTAY PRO" };

export default async function NewDemandePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  if (!hasPermission(user, "MANAGE_RENTALS")) notFound();

  // A demande can span several villas across the whole portfolio, so it
  // is not scoped to an agent's own — all properties are offered. The
  // prospect list holds contacts that are only prospects.
  const [properties, clients] = await Promise.all([
    listBookableProperties(),
    listProspectCandidates(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        {/* nativeButton={false}: this renders an <a>, not a <button>. */}
        <Button
          variant="ghost"
          size="sm"
          nativeButton={false}
          render={<Link href="/demandes" />}
        >
          <ArrowLeft aria-hidden="true" />
          Toutes les demandes
        </Button>
      </div>

      <div className="space-y-1">
        <h2 className="text-xl font-semibold tracking-tight">
          Nouvelle demande
        </h2>
        <p className="text-muted-foreground text-sm">
          Le premier contact d&apos;un client. Ce n&apos;est pas encore une
          location — elle le devient une fois convertie.
        </p>
      </div>

      <CreateDemandeForm properties={properties} clients={clients} />
    </div>
  );
}
