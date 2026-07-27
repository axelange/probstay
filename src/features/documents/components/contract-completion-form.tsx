"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CircleAlert, CircleCheck } from "lucide-react";
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
import { ID_DOC_TYPES } from "@/features/contacts/components/contact-type-labels";
import { saveContractCompletion } from "@/features/documents/actions/save-contract-completion";
import type { CompletionData } from "@/features/documents/services/build-completion-data";

/**
 * The contract step's completion form: every field the documents need,
 * shown with its current value so the agent can correct the client on the
 * spot. Email is displayed but greyed — it is the individual's identity
 * key, changed only from the contact page. Saving writes back to the
 * sources (contact / rental), then the readiness re-evaluates.
 */
export function ContractCompletionForm({
  rentalId,
  data,
  missingKeys,
  complete,
}: {
  rentalId: string;
  data: CompletionData;
  missingKeys: string[];
  complete: boolean;
}) {
  const router = useRouter();
  const t = data.tenant;
  const isCompany = t.kind === "COMPANY";
  const ownerIsCompany = data.owner?.kind === "COMPANY";

  const [form, setForm] = React.useState({
    firstName: t.firstName ?? "",
    lastName: t.lastName,
    phone: t.phone ?? "",
    birthDate: t.birthDate ?? "",
    birthPlace: t.birthPlace ?? "",
    nationality: t.nationality ?? "",
    idDocType: t.idDocType ?? "",
    idDocNumber: t.idDocNumber ?? "",
    // Tenant company block.
    legalForm: t.company?.legalForm ?? "",
    registrationNumber: t.company?.registrationNumber ?? "",
    registeredOffice: t.company?.registeredOffice ?? "",
    repFirstName: t.company?.repFirstName ?? "",
    repLastName: t.company?.repLastName ?? "",
    repCapacity: t.company?.repCapacity ?? "",
    // Owner company block.
    oLegalForm: data.owner?.company?.legalForm ?? "",
    oRegistrationNumber: data.owner?.company?.registrationNumber ?? "",
    oRegisteredOffice: data.owner?.company?.registeredOffice ?? "",
    oRepFirstName: data.owner?.company?.repFirstName ?? "",
    oRepLastName: data.owner?.company?.repLastName ?? "",
    oRepCapacity: data.owner?.company?.repCapacity ?? "",
    securityDepositAmount: data.securityDepositAmount?.toString() ?? "",
  });
  const [isPending, startTransition] = React.useTransition();
  const set = (k: keyof typeof form, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const miss = (key: string) => missingKeys.includes(key);
  // A missing required field gets an amber ring so the agent sees at a
  // glance what blocks the documents.
  const missCls = (key: string) =>
    miss(key) ? "border-amber-500 ring-1 ring-amber-500/40" : "";

  function save(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await saveContractCompletion({
        rentalId,
        tenant: {
          firstName: form.firstName,
          lastName: form.lastName,
          phone: form.phone,
          birthDate: form.birthDate,
          birthPlace: form.birthPlace,
          nationality: form.nationality,
          idDocType: form.idDocType,
          idDocNumber: form.idDocNumber,
          ...(isCompany
            ? {
                company: {
                  legalForm: form.legalForm,
                  registrationNumber: form.registrationNumber,
                  registeredOffice: form.registeredOffice,
                  repFirstName: form.repFirstName,
                  repLastName: form.repLastName,
                  repCapacity: form.repCapacity,
                },
              }
            : {}),
        },
        ...(ownerIsCompany
          ? {
              ownerCompany: {
                legalForm: form.oLegalForm,
                registrationNumber: form.oRegistrationNumber,
                registeredOffice: form.oRegisteredOffice,
                repFirstName: form.oRepFirstName,
                repLastName: form.oRepLastName,
                repCapacity: form.oRepCapacity,
              },
            }
          : {}),
        securityDepositAmount: form.securityDepositAmount,
      });
      if (result.status === "error") {
        toast.error(result.message);
        return;
      }
      toast.success("Informations enregistrées.");
      router.refresh();
    });
  }

  const field = (
    key: string,
    id: keyof typeof form,
    label: string,
    opts: { type?: string; placeholder?: string; mono?: boolean } = {}
  ) => (
    <div className="space-y-1.5">
      <Label htmlFor={`cc-${id}`} className="text-xs">
        {label}
      </Label>
      <Input
        id={`cc-${id}`}
        type={opts.type ?? "text"}
        placeholder={opts.placeholder}
        value={form[id]}
        onChange={(e) => set(id, e.target.value)}
        disabled={isPending}
        autoComplete="off"
        className={[
          "h-8 text-sm",
          opts.mono ? "font-mono text-xs" : "",
          missCls(key),
        ].join(" ")}
      />
    </div>
  );

  return (
    <form onSubmit={save} className="space-y-4">
      {complete ? (
        <p className="flex items-center gap-1.5 text-sm text-emerald-600">
          <CircleCheck aria-hidden="true" className="size-4" />
          Toutes les informations requises sont complètes.
        </p>
      ) : (
        <p className="flex items-center gap-1.5 text-sm text-amber-600">
          <CircleAlert aria-hidden="true" className="size-4" />
          {missingKeys.length} champ{missingKeys.length > 1 ? "s" : ""} requis
          manquant{missingKeys.length > 1 ? "s" : ""} pour générer les
          documents.
        </p>
      )}

      <div className="space-y-3 rounded-md border p-3">
        <p className="text-sm font-medium">
          Locataire{isCompany ? " (société)" : ""}
          {t.apimoLocked ? (
            <span className="text-muted-foreground ml-2 text-xs font-normal">
              identité gérée par APIMO
            </span>
          ) : null}
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          {isCompany ? (
            field("tenant.name", "lastName", "Dénomination sociale")
          ) : (
            <>
              {field("tenant.firstName", "firstName", "Prénom")}
              {field("tenant.name", "lastName", "Nom")}
            </>
          )}
          <div className="space-y-1.5">
            <Label className="text-xs">E-mail</Label>
            {/* Identity key — visible for context, changed only from the
                contact page. */}
            <Input
              value={t.email ?? ""}
              disabled
              className="text-muted-foreground h-8 text-sm"
            />
          </div>
          {field("tenant.phone", "phone", "Téléphone", { type: "tel" })}
        </div>

        {isCompany ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {field("tenant.legalForm", "legalForm", "Forme juridique", {
              placeholder: "SARL, SCI…",
            })}
            {field(
              "tenant.registrationNumber",
              "registrationNumber",
              "N° d'immatriculation",
              { mono: true }
            )}
            <div className="sm:col-span-2">
              {field(
                "tenant.registeredOffice",
                "registeredOffice",
                "Siège social"
              )}
            </div>
            {field("tenant.rep", "repFirstName", "Représentant — prénom")}
            {field("tenant.rep", "repLastName", "Représentant — nom")}
            {field("tenant.repCapacity", "repCapacity", "Qualité", {
              placeholder: "Gérant, Président…",
            })}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {field("tenant.birthDate", "birthDate", "Date de naissance", {
              type: "date",
            })}
            {field("tenant.birthPlace", "birthPlace", "Lieu de naissance")}
            {field("tenant.nationality", "nationality", "Nationalité(s)", {
              placeholder: "Française",
            })}
            <div className="space-y-1.5">
              <Label htmlFor="cc-idDocType" className="text-xs">
                Pièce d&apos;identité
              </Label>
              {/* items lets Base UI resolve the selected label without
                  opening the popup. */}
              <Select
                value={form.idDocType || null}
                onValueChange={(v) => v !== null && set("idDocType", v)}
                items={ID_DOC_TYPES.map((t) => ({ value: t, label: t }))}
                disabled={isPending}
              >
                <SelectTrigger
                  id="cc-idDocType"
                  className={["h-8 w-full text-sm", missCls("tenant.idDocType")].join(" ")}
                >
                  <SelectValue placeholder="Choisir…" />
                </SelectTrigger>
                <SelectContent>
                  {ID_DOC_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              {field("tenant.idDocNumber", "idDocNumber", "N° de la pièce", {
                mono: true,
              })}
            </div>
          </div>
        )}
      </div>

      {data.owner ? (
        <div className="space-y-3 rounded-md border p-3">
          <p className="text-sm font-medium">
            Propriétaire — {data.owner.name}
            <span className="text-muted-foreground ml-2 text-xs font-normal">
              {ownerIsCompany ? "société" : "particulier"}
            </span>
          </p>
          {ownerIsCompany ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {field("owner.legalForm", "oLegalForm", "Forme juridique")}
              {field(
                "owner.registrationNumber",
                "oRegistrationNumber",
                "N° d'immatriculation",
                { mono: true }
              )}
              <div className="sm:col-span-2">
                {field(
                  "owner.registeredOffice",
                  "oRegisteredOffice",
                  "Siège social"
                )}
              </div>
              {field("owner.rep", "oRepFirstName", "Représentant — prénom")}
              {field("owner.rep", "oRepLastName", "Représentant — nom")}
              {field("owner.repCapacity", "oRepCapacity", "Qualité", {
                placeholder: "Gérant, Président…",
              })}
            </div>
          ) : (
            <p className="text-muted-foreground text-xs">
              Identité gérée sur la fiche contact.
            </p>
          )}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        {field(
          "money.securityDeposit",
          "securityDepositAmount",
          "Caution (dépôt de garantie)",
          { type: "number" }
        )}
      </div>

      <Button type="submit" variant="outline" size="sm" disabled={isPending}>
        {isPending ? "Enregistrement…" : "Enregistrer les informations"}
      </Button>
    </form>
  );
}
