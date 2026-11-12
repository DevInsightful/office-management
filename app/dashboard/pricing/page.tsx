import { ActionLink, PageIntro } from "@/app/ui";
import { SofaProductsClient } from "@/app/dashboard/sofas/sofa-products-client";
import { requireUser } from "@/lib/auth";
import { ensureDb, sql } from "@/lib/db";
import { getCurrencySetting } from "@/lib/settings";

type SofaProductRow = { id: number; product_name: string; last_price: string | null };
type PricingSearchParams = { error?: string; success?: string; modal?: string; id?: string };

export default async function PricingPage({ searchParams }: { searchParams?: Promise<PricingSearchParams> }) {
  const user = await requireUser();
  await ensureDb();
  const params = searchParams ? await searchParams : undefined;
  const [rows, currencyCode] = await Promise.all([
    sql<SofaProductRow[]>`select id, product_name, last_price::text from sofa_products order by product_name asc`,
    getCurrencySetting(),
  ]);
  const products: { id: number; productName: string; lastPrice: number | null }[] = rows.map((row: SofaProductRow) => ({ id: row.id, productName: row.product_name, lastPrice: row.last_price === null ? null : Number(row.last_price) }));
  const selectedProduct = products.find((product) => product.id === Number(params?.id)) ?? null;
  const isAdmin = user.role !== "employee";
  const modal = isAdmin && params?.modal === "create" ? "create" as const : isAdmin && params?.modal === "edit" ? "edit" as const : undefined;
  const message = params?.error === "duplicate"
    ? "Error: A product with that name already exists."
    : params?.error === "invalid"
      ? "Error: Enter a valid product name and non-negative price."
      : params?.success === "created"
        ? "Product added."
        : params?.success === "updated"
          ? "Product updated."
          : params?.success === "deleted"
            ? "Product deleted."
            : undefined;

  return (
    <div className="space-y-4">
      <PageIntro eyebrow="Products" title="Pricing" description="Browse product names and their latest recorded prices." action={isAdmin ? <ActionLink href="/dashboard/pricing?modal=create" label="Add product" /> : undefined} />
      <SofaProductsClient
        products={products}
        currencyCode={currencyCode}
        canCreate={isAdmin}
        message={message}
        modal={modal}
        selectedProduct={selectedProduct}
      />
    </div>
  );
}
