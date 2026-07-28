import {
  ActionLink,
  Field,
  ModalFrame,
  PageIntro,
  Panel,
  currency,
  inputClass,
  primaryButton,
  textareaClass,
} from "@/app/ui";
import { requireAdmin } from "@/lib/auth";
import { getDashboardData } from "@/lib/data";
import { addFinanceEntryAction } from "@/app/actions";

const today = "2026-07-28";

export default async function FinancePage({
  searchParams,
}: {
  searchParams?: Promise<{ modal?: string }>;
}) {
  const user = await requireAdmin();
  const data = await getDashboardData(user);
  const params = searchParams ? await searchParams : undefined;
  const modal = params?.modal;

  return (
    <>
      <PageIntro
        eyebrow="Finance"
        title="Income and expense records"
        description="All financial entries live here. Add new income or expenses on this page and review the strongest revenue and cost categories beside the ledger."
        action={<ActionLink href="/dashboard/finance?modal=new-entry" label="New Expense / Income" />}
      />

      <section className="grid gap-4">
        <Panel title="All Finance Entries" subtitle="Latest office income and expenses.">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-slate-500">
                <tr>
                  <th className="pb-3 pr-4 font-medium">Type</th>
                  <th className="pb-3 pr-4 font-medium">Title</th>
                  <th className="pb-3 pr-4 font-medium">Category</th>
                  <th className="pb-3 pr-4 font-medium">Date</th>
                  <th className="pb-3 font-medium">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.finance.recent.map((entry) => (
                  <tr key={entry.id}>
                    <td className="py-3 pr-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] ${
                          entry.type === "income"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-rose-100 text-rose-700"
                        }`}
                      >
                        {entry.type}
                      </span>
                    </td>
                    <td className="py-3 pr-4">{entry.title}</td>
                    <td className="py-3 pr-4 text-slate-600">{entry.category}</td>
                    <td className="py-3 pr-4 text-slate-600">{entry.entry_date}</td>
                    <td className="py-3 font-semibold">{currency(entry.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </section>

      {modal === "new-entry" && (
        <ModalFrame
          title="New Finance Entry"
          subtitle="Record a new income or expense without leaving the finance page."
          closeHref="/dashboard/finance"
        >
          <form action={addFinanceEntryAction} className="space-y-3">
            <Field label="Type">
              <select name="type" defaultValue="expense" className={inputClass}>
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>
            </Field>
            <Field label="Title">
              <input name="title" placeholder="Office rent" className={inputClass} />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Category">
                <input name="category" placeholder="Rent" className={inputClass} />
              </Field>
              <Field label="Amount">
                <input name="amount" type="number" min="0" step="0.01" placeholder="50000" className={inputClass} />
              </Field>
            </div>
            <Field label="Entry date">
              <input name="entryDate" type="date" defaultValue={today} className={inputClass} />
            </Field>
            <Field label="Notes">
              <textarea name="notes" rows={4} className={textareaClass} placeholder="Optional details" />
            </Field>
            <button className={primaryButton}>Save finance entry</button>
          </form>
        </ModalFrame>
      )}
    </>
  );
}
