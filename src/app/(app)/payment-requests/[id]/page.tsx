import { InvoiceDetail } from "@/features/invoices/components/invoice-detail";

export const metadata = { title: "Avis de paiement — PROBSTAY" };

export default async function FundCallPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <InvoiceDetail id={id} family="FUND_CALL" />;
}
