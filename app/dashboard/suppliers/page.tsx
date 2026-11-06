import Link from "next/link";

import { createSupplierAction } from "@/app/actions";
import { PendingSubmitButton } from "@/app/pending-controls";
import { Field, MetricCard, PageIntro, Panel, currency, inputClass, primaryButton, textareaClass } from "@/app/ui";
import { requireAdmin } from "@/lib/auth";
import { getCurrencySetting } from "@/lib/settings";
import { getSupplierSummaries } from "@/lib/suppliers";

export default async function SuppliersPage() {
  await requireAdmin();
  const [suppliers, currencyCode] = await Promise.all([getSupplierSummaries(), getCurrencySetting()]);

  return (
    <div className="space-y-4">
      <PageIntro
        eyebrow="Suppliers"
        title="Supplier management"
        description="Create suppliers and review order, delivery, and profit totals assigned to each supplier."
      />
      <Panel title="Add Supplier" subtitle="Supplier name is required. Contact details are optional.">
        <form action={createSupplierAction} className="grid gap-3 lg:grid-cols-[1fr_1.5fr_auto]">
          <Field label="Supplier name">
            <input name="name" required className={inputClass} placeholder="Supplier name" />
          </Field>
          <Field label="Contact details (optional)">
            <textarea
              name="contactDetails"
              rows={1}
              className={textareaClass}
              placeholder="Phone, email, address, or other notes"
            />
          </Field>
          <div className="self-end">
            <PendingSubmitButton
              idleLabel="Save supplier"
              pendingLabel="Saving..."
              className={`${primaryButton} gap-3 lg:w-auto`}
              pendingClassName="cursor-not-allowed bg-slate-700 hover:bg-slate-700"
            />
          </div>
        </form>
      </Panel>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Suppliers" value={String(suppliers.length)} tone="sky" />
        <MetricCard
          label="Total Orders"
          value={String(suppliers.reduce((sum, supplier) => sum + supplier.totalOrders, 0))}
          tone="amber"
        />
        <MetricCard
          label="Total Order Value"
          value={currency(suppliers.reduce((sum, supplier) => sum + supplier.totalOrderValue, 0), currencyCode)}
          tone="violet"
        />
        <MetricCard
          label="Total Profit"
          value={currency(suppliers.reduce((sum, supplier) => sum + supplier.totalProfit, 0), currencyCode)}
          tone="emerald"
        />
      </section>
      <Panel
        title="All Suppliers"
        subtitle="Open a supplier to view assigned orders, monthly delivered/undelivered breakdown, and profit."
      >
        {suppliers.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">No suppliers found. Add your first supplier above.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-slate-500">
                <tr>
                  <th className="pb-3 pr-4">Supplier</th>
                  <th className="pb-3 pr-4">Total Orders</th>
                  <th className="pb-3 pr-4">Delivered (This Month)</th>
                  <th className="pb-3 pr-4">Undelivered (This Month)</th>
                  <th className="pb-3 pr-4">Remaining Commission</th>
                  <th className="pb-3">Total Profit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {suppliers.map((supplier) => (
                  <tr key={supplier.id}>
                    <td className="py-3 pr-4">
                      <Link
                        href={`/dashboard/suppliers/${supplier.id}`}
                        className="font-semibold text-slate-900 underline-offset-2 hover:text-amber-700 hover:underline"
                      >
                        {supplier.name}
                      </Link>
                      <p className="mt-1 text-xs text-slate-500">{supplier.contactDetails || "No contact details"}</p>
                    </td>
                    <td className="py-3 pr-4 font-medium">{supplier.totalOrders}</td>
                    <td className="py-3 pr-4 text-emerald-700 font-medium">
                      {supplier.deliveredThisMonth}
                      {supplier.deliveredValueThisMonth > 0 && (
                        <span className="ml-1 text-xs text-slate-500">
                          ({currency(supplier.deliveredValueThisMonth, currencyCode)})
                        </span>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-amber-700 font-medium">
                      {supplier.undeliveredThisMonth}
                      {supplier.undeliveredValueThisMonth > 0 && (
                        <span className="ml-1 text-xs text-slate-500">
                          ({currency(supplier.undeliveredValueThisMonth, currencyCode)})
                        </span>
                      )}
                    </td>
                    <td className="py-3 pr-4 font-semibold text-rose-700">{currency(supplier.remainingCommission, currencyCode)}</td>
                    <td className="py-3 font-semibold text-emerald-700">
                      {currency(supplier.totalProfit, currencyCode)}
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
