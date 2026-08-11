"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, FileUp, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getContactDocumentUrl } from "@/features/contacts/actions/get-contact-document-url";
import { uploadContactDocument } from "@/features/contacts/actions/upload-contact-document";
import {
  COMPANY_REGISTRATION_MAX_AGE_MONTHS,
  ID_DOC_TYPES,
  PERSON_ID_DOC_TYPES,
  idDocTypeLabel,
} from "@/features/contacts/components/contact-type-labels";
import type { ContactDocumentRow } from "@/features/contacts/services/contact-documents";
import { formatDate } from "@/features/rentals/components/rental-labels";
import type { IdentityDocumentType } from "@/generated/prisma/enums";

/**
 * The papers held against a contact.
 *
 * Two ways in, one place: a client sends theirs through their own link, an
 * agent files one from here. Whichever arrives first spares the other party
 * from being asked again — which is the point of showing them here at all,
 * since until now a document a client had sent was invisible to the agency.
 *
 * A company also has to produce a registration extract issued less than three
 * months before the contract is signed — that is what the extract evidences,
 * and it is judged once, at that moment. Whether the company still exists on
 * the day the client arrives is a search, not a document to collect again.
 */
export function ContactDocuments({
  contactId,
  isCompany,
  documents,
  canEdit,
}: {
  contactId: string;
  isCompany: boolean;
  documents: ContactDocumentRow[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState<string | null>(null);
  const [type, setType] = React.useState<IdentityDocumentType>(
    isCompany ? "COMPANY_REGISTRATION" : "PASSPORT"
  );
  const [number, setNumber] = React.useState("");
  const [issuedAt, setIssuedAt] = React.useState("");
  const input = React.useRef<HTMLInputElement | null>(null);

  // A company files its registration extract; a person files an ID. Both lists
  // stay available, because a company's representative also has a passport.
  const offered = isCompany ? ID_DOC_TYPES : PERSON_ID_DOC_TYPES;
  const needsIssuedAt = type === "COMPANY_REGISTRATION";

  function open(id: string) {
    setBusy(id);
    void getContactDocumentUrl({ id })
      .then((result) => {
        if (result.status === "error") {
          toast.error(result.message);
          return;
        }
        window.open(result.url, "_blank", "noopener,noreferrer");
      })
      .finally(() => setBusy(null));
  }

  function send(file: File) {
    setBusy("upload");
    const body = new FormData();
    body.set("contactId", contactId);
    body.set("type", type);
    body.set("number", number);
    body.set("issuedAt", issuedAt);
    body.set("file", file);
    void uploadContactDocument(body)
      .then((result) => {
        if (result.status === "error") {
          toast.error(result.message);
          return;
        }
        toast.success("Document enregistré.");
        setNumber("");
        setIssuedAt("");
        router.refresh();
      })
      .finally(() => setBusy(null));
  }

  return (
    <div className="space-y-3">
      {documents.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Aucun document. Le client peut envoyer le sien via son lien, ou vous
          pouvez le joindre ici.
        </p>
      ) : (
        <ul className="divide-y text-sm">
          {documents.map((d) => (
            <li
              key={d.id}
              className="flex flex-wrap items-baseline justify-between gap-x-3 py-2"
            >
              <span className="min-w-0">
                {idDocTypeLabel(d.type)}
                {d.number ? (
                  <span className="text-muted-foreground ml-2 font-mono text-xs">
                    {d.number}
                  </span>
                ) : null}
                <span className="text-muted-foreground block text-xs">
                  {d.issuedAt ? `Émis le ${formatDate(d.issuedAt)} · ` : ""}
                  Reçu le {formatDate(d.uploadedAt)}
                  {d.rental ? (
                    <>
                      {" · "}
                      <Link
                        href={`/rentals/${d.rental.id}`}
                        className="underline underline-offset-2"
                      >
                        location {d.rental.reference}
                      </Link>
                    </>
                  ) : null}
                </span>
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={busy !== null}
                onClick={() => open(d.id)}
              >
                <Eye aria-hidden="true" />
                Voir
              </Button>
            </li>
          ))}
        </ul>
      )}

      {isCompany &&
      !documents.some((d) => d.type === "COMPANY_REGISTRATION") ? (
        <p className="flex items-start gap-1.5 text-xs text-amber-600">
          <TriangleAlert aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
          Aucun extrait KBIS (ou équivalent étranger). Il doit dater de moins
          de {COMPANY_REGISTRATION_MAX_AGE_MONTHS} mois à la signature du
          contrat.
        </p>
      ) : null}

      {canEdit ? (
        <div className="space-y-2 rounded-md border p-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="doc-type" className="text-xs">
                Type
              </Label>
              <Select
                value={type}
                onValueChange={(v) =>
                  v !== null && setType(v as IdentityDocumentType)
                }
                items={offered.map((t) => ({ value: t.value, label: t.label }))}
              >
                <SelectTrigger id="doc-type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {offered.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="doc-number" className="text-xs">
                Numéro
              </Label>
              <Input
                id="doc-number"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                className="font-mono text-xs"
              />
            </div>
            {needsIssuedAt ? (
              <div className="space-y-1.5">
                <Label htmlFor="doc-issued" className="text-xs">
                  Date d&apos;émission
                </Label>
                <Input
                  id="doc-issued"
                  type="date"
                  value={issuedAt}
                  onChange={(e) => setIssuedAt(e.target.value)}
                />
              </div>
            ) : null}
          </div>

          <input
            ref={input}
            type="file"
            accept=".jpg,.jpeg,.png,.webp,.pdf"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) send(file);
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy !== null}
            onClick={() => input.current?.click()}
          >
            <FileUp aria-hidden="true" />
            {busy === "upload" ? "Envoi…" : "Joindre un document"}
          </Button>
          <p className="text-muted-foreground text-xs">
            JPEG, PNG, WEBP ou PDF — 10 Mo maximum.
          </p>
        </div>
      ) : null}
    </div>
  );
}
