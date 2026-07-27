"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { templateBlocksSchema } from "@/features/documents/template-blocks";

const schema = z.object({
  templateId: z.uuid(),
  blocks: templateBlocksSchema,
});

export type SaveTemplateResult =
  | { status: "success"; version: number }
  | { status: "error"; message: string };

/**
 * Saving a template never edits in place: it creates a new immutable
 * version and moves currentVersion forward. Older versions stay readable
 * for traceability but can never be generated from again.
 *
 * MANAGE_DOCUMENT_TEMPLATES only — SUPER_ADMIN and ADMIN by role, a
 * Moderator only when granted the permission.
 */
export async function saveTemplate(
  input: unknown
): Promise<SaveTemplateResult> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "Session expirée." };

  if (!hasPermission(user, "MANAGE_DOCUMENT_TEMPLATES")) {
    return {
      status: "error",
      message: "Vous n'avez pas la permission de modifier les modèles.",
    };
  }

  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Données invalides.",
    };
  }
  const data = parsed.data;

  try {
    const version = await prisma.$transaction(async (tx) => {
      const template = await tx.documentTemplate.findUnique({
        where: { id: data.templateId },
        select: { id: true, currentVersion: true },
      });
      if (!template) throw new Error("template gone");

      const next = template.currentVersion + 1;
      // The (templateId, version) unique index turns two concurrent saves
      // into one winner and one clean retryable error, never a silent
      // overwrite.
      await tx.documentTemplateVersion.create({
        data: {
          templateId: template.id,
          version: next,
          blocks: data.blocks,
          createdById: user.id,
        },
      });
      await tx.documentTemplate.update({
        where: { id: template.id },
        data: { currentVersion: next },
      });
      return next;
    });

    revalidatePath("/documents/templates");
    return { status: "success", version };
  } catch (error) {
    console.error("saveTemplate failed", error);
    return { status: "error", message: "Enregistrement impossible." };
  }
}
