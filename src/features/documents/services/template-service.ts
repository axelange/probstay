import "server-only";

import { prisma } from "@/lib/prisma";
import type {
  DocumentTemplateTypeKey,
  TemplateClauses,
} from "@/features/documents/template-clauses";

export type TemplateSummary = Awaited<
  ReturnType<typeof listTemplatesWithContent>
>[number];

/**
 * Every template with its current clauses and its version history. Two
 * templates today, so one query per template is fine — and the current
 * version's clauses come typed for the editor.
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

  const withClauses = await Promise.all(
    templates.map(async (t) => {
      const current = await prisma.documentTemplateVersion.findUnique({
        where: {
          templateId_version: { templateId: t.id, version: t.currentVersion },
        },
        select: { blocks: true },
      });
      return {
        ...t,
        clauses: (current?.blocks ?? {}) as TemplateClauses,
        versions: t.versions.map((v) => ({
          version: v.version,
          createdAt: v.createdAt,
          author: v.createdBy?.fullName ?? null,
        })),
      };
    })
  );

  return withClauses;
}

/**
 * The wording a document should be generated from: the current version's
 * clauses, and the version number so the generated document can record which
 * wording produced it.
 *
 * Both come back null when no template row exists yet — generation then falls
 * back to the shipped defaults rather than refusing to produce a document,
 * which is what lets a fresh environment issue paperwork before anyone has
 * opened the templates page.
 */
export async function currentTemplateClauses(
  type: DocumentTemplateTypeKey
): Promise<{ clauses: TemplateClauses | null; version: number | null }> {
  const template = await prisma.documentTemplate.findUnique({
    where: { type },
    select: { id: true, currentVersion: true },
  });
  if (!template) return { clauses: null, version: null };

  const current = await prisma.documentTemplateVersion.findUnique({
    where: {
      templateId_version: {
        templateId: template.id,
        version: template.currentVersion,
      },
    },
    select: { blocks: true },
  });

  return {
    clauses: (current?.blocks ?? null) as TemplateClauses | null,
    version: template.currentVersion,
  };
}
