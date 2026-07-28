"use client";

import * as React from "react";
import { PDFViewer } from "@react-pdf/renderer";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getContratData } from "@/features/documents/actions/get-contrat-data";
import { getConfirmationData } from "@/features/documents/actions/get-confirmation-data";
import { registerDocumentFontsBrowser } from "@/features/documents/fonts.browser";
import {
  ContratLocationSaisonniere,
  type ContratData,
} from "@/features/documents/templates/contrat-location-saisonniere";
import {
  RentalConfirmation,
  type ConfirmationData,
} from "@/features/documents/templates/rental-confirmation";

// Same fonts as the server, registered once in the browser.
registerDocumentFontsBrowser();

export type RentalOption = { id: string; label: string };

const DOC_TYPES = [
  { value: "CONTRAT", label: "Contrat de location saisonnière" },
  { value: "CONFIRMATION", label: "Confirmation de location (propriétaire)" },
];

/**
 * Document preview, driven by selection rather than typing: pick a document
 * type and a rental, and the fields are pre-filled from that rental
 * (property, contacts, dates, amounts). The same template renders here and
 * on the server, so the preview is the final document.
 */
export default function ContratPreview({
  rentals,
}: {
  rentals: RentalOption[];
}) {
  const [docType, setDocType] = React.useState("CONTRAT");
  const [rentalId, setRentalId] = React.useState(rentals[0]?.id ?? "");
  const [contrat, setContrat] = React.useState<ContratData | null>(null);
  const [confirmation, setConfirmation] =
    React.useState<ConfirmationData | null>(null);
  const [isPending, startTransition] = React.useTransition();

  // Both documents are driven by the selected rental; fetch the one on screen.
  // The render guards on `!rentalId`, so no synchronous reset is needed here.
  React.useEffect(() => {
    if (!rentalId) return;
    startTransition(async () => {
      if (docType === "CONFIRMATION") {
        setConfirmation(await getConfirmationData(rentalId));
      } else {
        setContrat(await getContratData(rentalId));
      }
    });
  }, [rentalId, docType]);

  const data = docType === "CONFIRMATION" ? confirmation : contrat;

  return (
    <div className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="doc-type">Type de document</Label>
          <Select
            value={docType}
            onValueChange={(v) => v !== null && setDocType(v)}
            items={DOC_TYPES}
          >
            <SelectTrigger id="doc-type" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DOC_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="doc-rental">Location</Label>
          {rentals.length > 0 ? (
            <Select
              value={rentalId}
              onValueChange={(v) => v !== null && setRentalId(v)}
              items={rentals.map((r) => ({ value: r.id, label: r.label }))}
            >
              <SelectTrigger id="doc-rental" className="w-full">
                <SelectValue placeholder="Choisir une location" />
              </SelectTrigger>
              <SelectContent>
                {rentals.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="text-muted-foreground text-sm">
              Aucune location disponible.
            </p>
          )}
          <p className="text-muted-foreground text-xs">
            Les champs sont pré-remplis depuis la location choisie — bien,
            contacts, dates et montants.
          </p>
        </div>
      </div>

      <div className="bg-muted/30 h-[82vh] overflow-hidden rounded-lg border">
        {!rentalId ? (
          <div className="text-muted-foreground p-8 text-sm">
            Choisissez une location pour prévisualiser le document.
          </div>
        ) : isPending || data === undefined ? (
          <div className="text-muted-foreground p-8 text-sm">Chargement…</div>
        ) : data === null ? (
          <div className="text-muted-foreground p-8 text-sm">
            Données indisponibles pour cette location.
          </div>
        ) : (
          <PDFViewer
            showToolbar
            style={{ width: "100%", height: "100%", border: 0 }}
          >
            {docType === "CONFIRMATION" ? (
              <RentalConfirmation data={confirmation!} />
            ) : (
              <ContratLocationSaisonniere data={contrat!} />
            )}
          </PDFViewer>
        )}
      </div>
    </div>
  );
}
