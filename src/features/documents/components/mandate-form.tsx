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
import { BilingualField } from "@/features/contacts/components/bilingual-field";
import { getMandateData } from "@/features/documents/actions/get-mandate-data";
import type { PickerOption } from "@/features/documents/components/contrat-preview";
import { MandateEquipmentDialog } from "@/features/documents/components/mandate-equipment-dialog";
import {
  MANDATE_OWNERSHIP,
  MANDATE_PETS,
  MANDATE_PROPERTY_KINDS,
  MANDATE_SERVICES,
  MANDATE_UTILITIES,
} from "@/features/documents/mandate-clauses";
import type {
  MandateInput,
  MandateServiceKey,
  MandateUtilityKey,
} from "@/features/documents/schemas/mandate-schema";
import type { MandateData } from "@/features/documents/templates/mandat-gestion-locative";
import { servicesFromCodes } from "@/features/properties/utils/apimo-services";

/** The mandate is set in French with its translation, or in French alone. */
const LANGUAGES = [
  { value: "BI", label: "Bilingue — Français / English" },
  { value: "FR", label: "Français seul" },
];

type ManualProperty = NonNullable<MandateInput["manualProperty"]>;

const EMPTY_MANUAL: ManualProperty = {
  address: "",
  kind: "",
  surface: "",
  rooms: "",
  bedrooms: "",
  equipment: [],
};

const PROPERTY_KINDS = MANDATE_PROPERTY_KINDS.map((k) => ({
  value: k.key,
  label: k.fr,
}));

const PETS = MANDATE_PETS.map((p) => ({ value: p.key, label: p.fr }));

const OWNERSHIP = MANDATE_OWNERSHIP.map((o) => ({
  value: o.key,
  label: o.fr,
}));

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
  /** The mandate as the server last assembled it. */
  const [built, setBuilt] = React.useState<MandateData | null>(null);
  /** Appendix 1: the pricing schedule's sheets, as image data. */
  const [pricingPages, setPricingPages] = React.useState<string[]>([]);
  const [description, setDescription] = React.useState("");
  const [descriptionEn, setDescriptionEn] = React.useState("");
  const [ownershipStatus, setOwnershipStatus] =
    React.useState<MandateInput["ownershipStatus"]>("");
  const [registrationNumber, setRegistrationNumber] = React.useState("");
  const [condominium, setCondominium] = React.useState(false);
  const [deposit, setDeposit] = React.useState("");
  const [utilities, setUtilities] = React.useState(DEFAULT_UTILITIES);
  const [services, setServices] = React.useState(DEFAULT_SERVICES);
  const [hasPool, setHasPool] = React.useState(true);
  const [smoking, setSmoking] = React.useState(false);
  const [bailiff, setBailiff] = React.useState(true);
  const [pets, setPets] = React.useState<MandateInput["pets"]>("NO");
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
        setBuilt(
          await getMandateData({
            contactId: contactId || null,
            propertyId: useManual ? null : propertyId || null,
            manualProperty: useManual ? manual : null,
            mandateNumber,
            // A property of ours describes itself, from its own record; only
            // one described by hand has a description to type.
            description: useManual ? description : "",
            descriptionEn: useManual ? descriptionEn : "",
            ownershipStatus,
            registrationNumber,
            condominium,
            deposit,
            utilities,
            services,
            hasPool,
            smoking,
            bailiff,
            pets,
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
    descriptionEn,
    ownershipStatus,
    registrationNumber,
    condominium,
    deposit,
    utilities,
    services,
    hasPool,
    smoking,
    bailiff,
    pets,
    place,
    signatureDate,
    bilingual,
    startTransition,
  ]);

  // The pricing schedule is laid over what the server assembled, here: a
  // file's worth of image data has no business going there and back on every
  // keystroke.
  React.useEffect(() => {
    onData(built ? { ...built, pricingPages } : null);
  }, [built, pricingPages, onData]);

  /** Reads the chosen images as data URLs, in the order they were chosen. */
  async function choosePricing(files: FileList | null) {
    const pages = await Promise.all(
      Array.from(files ?? []).map(
        (file) =>
          new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(file);
          }),
      ),
    );
    setPricingPages(pages);
  }

  /** The owner the chosen property has on file, who is then the mandate's. */
  const fileOwner = useManual
    ? undefined
    : properties.find((p) => p.id === propertyId)?.ownerName;

  /**
   * The bailiff's starting answer follows the kind of property: the
   * inspections by a commissaire de justice are a villa's, so a flat starts
   * unticked. Only a starting point — set when the property is chosen, and the
   * box stays the agent's to change afterwards.
   */
  const defaultBailiff = (isApartment: boolean) => setBailiff(!isApartment);

  const setField =
    (key: "address" | "rooms" | "bedrooms") =>
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
            // A contact picked before the property must not linger behind an
            // owner the property brings itself.
            if (properties.find((p) => p.id === v)?.ownerName) setContactId("");
            defaultBailiff(
              properties.find((p) => p.id === v)?.isApartment ?? false,
            );
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
            Adresse, type, surface, pièces, équipements et description viennent
            de la fiche du bien.
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
          <Select
            value={manual.kind || null}
            onValueChange={(v) => {
              if (v === null) return;
              setManual((m) => ({ ...m, kind: v }));
              defaultBailiff(v === "APARTMENT");
            }}
            items={PROPERTY_KINDS}
          >
            <SelectTrigger className="w-full" aria-label="Type de bien">
              <SelectValue placeholder="Type de bien" />
            </SelectTrigger>
            <SelectContent>
              {PROPERTY_KINDS.map((k) => (
                <SelectItem key={k.value} value={k.value}>
                  {k.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="grid grid-cols-3 gap-2">
            <div className="relative">
              <Input
                value={manual.surface}
                // Digits only: the unit is printed beside the field and on the
                // mandate, so there is nothing else to type here.
                onChange={(e) =>
                  setManual((m) => ({
                    ...m,
                    surface: e.target.value.replace(/\D/g, "").slice(0, 6),
                  }))
                }
                inputMode="numeric"
                placeholder="Surface"
                aria-label="Surface habitable en mètres carrés"
                autoComplete="off"
                className="pr-9"
              />
              <span
                aria-hidden
                className="text-muted-foreground pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm"
              >
                m²
              </span>
            </div>
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
            <p className="text-xs">Équipements</p>
            {manual.equipment.length > 0 ? (
              <p className="text-muted-foreground text-xs">
                {servicesFromCodes(manual.equipment)
                  .map((e) => e.fr)
                  .join(", ")}
              </p>
            ) : null}
            <MandateEquipmentDialog
              selected={manual.equipment}
              onChange={(equipment) => setManual((m) => ({ ...m, equipment }))}
            />
          </div>

          <BilingualField
            id="md-description"
            label="Description du bien"
            labelClassName="text-xs font-normal"
            rows={5}
            placeholder="Texte libre — une ligne vide sépare deux paragraphes."
            fr={description}
            en={descriptionEn}
            onChangeFr={setDescription}
            onChangeEn={setDescriptionEn}
          />
        </div>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="md-owner">Propriétaire</Label>
        {fileOwner ? (
          // Not a choice: the property decides. Offering the picker here would
          // let a mandate be drawn up in the name of someone who does not own
          // the property it is about.
          <>
            <Input id="md-owner" value={fileOwner} readOnly disabled />
            <p className="text-muted-foreground text-xs">
              Propriétaire enregistré sur la fiche du bien. Pour en changer,
              modifiez la fiche.
            </p>
          </>
        ) : (
          <>
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
              Particulier ou société : la section 1 vient de la fiche du
              contact, et ce qui y manque s&apos;imprime «&nbsp;[à
              compléter]&nbsp;».
            </p>
          </>
        )}
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
        <Select
          value={ownershipStatus || null}
          onValueChange={(v) => v !== null && setOwnershipStatus(v)}
          items={OWNERSHIP}
        >
          <SelectTrigger
            id="md-status"
            className="w-full"
            aria-label="Qualité du propriétaire"
          >
            <SelectValue placeholder="Qualité du propriétaire" />
          </SelectTrigger>
          <SelectContent>
            {OWNERSHIP.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          value={registrationNumber}
          onChange={(e) => setRegistrationNumber(e.target.value)}
          placeholder="N° d'enregistrement du meublé de tourisme"
          aria-label="Numéro d'enregistrement du meublé de tourisme"
          autoComplete="off"
        />
        <p className="text-muted-foreground text-xs">
          Laissé vide, le mandat indique «&nbsp;Enregistrement en cours, CERFA
          fourni en annexe&nbsp;».
        </p>
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
        <Check label="Bien fumeur" checked={smoking} onChange={setSmoking} />
        <Check
          label="Huissier (commissaire de justice)"
          checked={bailiff}
          onChange={setBailiff}
        />
        <div className="space-y-2">
          <Label htmlFor="md-pets" className="font-normal">
            Animaux autorisés
          </Label>
          <Select
            value={pets}
            onValueChange={(v) => v !== null && setPets(v)}
            items={PETS}
          >
            <SelectTrigger id="md-pets" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PETS.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </fieldset>

      <div className="space-y-2">
        <Label htmlFor="md-pricing">Grille tarifaire (annexe 1)</Label>
        <Input
          id="md-pricing"
          type="file"
          accept="image/png,image/jpeg"
          multiple
          onChange={(e) => void choosePricing(e.target.files)}
        />
        <p className="text-muted-foreground text-xs">
          {pricingPages.length > 0
            ? `${pricingPages.length} page${pricingPages.length > 1 ? "s" : ""} en annexe 1.`
            : "Image PNG ou JPEG, une par page. Sans fichier, l’annexe 1 annonce une grille jointe à part."}
        </p>
        {pricingPages.length > 0 ? (
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground text-xs underline underline-offset-2"
            onClick={() => setPricingPages([])}
          >
            Retirer la grille
          </button>
        ) : null}
      </div>

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
