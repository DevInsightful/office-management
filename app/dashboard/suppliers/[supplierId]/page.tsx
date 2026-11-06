import Link from "next/link";
import { notFound } from "next/navigation";

import { ActionLink, MetricCard, PageIntro, Panel, currency } from "@/app/ui";
import { requireAdmin } from "@/lib/auth";
import { ensureDb, sql } from "@/lib/db";
import { formatDateDDMMYY } from "@/lib/date-format";
import { getCurrencySetting } from "@/lib/settings";
import { getSupplierSummaries } from "@/lib/suppliers";

type SupplierOrder = {
  id: number;
  customer_name: string;
  delivery_date: string;
  total: string;
  profit: string;
  vendor_name: string;
  note: string;
  status: string;
};

export default async function SupplierDetailsPage({
  params,
}: {
  params: Promise<{ supplierId: string }>;
}) {
  await requireAdmin();
  await ensureDb();

  const supplierId = Number((await params).supplierId);
  if (!Number.isInteger(supplierId) || supplierId <= 0) notFound();

  const [summaries, currencyCode, orders] = await Promise.all([
    getSupplierSummaries(),
    getCurrencySetting(),
    sql<SupplierOrder[]>`
      select id, customer_name, delivery_date::text, total::text, profit::text, vendor_name, note, status
      from orders
      where supplier_id = ${supplierId}
      order by delivery_date desc, id desc
    `,
  ]);

  const supplier = summaries.find((item) => item.id === supplierId);
  if (!supplier) notFound();

  return (
    <div className="space-y-4">
      <PageIntro
        eyebrow="Supplier"
        title={supplier.name}
        description={supplier.contactDetails || "No contact details have been recorded."}
        action={<ActionLink href="/dashboard/suppliers" label="Back to Suppliers" />}
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Total Orders" value={String(supplier.totalOrders)} tone="sky" />
        <MetricCard
          label="Delivered This Month"
          value={`${supplier.deliveredThisMonth} (${currency(supplier.deliveredValueThisMonth, currencyCode)})`}
          tone="emerald"
        />
        <MetricCard
          label="Undelivered This Month"
          value={`${supplier.undeliveredThisMonth} (${currency(supplier.undeliveredValueThisMonth, currencyCode)})`}
          tone="rose"
        />
        <MetricCard label="Total Order Value" value={currency(supplier.totalOrderValue, currencyCode)} tone="violet" />
        <MetricCard label="Total Profit" value={currency(supplier.totalProfit, currencyCode)} tone="amber" />
      </section>

      <Panel
        title="Supplier Orders"
        subtitle="Every order assigned to this supplier, including individual value, profit, delivering vendor, and notes."
      >
        {orders.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">No orders assigned to this supplier yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-slate-500">
                <tr>
                  <th className="pb-3 pr-4">Order</th>
                  <th className="pb-3 pr-4">Customer</th>
                  <th className="pb-3 pr-4">Delivery</th>
                  <th className="pb-3 pr-4">Vendor</th>
                  <th className="pb-3 pr-4">Notes</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3 pr-4">Order Value</th>
                  <th className="pb-3">Profit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(orders as SupplierOrder[]).map((order: SupplierOrder) => (
                  <tr key={order.id}>
                    <td className="py-3 pr-4 font-medium">
                      <Link
                        href={`/dashboard/orders?modal=details&order=${order.id}`}
                        className="font-semibold text-slate-900 underline-offset-2 hover:text-amber-700 hover:underline"
                      >
                        #{order.id}
                      </Link>
                    </td>
                    <td className="py-3 pr-4">{order.customer_name}</td>
                    <td className="py-3 pr-4">{formatDateDDMMYY(order.delivery_date)}</td>
                    <td className="py-3 pr-4">{order.vendor_name || "-"}</td>
                    <td className="py-3 pr-4 max-w-xs truncate text-slate-600" title={order.note}>
                      {order.note || "-"}
                    </td>
                    <td className="py-3 pr-4 capitalize">{order.status}</td>
                    <td className="py-3 pr-4 font-medium">{currency(Number(order.total), currencyCode)}</td>
                    <td className="py-3 font-semibold text-emerald-700">
                      {currency(Number(order.profit), currencyCode)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
