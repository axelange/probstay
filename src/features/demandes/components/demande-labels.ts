import type { DemandeMode, DemandeSource } from "@/generated/prisma/enums";

export const MODE_LABELS: Record<DemandeMode, string> = {
  PRECISE: "Précise",
  WIDE: "Large",
};

export const SOURCE_LABELS: Record<DemandeSource, string> = {
  DIRECT: "Contact direct",
  WEBSITE: "Site internet",
};

export function modeLabel(mode: string): string {
  return MODE_LABELS[mode as DemandeMode] ?? mode;
}

export function sourceLabel(source: string): string {
  return SOURCE_LABELS[source as DemandeSource] ?? source;
}

/** A demande's outcome, derived from its timestamps. */
export type DemandeStatus = "pending" | "converted" | "lost";

export function demandeStatus(d: {
  convertedAt: Date | null;
  lostAt: Date | null;
}): DemandeStatus {
  if (d.convertedAt) return "converted";
  if (d.lostAt) return "lost";
  return "pending";
}

export const STATUS_LABELS: Record<DemandeStatus, string> = {
  pending: "En attente",
  converted: "Convertie",
  lost: "Perdue",
};
