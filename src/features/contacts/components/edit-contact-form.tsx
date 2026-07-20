"use client";

import * as React from "react";
import { Lock } from "lucide-react";
import { toast } from "sonner";
import type {
  ContactSpecialty,
  ContactType,
} from "@/generated/prisma/enums";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateContact } from "@/features/contacts/actions/update-contact";
import {
  CONTACT_TYPES,
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
  specialties: ContactSpecialty[];
  otherSpecialty: string | null;
  apimoId: number | null;
};

export function EditContactForm({
  contact,
  canEdit,
}: {
  contact: EditableContact;
  canEdit: boolean;
}) {
  const [form, setForm] = React.useState({
    firstName: contact.firstName ?? "",
    lastName: contact.lastName,
    email: contact.email ?? "",
    phone: contact.phone ?? "",
    iban: contact.iban ?? "",
    notes: contact.notes ?? "",
    otherSpecialty: contact.otherSpecialty ?? "",
  });
  const [types, setTypes] = React.useState<ContactType[]>(contact.types);
  const [specialties, setSpecialties] = React.useState<ContactSpecialty[]>(
    contact.specialties
  );
  const [isPending, startTransition] = React.useTransition();

  // Identity comes from APIMO on synced contacts and is rewritten by
  // every sync, so editing it here would show a change that reverts.
  const identityIsLocked = contact.apimoId !== null;
  const wantsOther = specialties.includes("OTHER");

  function set(field: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function toggle<T>(list: T[], value: T, setter: (next: T[]) => void) {
    setter(
      list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
    );
  }

  function save(event: React.FormEvent, acceptDuplicatePhone = false) {
    event.preventDefault();

    startTransition(async () => {
      const payload = {
        ...form,
        id: contact.id,
        types,
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
        <div className="flex flex-wrap items-baseline gap-2">
          <h3 className="text-sm font-medium">Identité</h3>
          {identityIsLocked ? (
            <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
              <Lock aria-hidden="true" className="size-3" />
              Géré par APIMO — à modifier dans APIMO
            </span>
          ) : null}
        </div>

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
                onChange={() => toggle(types, type, setTypes)}
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
            Coordonnées bancaires du propriétaire. Ne vient jamais d&apos;APIMO
            et n&apos;est jamais écrasé par une synchronisation.
          </p>
        </div>

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
