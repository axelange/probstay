import { z } from "zod";
import { IdentityDocumentType } from "@/generated/prisma/enums";

/**
 * An identity document type, or nothing.
 *
 * Shared by every form that asks for one — the two contact forms, the
 * contract's completion form and the client's own intake — so a document type
 * cannot mean one thing in one place and something else in another. The column
 * behind it is the enum, so an unrecognised value is refused here rather than
 * reaching a contract and printing raw.
 */
export const optionalIdDocType = z
  .union([z.literal(""), z.enum(IdentityDocumentType)])
  .transform((v) => (v === "" ? undefined : v))
  .optional();
