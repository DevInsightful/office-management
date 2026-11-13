import { ActionLink, PageIntro } from "@/app/ui";
import { SofaProductsClient } from "@/app/dashboard/sofas/sofa-products-client";
import { requireUser } from "@/lib/auth";
import { ensureDb, sql } from "@/lib/db";
import { getCurrencySetting } from "@/lib/settings";
import { SOFA_CATEGORIES } from "@/lib/sofa-categories";

type SofaPriceRow = { id: number; product_name: string; category: string | null; category_price: string | null; category_dimensions: string | null };
type PricingSearchParams = { error?: string; success?: string; modal?: string; id?: string };

export default async function PricingPage({ searchParams }: { searchParams?: Promise<PricingSearchParams> }) {
  const user = await requireUser();
  await ensureDb();
  const params = searchParams ? await searchParams : undefined;
  const [rows, currencyCode] = await Promise.all([
    sql<SofaPriceRow[]>`select product.id, product.product_name, prices.category, prices.last_price::text as category_price, prices.dimensions as category_dimensions
      from sofa_products product
      left join sofa_product_prices prices on prices.product_id = product.id
      order by product.product_name asc, prices.category asc`,
    getCurrencySetting(),
  ]);
  const productMap = new Map<number, { id: number; productName: string; prices: Record<string, number | null>; dimensions: Record<string, string> }>();
  for (const row of rows as SofaPriceRow[]) {
    let product = productMap.get(row.id);
    if (!product) {
      product = { id: row.id, productName: row.product_name, prices: Object.fromEntries(SOFA_CATEGORIES.map((category) => [category, null])), dimensions: Object.fromEntries(SOFA_CATEGORIES.map((category) => [category, ""])) };
      productMap.set(row.id, product);
    }
    if (row.category) {
      product.prices[row.category] = row.category_price === null ? null : Number(row.category_price);
      product.dimensions[row.category] = row.category_dimensions ?? "";
    }
  }
  const products = [...productMap.values()];
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
        categories={SOFA_CATEGORIES}
        message={message}
        modal={modal}
        selectedProduct={selectedProduct}
      />
    </div>
  );
}
