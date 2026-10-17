import Link from "next/link";
import { createSupplierAction } from "@/app/actions";
import { ActionLink, Field, MetricCard, ModalFrame, PageIntro, Panel, inputClass, primaryButton } from "@/app/ui";
import { requireAdmin } from "@/lib/auth";
import { ensureDb, sql } from "@/lib/db";

type SupplierListRow = { id: number; name: string; phone: string | null; company: string | null; address: string | null };

export default async function SuppliersPage({ searchParams }: { searchParams?: Promise<{ modal?: string }> }) {
  await requireAdmin();
  await ensureDb();
  const query = searchParams ? await searchParams : undefined;
  const suppliers = await sql<SupplierListRow[]>`select id, name, phone, company, address from suppliers order by name`;
  return <div className="space-y-4">
    <PageIntro
      eyebrow="Vendors"
      title="Suppliers"
      description="Manage order suppliers and their contact details."
      action={<ActionLink href="/dashboard/suppliers?modal=create" label="Create supplier" />}
    />

    <section aria-label="Supplier metrics" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard label="Total Suppliers" value={String(suppliers.length)} tone="sky" />
    </section>

    <Panel title="All suppliers" subtitle={`${suppliers.length} suppliers`}>
      {suppliers.length ? <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="text-xs uppercase tracking-wide text-slate-500"><tr>
            <th className="pb-3 pr-4 font-semibold">Supplier</th>
            <th className="pb-3 pr-4 font-semibold">Company</th>
            <th className="pb-3 pr-4 font-semibold">Phone</th>
            <th className="pb-3 pr-4 font-semibold">Address</th>
            <th className="pb-3 text-right font-semibold">Actions</th>
          </tr></thead>
          <tbody className="divide-y divide-slate-100">
            {suppliers.map((supplier: SupplierListRow) => <tr key={supplier.id} className="hover:bg-slate-50/80">
              <td className="py-3 pr-4"><Link href={`/dashboard/suppliers/${supplier.id}`} className="font-semibold text-slate-900 hover:text-amber-700">{supplier.name}</Link></td>
              <td className="py-3 pr-4 text-slate-700">{supplier.company || "—"}</td>
              <td className="py-3 pr-4 text-slate-700">{supplier.phone || "—"}</td>
              <td className="max-w-sm whitespace-pre-wrap py-3 pr-4 text-slate-700">{supplier.address || "—"}</td>
              <td className="py-3 text-right"><div className="inline-flex gap-2">
                <Link href={`/dashboard/suppliers/${supplier.id}?modal=edit`} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100">Edit</Link>
                <Link href={`/dashboard/suppliers/${supplier.id}?modal=delete`} className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-50">Delete</Link>
              </div></td>
            </tr>)}
          </tbody>
        </table>
      </div> : <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center">
        <p className="font-semibold text-slate-800">No suppliers yet</p>
        <p className="mt-1 text-sm text-slate-500">Create a supplier to start assigning orders.</p>
      </div>}
    </Panel>

    {query?.modal === "create" ? <ModalFrame title="Create supplier" subtitle="Supplier name is required. Contact details are optional." closeHref="/dashboard/suppliers">
      <form action={createSupplierAction} className="space-y-3">
        <Field label="Supplier name"><input required name="name" className={inputClass} /></Field>
        <Field label="Phone"><input name="phone" className={inputClass} /></Field>
        <Field label="Company"><input name="company" className={inputClass} /></Field>
        <Field label="Address"><textarea name="address" rows={3} className={inputClass} /></Field>
        <button className={primaryButton}>Create supplier</button>
      </form>
    </ModalFrame> : null}
  </div>;
}
