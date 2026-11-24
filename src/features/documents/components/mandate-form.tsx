"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
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
import { getMandateData } from "@/features/documents/actions/get-mandate-data";
import type { PickerOption } from "@/features/documents/components/contrat-preview";
import {
  MANDATE_SERVICES,
  MANDATE_UTILITIES,
} from "@/features/documents/mandate-clauses";
import type {
  MandateServiceKey,
  MandateUtilityKey,
} from "@/features/documents/schemas/mandate-schema";
import type { MandateData } from "@/features/documents/templates/mandat-gestion-locative";

/** The mandate is set in French with its translation, or in French alone. */
const LANGUAGES = [
  { value: "BI", label: "Bilingue — Français / English" },
  { value: "FR", label: "Français seul" },
];

const EMPTY_MANUAL = {
  address: "",
  kind: "",
  surface: "",
  rooms: "",
  bedrooms: "",
  equipment: [] as string[],
};

/** What a rent usually covers: the starting point the agent adjusts. */
const DEFAULT_UTILITIES: Record<MandateUtilityKey, boolean> = {
  electricity: true,
  water: true,
  gas: true,
  internet: true,
};

const DEFAULT_SERVICES: Record<MandateServiceKey, boolean> = {
  stayCleaning: false,
  endCleaning: true,
  linen: true,
  garden: true,
  pool: true,
};

const today = () => new Date().toISOString().slice(0, 10);

/** A labelled checkbox: ticked for "Inclus" or "Oui". */
function Check({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm">
      <input
        type="checkbox"
        className="size-4 cursor-pointer"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}

/**
 * The rental management mandate's inputs.
 *
 * Like the Property Management agreement, nothing here comes from a rental:
 * the mandate is what brings a property in. The owner is a contact on file,
 * whose record supplies section 1; the property is one of the agency's or is
 * described by hand; everything section 4 states is typed.
 *
 * It keeps its own state and hands back only the assembled mandate, as the
 * commercial agent agreement's form does.
 */
export function MandateForm({
  contacts,
  properties,
  startTransition,
  onData,
}: {
  contacts: PickerOption[];
  properties: PickerOption[];
  /** The preview's own transition, so one "Chargement…" covers every type. */
  startTransition: React.TransitionStartFunction;
  onData: (data: MandateData | null) => void;
}) {
  const [contactId, setContactId] = React.useState("");
  const [propertyId, setPropertyId] = React.useState("");
  /** Describing the property by hand rather than picking one of ours. */
  const [useManual, setUseManual] = React.useState(false);
  const [manual, setManual] = React.useState(EMPTY_MANUAL);
  const [mandateNumber, setMandateNumber] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [ownershipStatus, setOwnershipStatus] = React.useState("");
  const [registrationNumber, setRegistrationNumber] = React.useState("");
  const [condominium, setCondominium] = React.useState(false);
  const [deposit, setDeposit] = React.useState("");
  const [utilities, setUtilities] = React.useState(DEFAULT_UTILITIES);
  const [services, setServices] = React.useState(DEFAULT_SERVICES);
  const [hasPool, setHasPool] = React.useState(true);
  const [nonSmoking, setNonSmoking] = React.useState(true);
  const [bailiff, setBailiff] = React.useState(true);
  const [place, setPlace] = React.useState("Cannes");
  const [signatureDate, setSignatureDate] = React.useState(today);
  const [bilingual, setBilingual] = React.useState(true);

  // Rebuilt on every change, typed fields included, as the other forms are:
  // waiting for a blur would leave the page one edit behind.
  React.useEffect(() => {
    // An owner is needed, and a property of ours brings its own.
    if (!contactId && !propertyId) return;
    const timer = setTimeout(() => {
      startTransition(async () => {
        onData(
          await getMandateData({
            contactId: contactId || null,
            propertyId: useManual ? null : propertyId || null,
            manualProperty: useManual ? manual : null,
            mandateNumber,
            // A property of ours describes itself, from its own record; only
            // one described by hand has a description to type.
            description: useManual ? description : "",
            ownershipStatus,
            registrationNumber,
            condominium,
            deposit,
            utilities,
            services,
            hasPool,
            nonSmoking,
            bailiff,
            place,
            signatureDate,
            bilingual,
          }),
        );
      });
    }, 250);
    return () => clearTimeout(timer);
  }, [
    contactId,
    propertyId,
    useManual,
    manual,
    mandateNumber,
    description,
    ownershipStatus,
    registrationNumber,
    condominium,
    deposit,
    utilities,
    services,
    hasPool,
    nonSmoking,
    bailiff,
    place,
    signatureDate,
    bilingual,
    startTransition,
    onData,
  ]);

  /** The equipment line being typed, before it joins the list. */
  const [equipmentDraft, setEquipmentDraft] = React.useState("");

  function addEquipment() {
    const value = equipmentDraft.trim();
    if (!value) return;
    setManual((m) =>
      // Typed twice is a slip, not a second item.
      m.equipment.some((e) => e.toLowerCase() === value.toLowerCase())
        ? m
        : { ...m, equipment: [...m.equipment, value] },
    );
    setEquipmentDraft("");
  }

  const setField =
    (key: Exclude<keyof typeof EMPTY_MANUAL, "equipment">) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setManual((m) => ({ ...m, [key]: e.target.value }));

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="md-property">Bien</Label>
        <Combobox
          id="md-property"
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
            // Exclusive: a property left selected behind the typed fields
            // would be sent with them, and would decide the owner.
            setUseManual((v) => !v);
            setPropertyId("");
          }}
        >
          {useManual ? "Revenir à la recherche" : "Utiliser un autre bien"}
        </button>
        {!useManual ? (
          <p className="text-muted-foreground text-xs">
            Adresse, surface, pièces et description viennent de la fiche du
            bien.
          </p>
        ) : null}
      </div>

      {useManual ? (
        <div className="border-border space-y-2 border-l pl-3">
          <Input
            value={manual.address}
            onChange={setField("address")}
            placeholder="Adresse complète du bien"
            aria-label="Adresse du bien"
            autoComplete="off"
          />
          <Input
            value={manual.kind}
            onChange={setField("kind")}
            placeholder="Type de bien — villa avec piscine"
            aria-label="Type de bien"
            autoComplete="off"
          />
          <div className="grid grid-cols-3 gap-2">
            <Input
              value={manual.surface}
              onChange={setField("surface")}
              placeholder="320 m²"
              aria-label="Surface habitable"
              autoComplete="off"
            />
            <Input
              value={manual.rooms}
              onChange={setField("rooms")}
              placeholder="Pièces"
              aria-label="Nombre de pièces"
              autoComplete="off"
            />
            <Input
              value={manual.bedrooms}
              onChange={setField("bedrooms")}
              placeholder="Chambres"
              aria-label="Nombre de chambres"
              autoComplete="off"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="md-equipment" className="text-xs font-normal">
              Équipements
            </Label>
            {manual.equipment.length > 0 ? (
              <ul className="flex flex-wrap gap-1">
                {manual.equipment.map((item) => (
                  <li
                    key={item}
                    className="bg-muted flex items-center gap-1 rounded-md px-2 py-0.5 text-xs"
                  >
                    {item}
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-foreground cursor-pointer"
                      aria-label={`Retirer ${item}`}
                      onClick={() =>
                        setManual((m) => ({
                          ...m,
                          equipment: m.equipment.filter((e) => e !== item),
                        }))
                      }
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            <div className="flex gap-2">
              <Input
                id="md-equipment"
                value={equipmentDraft}
                onChange={(e) => setEquipmentDraft(e.target.value)}
                onKeyDown={(e) => {
                  // Enter adds the line; it must not submit anything around it.
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addEquipment();
                  }
                }}
                placeholder="Climatisation / Air conditioning"
                autoComplete="off"
              />
              <Button type="button" variant="outline" onClick={addEquipment}>
                Ajouter
              </Button>
            </div>
            <p className="text-muted-foreground text-xs">
              Un équipement par ligne. L&apos;anglais est facultatif, après
              «&nbsp;/&nbsp;»&nbsp;; la liste anglaise ne s&apos;imprime que si
              chaque ligne en a un.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="md-description" className="text-xs font-normal">
              Description du bien
            </Label>
            <textarea
              id="md-description"
              className="border-input bg-background focus-visible:ring-ring/50 w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-[3px] disabled:opacity-50"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              placeholder="Texte libre — une ligne vide sépare deux paragraphes."
            />
          </div>
        </div>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="md-owner">Propriétaire</Label>
        <Combobox
          id="md-owner"
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
        <p className="text-muted-foreground text-xs">
          Particulier ou société : la section 1 vient de la fiche du contact, et
          ce qui y manque s&apos;imprime «&nbsp;[à compléter]&nbsp;». Un bien de
          l&apos;agence qui a un propriétaire en fiche l&apos;emporte sur ce
          choix.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-2">
          <Label htmlFor="md-number">N° de mandat</Label>
          <Input
            id="md-number"
            value={mandateNumber}
            onChange={(e) => setMandateNumber(e.target.value)}
            placeholder="Registre des mandats"
            autoComplete="off"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="md-lang">Langue</Label>
          <Select
            value={bilingual ? "BI" : "FR"}
            onValueChange={(v) => v !== null && setBilingual(v === "BI")}
            items={LANGUAGES}
          >
            <SelectTrigger id="md-lang" className="w-full">
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
      </div>

      <div className="space-y-2">
        <Label htmlFor="md-status">Informations légales</Label>
        <Input
          id="md-status"
          value={ownershipStatus}
          onChange={(e) => setOwnershipStatus(e.target.value)}
          placeholder="Qualité du propriétaire — pleine propriété"
          aria-label="Qualité du propriétaire"
          autoComplete="off"
        />
        <Input
          value={registrationNumber}
          onChange={(e) => setRegistrationNumber(e.target.value)}
          placeholder="N° d'enregistrement du meublé de tourisme"
          aria-label="Numéro d'enregistrement du meublé de tourisme"
          autoComplete="off"
        />
        <Check
          label="Règlement de copropriété applicable"
          checked={condominium}
          onChange={setCondominium}
        />
      </div>

      <div className="space-y-1">
        <Check
          label="Le bien a une piscine"
          checked={hasPool}
          onChange={setHasPool}
        />
        <p className="text-muted-foreground text-xs">
          Décochée, l&apos;article 9.4.2 sur la sécurité des piscines et la
          ligne «&nbsp;Entretien piscine&nbsp;» disparaissent du mandat.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="md-deposit">Dépôt de garantie (4.1)</Label>
        <Input
          id="md-deposit"
          value={deposit}
          onChange={(e) => setDeposit(e.target.value)}
          placeholder="10 000 €"
          autoComplete="off"
        />
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Charges incluses (4.2)</legend>
        {MANDATE_UTILITIES.map((u) => (
          <Check
            key={u.key}
            label={u.fr}
            checked={utilities[u.key]}
            onChange={(v) => setUtilities((s) => ({ ...s, [u.key]: v }))}
          />
        ))}
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">
          Prestations incluses (4.3)
        </legend>
        {MANDATE_SERVICES.filter((sv) => sv.key !== "pool" || hasPool).map(
          (sv) => (
            <Check
              key={sv.key}
              label={sv.fr}
              checked={services[sv.key]}
              onChange={(v) => setServices((s) => ({ ...s, [sv.key]: v }))}
            />
          ),
        )}
        <p className="text-muted-foreground text-xs">
          Une ligne décochée s&apos;imprime «&nbsp;Non inclus&nbsp;».
        </p>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">
          Conditions particulières (4.4)
        </legend>
        <Check
          label="Bien non-fumeur"
          checked={nonSmoking}
          onChange={setNonSmoking}
        />
        <Check
          label="Huissier (commissaire de justice)"
          checked={bailiff}
          onChange={setBailiff}
        />
      </fieldset>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-2">
          <Label htmlFor="md-place">Fait à</Label>
          <Input
            id="md-place"
            value={place}
            onChange={(e) => setPlace(e.target.value)}
            autoComplete="off"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="md-signed">Le</Label>
          <Input
            id="md-signed"
            type="date"
            value={signatureDate}
            onChange={(e) => setSignatureDate(e.target.value)}
          />
        </div>
      </div>
    </>
  );
}
