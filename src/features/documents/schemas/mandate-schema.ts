import { z } from "zod";

import {
  MANDATE_OWNERSHIP,
  MANDATE_PETS,
  MANDATE_PROPERTY_KINDS,
  MANDATE_SERVICES,
  MANDATE_UTILITIES,
} from "@/features/documents/mandate-clauses";
import { isApimoService } from "@/features/properties/utils/apimo-services";

const line = (max: number) => z.string().trim().max(max);
/** yyyy-mm-dd as a date field sends it, or empty while it is being filled. */
const day = z.union([z.literal(""), z.iso.date()]);

export type MandateUtilityKey = (typeof MANDATE_UTILITIES)[number]["key"];
export type MandateServiceKey = (typeof MANDATE_SERVICES)[number]["key"];

/** One flag per line of 4.2 and 4.3: true for "Inclus". */
const flags = <K extends string>(keys: readonly K[]) =>
  z.object(
    Object.fromEntries(keys.map((k) => [k, z.boolean()])) as Record<
      K,
      z.ZodBoolean
    >,
  );

/** What the preview hands over: everything the agency chose or typed. */
export const mandateSchema = z.object({
  /** The owner. Overridden by the property's own owner when it has one. */
  contactId: z.uuid().nullable(),
  /** A property of the agency's, or one described by hand. */
  propertyId: z.uuid().nullable(),
  manualProperty: z
    .object({
      address: line(240),
      /** Empty until one is chosen. */
      kind: z.union([
        z.literal(""),
        z.enum(MANDATE_PROPERTY_KINDS.map((k) => k.key)),
      ]),
      /** Square metres, as a whole number; the unit is the document's. */
      surface: z.string().regex(/^\d{0,6}$/),
      rooms: line(20),
      bedrooms: line(20),
      /** What the property is equipped with, as APIMO's equipment codes. */
      equipment: z.array(z.number().int().refine(isApimoService)).max(200),
    })
    .nullable(),
  /** The number the mandate carries in the register of mandates. */
  mandateNumber: line(40),
  /** Section 3's free description. Empty falls back to the property's own. */
  description: z.string().trim().max(6000),
  /** Its English, for a property described by hand. */
  descriptionEn: z.string().trim().max(6000),
  /** In what capacity the owner holds the property. Empty until chosen. */
  ownershipStatus: z.union([
    z.literal(""),
    z.enum(MANDATE_OWNERSHIP.map((o) => o.key)),
  ]),
  /** The furnished tourist accommodation's registration number. */
  registrationNumber: line(60),
  condominium: z.boolean(),
  /** As typed — the security deposit held on the Agent's escrow account. */
  deposit: line(40),
  utilities: flags(MANDATE_UTILITIES.map((u) => u.key)),
  services: flags(MANDATE_SERVICES.map((s) => s.key)),
  /** Whether the property has a swimming pool — see article 9.4.2. */
  hasPool: z.boolean(),
  smoking: z.boolean(),
  bailiff: z.boolean(),
  pets: z.enum(MANDATE_PETS.map((p) => p.key)),
  place: line(80),
  signatureDate: day,
  bilingual: z.boolean(),
});

export type MandateInput = z.infer<typeof mandateSchema>;
