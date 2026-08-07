"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Download, FileCheck2, FilePlus2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getSignedDocumentUrl } from "@/features/documents/actions/get-signed-document-url";
import { uploadSignedDocument } from "@/features/documents/actions/upload-signed-document";
import type { SignedDocumentRow } from "@/features/documents/services/signed-document-service";
import { formatDate } from "@/features/rentals/components/rental-labels";

const ACCEPT = ".pdf,.jpg,.jpeg,.png,.heic";

const SLOTS = [
  { type: "RENTAL_CONFIRMATION", label: "Confirmation de location signée" },
  { type: "SEASONAL_RENTAL_CONTRACT", label: "Contrat de location signé" },
] as const;

type SlotType = (typeof SLOTS)[number]["type"];
type Kind = "SIGNED" | "AMENDMENT";
/** Unique per control, so two file inputs on one row stay distinguishable. */
const slotKey = (type: SlotType, kind: Kind) => `${type}:${kind}`;

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

/**
 * The copies that came back signed.
 *
 * One slot per document, because there are exactly two and an agent looking
 * for the signed contract should not have to read a list to see whether it is
 * there. Uploading again supersedes rather than replaces: the previous copy
 * stays under "Historique", since a signed document is evidence and swapping
 * one silently would leave no trace of what was signed first.
 *
 * The file goes through a Server Action, so the whole scan is buffered by the
 * server and `serverActions.bodySizeLimit` has to be raised for every action in
 * the app to let it past. The alternative is uploading straight to the bucket
 * from here with the browser client — the storage INSERT policy already
 * authorises on the rental id in the path, so it would be no less guarded —
 * leaving the action to record only the row. Worth doing if uploads grow.
 */
export function SignedDocuments({
  rentalId,
  documents,
  canManage,
}: {
  rentalId: string;
  documents: SignedDocumentRow[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState<string | null>(null);
  const inputs = React.useRef<Record<string, HTMLInputElement | null>>({});

  const signed = documents.filter((d) => d.kind === "SIGNED");
  const latest = (type: SlotType) => signed.find((d) => d.type === type);
  const latestIds = new Set(
    SLOTS.map((s) => latest(s.type)?.id).filter(Boolean) as string[]
  );
  // Only signed copies supersede one another. An avenant amends the document
  // rather than replacing it, so every one stays in view.
  const superseded = signed.filter((d) => !latestIds.has(d.id));
  const amendments = (type: SlotType) =>
    documents.filter((d) => d.kind === "AMENDMENT" && d.type === type);

  function upload(type: SlotType, kind: Kind, file: File) {
    setBusy(slotKey(type, kind));
    const formData = new FormData();
    formData.set("rentalId", rentalId);
    formData.set("type", type);
    formData.set("kind", kind);
    formData.set("file", file);

    void uploadSignedDocument(formData)
      .then((result) => {
        if (result.status === "error") {
          toast.error(result.message);
          return;
        }
        toast.success(`${result.fileName} enregistré.`);
        router.refresh();
      })
      .finally(() => setBusy(null));
  }

  function download(id: string) {
    setBusy(id);
    void getSignedDocumentUrl({ id })
      .then((result) => {
        if (result.status === "error") {
          toast.error(result.message);
          return;
        }
        window.location.href = result.url;
      })
      .finally(() => setBusy(null));
  }

  return (
    <div className="space-y-3 rounded-md border p-3">
      <p className="text-xs font-medium">Documents signés</p>

      <ul className="space-y-2">
        {SLOTS.map((slot) => {
          const doc = latest(slot.type);
          const pending = busy === slotKey(slot.type, "SIGNED");
          const riders = amendments(slot.type);
          return (
            <li key={slot.type} className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm">
              <FileCheck2
                aria-hidden="true"
                className={`size-4 shrink-0 ${doc ? "text-emerald-600" : "text-muted-foreground"}`}
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate">{slot.label}</span>
                {doc ? (
                  <span className="text-muted-foreground block truncate text-xs">
                    {doc.fileName} · {formatSize(doc.sizeBytes)} ·{" "}
                    {formatDate(doc.uploadedAt)}
                    {doc.uploaderName ? ` · ${doc.uploaderName}` : ""}
                  </span>
                ) : (
                  <span className="text-muted-foreground block text-xs">
                    Aucun exemplaire signé.
                  </span>
                )}
              </span>

              {doc ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => download(doc.id)}
                  disabled={busy !== null}
                >
                  <Download aria-hidden="true" />
                  Télécharger
                </Button>
              ) : null}

              {canManage ? (
                <>
                  <input
                    ref={(el) => {
                      inputs.current[slotKey(slot.type, "SIGNED")] = el;
                    }}
                    type="file"
                    accept={ACCEPT}
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      // Cleared before the upload so choosing the same file
                      // twice still fires a change event.
                      event.target.value = "";
                      if (file) upload(slot.type, "SIGNED", file);
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      inputs.current[slotKey(slot.type, "SIGNED")]?.click()
                    }
                    disabled={busy !== null}
                  >
                    <Upload aria-hidden="true" />
                    {pending ? "Envoi…" : doc ? "Remplacer" : "Téléverser"}
                  </Button>
                </>
              ) : null}
            </div>

            {/* Avenants to this document. They do not supersede the signed
                copy — both are in force, and a booking may collect several —
                so each is listed rather than folded into a history. */}
            <div className="space-y-1 pl-7">
              {riders.map((rider) => (
                <div
                  key={rider.id}
                  className="text-muted-foreground flex items-center justify-between gap-3 text-xs"
                >
                  <span className="min-w-0 truncate">
                    Avenant — {rider.fileName} · {formatSize(rider.sizeBytes)} ·{" "}
                    {formatDate(rider.uploadedAt)}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => download(rider.id)}
                    disabled={busy !== null}
                  >
                    <Download aria-hidden="true" />
                  </Button>
                </div>
              ))}

              {canManage ? (
                <>
                  <input
                    ref={(el) => {
                      inputs.current[slotKey(slot.type, "AMENDMENT")] = el;
                    }}
                    type="file"
                    accept={ACCEPT}
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      event.target.value = "";
                      if (file) upload(slot.type, "AMENDMENT", file);
                    }}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                    onClick={() =>
                      inputs.current[slotKey(slot.type, "AMENDMENT")]?.click()
                    }
                    disabled={busy !== null}
                  >
                    <FilePlus2 aria-hidden="true" />
                    {busy === slotKey(slot.type, "AMENDMENT")
                      ? "Envoi…"
                      : "Ajouter un avenant"}
                  </Button>
                </>
              ) : null}
            </div>
            </li>
          );
        })}
      </ul>

      <p className="text-muted-foreground text-xs">
        PDF, JPEG, PNG ou HEIC, 25 Mo maximum. Un nouvel exemplaire signé
        remplace le courant&nbsp;; le précédent reste dans l&apos;historique. Un
        avenant ne remplace rien&nbsp;: il s&apos;ajoute au document
        qu&apos;il modifie.
      </p>

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
              <li
                key={d.id}
                className="text-muted-foreground flex items-center justify-between gap-3 py-1.5 text-xs"
              >
                <span className="min-w-0 truncate">
                  {d.fileName} · {formatDate(d.uploadedAt)}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => download(d.id)}
                  disabled={busy !== null}
                >
                  <Download aria-hidden="true" />
                </Button>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}
