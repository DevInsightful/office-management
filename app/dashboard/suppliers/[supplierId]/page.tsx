import { notFound } from "next/navigation";
import { deleteSupplierAction, updateSupplierAction } from "@/app/actions";
import { ActionLink, Field, MetricCard, ModalFrame, PageIntro, Panel, inputClass, primaryButton, currency } from "@/app/ui";
import { PendingSubmitButton } from "@/app/pending-controls";
import { requireAdmin } from "@/lib/auth";
import { ensureDb, sql } from "@/lib/db";
import { getCurrencySetting } from "@/lib/settings";
import Link from "next/link";
import { formatDateDDMMYY } from "@/lib/date-format";

export default async function SupplierDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ supplierId: string }>;
  searchParams?: Promise<{ modal?: string }>;
}) {
  await requireAdmin();
  await ensureDb();
  const { supplierId: rawId } = await params;
  const query = searchParams ? await searchParams : undefined;
  const id = Number(rawId);
  if (!Number.isInteger(id) || id < 1) notFound();
  const suppliers = await sql<{ id: number; name: string; phone: string | null; company: string | null; address: string | null }[]>`select id, name, phone, company, address from suppliers where id=${id}`;
  const supplier = suppliers[0];
  if (!supplier) notFound();
  const rows = await sql<{ total_orders: string; delivered: string; undelivered: string; month_delivered: string; profit: string; order_value: string }[]>`
    select count(*)::text total_orders,
      count(*) filter (where status='delivered')::text delivered,
      count(*) filter (where status <> 'delivered')::text undelivered,
      count(*) filter (where status='delivered' and date_trunc('month', delivery_date)=date_trunc('month', current_date))::text month_delivered,
      coalesce(sum(profit),0)::text profit, coalesce(sum(total),0)::text order_value
    from orders where supplier_id=${id}`;
  const stats = rows[0];
  const deliveredOrders = await sql<{ id: number; customer_name: string; booking_date: string; delivery_date: string; total: string; profit: string }[]>`
    select id, customer_name, booking_date::text, delivery_date::text, total::text, profit::text
    from orders where supplier_id=${id} and status='delivered' order by delivery_date desc, id desc`;
  const currencyCode = await getCurrencySetting();
  const isEditModalOpen = query?.modal === "edit";

  return <div className="space-y-5">
    <PageIntro
      eyebrow="Supplier profile"
      title={supplier.name}
      description={supplier.company ? `${supplier.company} · Supplier overview and order performance.` : "Supplier overview and order performance."}
      action={<div className="flex flex-wrap gap-2"><ActionLink href={`/dashboard/suppliers/${id}?modal=edit`} label="Edit supplier" /><ActionLink href={`/dashboard/suppliers/${id}?modal=delete`} label="Delete supplier" /></div>}
    />

    <section aria-label="Supplier performance" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      <MetricCard label="Total Orders" value={stats.total_orders} tone="sky" />
      <MetricCard label="Delivered" value={stats.delivered} tone="emerald" />
      <MetricCard label="Undelivered" value={stats.undelivered} tone="amber" />
      <MetricCard label="Delivered This Month" value={stats.month_delivered} tone="violet" />
      <MetricCard label="Total Profit" value={currency(Number(stats.profit), currencyCode)} tone="emerald" />
      <MetricCard label="Total Order Value" value={currency(Number(stats.order_value), currencyCode)} tone="sky" />
    </section>

    <Panel title="Supplier details" subtitle="Contact information for this supplier.">
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Supplier name</p>
          <p className="mt-2 text-base font-semibold text-slate-950">{supplier.name}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Company</p>
          <p className="mt-2 text-base font-semibold text-slate-950">{supplier.company || "Not provided"}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Phone</p>
          <p className="mt-2 text-base font-semibold text-slate-950">{supplier.phone || "Not provided"}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 md:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Address</p>
          <p className="mt-2 whitespace-pre-wrap text-base font-semibold text-slate-950">{supplier.address || "Not provided"}</p>
        </div>
      </div>
    </Panel>

    <Panel title="Delivered orders" subtitle={`${deliveredOrders.length} orders delivered by ${supplier.name}`}>
      {deliveredOrders.length ? <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead className="text-xs uppercase tracking-wide text-slate-500"><tr>
            <th className="pb-3 pr-4 font-semibold">Order</th>
            <th className="pb-3 pr-4 font-semibold">Customer</th>
            <th className="pb-3 pr-4 font-semibold">Booked</th>
            <th className="pb-3 pr-4 font-semibold">Delivered</th>
            <th className="pb-3 pr-4 text-right font-semibold">Order value</th>
            <th className="pb-3 text-right font-semibold">Profit</th>
          </tr></thead>
          <tbody className="divide-y divide-slate-100">
            {deliveredOrders.map((order: { id: number; customer_name: string; booking_date: string; delivery_date: string; total: string; profit: string }) => <tr key={order.id}>
              <td className="py-3 pr-4"><Link href={`/dashboard/orders?modal=details&order=${order.id}`} className="font-semibold text-slate-900 hover:text-amber-700">#{order.id}</Link></td>
              <td className="py-3 pr-4 text-slate-700">{order.customer_name}</td>
              <td className="py-3 pr-4 text-slate-600">{formatDateDDMMYY(order.booking_date)}</td>
              <td className="py-3 pr-4 text-slate-600">{formatDateDDMMYY(order.delivery_date)}</td>
              <td className="py-3 pr-4 text-right font-medium text-slate-800">{currency(Number(order.total), currencyCode)}</td>
              <td className="py-3 text-right font-semibold text-emerald-700">{currency(Number(order.profit), currencyCode)}</td>
            </tr>)}
          </tbody>
        </table>
      </div> : <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center">
        <p className="font-semibold text-slate-800">No delivered orders yet</p>
        <p className="mt-1 text-sm text-slate-500">Orders assigned to this supplier will appear here after delivery.</p>
      </div>}
    </Panel>

    {isEditModalOpen ? <ModalFrame title="Edit supplier" subtitle="Update this supplier’s contact information." closeHref={`/dashboard/suppliers/${id}`}>
      <form action={updateSupplierAction} className="space-y-3">
        <input type="hidden" name="supplierId" value={id} />
        <Field label="Supplier name"><input required name="name" defaultValue={supplier.name} className={inputClass} /></Field>
        <Field label="Phone"><input name="phone" defaultValue={supplier.phone ?? ""} className={inputClass} /></Field>
        <Field label="Company"><input name="company" defaultValue={supplier.company ?? ""} className={inputClass} /></Field>
        <Field label="Address"><textarea name="address" rows={3} defaultValue={supplier.address ?? ""} className={inputClass} /></Field>
        <button className={primaryButton}>Save changes</button>
      </form>
    </ModalFrame> : null}

    {query?.modal === "delete" ? <ModalFrame title="Delete supplier?" subtitle="This supplier will be removed from your supplier list." closeHref={`/dashboard/suppliers/${id}`}>
      <div className="space-y-4">
        <p className="text-sm leading-6 text-slate-600">Orders already associated with {supplier.name} will remain in the system and become unassigned. Supplier contact details cannot be restored after deletion.</p>
        <form action={deleteSupplierAction} className="flex flex-wrap justify-end gap-2">
          <input type="hidden" name="supplierId" value={id} />
          <PendingSubmitButton idleLabel="Delete supplier" pendingLabel="Deleting..." className="inline-flex items-center justify-center rounded-2xl bg-rose-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-rose-800" pendingClassName="cursor-not-allowed bg-rose-400" />
        </form>
      </div>
    </ModalFrame> : null}
  </div>;
}
