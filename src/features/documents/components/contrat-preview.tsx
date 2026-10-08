"use client";

import * as React from "react";
import { PDFViewer, pdf } from "@react-pdf/renderer";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { getConciergeData } from "@/features/documents/actions/get-concierge-data";
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
import {
  CONCIERGE_TIERS,
  TIERS,
  type ConciergeTier,
} from "@/features/documents/concierge-packages";
import {
  ContratConciergerie,
  type ConciergeData,
} from "@/features/documents/templates/contrat-conciergerie";
import { documentFileName } from "@/features/documents/reference";
import type { DocumentType } from "@/features/documents/services/document-readiness";

// Same fonts as the server, registered once in the browser.
registerDocumentFontsBrowser();

export type RentalOption = { id: string; label: string };
/** A contact or a property, as the concierge agreement's pickers list them. */
export type PickerOption = { id: string; label: string; hint?: string };

const DOC_TYPES = [
  { value: "CONTRAT", label: "Contrat de location saisonnière" },
  { value: "CONFIRMATION", label: "Confirmation de location (propriétaire)" },
  { value: "CONCIERGERIE", label: "Contrat de Property Management" },
];

/** The agreement is set in both languages, or in French alone. */
const LANGUAGES = [
  { value: "BI", label: "Bilingue — English / Français" },
  { value: "FR", label: "Français seul" },
];

const EMPTY_MANUAL = {
  label: "",
  address: "",
  kind: "",
  surface: "",
  rooms: "",
};

/**
 * Document preview, driven by selection rather than typing: pick a document
 * type and a rental, and the fields are pre-filled from that rental
 * (property, contacts, dates, amounts). The same template renders here and
 * on the server, so the preview is the final document.
 */
/** The three documents the preview can draw, including the one with no rental. */
type PreviewType = DocumentType | "CONCIERGERIE";

export default function ContratPreview({
  rentals,
  contacts,
  properties,
}: {
  rentals: RentalOption[];
  contacts: PickerOption[];
  properties: PickerOption[];
}) {
  const [docType, setDocType] = React.useState<PreviewType>("CONTRAT");
  const [rentalId, setRentalId] = React.useState(rentals[0]?.id ?? "");
  const [contrat, setContrat] = React.useState<ContratData | null>(null);
  const [confirmation, setConfirmation] =
    React.useState<ConfirmationData | null>(null);
  const [isPending, startTransition] = React.useTransition();

  // ---- The concierge agreement's own inputs -------------------------------
  //
  // None of these come from a rental: the agreement is sold to an owner for a
  // residence, and both the fee and the fund are settled after the agent has
  // been to see it. The preview is therefore a form, not a selector.
  const [contactId, setContactId] = React.useState(contacts[0]?.id ?? "");
  const [tier, setTier] = React.useState<ConciergeTier>("ESSENTIAL");
  const [bilingual, setBilingual] = React.useState(true);
  const [fee, setFee] = React.useState("");
  // Today, so the schedule has something to compute from before the agent has
  // chosen a date — an empty summary teaches nothing about what it will show.
  const [startDate, setStartDate] = React.useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [fundAmount, setFundAmount] = React.useState("");
  const [fundThreshold, setFundThreshold] = React.useState("");
  // Articles 5.2 and 5.3: the two ceilings the agreement gives BSTAY. Shown
  // with the agency's usual figures rather than left blank — they are a policy
  // the agent adjusts, not a value invented afresh each time.
  const [threshold, setThreshold] = React.useState("500,00 €");
  const [emergency, setEmergency] = React.useState("3 000,00 €");
  const [propertyId, setPropertyId] = React.useState("");
  /** Describing a residence by hand rather than picking one of the agency's. */
  const [useManual, setUseManual] = React.useState(false);
  const [manual, setManual] = React.useState(EMPTY_MANUAL);
  const [concierge, setConcierge] = React.useState<ConciergeData | null>(null);

  // Both documents are driven by the selected rental; fetch the one on screen.
  // The render guards on `!rentalId`, so no synchronous reset is needed here.
  React.useEffect(() => {
    if (docType === "CONCIERGERIE") return;
    if (!rentalId) return;
    startTransition(async () => {
      if (docType === "CONFIRMATION") {
        setConfirmation(await getConfirmationData(rentalId));
      } else {
        setContrat(await getContratData(rentalId));
      }
    });
  }, [rentalId, docType]);

  // Rebuilt on every change, including every keystroke in the fee: the figures
  // are typed, so waiting for a blur would leave the page showing a document
  // that is one edit behind what the agent is reading.
  React.useEffect(() => {
    // A property is enough on its own: it carries the client with it.
    if (docType !== "CONCIERGERIE" || (!contactId && !propertyId)) return;
    const timer = setTimeout(() => {
      startTransition(async () => {
        setConcierge(
          await getConciergeData({
            contactId,
            tier,
            bilingual,
            fee: fee.trim(),
            startDate,
            threshold,
            emergency,
            fund:
              fundAmount.trim() || fundThreshold.trim()
                ? {
                    amount: fundAmount.trim() || "—",
                    threshold: fundThreshold.trim() || "—",
                  }
                : null,
            propertyId: propertyId || null,
            manualProperty: useManual ? manual : null,
            place: "Cannes",
          }),
        );
      });
    }, 250);
    return () => clearTimeout(timer);
  }, [
    docType,
    contactId,
    tier,
    bilingual,
    fee,
    startDate,
    threshold,
    emergency,
    fundAmount,
    fundThreshold,
    propertyId,
    useManual,
    manual,
  ]);

  const data =
    docType === "CONCIERGERIE"
      ? concierge
      : docType === "CONFIRMATION"
        ? confirmation
        : contrat;

  // The same element the viewer shows, so the saved file is the preview.
  const doc =
    docType === "CONCIERGERIE" ? (
      <ContratConciergerie data={concierge!} />
    ) : docType === "CONFIRMATION" ? (
      <RentalConfirmation data={confirmation!} />
    ) : (
      <ContratLocationSaisonniere data={contrat!} />
    );

  const fileName =
    docType === "CONCIERGERIE"
      ? concierge
        ? `Contrat Property Management — ${concierge.client.name}.pdf`
        : ""
      : data && "tenant" in data
        ? documentFileName(docType, data.reference, data.tenant.name)
        : "";

  const [isSaving, setIsSaving] = React.useState(false);

  /**
   * Renders to a blob and saves it under the document's own name — the viewer's
   * own save button cannot be renamed, and would write the blob's opaque id.
   */
  async function download() {
    if (!data) return;
    setIsSaving(true);
    let url: string | undefined;
    try {
      const blob = await pdf(doc).toBlob();
      url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.click();
    } catch {
      toast.error("Le document n'a pas pu être téléchargé.");
    } finally {
      // Revoking immediately can cancel the download in some browsers; give
      // the click a turn to be picked up first.
      if (url) {
        const objectUrl = url;
        setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000);
      }
      setIsSaving(false);
    }
  }

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

        {docType === "CONCIERGERIE" ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="cg-property">Bien</Label>
              {/* The search holds nothing but properties. It used to carry
                  "Saisir un bien ponctuel…" as a first option with an empty
                  value, which chose a state rather than a property — and the
                  search text it was picked from stayed on screen afterwards,
                  since there was nothing to replace it with. The escape is a
                  link under the field instead, where it reads as a different
                  kind of action. */}
              <Combobox
                id="cg-property"
                options={properties.map((p) => ({
                  value: p.id,
                  label: p.label,
                  hint: p.hint,
                }))}
                value={propertyId || null}
                onValueChange={(v) => {
                  setPropertyId(v);
                  setUseManual(false);
                }}
                placeholder="Rechercher un bien…"
                emptyLabel="Aucun bien."
                disabled={useManual}
              />
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground text-xs underline underline-offset-2"
                onClick={() => {
                  setUseManual((v) => !v);
                  // Picking one of ours and describing one by hand are
                  // exclusive: leaving a property selected behind the manual
                  // fields would send both, and the server would take the
                  // property — silently ignoring everything just typed.
                  setPropertyId("");
                }}
              >
                {useManual
                  ? "Revenir à la recherche"
                  : "Utiliser un autre bien"}
              </button>
            </div>

            {/* The residence may not be one the agency manages: an owner can
                subscribe for a house BSTAY has no mandate on. The contract
                still has to name it — the paper contract this replaces never
                did, which is the one thing an estate-management agreement
                cannot leave out. */}
            {useManual ? (
              <div className="border-border space-y-2 border-l pl-3">
                <Input
                  value={manual.label}
                  onChange={(e) =>
                    setManual((m) => ({ ...m, label: e.target.value }))
                  }
                  placeholder="Désignation — Villa Reina"
                  autoComplete="off"
                />
                <Input
                  value={manual.address}
                  onChange={(e) =>
                    setManual((m) => ({ ...m, address: e.target.value }))
                  }
                  placeholder="Adresse complète"
                  autoComplete="off"
                />
                <Input
                  value={manual.kind}
                  onChange={(e) =>
                    setManual((m) => ({ ...m, kind: e.target.value }))
                  }
                  placeholder="Nature — villa avec piscine"
                  autoComplete="off"
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    value={manual.surface}
                    onChange={(e) =>
                      setManual((m) => ({ ...m, surface: e.target.value }))
                    }
                    placeholder="320 m²"
                    autoComplete="off"
                  />
                  <Input
                    value={manual.rooms}
                    onChange={(e) =>
                      setManual((m) => ({ ...m, rooms: e.target.value }))
                    }
                    placeholder="8 pièces, 5 chambres"
                    autoComplete="off"
                  />
                </div>
              </div>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="cg-contact">Client</Label>
              {/* A property of ours names its own client: an agreement to look
                  after a house is signed by whoever owns it. The picker is
                  therefore hidden rather than disabled when one is chosen — a
                  greyed-out field invites a fight with the form over something
                  the server decides anyway. */}
              {propertyId ? (
                <p className="text-muted-foreground border-border rounded-md border px-3 py-2 text-sm">
                  Le propriétaire du bien choisi.
                </p>
              ) : (
                <Combobox
                  id="cg-contact"
                  options={contacts.map((c) => ({
                    value: c.id,
                    label: c.label,
                    hint: c.hint,
                  }))}
                  value={contactId || null}
                  onValueChange={setContactId}
                  placeholder="Rechercher un contact…"
                  emptyLabel="Aucun contact."
                />
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="cg-lang">Langue</Label>
              <Select
                value={bilingual ? "BI" : "FR"}
                onValueChange={(v) => v !== null && setBilingual(v === "BI")}
                items={LANGUAGES}
              >
                <SelectTrigger id="cg-lang" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((l) => (
                    <SelectItem key={l.value} value={l.value}>
                      {l.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cg-tier">Forfait</Label>
              <Select
                value={tier}
                onValueChange={(v) => v !== null && setTier(v as ConciergeTier)}
                items={CONCIERGE_TIERS.map((t) => ({
                  value: t,
                  label: TIERS[t].name.fr,
                }))}
              >
                <SelectTrigger id="cg-tier" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONCIERGE_TIERS.map((t) => (
                    <SelectItem key={t} value={t}>
                      {TIERS[t].name.fr}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-muted-foreground text-xs">
                Indicatif&nbsp;: {TIERS[tier].price.fr}. Le montant porté au
                contrat est celui que vous saisissez ci-dessous.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cg-start">Date de démarrage</Label>
              <Input
                id="cg-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cg-fee">Honoraires mensuels HT</Label>
              <Input
                id="cg-fee"
                value={fee}
                onChange={(e) => setFee(e.target.value)}
                placeholder="950"
                autoComplete="off"
              />
              <p className="text-muted-foreground text-xs">
                Le récapitulatif des prélèvements se calcule sur les trimestres
                civils&nbsp;: un contrat démarrant en novembre n&apos;occupe que
                deux mois du dernier trimestre.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label htmlFor="cg-threshold-exp">Seuil sans accord</Label>
                <Input
                  id="cg-threshold-exp"
                  value={threshold}
                  onChange={(e) => setThreshold(e.target.value)}
                  autoComplete="off"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cg-emergency">Plafond d&apos;urgence</Label>
                <Input
                  id="cg-emergency"
                  value={emergency}
                  onChange={(e) => setEmergency(e.target.value)}
                  autoComplete="off"
                />
              </div>
              <p className="text-muted-foreground col-span-2 text-xs">
                Articles 5.2 et 5.3 : ce que BSTAY peut engager sans accord
                préalable, par intervention, et en cas d&apos;urgence.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label htmlFor="cg-fund">Fonds de roulement</Label>
                <Input
                  id="cg-fund"
                  value={fundAmount}
                  onChange={(e) => setFundAmount(e.target.value)}
                  placeholder="5 000,00 €"
                  autoComplete="off"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cg-threshold">Seuil</Label>
                <Input
                  id="cg-threshold"
                  value={fundThreshold}
                  onChange={(e) => setFundThreshold(e.target.value)}
                  placeholder="1 000,00 €"
                  autoComplete="off"
                />
              </div>
              <p className="text-muted-foreground col-span-2 text-xs">
                Laissez les deux vides pour un contrat sans fonds de roulement —
                l&apos;article disparaît alors du document.
              </p>
            </div>
          </>
        ) : (
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
        )}

        <div className="space-y-2">
          <Button
            type="button"
            onClick={download}
            disabled={!data || isPending || isSaving}
            className="w-full"
          >
            <Download />
            {isSaving ? "Préparation…" : "Télécharger le PDF"}
          </Button>
          {data ? (
            <p className="text-muted-foreground truncate text-xs">{fileName}</p>
          ) : null}
        </div>
      </div>

      <div className="bg-muted/30 h-[82vh] overflow-hidden rounded-lg border">
        {docType === "CONCIERGERIE" && !contactId && !propertyId ? (
          <div className="text-muted-foreground p-8 text-sm">
            Choisissez un client pour prévisualiser le contrat.
          </div>
        ) : docType !== "CONCIERGERIE" && !rentalId ? (
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
            {doc}
          </PDFViewer>
        )}
      </div>
    </div>
  );
}
