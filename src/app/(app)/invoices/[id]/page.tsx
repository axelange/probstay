import { InvoiceDetail } from "@/features/invoices/components/invoice-detail";

export const metadata = { title: "Facture — PROBSTAY" };

export default async function InvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <InvoiceDetail id={id} family="FEE" />;
}
