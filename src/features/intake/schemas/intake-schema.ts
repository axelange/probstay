import { z } from "zod";
import { MaritalStatus, StayPurpose } from "@/generated/prisma/enums";
import { optionalIdDocType } from "@/features/contacts/schemas/id-doc-type";

/**
 * What a client submits through their link.
 *
 * Almost everything is optional. The form asks the client to complete it, but
 * refusing a submission because one line is blank would leave the agency with
 * nothing at all instead of most of it — and the agent can see what is still
 * missing and chase it. The one thing that is not optional is the
 * confirmation: without it there is no declaration, only a draft.
 *
 * Trimmed, capped, and empty strings normalised to undefined so a cleared
 * field reads as "not given" rather than as an empty value overwriting one
 * already on file.
 */
const line = (max = 160) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === "" ? undefined : v))
    .optional();

export const intakeIndividualSchema = z.object({
  lastName: line(120),
  firstName: line(120),
  occupation: line(120),
  nationality: line(80),
  maritalStatus: z
    .union([z.literal(""), z.enum(MaritalStatus)])
    .transform((v) => (v === "" ? undefined : v))
    .optional(),
  birthDate: z
    .union([z.literal(""), z.iso.date()])
    .transform((v) => (v === "" ? undefined : v))
    .optional(),
  birthPlace: line(120),
  address: line(180),
  postalCode: line(20),
  city: line(120),
  country: line(80),
  phone: line(40),
  email: z
    .union([z.literal(""), z.email().max(160)])
    .transform((v) => (v === "" ? undefined : v))
    .optional(),
  idDocType: optionalIdDocType,
  idDocNumber: line(60),
  // Where the uploaded copy landed. Produced by uploadIntakeId, not typed by
  // anyone — the form carries it from the upload to the submission.
  idDocPath: line(300),
});

export const intakeCompanySchema = z.object({
  companyName: line(160),
  legalForm: line(80),
  registrationNumber: line(60),
  mainActivity: line(160),
  registeredOffice: line(180),
  officePostalCode: line(20),
  officeCity: line(120),
  officeCountry: line(80),
  companyPhone: line(40),
  companyEmail: z
    .union([z.literal(""), z.email().max(160)])
    .transform((v) => (v === "" ? undefined : v))
    .optional(),

  repLastName: line(120),
  repFirstName: line(120),
  repCapacity: line(80),
  repOccupation: line(120),
  repNationality: line(80),
  repPhone: line(40),
  repEmail: z
    .union([z.literal(""), z.email().max(160)])
    .transform((v) => (v === "" ? undefined : v))
    .optional(),
  // The representative's own document: a company cannot present one, and the
  // person signing for it is who an identification obligation reaches.
  repIdDocType: optionalIdDocType,
  repIdDocNumber: line(60),
  repIdDocPath: line(300),
});

/** Another adult on the stay. Children are not listed. */
export const intakeOccupantSchema = z.object({
  firstName: z.string().trim().max(120),
  lastName: z.string().trim().max(120),
  idDocType: optionalIdDocType,
  idDocNumber: line(60),
  idDocPath: line(300),
});

export const intakeSubmissionSchema = z.object({
  token: z.string().min(20).max(200),
  individual: intakeIndividualSchema,
  company: intakeCompanySchema,
  occupants: z.array(intakeOccupantSchema).max(30).default([]),
  stayPurpose: z
    .union([z.literal(""), z.enum(StayPurpose)])
    .transform((v) => (v === "" ? undefined : v))
    .optional(),
  stayPurposeOther: line(160),
  // The declaration itself. Refused rather than defaulted: an unticked box is
  // a form someone abandoned, not a statement they made.
  confirmed: z.literal(true, {
    message: "Merci de confirmer que les informations sont exactes.",
  }),
});

export type IntakeSubmissionInput = z.infer<typeof intakeSubmissionSchema>;
export type IntakeIndividual = z.infer<typeof intakeIndividualSchema>;
export type IntakeCompany = z.infer<typeof intakeCompanySchema>;
export type IntakeOccupant = z.infer<typeof intakeOccupantSchema>;
