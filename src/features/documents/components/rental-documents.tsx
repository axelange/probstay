"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Download, FileText } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { generateDocumentAction } from "@/features/documents/actions/generate-document";
import { getDocumentUrl } from "@/features/documents/actions/get-document-url";
import {
  DOCUMENT_NAME,
  DOCUMENT_TYPE_OF_TEMPLATE,
} from "@/features/documents/reference";
import type { GeneratedDocumentRow } from "@/features/documents/services/generated-document-service";
import { formatDate } from "@/features/rentals/components/rental-labels";

const ORDER = ["CONFIRMATION", "CONTRAT"] as const;

/**
 * Document generation for a rental, in the contract step.
 *
 * Generating is always available rather than gated on the rental being
 * complete: the agency works to two hard gates and guidance thereafter, so
 * what is still missing is shown by the completion form above, not enforced
 * here. An agent who needs a draft to send an owner can produce one.
 *
 * Every generation is kept. The newest of each kind is what you normally
 * want, so it leads; the rest stay reachable underneath, because a document
 * that has been sent or signed has to remain retrievable exactly as it was.
 */
export function RentalDocuments({
  rentalId,
  documents,
  canManage,
}: {
  rentalId: string;
  documents: GeneratedDocumentRow[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState<string | null>(null);

  const latestIds = new Set(
    ORDER.map(
      (t) =>
        documents.find((d) => DOCUMENT_TYPE_OF_TEMPLATE[d.type] === t)?.id
    ).filter(Boolean) as string[]
  );
  const superseded = documents.filter((d) => !latestIds.has(d.id));

  function generate(type: (typeof ORDER)[number]) {
    setBusy(type);
    void generateDocumentAction({ rentalId, type })
      .then((result) => {
        if (result.status === "error") {
          toast.error(result.message);
          return;
        }
        toast.success(`${result.fileName} généré.`);
        router.refresh();
      })
      .finally(() => setBusy(null));
  }

  function download(id: string) {
    setBusy(id);
    void getDocumentUrl({ id })
      .then((result) => {
        if (result.status === "error") {
          toast.error(result.message);
          return;
        }
        // The signed link carries the readable file name and expires shortly,
        // so it is followed immediately rather than rendered into the page.
        window.location.href = result.url;
      })
      .finally(() => setBusy(null));
  }

  function Row({ doc, muted }: { doc: GeneratedDocumentRow; muted?: boolean }) {
    return (
      <li className="flex items-center gap-3 py-1.5">
        <FileText
          aria-hidden="true"
          className={`size-4 shrink-0 ${muted ? "text-muted-foreground/60" : "text-muted-foreground"}`}
        />
        <div className="min-w-0 flex-1">
          <p className={`truncate text-xs ${muted ? "text-muted-foreground" : ""}`}>
            {doc.fileName}
          </p>
          <p className="text-muted-foreground text-[11px] tabular-nums">
            {formatDate(doc.createdAt)}
            {doc.authorName ? ` — ${doc.authorName}` : ""}
            {doc.templateVersion === null
              ? " — modèle par défaut"
              : ` — modèle v${doc.templateVersion}`}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => download(doc.id)}
          disabled={busy !== null}
        >
          <Download aria-hidden="true" />
          {busy === doc.id ? "…" : "Télécharger"}
        </Button>
      </li>
    );
  }

  return (
    <div className="space-y-3 rounded-md border p-3">
      <p className="text-xs font-medium">Documents</p>

      {canManage ? (
        <div className="flex flex-wrap gap-2">
          {ORDER.map((t) => (
            <Button
              key={t}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => generate(t)}
              disabled={busy !== null}
            >
              {busy === t ? "Génération…" : `Générer — ${DOCUMENT_NAME[t]}`}
            </Button>
          ))}
        </div>
      ) : null}

      {documents.length === 0 ? (
        <p className="text-muted-foreground text-xs">
          Aucun document généré pour cette location.
        </p>
      ) : (
        <ul className="divide-y">
          {documents
            .filter((d) => latestIds.has(d.id))
            .map((d) => (
              <Row key={d.id} doc={d} />
            ))}
        </ul>
      )}

      {superseded.length > 0 ? (
        <details className="group">
          <summary className="text-muted-foreground hover:text-foreground cursor-pointer text-xs">
            Historique
            <Badge variant="secondary" className="ml-2 font-normal">
              {superseded.length}
            </Badge>
          </summary>
          <ul className="mt-1 divide-y">
            {superseded.map((d) => (
              <Row key={d.id} doc={d} muted />
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}
