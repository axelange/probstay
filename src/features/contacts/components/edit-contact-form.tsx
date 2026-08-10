"use client";

import * as React from "react";
import { Lock } from "lucide-react";
import { toast } from "sonner";
import type {
  ContactKind,
  ContactSpecialty,
  ContactType,
} from "@/generated/prisma/enums";
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
import { updateContact } from "@/features/contacts/actions/update-contact";
import {
  CONTACT_TYPES,
  ID_DOC_TYPES,
  contactTypeLabel,
} from "@/features/contacts/components/contact-type-labels";
import {
  CONTACT_SPECIALTIES,
  contactSpecialtyLabel,
} from "@/features/contacts/components/contact-specialty-labels";

export type EditableContact = {
  id: string;
  firstName: string | null;
  lastName: string;
  email: string | null;
  phone: string | null;
  iban: string | null;
  notes: string | null;
  types: ContactType[];
  kind: ContactKind;
  company: {
    legalForm: string | null;
    registrationNumber: string | null;
    registeredOffice: string | null;
    repFirstName: string | null;
    repLastName: string | null;
    repCapacity: string | null;
    repBirthDate: Date | null;
    repBirthPlace: string | null;
    repNationality: string | null;
    paraHotelRegime: boolean;
  } | null;
  // Civil identity of an individual (contracts).
  birthDate: Date | null;
  birthPlace: string | null;
  nationality: string | null;
  idDocType: string | null;
  idDocNumber: string | null;
  address: string | null;
  specialties: ContactSpecialty[];
  otherSpecialty: string | null;
  apimoId: number | null;
};

/** A @db.Date arrives as a Date at UTC midnight — yyyy-mm-dd for the input. */
function toDateInput(date: Date | null): string {
  return date ? new Date(date).toISOString().slice(0, 10) : "";
}

export function EditContactForm({
  contact,
  canEdit,
  canSeeBankingDetails,
}: {
  contact: EditableContact;
  canEdit: boolean;
  /** Narrower than canEdit: an Owner also tagged Prestataire is visible
   *  to everyone, but their IBAN is not. */
  canSeeBankingDetails: boolean;
}) {
  const [form, setForm] = React.useState({
    firstName: contact.firstName ?? "",
    lastName: contact.lastName,
    email: contact.email ?? "",
    phone: contact.phone ?? "",
    iban: contact.iban ?? "",
    notes: contact.notes ?? "",
    otherSpecialty: contact.otherSpecialty ?? "",
    // Company block — only sent when kind is COMPANY.
    legalForm: contact.company?.legalForm ?? "",
    registrationNumber: contact.company?.registrationNumber ?? "",
    registeredOffice: contact.company?.registeredOffice ?? "",
    repFirstName: contact.company?.repFirstName ?? "",
    repLastName: contact.company?.repLastName ?? "",
    repCapacity: contact.company?.repCapacity ?? "",
    repBirthDate: toDateInput(contact.company?.repBirthDate ?? null),
    repBirthPlace: contact.company?.repBirthPlace ?? "",
    repNationality: contact.company?.repNationality ?? "",
    paraHotelRegime: contact.company?.paraHotelRegime ?? false,
    // Individual civil identity.
    birthDate: toDateInput(contact.birthDate),
    birthPlace: contact.birthPlace ?? "",
    nationality: contact.nationality ?? "",
    idDocType: contact.idDocType ?? "",
    idDocNumber: contact.idDocNumber ?? "",
    address: contact.address ?? "",
  });
  const [kind, setKind] = React.useState<ContactKind>(contact.kind);
  const [types, setTypes] = React.useState<ContactType[]>(contact.types);
  const [specialties, setSpecialties] = React.useState<ContactSpecialty[]>(
    contact.specialties
  );
  const [isPending, startTransition] = React.useTransition();

  // Identity comes from APIMO on synced contacts and is rewritten by
  // every sync, so editing it here would show a change that reverts.
  const identityIsLocked = contact.apimoId !== null;
  const wantsOther = specialties.includes("OTHER");
  const isCompany = kind === "COMPANY";

  function set(field: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function toggle<T>(list: T[], value: T, setter: (next: T[]) => void) {
    setter(
      list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
    );
  }

  // Prospect is exclusive: picking it clears the rest, any other clears
  // it. Matches the database CHECK.
  function toggleType(type: ContactType) {
    setTypes((current) => {
      if (current.includes(type)) return current.filter((t) => t !== type);
      if (type === "PROSPECT") return ["PROSPECT"];
      return [...current.filter((t) => t !== "PROSPECT"), type];
    });
  }

  function save(event: React.FormEvent, acceptDuplicatePhone = false) {
    event.preventDefault();

    startTransition(async () => {
      const payload = {
        ...form,
        id: contact.id,
        types,
        kind,
        specialties,
        acceptDuplicatePhone,
      };

      const result = await updateContact(payload);

      if (result.status === "duplicate-phone") {
        // A shared line is legitimate, so this asks rather than refuses.
        if (window.confirm(result.message)) {
          const retry = await updateContact({
            ...payload,
            acceptDuplicatePhone: true,
          });
          if (retry.status === "error") toast.error(retry.message);
          else if (retry.status === "success") toast.success("Contact enregistré.");
        }
        return;
      }

      if (result.status === "error") {
        toast.error(result.message);
        return;
      }

      toast.success("Contact enregistré.");
    });
  }

  const disabled = isPending || !canEdit;

  return (
    <form onSubmit={(e) => save(e)} className="space-y-6">
      <section className="space-y-3">
        <h3 className="text-sm font-medium">Nature</h3>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {(["INDIVIDUAL", "COMPANY"] as const).map((k) => (
            <label
              key={k}
              className="flex cursor-pointer items-center gap-1.5 text-sm"
            >
              <input
                type="radio"
                name="kind"
                className="size-4 cursor-pointer"
                checked={kind === k}
                onChange={() => setKind(k)}
                disabled={disabled}
              />
              {k === "INDIVIDUAL" ? "Particulier" : "Société"}
            </label>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-baseline gap-2">
          <h3 className="text-sm font-medium">
            {isCompany ? "Société" : "Identité"}
          </h3>
          {identityIsLocked ? (
            <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
              <Lock aria-hidden="true" className="size-3" />
              Géré par APIMO — à modifier dans APIMO
            </span>
          ) : null}
        </div>

        {isCompany ? (
          <div className="space-y-2">
            <Label htmlFor="lastName">Dénomination sociale *</Label>
            <Input
              id="lastName"
              required
              value={form.lastName}
              onChange={(e) => set("lastName", e.target.value)}
              disabled={disabled || identityIsLocked}
              autoComplete="off"
            />
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="firstName">Prénom</Label>
              <Input
                id="firstName"
                value={form.firstName}
                onChange={(e) => set("firstName", e.target.value)}
                disabled={disabled || identityIsLocked}
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Nom *</Label>
              <Input
                id="lastName"
                required
                value={form.lastName}
                onChange={(e) => set("lastName", e.target.value)}
                disabled={disabled || identityIsLocked}
                autoComplete="off"
              />
            </div>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              disabled={disabled || identityIsLocked}
              autoComplete="off"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Téléphone</Label>
            <Input
              id="phone"
              type="tel"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              disabled={disabled || identityIsLocked}
              autoComplete="off"
            />
          </div>
        </div>
      </section>

      {isCompany ? (
        <section className="space-y-4 rounded-md border p-3">
          <p className="text-muted-foreground text-xs">
            Informations pour les contrats. Certaines sont synchronisées
            depuis APIMO (siège, représentant), d&apos;autres depuis le
            commentaire privé APIMO (forme sociale, immatriculation, qualité)
            ou saisies ici. Les saisies BSTAY survivent aux synchronisations.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="legalForm">Forme sociale</Label>
              <Input
                id="legalForm"
                placeholder="Société civile particulière, SARL, SAS…"
                value={form.legalForm}
                onChange={(e) => set("legalForm", e.target.value)}
                disabled={disabled}
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="registrationNumber">
                Numéro d&apos;immatriculation
              </Label>
              <Input
                id="registrationNumber"
                placeholder="RCS, RCI, SIREN…"
                value={form.registrationNumber}
                onChange={(e) => set("registrationNumber", e.target.value)}
                disabled={disabled}
                autoComplete="off"
                className="font-mono text-xs"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="registeredOffice">Siège social</Label>
            <Input
              id="registeredOffice"
              value={form.registeredOffice}
              onChange={(e) => set("registeredOffice", e.target.value)}
              disabled={disabled}
              autoComplete="off"
            />
          </div>

          <label className="flex items-start gap-3 rounded-md border p-3">
            <input
              type="checkbox"
              className="mt-0.5 size-4"
              checked={form.paraHotelRegime}
              onChange={(e) =>
                setForm((f) => ({ ...f, paraHotelRegime: e.target.checked }))
              }
              disabled={disabled}
            />
            <span className="space-y-1">
              <span className="block text-sm font-medium">
                Régime parahôtelier (TVA 10 %)
              </span>
              <span className="text-muted-foreground block text-xs">
                Ajoute une TVA à 10 % sur le net propriétaire dans les documents
                (contrat, confirmation). Sans cela, les montants sont exprimés HT.
              </span>
            </span>
          </label>

          <div className="space-y-3">
            <p className="text-sm font-medium">Représentant légal</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="repFirstName">Prénom</Label>
                <Input
                  id="repFirstName"
                  value={form.repFirstName}
                  onChange={(e) => set("repFirstName", e.target.value)}
                  disabled={disabled}
                  autoComplete="off"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="repLastName">Nom</Label>
                <Input
                  id="repLastName"
                  value={form.repLastName}
                  onChange={(e) => set("repLastName", e.target.value)}
                  disabled={disabled}
                  autoComplete="off"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="repCapacity">Qualité</Label>
                <Input
                  id="repCapacity"
                  placeholder="Gérant, Président…"
                  value={form.repCapacity}
                  onChange={(e) => set("repCapacity", e.target.value)}
                  disabled={disabled}
                  autoComplete="off"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="repBirthDate">Date de naissance</Label>
                <Input
                  id="repBirthDate"
                  type="date"
                  value={form.repBirthDate}
                  onChange={(e) => set("repBirthDate", e.target.value)}
                  disabled={disabled}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="repBirthPlace">Lieu de naissance</Label>
                <Input
                  id="repBirthPlace"
                  value={form.repBirthPlace}
                  onChange={(e) => set("repBirthPlace", e.target.value)}
                  disabled={disabled}
                  autoComplete="off"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="repNationality">Nationalité(s)</Label>
                <Input
                  id="repNationality"
                  placeholder="Suisse / Russe"
                  value={form.repNationality}
                  onChange={(e) => set("repNationality", e.target.value)}
                  disabled={disabled}
                  autoComplete="off"
                />
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {!isCompany ? (
        <section className="space-y-3">
          <h3 className="text-sm font-medium">Identité civile</h3>
          <p className="text-muted-foreground text-xs">
            Requise pour les contrats. Propre à BSTAY — jamais issue d&apos;APIMO
            ni écrasée par une synchronisation.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="birthDate">Date de naissance</Label>
              <Input
                id="birthDate"
                type="date"
                value={form.birthDate}
                onChange={(e) => set("birthDate", e.target.value)}
                disabled={disabled}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="birthPlace">Lieu de naissance</Label>
              <Input
                id="birthPlace"
                value={form.birthPlace}
                onChange={(e) => set("birthPlace", e.target.value)}
                disabled={disabled}
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nationality">Nationalité(s)</Label>
              <Input
                id="nationality"
                placeholder="Française"
                value={form.nationality}
                onChange={(e) => set("nationality", e.target.value)}
                disabled={disabled}
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="idDocType">Pièce d&apos;identité</Label>
              {/* items lets Base UI resolve the selected label without
                  opening the popup. */}
              <Select
                value={form.idDocType || null}
                onValueChange={(v) => v !== null && set("idDocType", v)}
                items={ID_DOC_TYPES.map((t) => ({ value: t.value, label: t.label }))}
                disabled={disabled}
              >
                <SelectTrigger id="idDocType" className="w-full">
                  <SelectValue placeholder="Choisir…" />
                </SelectTrigger>
                <SelectContent>
                  {ID_DOC_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Adresse</Label>
              <Input
                id="address"
                value={form.address}
                onChange={(e) => set("address", e.target.value)}
                disabled={disabled}
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="idDocNumber">Numéro de la pièce</Label>
              <Input
                id="idDocNumber"
                value={form.idDocNumber}
                onChange={(e) => set("idDocNumber", e.target.value)}
                disabled={disabled}
                autoComplete="off"
                className="font-mono text-xs sm:max-w-xs"
              />
            </div>
          </div>
        </section>
      ) : null}

      <section className="space-y-3">
        <h3 className="text-sm font-medium">Type *</h3>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {CONTACT_TYPES.map((type) => (
            <label
              key={type}
              className="flex cursor-pointer items-center gap-1.5 text-sm"
            >
              <input
                type="checkbox"
                className="size-4 cursor-pointer"
                checked={types.includes(type)}
                onChange={() => toggleType(type)}
                disabled={disabled}
              />
              {contactTypeLabel(type)}
            </label>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-medium">Spécialités</h3>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {CONTACT_SPECIALTIES.map((specialty) => (
            <label
              key={specialty}
              className="flex cursor-pointer items-center gap-1.5 text-sm"
            >
              <input
                type="checkbox"
                className="size-4 cursor-pointer"
                checked={specialties.includes(specialty)}
                onChange={() => toggle(specialties, specialty, setSpecialties)}
                disabled={disabled}
              />
              {contactSpecialtyLabel(specialty)}
            </label>
          ))}
        </div>

        {wantsOther ? (
          <Input
            aria-label="Préciser la spécialité"
            placeholder="Préciser (ex. Jardinier)"
            value={form.otherSpecialty}
            onChange={(e) => set("otherSpecialty", e.target.value)}
            disabled={disabled}
            autoComplete="off"
            className="sm:max-w-xs"
          />
        ) : null}
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-medium">Interne</h3>
        {/* Omitted rather than disabled when not permitted: an empty
            field reads as "no IBAN recorded", which is a different
            statement from "you may not see it". */}
        {canSeeBankingDetails ? (
          <div className="space-y-2">
            <Label htmlFor="iban">IBAN</Label>
            <Input
              id="iban"
              value={form.iban}
              onChange={(e) => set("iban", e.target.value)}
              disabled={disabled}
              autoComplete="off"
              className="font-mono text-xs sm:max-w-md"
            />
            <p className="text-muted-foreground text-xs">
              Coordonnées bancaires du propriétaire. Ne vient jamais
              d&apos;APIMO et n&apos;est jamais écrasé par une
              synchronisation.
            </p>
          </div>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="notes">Notes internes</Label>
          <Input
            id="notes"
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            disabled={disabled}
            autoComplete="off"
          />
        </div>
      </section>

      {canEdit ? (
        <div className="flex items-center gap-3">
          <Button
            type="submit"
            disabled={
              disabled ||
              !form.lastName.trim() ||
              types.length === 0 ||
              (wantsOther && !form.otherSpecialty.trim())
            }
          >
            {isPending ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </div>
      ) : null}
    </form>
  );
}
