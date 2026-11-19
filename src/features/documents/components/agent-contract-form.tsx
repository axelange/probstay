"use client";

import * as React from "react";
import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getAgentContractData } from "@/features/documents/actions/get-agent-contract-data";
import type { PickerOption } from "@/features/documents/components/contrat-preview";
import {
  AGENT_PHASES,
  AGENT_PHASE_LABELS,
  type AgentCivility,
  type AgentPhase,
} from "@/features/documents/schemas/agent-contract-schema";
import type { AgentContractData } from "@/features/documents/templates/contrat-agent-commercial";
import { COUNTRIES } from "@/lib/countries";

const CIVILITIES: { value: AgentCivility; label: string }[] = [
  { value: "MR", label: "Monsieur" },
  { value: "MRS", label: "Madame" },
];

/** The agreement is set in French with its translation, or in French alone. */
const LANGUAGES = [
  { value: "BI", label: "Bilingue — Français / English" },
  { value: "FR", label: "Français seul" },
];

const PHASES = AGENT_PHASES.map((p) => ({
  value: p,
  label: AGENT_PHASE_LABELS[p].fr,
}));

const COUNTRY_OPTIONS = COUNTRIES.map((c) => ({ value: c.code, label: c.fr }));

const EMPTY_MANUAL = {
  firstName: "",
  lastName: "",
  birthDate: "",
  birthCity: "",
  birthCountry: "",
  address: "",
  email: "",
};

const today = () => new Date().toISOString().slice(0, 10);

/**
 * The commercial agent agreement's inputs.
 *
 * Like the Property Management agreement, nothing here comes from a rental:
 * the contract is between BSTAY and a person, so the preview is a form. The
 * agent is a contact already on file — whose record then supplies the civil
 * identity the parties clause prints — or is typed in for someone the agency
 * has not entered yet.
 *
 * It keeps its own state and hands back only the assembled contract: the
 * preview has no use for the fields themselves, and holding them there would
 * add a dozen values to a component that already carries two other forms.
 */
export function AgentContractForm({
  contacts,
  startTransition,
  onData,
}: {
  contacts: PickerOption[];
  /** The preview's own transition, so one "Chargement…" covers every type. */
  startTransition: React.TransitionStartFunction;
  onData: (data: AgentContractData | null) => void;
}) {
  const [contactId, setContactId] = React.useState("");
  /** Describing the agent by hand rather than picking a contact. */
  const [useManual, setUseManual] = React.useState(false);
  const [manual, setManual] = React.useState(EMPTY_MANUAL);
  const [civility, setCivility] = React.useState<AgentCivility>("MR");
  const [rsac, setRsac] = React.useState("");
  const [effectiveDate, setEffectiveDate] = React.useState(today);
  const [signatureDate, setSignatureDate] = React.useState(today);
  const [initialPhase, setInitialPhase] =
    React.useState<AgentPhase>("BEGINNER");
  const [initialRevenue, setInitialRevenue] = React.useState("0");
  const [bilingual, setBilingual] = React.useState(true);

  // Rebuilt on every change, typed fields included, for the reason the
  // Property Management form is: waiting for a blur would leave the page
  // showing a contract one edit behind what the agent is reading.
  React.useEffect(() => {
    if (!useManual && !contactId) return;
    const timer = setTimeout(() => {
      startTransition(async () => {
        onData(
          await getAgentContractData({
            contactId: useManual ? null : contactId,
            manualAgent: useManual ? manual : null,
            civility,
            rsac,
            effectiveDate,
            signatureDate,
            initialPhase,
            initialRevenue,
            bilingual,
            place: "Cannes",
          }),
        );
      });
    }, 250);
    return () => clearTimeout(timer);
  }, [
    contactId,
    useManual,
    manual,
    civility,
    rsac,
    effectiveDate,
    signatureDate,
    initialPhase,
    initialRevenue,
    bilingual,
    startTransition,
    onData,
  ]);

  const setField =
    (key: keyof typeof EMPTY_MANUAL) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setManual((m) => ({ ...m, [key]: e.target.value }));

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="ag-contact">Agent</Label>
        <Combobox
          id="ag-contact"
          options={contacts.map((c) => ({
            value: c.id,
            label: c.label,
            hint: c.hint,
          }))}
          value={contactId || null}
          onValueChange={(v) => {
            setContactId(v);
            setUseManual(false);
          }}
          placeholder="Rechercher un contact…"
          emptyLabel="Aucun contact."
          disabled={useManual}
        />
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground text-xs underline underline-offset-2"
          onClick={() => {
            // Exclusive, as the residence is on the other contract: a contact
            // left selected behind the typed fields would be sent with them.
            setUseManual((v) => !v);
            setContactId("");
            onData(null);
          }}
        >
          {useManual ? "Revenir à la recherche" : "Saisir l'agent à la main"}
        </button>
        {!useManual ? (
          <p className="text-muted-foreground text-xs">
            Nom, naissance, adresse et courriel viennent de la fiche du contact.
            Ce qui y manque s&apos;imprime «&nbsp;[à compléter]&nbsp;»&nbsp;:
            complétez la fiche, ou saisissez l&apos;agent à la main.
          </p>
        ) : null}
      </div>

      {useManual ? (
        <div className="border-border space-y-2 border-l pl-3">
          <div className="grid grid-cols-2 gap-2">
            <Input
              value={manual.firstName}
              onChange={setField("firstName")}
              placeholder="Prénom"
              aria-label="Prénom"
              autoComplete="off"
            />
            <Input
              value={manual.lastName}
              onChange={setField("lastName")}
              placeholder="Nom"
              aria-label="Nom"
              autoComplete="off"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ag-birth" className="text-xs font-normal">
              Date de naissance
            </Label>
            <Input
              id="ag-birth"
              type="date"
              value={manual.birthDate}
              onChange={setField("birthDate")}
            />
          </div>
          <Input
            value={manual.birthCity}
            onChange={setField("birthCity")}
            placeholder="Ville de naissance"
            aria-label="Ville de naissance"
            autoComplete="off"
          />
          <Combobox
            options={COUNTRY_OPTIONS}
            value={manual.birthCountry || null}
            onValueChange={(v) => setManual((m) => ({ ...m, birthCountry: v }))}
            placeholder="Pays de naissance…"
            emptyLabel="Aucun pays."
          />
          <Input
            value={manual.address}
            onChange={setField("address")}
            placeholder="Adresse — 6 allée des Oliviers, 06400 Cannes"
            aria-label="Adresse"
            autoComplete="off"
          />
          <Input
            type="email"
            value={manual.email}
            onChange={setField("email")}
            placeholder="Courriel"
            aria-label="Courriel"
            autoComplete="off"
          />
        </div>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="ag-civility">Civilité</Label>
        <Select
          value={civility}
          onValueChange={(v) => v !== null && setCivility(v as AgentCivility)}
          items={CIVILITIES}
        >
          <SelectTrigger id="ag-civility" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CIVILITIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="ag-lang">Langue</Label>
        <Select
          value={bilingual ? "BI" : "FR"}
          onValueChange={(v) => v !== null && setBilingual(v === "BI")}
          items={LANGUAGES}
        >
          <SelectTrigger id="ag-lang" className="w-full">
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
        <p className="text-muted-foreground text-xs">
          Le français fait foi. En français seul, la clause linguistique
          disparaît du contrat.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-2">
          <Label htmlFor="ag-effective">Prise d&apos;effet</Label>
          <Input
            id="ag-effective"
            type="date"
            value={effectiveDate}
            onChange={(e) => setEffectiveDate(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ag-signed">Signature</Label>
          <Input
            id="ag-signed"
            type="date"
            value={signatureDate}
            onChange={(e) => setSignatureDate(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="ag-rsac">N° RSAC</Label>
        <Input
          id="ag-rsac"
          value={rsac}
          onChange={(e) => setRsac(e.target.value)}
          placeholder="Cannes 912 345 678"
          autoComplete="off"
        />
        <p className="text-muted-foreground text-xs">
          Laissez vide tant que l&apos;agent n&apos;est pas immatriculé&nbsp;:
          le contrat dit alors que l&apos;immatriculation est en cours.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-2">
          <Label htmlFor="ag-phase">Phase initiale</Label>
          <Select
            value={initialPhase}
            onValueChange={(v) =>
              v !== null && setInitialPhase(v as AgentPhase)
            }
            items={PHASES}
          >
            <SelectTrigger id="ag-phase" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PHASES.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="ag-revenue">CA initial HT</Label>
          <Input
            id="ag-revenue"
            value={initialRevenue}
            onChange={(e) => setInitialRevenue(e.target.value)}
            placeholder="0"
            autoComplete="off"
          />
        </div>
        <p className="text-muted-foreground col-span-2 text-xs">
          Annexe financière&nbsp;: la phase et le CA de progression dont
          l&apos;agent part. Débutant sous 50&nbsp;000&nbsp;€, Junior sous
          100&nbsp;000&nbsp;€, Senior au-delà.
        </p>
      </div>
    </>
  );
}
