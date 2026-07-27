import { z } from "zod";

/**
 * A template's content: an ordered list of blocks.
 *
 * Text blocks are bilingual — French is legally authoritative, English is
 * the courtesy line above it in the house style. `{{variables}}` inside the
 * text are interpolated from the rental at generation time. Slot blocks
 * have no text of their own: the renderer fills them from the rental's
 * data (parties table, stay table, …), so editors can position them but
 * not rewrite them.
 */
export const TEXT_KINDS = ["title", "paragraph", "list_item"] as const;
export const SLOT_KINDS = [
  "slot_parties",
  "slot_stay",
  "slot_services",
  "slot_financial",
  "slot_payment",
  "slot_signatures",
] as const;

export type TemplateTextKind = (typeof TEXT_KINDS)[number];
export type TemplateSlotKind = (typeof SLOT_KINDS)[number];

export type TemplateBlock =
  | { kind: TemplateTextKind; fr: string; en: string }
  | { kind: TemplateSlotKind };

export const templateBlockSchema = z.union([
  z.object({
    kind: z.enum(TEXT_KINDS),
    fr: z.string().max(8000),
    en: z.string().max(8000),
  }),
  z.object({ kind: z.enum(SLOT_KINDS) }),
]);

export const templateBlocksSchema = z
  .array(templateBlockSchema)
  .min(1, "Un modèle ne peut pas être vide.")
  .max(200);

/** French labels for the editor. */
export const BLOCK_KIND_LABELS: Record<TemplateBlock["kind"], string> = {
  title: "Titre de section",
  paragraph: "Paragraphe",
  list_item: "Élément de liste",
  slot_parties: "Données — Parties & bien",
  slot_stay: "Données — Séjour",
  slot_services: "Données — Prestations",
  slot_financial: "Données — Récapitulatif financier",
  slot_payment: "Données — Conditions de paiement",
  slot_signatures: "Données — Signatures",
};
