import { redirect } from "next/navigation";
import { CatalogList } from "@/features/invoices/components/catalog-list";
import {
  canManageInvoices,
  canReadAllInvoices,
} from "@/features/invoices/services/invoice-service";
import { listProducts } from "@/features/invoices/services/product-service";
import { getCurrentUser } from "@/lib/auth";

export const metadata = { title: "Catalogue — PROBSTAY" };

/**
 * What the agency bills, written down in advance.
 *
 * It feeds the invoice lines and nothing else: a product is a starting point,
 * never a constraint — an article ponctuel is still typed straight onto the
 * document.
 */
export default async function CatalogPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!canReadAllInvoices(user)) redirect("/");

  const products = await listProducts(user);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="page-title">Catalogue</h2>
        <p className="text-muted-foreground text-sm">
          Les prestations facturées régulièrement, prêtes à poser sur une
          facture. Un article ponctuel se saisit directement sur le document.
        </p>
      </div>

      <CatalogList products={products} canManage={canManageInvoices(user)} />
    </div>
  );
}
