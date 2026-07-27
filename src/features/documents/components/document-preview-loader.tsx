"use client";

import dynamic from "next/dynamic";
import type { RentalOption } from "@/features/documents/components/contrat-preview";

// react-pdf's viewer is browser-only and heavy, so it is loaded client-side
// only (ssr: false) and code-split away from every other route.
const ContratPreview = dynamic(
  () => import("@/features/documents/components/contrat-preview"),
  {
    ssr: false,
    loading: () => (
      <div className="text-muted-foreground p-8 text-sm">
        Chargement de l&apos;aperçu…
      </div>
    ),
  }
);

export function DocumentPreviewLoader({
  rentals,
}: {
  rentals: RentalOption[];
}) {
  return <ContratPreview rentals={rentals} />;
}
