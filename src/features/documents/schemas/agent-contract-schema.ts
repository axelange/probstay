import { z } from "zod";
import type { Bilingual } from "@/features/documents/concierge-packages";

/**
 * The three remuneration levels of article 5, in the order an agent climbs
 * them. The annex states which one the agent starts from.
 */
export const AGENT_PHASES = ["BEGINNER", "JUNIOR", "SENIOR"] as const;
export type AgentPhase = (typeof AGENT_PHASES)[number];

export const AGENT_PHASE_LABELS: Record<AgentPhase, Bilingual> = {
  BEGINNER: { fr: "Débutant", en: "Beginner" },
  JUNIOR: { fr: "Junior", en: "Junior" },
  SENIOR: { fr: "Senior", en: "Senior" },
};

export const AGENT_CIVILITIES = ["MR", "MRS"] as const;
export type AgentCivility = (typeof AGENT_CIVILITIES)[number];

const line = (max: number) => z.string().trim().max(max);
/** yyyy-mm-dd as a date field sends it, or empty while it is being filled. */
const day = z.union([z.literal(""), z.iso.date()]);

/** What the preview hands over: everything the agency chose or typed. */
export const agentContractSchema = z.object({
  /** An existing contact, or null when the agent is described by hand. */
  contactId: z.uuid().nullable(),
  manualAgent: z
    .object({
      firstName: line(80),
      lastName: line(80),
      birthDate: day,
      birthCity: line(80),
      /** ISO 3166-1 alpha-2, as the contacts hold it. */
      birthCountry: line(2),
      address: line(240),
      email: line(160),
    })
    .nullable(),
  civility: z.enum(AGENT_CIVILITIES),
  /** The RSAC number once the agent holds one; empty while it is pending. */
  rsac: line(80),
  effectiveDate: day,
  signatureDate: day,
  initialPhase: z.enum(AGENT_PHASES),
  /** As typed — the progression revenue carried over, excluding VAT. */
  initialRevenue: line(40),
  bilingual: z.boolean(),
  place: line(80),
});

export type AgentContractInput = z.infer<typeof agentContractSchema>;
