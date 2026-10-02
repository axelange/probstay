"use client";

import dynamic from "next/dynamic";
import type { InvoiceDocumentData } from "@/features/invoices/templates/facture";

// react-pdf's viewer is browser-only and heavy, so it is loaded client-side
// only (ssr: false) and code-split away from every other route.
const InvoicePreview = dynamic(
  () => import("@/features/invoices/components/invoice-preview"),
  {
    ssr: false,
    loading: () => (
      <div className="text-muted-foreground p-8 text-sm">
        Chargement de l&apos;aperçu…
      </div>
    ),
  }
);

export function InvoicePreviewLoader({ data }: { data: InvoiceDocumentData }) {
  return <InvoicePreview data={data} />;
}
