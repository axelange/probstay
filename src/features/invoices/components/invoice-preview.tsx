"use client";

import { PDFViewer } from "@react-pdf/renderer";
import { registerDocumentFontsBrowser } from "@/features/documents/fonts.browser";
import {
  Facture,
  type InvoiceDocumentData,
} from "@/features/invoices/templates/facture";

// Same fonts as the server, registered once in the browser.
registerDocumentFontsBrowser();

/**
 * The invoice as it will be produced, rendered in the browser.
 *
 * The same template the server writes to the bucket, fed by the same builder,
 * so this is not a mock-up of the document — it is the document. What the
 * agent approves here is what gets stored at issue.
 */
export default function InvoicePreview({
  data,
}: {
  data: InvoiceDocumentData;
}) {
  return (
    <PDFViewer showToolbar style={{ width: "100%", height: "100%", border: 0 }}>
      <Facture data={data} />
    </PDFViewer>
  );
}
