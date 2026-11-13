"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { createSofaProductAction, deleteSofaProductAction, updateSofaProductAction } from "@/app/actions";
import { PendingSubmitButton } from "@/app/pending-controls";
import { Field, ModalFrame, Panel, currency, inputClass, primaryButton } from "@/app/ui";

type SofaProduct = { id: number; productName: string; prices: Record<string, number | null>; dimensions: Record<string, string> };

function SofaProductForm({
  product,
  categories,
  action,
  submitLabel,
  pendingLabel,
}: {
  product?: SofaProduct | null;
  categories: readonly string[];
  action: (formData: FormData) => Promise<void>;
  submitLabel: string;
  pendingLabel: string;
}) {
  const [dimensions, setDimensions] = useState<Record<string, string>>(() => Object.fromEntries(categories.map((category) => [category, product?.dimensions[category] ?? ""])));
  const [defaults, setDefaults] = useState({ height: "", width: "", depth: "", unit: "cm" });

  function applyDefaultDimensions() {
    const parts = [
      defaults.height ? `H ${defaults.height}` : "",
      defaults.width ? `W ${defaults.width}` : "",
      defaults.depth ? `D ${defaults.depth}` : "",
    ].filter(Boolean);
    if (parts.length === 0) return;
    const formatted = `${parts.join(" × ")} ${defaults.unit}`;
    setDimensions(Object.fromEntries(categories.map((category) => [category, formatted])));
  }

  return <form action={action} className="space-y-4">
    {product ? <input type="hidden" name="productId" value={product.id} /> : null}
    <Field label="Sofa name"><input name="productName" required maxLength={120} defaultValue={product?.productName ?? ""} className={inputClass} placeholder="Sofa name" /></Field>
    <fieldset className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
      <legend className="px-1 text-sm font-semibold text-slate-900">Default dimensions for all variants</legend>
      <div className="grid gap-3 sm:grid-cols-4">
        <Field label="Height"><input type="number" min="0" step="0.1" value={defaults.height} onChange={(event) => setDefaults((current) => ({ ...current, height: event.target.value }))} className={inputClass} placeholder="H" /></Field>
        <Field label="Width"><input type="number" min="0" step="0.1" value={defaults.width} onChange={(event) => setDefaults((current) => ({ ...current, width: event.target.value }))} className={inputClass} placeholder="W" /></Field>
        <Field label="Depth"><input type="number" min="0" step="0.1" value={defaults.depth} onChange={(event) => setDefaults((current) => ({ ...current, depth: event.target.value }))} className={inputClass} placeholder="D" /></Field>
        <Field label="Unit"><select value={defaults.unit} onChange={(event) => setDefaults((current) => ({ ...current, unit: event.target.value }))} className={inputClass}><option value="cm">cm</option><option value="in">in</option></select></Field>
      </div>
      <button type="button" onClick={applyDefaultDimensions} className="mt-3 rounded-xl border border-amber-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-amber-100">Apply to all variants</button>
      <p className="mt-2 text-xs text-slate-600">You can edit each variant’s dimensions separately below.</p>
    </fieldset>
    <div className="grid gap-3 sm:grid-cols-2">
      {categories.map((category, index) => <fieldset key={category} className="rounded-2xl border border-slate-200 p-3">
        <legend className="px-1 text-sm font-semibold text-slate-800">{category}</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Price"><input name={`price_${index}`} type="number" min="0" step="0.01" defaultValue={product?.prices[category] ?? ""} className={inputClass} placeholder="No price" /></Field>
          <Field label="Dimensions (H × W × D)"><input name={`dimensions_${index}`} maxLength={100} value={dimensions[category]} onChange={(event) => setDimensions((current) => ({ ...current, [category]: event.target.value }))} className={inputClass} placeholder="e.g. H 85 × W 200 × D 90 cm" /></Field>
        </div>
      </fieldset>)}
    </div>
    <PendingSubmitButton idleLabel={submitLabel} pendingLabel={pendingLabel} className={`${primaryButton} gap-3`} pendingClassName="cursor-not-allowed bg-slate-700 hover:bg-slate-700" />
  </form>;
}

export function SofaProductsClient({
  products,
  currencyCode,
  canCreate,
  message,
  modal,
  selectedProduct,
  categories,
}: {
  products: SofaProduct[];
  currencyCode: string;
  canCreate: boolean;
  message?: string;
  modal?: "create" | "edit";
  selectedProduct?: SofaProduct | null;
  categories: readonly string[];
}) {
  const [search, setSearch] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [priceCategory, setPriceCategory] = useState(categories[0] ?? "");
  const [sort, setSort] = useState("name-asc");

  const visibleProducts = useMemo(() => {
    const min = minPrice === "" ? null : Number(minPrice);
    const max = maxPrice === "" ? null : Number(maxPrice);
    return products
      .filter((product) => product.productName.toLowerCase().includes(search.trim().toLowerCase()))
      .filter((product) => {
        if (min === null && max === null) return true;
        const price = product.prices[priceCategory];
        return price !== null && price !== undefined && (min === null || price >= min) && (max === null || price <= max);
      })
      .sort((left, right) => {
        if (sort === "price-asc") return (left.prices[priceCategory] ?? Number.POSITIVE_INFINITY) - (right.prices[priceCategory] ?? Number.POSITIVE_INFINITY) || left.productName.localeCompare(right.productName);
        if (sort === "price-desc") return (right.prices[priceCategory] ?? Number.NEGATIVE_INFINITY) - (left.prices[priceCategory] ?? Number.NEGATIVE_INFINITY) || left.productName.localeCompare(right.productName);
        return left.productName.localeCompare(right.productName);
      });
  }, [maxPrice, minPrice, priceCategory, products, search, sort]);

  return (
    <div className="space-y-4">
      {message ? <p role="status" className={`rounded-2xl border px-4 py-3 text-sm ${message.startsWith("Error:") ? "border-rose-200 bg-rose-50 text-rose-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>{message}</p> : null}

      <Panel title="Product pricing" subtitle={`${visibleProducts.length} product(s)`}>
        <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <Field label="Search product name"><input value={search} onChange={(event) => setSearch(event.target.value)} className={inputClass} placeholder="Search by name" /></Field>
          <Field label="Price category"><select value={priceCategory} onChange={(event) => setPriceCategory(event.target.value)} className={inputClass}>{categories.map((category) => <option key={category} value={category}>{category}</option>)}</select></Field>
          <Field label="Minimum price"><input type="number" min="0" step="0.01" value={minPrice} onChange={(event) => setMinPrice(event.target.value)} className={inputClass} placeholder="Any" /></Field>
          <Field label="Maximum price"><input type="number" min="0" step="0.01" value={maxPrice} onChange={(event) => setMaxPrice(event.target.value)} className={inputClass} placeholder="Any" /></Field>
          <Field label="Sort"><select value={sort} onChange={(event) => setSort(event.target.value)} className={inputClass}>
            <option value="name-asc">Product name</option>
            <option value="price-asc">Selected category price: low to high</option>
            <option value="price-desc">Selected category price: high to low</option>
          </select></Field>
        </div>
        <div className="max-w-full overflow-x-auto">
          <table className="min-w-[1800px] text-sm">
            <thead className="text-left text-slate-500"><tr>
              <th className="sticky left-0 z-10 min-w-52 bg-white pb-3 pr-4 font-medium">Sofa name</th>
              {categories.map((category) => <th key={category} className="min-w-48 px-3 pb-3 font-medium"><span className="block">{category}</span><span className="mt-1 block text-xs font-normal">Price · Dimensions (H × W × D)</span></th>)}
              {canCreate ? <th className="sticky right-0 z-10 min-w-32 bg-white pb-3 pl-3 text-right font-medium">Actions</th> : null}
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {visibleProducts.map((product) => <tr key={product.id}>
                <td className="sticky left-0 z-10 bg-white py-3 pr-4 font-semibold text-slate-900">{product.productName}</td>
                {categories.map((category) => <td key={category} className="px-3 py-3 text-slate-700">
                  <p className="whitespace-nowrap font-medium">{product.prices[category] === null || product.prices[category] === undefined ? "—" : currency(product.prices[category]!, currencyCode)}</p>
                  <p className="mt-1 whitespace-nowrap text-xs text-slate-500">{product.dimensions[category] || "—"}</p>
                </td>)}
                {canCreate ? <td className="sticky right-0 z-10 bg-white py-3 pl-3 text-right">
                  <div className="inline-flex items-center gap-2">
                    <Link href={`/dashboard/pricing?modal=edit&id=${product.id}`} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">Edit</Link>
                    <form action={deleteSofaProductAction} onSubmit={(event) => { if (!window.confirm(`Delete ${product.productName}?`)) event.preventDefault(); }}>
                      <input type="hidden" name="productId" value={product.id} />
                      <PendingSubmitButton idleLabel="Delete" pendingLabel="Deleting..." className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50" pendingClassName="cursor-not-allowed bg-rose-50 text-rose-400" />
                    </form>
                  </div>
                </td> : null}
              </tr>)}
              {visibleProducts.length === 0 ? <tr><td colSpan={categories.length + (canCreate ? 2 : 1)} className="py-6 text-center text-slate-500">No matching products.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </Panel>

      {canCreate && modal === "create" ? <ModalFrame title="Add sofa" subtitle="Add the sofa name and category prices and dimensions." closeHref="/dashboard/pricing" widthClassName="max-w-4xl">
        <SofaProductForm categories={categories} action={createSofaProductAction} submitLabel="Create sofa" pendingLabel="Creating..." />
      </ModalFrame> : null}

      {canCreate && modal === "edit" && selectedProduct ? <ModalFrame title="Edit sofa pricing" subtitle="Update category prices and dimensions for this sofa." closeHref="/dashboard/pricing" widthClassName="max-w-4xl">
        <SofaProductForm product={selectedProduct} categories={categories} action={updateSofaProductAction} submitLabel="Save changes" pendingLabel="Saving..." />
      </ModalFrame> : null}
    </div>
  );
}
