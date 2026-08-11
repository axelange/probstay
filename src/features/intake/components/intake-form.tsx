"use client";

import * as React from "react";
import Image from "next/image";
import { CircleCheck, FileUp, Paperclip, Plus, X } from "lucide-react";
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
import { PERSON_ID_DOC_TYPES } from "@/features/contacts/components/contact-type-labels";
import { submitIntake } from "@/features/intake/actions/submit-intake";
import { uploadIntakeId } from "@/features/intake/actions/upload-intake-id";
import { missingIntakeFields } from "@/features/intake/schemas/required-fields";
import type { IntakePrefill } from "@/features/intake/services/intake-service";

// Bilingual like every other label here: a client who cannot read the options
// cannot answer the question, however well the question is translated.
const MARITAL = [
  ["", "—"],
  ["SINGLE", "Célibataire / Single"],
  ["MARRIED", "Marié(e) / Married"],
  ["PACS", "Pacsé(e) / Civil partnership"],
  ["DIVORCED", "Divorcé(e) / Divorced"],
  ["WIDOWED", "Veuf ou veuve / Widowed"],
  ["OTHER", "Autre / Other"],
] as const;

const PURPOSES = [
  ["HOLIDAY", "Vacances / Holiday"],
  ["BUSINESS", "Professionnel / Business"],
  ["EVENT", "Événement / Event"],
  ["OTHER", "Autre / Other"],
] as const;

type Occupant = {
  firstName: string;
  lastName: string;
  idDocType: string;
  idDocNumber: string;
  idDocPath: string;
  idDocFileName: string;
};

/** Bilingual, because the clients are not all French-speaking. */
function Row({
  id,
  label,
  value,
  onChange,
  type = "text",
  wide,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  wide?: boolean;
}) {
  return (
    <div className={`space-y-1.5 ${wide ? "sm:col-span-2" : ""}`}>
      <Label htmlFor={id} className="text-xs">
        {label}
      </Label>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

/**
 * A closed list rather than free text.
 *
 * `Contact.idDocType` is a text column, but every writer — both agent forms
 * and now this one — puts the same French labels in it, which is what
 * `idDocLabel` matches on to caption the contract ("ID card / CNI"). A client
 * typing "carte nationale" or "ID" would still be understood, but a client
 * typing "papiers" would print as-is on a contract.
 */
function Choice({
  id,
  label,
  value,
  onChange,
  options,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: readonly (readonly [string, string])[];
}) {
  // The blank entry becomes the placeholder: a list whose first row is a dash
  // reads as an option one could choose.
  const choices = options.filter(([v]) => v !== "");

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs">
        {label}
      </Label>
      <Select
        value={value || null}
        onValueChange={(v) => v !== null && onChange(v)}
        items={choices.map(([v, l]) => ({ value: v, label: l }))}
      >
        <SelectTrigger id={id} className="w-full">
          <SelectValue placeholder="Choisir… / Select…" />
        </SelectTrigger>
        <SelectContent>
          {choices.map(([v, l]) => (
            <SelectItem key={v} value={v}>
              {l}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/**
 * The document types, with an explicit "not stated" first. The stored value is
 * the enum; the label is only what the client reads.
 */
const ID_DOC_OPTIONS = [
  ["", "—"] as const,
  ...PERSON_ID_DOC_TYPES.map(
    (t) => [t.value, `${t.label} / ${t.labelEn}`] as const
  ),
];

/**
 * A copy of the identity document.
 *
 * Sent the moment it is chosen rather than with the rest of the form: a
 * submission carrying one file per person would be tens of megabytes, and a
 * failure would lose the whole form with them. What comes back is a path the
 * form holds until it submits.
 */
function IdUpload({
  token,
  fileName,
  onUploaded,
  onCleared,
}: {
  token: string;
  fileName: string;
  onUploaded: (path: string, name: string) => void;
  onCleared: () => void;
}) {
  const input = React.useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = React.useState(false);

  function send(file: File) {
    setBusy(true);
    const body = new FormData();
    body.set("token", token);
    body.set("file", file);
    void uploadIntakeId(body)
      .then((result) => {
        if (result.status === "error") {
          toast.error(result.message);
          return;
        }
        onUploaded(result.storagePath, result.fileName);
      })
      .finally(() => setBusy(false));
  }

  return (
    <div className="space-y-1.5 sm:col-span-2">
      <Label className="text-xs">
        Copie de la pièce d&apos;identité / Copy of the ID document
      </Label>
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={input}
          type="file"
          accept=".jpg,.jpeg,.png,.webp,.pdf"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            // Cleared first so choosing the same file twice still fires.
            e.target.value = "";
            if (file) send(file);
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={() => input.current?.click()}
        >
          <FileUp aria-hidden="true" />
          {busy ? "Envoi…" : fileName ? "Remplacer / Replace" : "Joindre / Attach"}
        </Button>
        {fileName ? (
          <span className="text-muted-foreground flex min-w-0 items-center gap-1.5 text-xs">
            <Paperclip aria-hidden="true" className="size-3.5 shrink-0" />
            <span className="truncate">{fileName}</span>
            <button
              type="button"
              onClick={onCleared}
              className="hover:text-foreground cursor-pointer underline underline-offset-2"
            >
              retirer
            </button>
          </span>
        ) : (
          <span className="text-muted-foreground text-xs">
            JPEG, PNG, WEBP ou PDF — 10 Mo maximum.
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * The other adults on the stay.
 *
 * Optional on a FULL link and required on an OCCUPANTS one: the tenant is
 * identified before the contract, when they often cannot yet name who is
 * coming with them, so holding up their own declaration over these would
 * defeat the point of asking early. They are chased at finalisation instead.
 *
 * Numbered from 2 — the person filling the form is guest 1.
 */
function OccupantsSection({
  stay,
  scope,
  occupants,
  setOccupants,
  token,
}: {
  stay: NonNullable<IntakePrefill["stay"]>;
  scope: IntakePrefill["scope"];
  occupants: Occupant[];
  setOccupants: React.Dispatch<React.SetStateAction<Occupant[]>>;
  token: string;
}) {
  const expected = stay.otherAdults;
  const hint =
    scope === "OCCUPANTS"
      ? `Merci d'indiquer les autres adultes du séjour${expected > 0 ? ` — ${expected} attendu(s)` : ""}. Les enfants ne sont pas à déclarer ici. / Please list the other adults; children are not declared here.`
      : `Facultatif à ce stade${expected > 0 ? ` — ${expected} attendu(s)` : ""} ; ces informations vous seront redemandées avant l'arrivée. Les enfants ne sont pas à déclarer ici. / Optional for now; we will ask again before arrival.`;

  return (
      <Section
        title="Autres occupants / Other guests"
        hint={hint}
      >
        <div className="space-y-3">
          {occupants.map((o, i) => (
            <div key={i} className="space-y-3 rounded-lg border p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">
                  Occupant {i + 2}
                  <span className="text-muted-foreground ml-2 text-xs font-normal">
                    {[o.firstName, o.lastName].filter(Boolean).join(" ") ||
                      "à renseigner / to complete"}
                  </span>
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label="Retirer cet occupant"
                  onClick={() =>
                    setOccupants((l) => l.filter((_, j) => j !== i))
                  }
                >
                  <X aria-hidden="true" />
                </Button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
              <Row id={`o-${i}-last`} label="Nom / Last name" value={o.lastName} onChange={(v) => setOccupants((l) => l.map((x, j) => (j === i ? { ...x, lastName: v } : x)))} />
              <Row id={`o-${i}-first`} label="Prénom / First name" value={o.firstName} onChange={(v) => setOccupants((l) => l.map((x, j) => (j === i ? { ...x, firstName: v } : x)))} />
              <Choice
                id={`o-${i}-type`}
                label="Pièce d'identité / ID document"
                value={o.idDocType}
                onChange={(v) =>
                  setOccupants((l) =>
                    l.map((x, j) => (j === i ? { ...x, idDocType: v } : x))
                  )
                }
                options={ID_DOC_OPTIONS}
              />
              <Row id={`o-${i}-num`} label="Numéro / Number" value={o.idDocNumber} onChange={(v) => setOccupants((l) => l.map((x, j) => (j === i ? { ...x, idDocNumber: v } : x)))} />
              <IdUpload
                token={token}
                fileName={o.idDocFileName}
                onUploaded={(path, fileName) =>
                  setOccupants((l) =>
                    l.map((x, j) =>
                      j === i
                        ? { ...x, idDocPath: path, idDocFileName: fileName }
                        : x
                    )
                  )
                }
                onCleared={() =>
                  setOccupants((l) =>
                    l.map((x, j) =>
                      j === i ? { ...x, idDocPath: "", idDocFileName: "" } : x
                    )
                  )
                }
              />
              </div>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setOccupants((l) => [
                ...l,
                {
                  firstName: "",
                  lastName: "",
                  idDocType: "",
                  idDocNumber: "",
                  idDocPath: "",
                  idDocFileName: "",
                },
              ])
            }
          >
            <Plus aria-hidden="true" />
            Ajouter un occupant / Add a guest
          </Button>
        </div>
      </Section>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="space-y-1">
        <h2 className="text-sm font-medium">{title}</h2>
        {hint ? <p className="text-muted-foreground text-xs">{hint}</p> : null}
      </div>
      {children}
    </section>
  );
}

/**
 * The client's own form.
 *
 * Pre-filled with what the agency holds so the client corrects rather than
 * retypes. Which sections appear follows the contact: a company is asked about
 * the entity and the person who signs for it, an individual about themselves.
 * The stay block only exists when the link was opened for a booking — the same
 * link issued from a contact page is an identity request and nothing more.
 */
export function IntakeForm({
  token,
  prefill,
}: {
  token: string;
  prefill: IntakePrefill;
}) {
  const [individual, setIndividual] = React.useState(prefill.individual);
  const [company, setCompany] = React.useState(prefill.company);
  const [stayPurpose, setStayPurpose] = React.useState(
    prefill.stay?.stayPurpose ?? ""
  );
  const [stayPurposeOther, setStayPurposeOther] = React.useState(
    prefill.stay?.stayPurposeOther ?? ""
  );
  const [occupants, setOccupants] = React.useState<Occupant[]>(
    prefill.stay?.occupants.map((o) => ({
      firstName: o.firstName,
      lastName: o.lastName,
      idDocType: o.idDocType ?? "",
      idDocNumber: o.idDocNumber ?? "",
      // A copy already on file is not re-offered: the client would have to
      // find the same document again to see anything here.
      idDocPath: "",
      idDocFileName: "",
    })) ?? []
  );
  const [idDoc, setIdDoc] = React.useState({ path: "", fileName: "" });
  const [repIdDoc, setRepIdDoc] = React.useState({ path: "", fileName: "" });
  const [confirmed, setConfirmed] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();
  const [done, setDone] = React.useState(false);

  const ind = (k: string) => (v: string) =>
    setIndividual((f) => ({ ...f, [k]: v }));
  const cmp = (k: string) => (v: string) =>
    setCompany((f) => ({ ...f, [k]: v }));

  // The same rule the action applies, so the button never promises a
  // submission the server will refuse.
  const missing = missingIntakeFields(
    {
      individual: { ...individual, idDocPath: idDoc.path },
      company: { ...company, repIdDocPath: repIdDoc.path },
      occupants,
    },
    { scope: prefill.scope, isCompany: prefill.isCompany }
  );

  function submit() {
    startTransition(async () => {
      const result = await submitIntake({
        token,
        individual: { ...individual, idDocPath: idDoc.path },
        company: { ...company, repIdDocPath: repIdDoc.path },
        occupants,
        stayPurpose,
        stayPurposeOther,
        confirmed,
      });
      if (result.status === "error") {
        toast.error(result.message);
        return;
      }
      setDone(true);
    });
  }

  if (done) {
    return (
      <div className="space-y-3 rounded-lg border p-6 text-center">
        <CircleCheck aria-hidden="true" className="mx-auto size-8 text-emerald-600" />
        <h1 className="text-lg font-semibold">Merci</h1>
        <p className="text-muted-foreground text-sm">
          Vos informations ont bien été transmises à BSTAY. Vous pouvez fermer
          cette page.
        </p>
        <p className="text-muted-foreground text-xs">
          Thank you — your information has been sent to BSTAY.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="space-y-8"
    >
      <header className="space-y-4 text-center">
        {/* The vertical lockup, as the documents use. SVG rather than the PNG:
            the lettering is hairline and goes grey when rastered at this size. */}
        <Image
          src="/img/LogoVertical.svg"
          alt="BSTAY"
          width={90}
          height={99}
          priority
          className="mx-auto"
        />
        <h1 className="text-xl font-semibold tracking-tight">
          Vos informations / Your details
        </h1>
        <div className="text-muted-foreground space-y-1 text-sm">
          <p>
            {prefill.stay
              ? `Pour votre séjour à ${prefill.stay.property}. Merci de vérifier et de compléter les informations ci-dessous.`
              : "Merci de vérifier et de compléter les informations ci-dessous."}
          </p>
          <p>
            {prefill.stay
              ? `For your stay at ${prefill.stay.property}. Please check and complete the details below.`
              : "Please check and complete the details below."}
          </p>
        </div>
        <p className="text-muted-foreground text-xs">
          Ces informations sont recueillies au titre de nos obligations légales
          d&apos;identification (LCB-FT / TRACFIN) et conservées à ce titre.
          <span className="block">
            Collected under our legal identification obligations and retained on
            that basis.
          </span>
        </p>
      </header>

      {/* An OCCUPANTS link asks only for the other adults: the contracting
          party already declared and confirmed their own details, and showing
          them again would invite a second, contradictory answer. */}
      {prefill.scope === "OCCUPANTS" ? null : prefill.isCompany ? (
        <>
          <Section title="Société / Company">
            <div className="grid gap-3 sm:grid-cols-2">
              <Row id="c-name" label="Dénomination sociale / Company name" value={company.companyName ?? ""} onChange={cmp("companyName")} wide />
              <Row id="c-form" label="Forme juridique / Legal form" value={company.legalForm ?? ""} onChange={cmp("legalForm")} />
              <Row id="c-reg" label="Numéro SIREN / Registration number" value={company.registrationNumber ?? ""} onChange={cmp("registrationNumber")} />
              <Row id="c-act" label="Activité principale / Main business activity" value={company.mainActivity ?? ""} onChange={cmp("mainActivity")} wide />
              <Row id="c-office" label="Adresse du siège social / Registered office" value={company.registeredOffice ?? ""} onChange={cmp("registeredOffice")} wide />
              <Row id="c-zip" label="Code postal / Postal code" value={company.officePostalCode ?? ""} onChange={cmp("officePostalCode")} />
              <Row id="c-city" label="Ville / City" value={company.officeCity ?? ""} onChange={cmp("officeCity")} />
              <Row id="c-country" label="Pays / Country" value={company.officeCountry ?? ""} onChange={cmp("officeCountry")} />
              <Row id="c-phone" label="Téléphone / Phone" value={company.companyPhone ?? ""} onChange={cmp("companyPhone")} />
              <Row id="c-email" label="Adresse e-mail / Email" type="email" value={company.companyEmail ?? ""} onChange={cmp("companyEmail")} wide />
            </div>
          </Section>

          <Section title="Représentant légal / Legal representative">
            <div className="grid gap-3 sm:grid-cols-2">
              <Row id="r-last" label="Nom / Last name" value={company.repLastName ?? ""} onChange={cmp("repLastName")} />
              <Row id="r-first" label="Prénom / First name" value={company.repFirstName ?? ""} onChange={cmp("repFirstName")} />
              <Row id="r-cap" label="Fonction / Position" value={company.repCapacity ?? ""} onChange={cmp("repCapacity")} />
              <Row id="r-occ" label="Profession / Occupation" value={company.repOccupation ?? ""} onChange={cmp("repOccupation")} />
              <Row id="r-nat" label="Nationalité / Nationality" value={company.repNationality ?? ""} onChange={cmp("repNationality")} />
              <Row id="r-phone" label="Téléphone / Phone" value={company.repPhone ?? ""} onChange={cmp("repPhone")} />
              <Row id="r-email" label="Adresse e-mail / Email" type="email" value={company.repEmail ?? ""} onChange={cmp("repEmail")} wide />
              <Choice
                id="r-idtype"
                label="Pièce d'identité / ID document"
                value={company.repIdDocType ?? ""}
                onChange={cmp("repIdDocType")}
                options={ID_DOC_OPTIONS}
              />
              <Row id="r-idnum" label="Numéro / Number" value={company.repIdDocNumber ?? ""} onChange={cmp("repIdDocNumber")} />
              <IdUpload
                token={token}
                fileName={repIdDoc.fileName}
                onUploaded={(path, fileName) => setRepIdDoc({ path, fileName })}
                onCleared={() => setRepIdDoc({ path: "", fileName: "" })}
              />
            </div>
          </Section>
        </>
      ) : (
        <Section title="Vos coordonnées / Your details">
          <div className="grid gap-3 sm:grid-cols-2">
            <Row id="i-last" label="Nom / Last name" value={individual.lastName ?? ""} onChange={ind("lastName")} />
            <Row id="i-first" label="Prénom / First name" value={individual.firstName ?? ""} onChange={ind("firstName")} />
            <Row id="i-occ" label="Profession / Occupation" value={individual.occupation ?? ""} onChange={ind("occupation")} />
            <Row id="i-nat" label="Nationalité / Nationality" value={individual.nationality ?? ""} onChange={ind("nationality")} />

            <Choice
              id="i-marital"
              label="Situation matrimoniale / Marital status"
              value={individual.maritalStatus ?? ""}
              onChange={ind("maritalStatus")}
              options={MARITAL}
            />

            <Row id="i-birth" label="Date de naissance / Date of birth" type="date" value={individual.birthDate ?? ""} onChange={ind("birthDate")} />
            <Row id="i-birthplace" label="Lieu de naissance / Place of birth" value={individual.birthPlace ?? ""} onChange={ind("birthPlace")} />
            <Row id="i-addr" label="Adresse / Address" value={individual.address ?? ""} onChange={ind("address")} wide />
            <Row id="i-zip" label="Code postal / Postal code" value={individual.postalCode ?? ""} onChange={ind("postalCode")} />
            <Row id="i-city" label="Ville / City" value={individual.city ?? ""} onChange={ind("city")} />
            <Row id="i-country" label="Pays / Country" value={individual.country ?? ""} onChange={ind("country")} />
            <Row id="i-phone" label="Téléphone / Phone" value={individual.phone ?? ""} onChange={ind("phone")} />
            <Row id="i-email" label="Adresse e-mail / Email" type="email" value={individual.email ?? ""} onChange={ind("email")} wide />
            <Choice
              id="i-idtype"
              label="Pièce d'identité / ID document"
              value={individual.idDocType ?? ""}
              onChange={ind("idDocType")}
              options={ID_DOC_OPTIONS}
            />
            <Row id="i-idnum" label="Numéro / Number" value={individual.idDocNumber ?? ""} onChange={ind("idDocNumber")} />
            <IdUpload
              token={token}
              fileName={idDoc.fileName}
              onUploaded={(path, fileName) => setIdDoc({ path, fileName })}
              onCleared={() => setIdDoc({ path: "", fileName: "" })}
            />
          </div>
        </Section>
      )}

      {prefill.stay && prefill.scope === "FULL" ? (
        <>
          <Section
            title="Motif du séjour / Purpose of stay"
            hint="Merci d'indiquer la raison de votre séjour."
          >
            <div className="space-y-1.5">
              {PURPOSES.map(([value, label]) => (
                <label key={value} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="stayPurpose"
                    checked={stayPurpose === value}
                    onChange={() => setStayPurpose(value)}
                  />
                  <span>{label}</span>
                </label>
              ))}
              {stayPurpose === "OTHER" ? (
                <Input
                  value={stayPurposeOther}
                  onChange={(e) => setStayPurposeOther(e.target.value)}
                  placeholder="Précisez / Please specify"
                  className="mt-1"
                />
              ) : null}
            </div>
          </Section>

          <OccupantsSection
            stay={prefill.stay}
            scope={prefill.scope}
            occupants={occupants}
            setOccupants={setOccupants}
            token={token}
          />
        </>
      ) : null}

      {prefill.stay && prefill.scope === "OCCUPANTS" ? (
        <OccupantsSection
          stay={prefill.stay}
          scope={prefill.scope}
          occupants={occupants}
          setOccupants={setOccupants}
          token={token}
        />
      ) : null}



      <div className="space-y-4 border-t pt-6">
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
          />
          <span>
            Je confirme que les informations fournies à BSTAY sont exactes.
            <span className="text-muted-foreground block text-xs">
              I confirm that the information provided to BSTAY is correct.
            </span>
          </span>
        </label>

        {missing.length > 0 ? (
          <div className="space-y-1 text-sm text-amber-600">
            <p>
              {missing.length} information{missing.length > 1 ? "s" : ""} à
              compléter / {missing.length} field
              {missing.length > 1 ? "s" : ""} still needed
            </p>
            <ul className="list-disc pl-5 text-xs">
              {missing.slice(0, 8).map((m) => (
                <li key={m}>{m}</li>
              ))}
              {missing.length > 8 ? <li>…</li> : null}
            </ul>
          </div>
        ) : null}

        <Button
          type="submit"
          disabled={!confirmed || isPending || missing.length > 0}
        >
          {isPending ? "Envoi…" : "Envoyer / Submit"}
        </Button>
      </div>
    </form>
  );
}
