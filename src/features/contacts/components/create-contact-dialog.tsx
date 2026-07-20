"use client";

import * as React from "react";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";
import type { ContactSpecialty, ContactType } from "@/generated/prisma/enums";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createContact } from "@/features/contacts/actions/create-contact";
import {
  CONTACT_TYPES,
  contactTypeLabel,
} from "@/features/contacts/components/contact-type-labels";
import {
  CONTACT_SPECIALTIES,
  contactSpecialtyLabel,
} from "@/features/contacts/components/contact-specialty-labels";

const EMPTY = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  notes: "",
  otherSpecialty: "",
};

export function CreateContactDialog() {
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState(EMPTY);
  const [types, setTypes] = React.useState<ContactType[]>(["OWNER"]);
  const [specialties, setSpecialties] = React.useState<ContactSpecialty[]>([]);
  const [isPending, startTransition] = React.useTransition();

  const wantsOther = specialties.includes("OTHER");

  function reset() {
    setForm(EMPTY);
    setTypes(["OWNER"]);
    setSpecialties([]);
  }

  function toggleSpecialty(specialty: ContactSpecialty) {
    setSpecialties((current) =>
      current.includes(specialty)
        ? current.filter((s) => s !== specialty)
        : [...current, specialty]
    );
  }

  function set(field: keyof typeof EMPTY, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function toggleType(type: ContactType) {
    setTypes((current) =>
      current.includes(type)
        ? current.filter((t) => t !== type)
        : [...current, type]
    );
  }

  function submit(event: React.FormEvent, acceptDuplicatePhone = false) {
    event.preventDefault();

    startTransition(async () => {
      const result = await createContact({
        ...form,
        types,
        specialties,
        acceptDuplicatePhone,
      });

      if (result.status === "duplicate-phone") {
        // A shared line is legitimate, so this asks rather than refuses.
        // Confirming resubmits with the flag set.
        if (window.confirm(result.message)) {
          const retry = await createContact({
            ...form,
            types,
            specialties,
            acceptDuplicatePhone: true,
          });
          if (retry.status === "error") {
            toast.error(retry.message);
            return;
          }
          if (retry.status === "success") {
            toast.success(`${retry.name} a été créé.`);
            reset();
            setOpen(false);
          }
        }
        return;
      }

      if (result.status === "error") {
        toast.error(result.message);
        return;
      }

      toast.success(`${result.name} a été créé.`);
      reset();
      setOpen(false);
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger
        render={
          <Button size="sm">
            <UserPlus aria-hidden="true" />
            Nouveau contact
          </Button>
        }
      />

      <DialogContent className="sm:max-w-md">
        <form onSubmit={(e) => submit(e)}>
          <DialogHeader>
            <DialogTitle>Nouveau contact</DialogTitle>
            <DialogDescription>
              Seul le nom est obligatoire. Un contact peut cumuler plusieurs
              types.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="contact-firstname">Prénom</Label>
                <Input
                  id="contact-firstname"
                  value={form.firstName}
                  onChange={(e) => set("firstName", e.target.value)}
                  disabled={isPending}
                  autoComplete="off"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact-lastname">Nom *</Label>
                <Input
                  id="contact-lastname"
                  required
                  value={form.lastName}
                  onChange={(e) => set("lastName", e.target.value)}
                  disabled={isPending}
                  autoComplete="off"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact-email">E-mail</Label>
              <Input
                id="contact-email"
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                disabled={isPending}
                autoComplete="off"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact-phone">Téléphone</Label>
              <Input
                id="contact-phone"
                type="tel"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                disabled={isPending}
                autoComplete="off"
              />
            </div>

            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Type *</legend>
              <div className="flex flex-wrap gap-3">
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
                      disabled={isPending}
                    />
                    {contactTypeLabel(type)}
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Spécialités</legend>
              <p className="text-muted-foreground text-xs">
                Le métier du contact. Facultatif — un propriétaire ou un
                client n&apos;en a pas.
              </p>
              <div className="flex flex-wrap gap-x-3 gap-y-1.5">
                {CONTACT_SPECIALTIES.map((specialty) => (
                  <label
                    key={specialty}
                    className="flex cursor-pointer items-center gap-1.5 text-sm"
                  >
                    <input
                      type="checkbox"
                      className="size-4 cursor-pointer"
                      checked={specialties.includes(specialty)}
                      onChange={() => toggleSpecialty(specialty)}
                      disabled={isPending}
                    />
                    {contactSpecialtyLabel(specialty)}
                  </label>
                ))}
              </div>

              {/* Only once "Autre" is ticked: an always-visible free
                  field invites people to type a trade that already has
                  a checkbox. */}
              {wantsOther ? (
                <Input
                  aria-label="Préciser la spécialité"
                  placeholder="Préciser (ex. Jardinier)"
                  value={form.otherSpecialty}
                  onChange={(e) => set("otherSpecialty", e.target.value)}
                  disabled={isPending}
                  autoComplete="off"
                  className="mt-1"
                />
              ) : null}
            </fieldset>

            <div className="space-y-2">
              <Label htmlFor="contact-notes">Notes internes</Label>
              <Input
                id="contact-notes"
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                disabled={isPending}
                autoComplete="off"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={
                isPending ||
                !form.lastName.trim() ||
                types.length === 0 ||
                // Matches the schema's refine, so the button explains
                // itself rather than the form failing on submit.
                (wantsOther && !form.otherSpecialty.trim())
              }
            >
              {isPending ? "Enregistrement…" : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
