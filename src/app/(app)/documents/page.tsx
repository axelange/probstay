import { redirect } from "next/navigation";
import { DocumentsLibrary } from "@/features/documents/components/documents-library";
import { listStoredDocuments } from "@/features/documents/services/document-library-service";
import { getCurrentUser } from "@/lib/auth";

export const metadata = { title: "Documents — PROBSTAY" };

export default async function DocumentsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Both buckets, for the rentals this user may see — the service applies
  // the rentals' own visibility rule.
  const documents = await listStoredDocuments(user);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="page-title">Documents</h2>
        <p className="text-muted-foreground text-sm">
          Tout ce qui est en stockage — documents générés et exemplaires
          signés, toutes locations confondues.
        </p>
      </div>

      <DocumentsLibrary documents={documents} />
    </div>
  );
}
