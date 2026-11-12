"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { createSofaProductAction, deleteSofaProductAction, updateSofaProductAction } from "@/app/actions";
import { PendingSubmitButton } from "@/app/pending-controls";
import { Field, ModalFrame, Panel, currency, inputClass, primaryButton } from "@/app/ui";

type SofaProduct = { id: number; productName: string; lastPrice: number | null };

export function SofaProductsClient({
  products,
  currencyCode,
  canCreate,
  message,
  modal,
  selectedProduct,
}: {
  products: SofaProduct[];
  currencyCode: string;
  canCreate: boolean;
  message?: string;
  modal?: "create" | "edit";
  selectedProduct?: SofaProduct | null;
}) {
  const [search, setSearch] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sort, setSort] = useState("name-asc");

  const visibleProducts = useMemo(() => {
    const min = minPrice === "" ? null : Number(minPrice);
    const max = maxPrice === "" ? null : Number(maxPrice);
    return products
      .filter((product) => product.productName.toLowerCase().includes(search.trim().toLowerCase()))
      .filter((product) => product.lastPrice !== null && (min === null || product.lastPrice >= min) && (max === null || product.lastPrice <= max) || product.lastPrice === null && min === null && max === null)
      .sort((left, right) => {
        if (sort === "price-asc") return (left.lastPrice ?? Number.POSITIVE_INFINITY) - (right.lastPrice ?? Number.POSITIVE_INFINITY) || left.productName.localeCompare(right.productName);
        if (sort === "price-desc") return (right.lastPrice ?? Number.NEGATIVE_INFINITY) - (left.lastPrice ?? Number.NEGATIVE_INFINITY) || left.productName.localeCompare(right.productName);
        return left.productName.localeCompare(right.productName);
      });
  }, [maxPrice, minPrice, products, search, sort]);

  return (
    <div className="space-y-4">
      {message ? <p role="status" className={`rounded-2xl border px-4 py-3 text-sm ${message.startsWith("Error:") ? "border-rose-200 bg-rose-50 text-rose-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>{message}</p> : null}

      <Panel title="Products and last prices" subtitle={`${visibleProducts.length} product(s)`}>
        <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Field label="Search product name"><input value={search} onChange={(event) => setSearch(event.target.value)} className={inputClass} placeholder="Search by name" /></Field>
          <Field label="Minimum price"><input type="number" min="0" step="0.01" value={minPrice} onChange={(event) => setMinPrice(event.target.value)} className={inputClass} placeholder="Any" /></Field>
          <Field label="Maximum price"><input type="number" min="0" step="0.01" value={maxPrice} onChange={(event) => setMaxPrice(event.target.value)} className={inputClass} placeholder="Any" /></Field>
          <Field label="Sort by price"><select value={sort} onChange={(event) => setSort(event.target.value)} className={inputClass}>
            <option value="name-asc">Product name</option>
            <option value="price-asc">Price: low to high</option>
            <option value="price-desc">Price: high to low</option>
          </select></Field>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-slate-500"><tr><th className="pb-3 pr-4 font-medium">Product name</th><th className="pb-3 font-medium">Last price</th>{canCreate ? <th className="pb-3 text-right font-medium">Actions</th> : null}</tr></thead>
            <tbody className="divide-y divide-slate-100">
              {visibleProducts.map((product) => <tr key={product.id}>
                <td className="py-3 pr-4 font-medium text-slate-900">{product.productName}</td>
                <td className="py-3 text-slate-700">{product.lastPrice === null ? "—" : currency(product.lastPrice, currencyCode)}</td>
                {canCreate ? <td className="py-3 text-right">
                  <div className="inline-flex items-center gap-2">
                    <Link href={`/dashboard/pricing?modal=edit&id=${product.id}`} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">Edit</Link>
                    <form action={deleteSofaProductAction} onSubmit={(event) => { if (!window.confirm(`Delete ${product.productName}?`)) event.preventDefault(); }}>
                      <input type="hidden" name="productId" value={product.id} />
                      <PendingSubmitButton idleLabel="Delete" pendingLabel="Deleting..." className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50" pendingClassName="cursor-not-allowed bg-rose-50 text-rose-400" />
                    </form>
                  </div>
                </td> : null}
              </tr>)}
              {visibleProducts.length === 0 ? <tr><td colSpan={canCreate ? 3 : 2} className="py-6 text-center text-slate-500">No matching products.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </Panel>

      {canCreate && modal === "create" ? <ModalFrame title="Add product" subtitle="Enter the product name and latest price." closeHref="/dashboard/pricing">
        <form action={createSofaProductAction} className="space-y-4">
          <Field label="Product name"><input name="productName" required maxLength={120} className={inputClass} placeholder="Product name" /></Field>
          <Field label="Last price"><input name="lastPrice" type="number" min="0" step="0.01" className={inputClass} placeholder="Optional" /></Field>
          <PendingSubmitButton idleLabel="Create product" pendingLabel="Creating..." className={`${primaryButton} gap-3`} pendingClassName="cursor-not-allowed bg-slate-700 hover:bg-slate-700" />
        </form>
      </ModalFrame> : null}

      {canCreate && modal === "edit" && selectedProduct ? <ModalFrame title="Edit product" subtitle="Update the product name or latest price." closeHref="/dashboard/pricing">
        <form action={updateSofaProductAction} className="space-y-4">
          <input type="hidden" name="productId" value={selectedProduct.id} />
          <Field label="Product name"><input name="productName" required maxLength={120} defaultValue={selectedProduct.productName} className={inputClass} /></Field>
          <Field label="Last price"><input name="lastPrice" type="number" min="0" step="0.01" defaultValue={selectedProduct.lastPrice ?? ""} className={inputClass} placeholder="Optional" /></Field>
          <PendingSubmitButton idleLabel="Save changes" pendingLabel="Saving..." className={`${primaryButton} gap-3`} pendingClassName="cursor-not-allowed bg-slate-700 hover:bg-slate-700" />
        </form>
      </ModalFrame> : null}
    </div>
  );
}
