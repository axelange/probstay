import "server-only";

import { prisma } from "@/lib/prisma";
import type { TemplateBlock } from "@/features/documents/template-blocks";

export type TemplateSummary = Awaited<
  ReturnType<typeof listTemplatesWithContent>
>[number];

/**
 * Every template with its current blocks and its version history. Two
 * templates today, so one query per template is fine — and the current
 * version's blocks come typed for the editor.
 */
export async function listTemplatesWithContent() {
  const templates = await prisma.documentTemplate.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      type: true,
      name: true,
      currentVersion: true,
      versions: {
        orderBy: { version: "desc" },
        select: {
          version: true,
          createdAt: true,
          createdBy: { select: { fullName: true } },
        },
      },
    },
  });

  const withBlocks = await Promise.all(
    templates.map(async (t) => {
      const current = await prisma.documentTemplateVersion.findUnique({
        where: {
          templateId_version: { templateId: t.id, version: t.currentVersion },
        },
        select: { blocks: true },
      });
      return {
        ...t,
        blocks: (current?.blocks ?? []) as TemplateBlock[],
        versions: t.versions.map((v) => ({
          version: v.version,
          createdAt: v.createdAt,
          author: v.createdBy?.fullName ?? null,
        })),
      };
    })
  );

  return withBlocks;
}
