import { redirect } from "next/navigation";
import { TemplatesManager } from "@/features/documents/components/template-editor";
import { listTemplatesWithContent } from "@/features/documents/services/template-service";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

export const metadata = { title: "Modèles de documents — BSTAY PRO" };

export default async function TemplatesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Editing is MANAGE_DOCUMENT_TEMPLATES — SUPER_ADMIN and ADMIN by role,
  // a Moderator only when granted. Anyone without it lands back on the
  // documents page rather than a read-only editor they cannot use.
  if (!hasPermission(user, "MANAGE_DOCUMENT_TEMPLATES")) {
    redirect("/documents");
  }

  const templates = await listTemplatesWithContent();

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold tracking-tight">
          Modèles de documents
        </h2>
        <p className="text-muted-foreground text-sm">
          Textes et structure des documents générés. Le français fait foi ;
          l&apos;anglais l&apos;accompagne. Chaque enregistrement crée une
          nouvelle version.
        </p>
      </div>

      <TemplatesManager templates={templates} canEdit />
    </div>
  );
}
