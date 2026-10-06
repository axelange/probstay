"use client";

import * as React from "react";
import { CircleCheck, FileUp, Paperclip } from "lucide-react";
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
  ["SINGLE", "Single / Célibataire"],
  ["MARRIED", "Married / Marié(e)"],
  ["PACS", "Civil partnership / Pacsé(e)"],
  ["DIVORCED", "Divorced / Divorcé(e)"],
  ["WIDOWED", "Widowed / Veuf ou veuve"],
  ["OTHER", "Other / Autre"],
] as const;

const PURPOSES = [
  ["HOLIDAY", "Holiday / Vacances"],
  ["BUSINESS", "Business / Professionnel"],
  ["EVENT", "Event / Événement"],
  ["OTHER", "Other / Autre"],
] as const;

type Occupant = {
  firstName: string;
  lastName: string;
  idDocType: string;
  idDocNumber: string;
  idDocPath: string;
  idDocFileName: string;
};

/**
 * A bilingual label: English upright, French in italic grey after the slash.
 *
 * The same treatment the documents give a charge line, and for the same
 * reason — a client reading one language should be able to skim past the
 * other, and the shift in weight and colour does that faster than a slash
 * alone. It also says which of the two is the original.
 *
 * Split on the FIRST separator only: "Representative — Last name / Nom" has to
 * keep its prefix with the English half, and splitting on every slash would
 * also cut "LCB-FT / TRACFIN", which is one name and not two languages.
 *
 * A label with no separator is one language and prints as it stands, which is
 * what an agency-typed value does.
 */
function Bi({ children }: { children: string }) {
  const at = children.indexOf(" / ");
  if (at === -1) return <>{children}</>;
  return (
    <>
      {children.slice(0, at)}
      {/* The separator stays upright while the French leans. Set in the italic
          run it read as though the space after it had been lost: an oblique
          slash carries its top to the right, close to the next letter, and its
          foot to the left, away from the previous one — so the same two spaces
          look uneven. Upright, the stroke sits square between them. */}
      <span className="text-muted-foreground"> / </span>
      <span className="text-muted-foreground italic">
        {children.slice(at + 3)}
      </span>
    </>
  );
}

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
        <Bi>{label}</Bi>
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
        <Bi>{label}</Bi>
      </Label>
      <Select
        value={value || null}
        onValueChange={(v) => v !== null && onChange(v)}
        items={choices.map(([v, l]) => ({ value: v, label: l }))}
      >
        <SelectTrigger id={id} className="w-full">
          <SelectValue placeholder="Select… / Choisir…" />
        </SelectTrigger>
        <SelectContent>
          {choices.map(([v, l]) => (
            <SelectItem key={v} value={v}>
              <Bi>{l}</Bi>
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
          {busy ? "Sending… / Envoi…" : fileName ? "Replace / Remplacer" : "Attach / Joindre"}
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
      ? `Please list the other adults${expected > 0 ? ` — ${expected} expected` : ""}; children are not declared here. / Merci d'indiquer les autres adultes du séjour. Les enfants ne sont pas à déclarer ici.`
      : `Optional for now${expected > 0 ? ` — ${expected} expected` : ""}; we will ask again before arrival. Children are not declared here. / Facultatif à ce stade ; ces informations vous seront redemandées avant l'arrivée.`;

  return (
      <Section
        title="Other guests / Autres occupants"
        hint={hint}
      >
        <div className="space-y-3">
          {occupants.map((o, i) => (
            <div key={i} className="bg-card border-border space-y-3 border p-5">
              {/* No remove: the booking fixes how many adults there are, and a
                  client who could delete a slot could submit a stay short of
                  the headcount the agency is required to identify. A slot left
                  blank reads as missing, which is the truth; a slot deleted
                  would read as complete. */}
              {/* Numbered from 2: the primary tenant is occupant 1 of the
                  stay, declared in their own section, so the first of the
                  other adults is the second person on the booking. */}
              <p className="text-sm font-medium">
                Occupant {i + 2}
                <span className="text-muted-foreground ml-2 text-xs font-normal">
                  {[o.firstName, o.lastName].filter(Boolean).join(" ") ||
                    "à renseigner / to complete"}
                </span>
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
              <Row id={`o-${i}-last`} label="Last name / Nom" value={o.lastName} onChange={(v) => setOccupants((l) => l.map((x, j) => (j === i ? { ...x, lastName: v } : x)))} />
              <Row id={`o-${i}-first`} label="First name / Prénom" value={o.firstName} onChange={(v) => setOccupants((l) => l.map((x, j) => (j === i ? { ...x, firstName: v } : x)))} />
              <Choice
                id={`o-${i}-type`}
                label="ID document / Pièce d'identité"
                value={o.idDocType}
                onChange={(v) =>
                  setOccupants((l) =>
                    l.map((x, j) => (j === i ? { ...x, idDocType: v } : x))
                  )
                }
                options={ID_DOC_OPTIONS}
              />
              <Row id={`o-${i}-num`} label="Number / Numéro" value={o.idDocNumber} onChange={(v) => setOccupants((l) => l.map((x, j) => (j === i ? { ...x, idDocNumber: v } : x)))} />
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
    <section className="space-y-5">
      <div className="space-y-2">
        {/* The site marks a section with capitals over a hairline rather than
            a heavier weight — there is one weight of Albertus here and the
            letterspacing is what gives the line its rank. */}
        <h2 className="brand-section border-border border-b pb-2 text-xs">
          <Bi>{title}</Bi>
        </h2>
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
  /**
   * One slot per adult the booking expects, opened at that count and kept
   * there — the client is not asked how many are coming, the booking already
   * says so, and a page that opened empty behind an "add a guest" button asked
   * them to work it out again.
   *
   * Whoever was recorded before comes back in order, the first into the first
   * slot, so a client returning to a half-filled form finds their own answers
   * where they left them rather than a blank page.
   *
   * `max` and not the headcount alone: if more adults were recorded than the
   * booking expects — a guest added late, a headcount since corrected — the
   * extra ones keep a slot instead of being silently dropped on open.
   */
  const [occupants, setOccupants] = React.useState<Occupant[]>(() => {
    const recorded = prefill.stay?.occupants ?? [];
    const slots = Math.max(prefill.stay?.otherAdults ?? 0, recorded.length);
    return Array.from({ length: slots }, (_, i) => {
      const o = recorded[i];
      return {
        firstName: o?.firstName ?? "",
        lastName: o?.lastName ?? "",
        idDocType: o?.idDocType ?? "",
        idDocNumber: o?.idDocNumber ?? "",
        // A copy already on file is not re-offered: the client would have to
        // find the same document again to see anything here.
        idDocPath: "",
        idDocFileName: "",
      };
    });
  });
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
    {
      scope: prefill.scope,
      isCompany: prefill.isCompany,
      expectedOccupants: prefill.stay?.otherAdults ?? 0,
    }
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
      <div className="bg-card border-border space-y-4 border p-10 text-center">
        <CircleCheck aria-hidden="true" className="text-muted-foreground mx-auto size-8" />
        <h1 className="brand-section text-base">Thank you / Merci</h1>
        <p className="text-muted-foreground text-sm">
          Your information has been sent to BSTAY. You may close this page.
        </p>
        <p className="text-muted-foreground text-xs italic">
          Vos informations ont bien été transmises à BSTAY. Vous pouvez fermer
          cette page.
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
      className="space-y-12"
    >
      {/* An OCCUPANTS link asks only for the other adults: the contracting
          party already declared and confirmed their own details, and showing
          them again would invite a second, contradictory answer. */}
      {prefill.scope === "OCCUPANTS" ? null : prefill.isCompany ? (
        <>
          <Section title="Company / Société">
            <div className="grid gap-3 sm:grid-cols-2">
              <Row id="c-name" label="Company name / Dénomination sociale" value={company.companyName ?? ""} onChange={cmp("companyName")} wide />
              <Row id="c-form" label="Legal form / Forme juridique" value={company.legalForm ?? ""} onChange={cmp("legalForm")} />
              <Row id="c-reg" label="Registration number / Numéro SIREN" value={company.registrationNumber ?? ""} onChange={cmp("registrationNumber")} />
              <Row id="c-act" label="Main business activity / Activité principale" value={company.mainActivity ?? ""} onChange={cmp("mainActivity")} wide />
              <Row id="c-office" label="Registered office / Adresse du siège social" value={company.registeredOffice ?? ""} onChange={cmp("registeredOffice")} wide />
              <Row id="c-zip" label="Postal code / Code postal" value={company.officePostalCode ?? ""} onChange={cmp("officePostalCode")} />
              <Row id="c-city" label="City / Ville" value={company.officeCity ?? ""} onChange={cmp("officeCity")} />
              <Row id="c-country" label="Country / Pays" value={company.officeCountry ?? ""} onChange={cmp("officeCountry")} />
              <Row id="c-phone" label="Phone / Téléphone" value={company.companyPhone ?? ""} onChange={cmp("companyPhone")} />
              <Row id="c-email" label="Email / Adresse e-mail" type="email" value={company.companyEmail ?? ""} onChange={cmp("companyEmail")} wide />
            </div>
          </Section>

          <Section title="Legal representative / Représentant légal">
            <div className="grid gap-3 sm:grid-cols-2">
              <Row id="r-last" label="Last name / Nom" value={company.repLastName ?? ""} onChange={cmp("repLastName")} />
              <Row id="r-first" label="First name / Prénom" value={company.repFirstName ?? ""} onChange={cmp("repFirstName")} />
              <Row id="r-cap" label="Position / Fonction" value={company.repCapacity ?? ""} onChange={cmp("repCapacity")} />
              <Row id="r-occ" label="Occupation / Profession" value={company.repOccupation ?? ""} onChange={cmp("repOccupation")} />
              <Row id="r-nat" label="Nationality / Nationalité" value={company.repNationality ?? ""} onChange={cmp("repNationality")} />
              <Row id="r-phone" label="Phone / Téléphone" value={company.repPhone ?? ""} onChange={cmp("repPhone")} />
              <Row id="r-email" label="Email / Adresse e-mail" type="email" value={company.repEmail ?? ""} onChange={cmp("repEmail")} wide />
              <Choice
                id="r-idtype"
                label="ID document / Pièce d'identité"
                value={company.repIdDocType ?? ""}
                onChange={cmp("repIdDocType")}
                options={ID_DOC_OPTIONS}
              />
              <Row id="r-idnum" label="Number / Numéro" value={company.repIdDocNumber ?? ""} onChange={cmp("repIdDocNumber")} />
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
        <Section title="Your details / Vos coordonnées">
          <div className="grid gap-3 sm:grid-cols-2">
            <Row id="i-last" label="Last name / Nom" value={individual.lastName ?? ""} onChange={ind("lastName")} />
            <Row id="i-first" label="First name / Prénom" value={individual.firstName ?? ""} onChange={ind("firstName")} />
            <Row id="i-occ" label="Occupation / Profession" value={individual.occupation ?? ""} onChange={ind("occupation")} />
            <Row id="i-nat" label="Nationality / Nationalité" value={individual.nationality ?? ""} onChange={ind("nationality")} />

            <Choice
              id="i-marital"
              label="Marital status / Situation matrimoniale"
              value={individual.maritalStatus ?? ""}
              onChange={ind("maritalStatus")}
              options={MARITAL}
            />

            <Row id="i-birth" label="Date of birth / Date de naissance" type="date" value={individual.birthDate ?? ""} onChange={ind("birthDate")} />
            <Row id="i-birthplace" label="Place of birth / Lieu de naissance" value={individual.birthPlace ?? ""} onChange={ind("birthPlace")} />
            <Row id="i-addr" label="Address / Adresse" value={individual.address ?? ""} onChange={ind("address")} wide />
            <Row id="i-zip" label="Postal code / Code postal" value={individual.postalCode ?? ""} onChange={ind("postalCode")} />
            <Row id="i-city" label="City / Ville" value={individual.city ?? ""} onChange={ind("city")} />
            <Row id="i-country" label="Country / Pays" value={individual.country ?? ""} onChange={ind("country")} />
            <Row id="i-phone" label="Phone / Téléphone" value={individual.phone ?? ""} onChange={ind("phone")} />
            <Row id="i-email" label="Email / Adresse e-mail" type="email" value={individual.email ?? ""} onChange={ind("email")} wide />
            <Choice
              id="i-idtype"
              label="ID document / Pièce d'identité"
              value={individual.idDocType ?? ""}
              onChange={ind("idDocType")}
              options={ID_DOC_OPTIONS}
            />
            <Row id="i-idnum" label="Number / Numéro" value={individual.idDocNumber ?? ""} onChange={ind("idDocNumber")} />
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
            title="Purpose of stay / Motif du séjour"
            hint="Please tell us the reason for your stay. / Merci d'indiquer la raison de votre séjour."
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
                  placeholder="Please specify / Précisez"
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



      <div className="border-border space-y-5 border-t pt-8">
        {/* Under the fields rather than over them. The lockup, the title and
            the instruction are all on the banner, so this was the only thing
            left at the top — and a page that opens on TRACFIN reads as a
            formality before it reads as a welcome. It belongs here, next to
            the box that confirms the answers and the button that sends them,
            which is the moment it actually bears on. */}
        <p className="text-muted-foreground text-xs">
          Collected under our legal identification obligations (LCB-FT /
          TRACFIN) and retained on that basis.
          <span className="text-muted-foreground block italic">
            Ces informations sont recueillies au titre de nos obligations
            légales d&apos;identification et conservées à ce titre.
          </span>
        </p>

        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
          />
          <span>
            I confirm that the information provided to BSTAY is correct.
            <span className="text-muted-foreground block text-xs italic">
              Je confirme que les informations fournies à BSTAY sont exactes.
            </span>
          </span>
        </label>

        {missing.length > 0 ? (
          <div className="text-destructive space-y-1 text-sm">
            <p>
              {missing.length} field{missing.length > 1 ? "s" : ""} still
              needed / {missing.length} information
              {missing.length > 1 ? "s" : ""} à compléter
            </p>
            <ul className="list-disc pl-5 text-xs">
              {missing.slice(0, 8).map((m) => (
                <li key={m}>
                  <Bi>{m}</Bi>
                </li>
              ))}
              {missing.length > 8 ? <li>…</li> : null}
            </ul>
          </div>
        ) : null}

        <Button
          type="submit"
          disabled={!confirmed || isPending || missing.length > 0}
        >
          {isPending ? "Sending… / Envoi…" : "Submit / Envoyer"}
        </Button>
      </div>
    </form>
  );
}
