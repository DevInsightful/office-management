import { addFinanceEntryAction, updateFinanceEntryAction, updateFinanceExchangeRatesAction } from "@/app/actions";
import { FinanceLedgerClient } from "@/app/dashboard/client-tables";
import { PendingSubmitButton } from "@/app/pending-controls";
import { ActionLink, Field, ModalFrame, PageIntro, Panel, inputClass, primaryButton, textareaClass } from "@/app/ui";
import { requireAdmin } from "@/lib/auth";
import { getDashboardData } from "@/lib/data";
import { getFinanceExchangeRates } from "@/lib/settings";

export default async function FinancePage({
  searchParams,
}: {
  searchParams?: Promise<{ modal?: string; entry?: string; error?: string; success?: string }>;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const user = await requireAdmin();
  const data = await getDashboardData(user);
  const rates = await getFinanceExchangeRates();
  const params = searchParams ? await searchParams : undefined;
  const modal = params?.modal;
  const selectedEntryId = Number(params?.entry ?? 0);
  const selectedEntry = data.finance.recent.find((entry) => entry.id === selectedEntryId) ?? null;

  return (
    <>
      <PageIntro
        eyebrow="Finance"
        title="Income and expense records"
        description="All financial entries live here. Add new income or expenses on this page and review the strongest revenue and cost categories beside the ledger."
        action={<ActionLink href="/dashboard/finance?modal=new-entry" label="New Expense / Income" />}
      />

      {params?.error === "invalid_exchange_rates" ? <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">Enter positive GBP-to-PKR and USD-to-PKR rates.</p> : null}
      {params?.error === "exchange_rate_missing" ? <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">Set the exchange rate on this page before saving a GBP or USD entry.</p> : null}
      {params?.error === "invalid_finance_entry" ? <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">Check the entry fields and enter an amount greater than zero.</p> : null}
      {params?.success === "exchange_rates_updated" ? <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Exchange rates saved. New entries will use these rates.</p> : null}

      <Panel title="Finance exchange rates" subtitle="Set how much PKR one GBP or USD is worth. Rates are saved with each entry so historical totals stay unchanged.">
        <form action={updateFinanceExchangeRatesAction} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <Field label="1 GBP = PKR">
            <input name="gbpToPkr" type="number" min="0.000001" step="0.01" required defaultValue={rates.GBP ?? ""} className={inputClass} />
          </Field>
          <Field label="1 USD = PKR">
            <input name="usdToPkr" type="number" min="0.000001" step="0.01" required defaultValue={rates.USD ?? ""} className={inputClass} />
          </Field>
          <PendingSubmitButton idleLabel="Save exchange rates" pendingLabel="Saving rates..." className={`${primaryButton} gap-3`} pendingClassName="cursor-not-allowed bg-slate-700 hover:bg-slate-700" />
        </form>
      </Panel>

      <FinanceLedgerClient entries={data.finance.recent} today={today} currencyCode="PKR" />

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
              <Field label="Currency">
                <select name="currency" defaultValue="PKR" className={inputClass}>
                  <option value="PKR">PKR</option>
                  <option value="GBP">GBP</option>
                  <option value="USD">USD</option>
                </select>
              </Field>
              <Field label="Amount">
                <input name="amount" type="number" min="0" step="0.01" placeholder="50000" className={inputClass} />
              </Field>
            </div>
            <Field label="Entry date">
              <input name="entryDate" type="date" defaultValue={today} max={today} className={inputClass} />
            </Field>
            <Field label="Notes">
              <textarea name="notes" rows={4} className={textareaClass} placeholder="Optional details" />
            </Field>
            <PendingSubmitButton
              idleLabel="Save finance entry"
              pendingLabel="Saving entry..."
              className={`${primaryButton} gap-3`}
              pendingClassName="cursor-not-allowed bg-slate-700 hover:bg-slate-700"
            />
          </form>
        </ModalFrame>
      )}

      {modal === "edit-entry" && selectedEntry && (
        <ModalFrame
          title={`Edit ${selectedEntry.title}`}
          subtitle="Update an existing finance entry."
          closeHref="/dashboard/finance"
        >
          <form action={updateFinanceEntryAction} className="space-y-3">
            <input type="hidden" name="entryId" value={selectedEntry.id} />
            <Field label="Type">
              <select name="type" defaultValue={selectedEntry.type} className={inputClass}>
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>
            </Field>
            <Field label="Title">
              <input name="title" defaultValue={selectedEntry.title} className={inputClass} />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Category">
                <input name="category" defaultValue={selectedEntry.category} className={inputClass} />
              </Field>
              <Field label="Currency">
                <select name="currency" defaultValue={selectedEntry.currencyCode} className={inputClass}>
                  <option value="PKR">PKR</option>
                  <option value="GBP">GBP</option>
                  <option value="USD">USD</option>
                </select>
              </Field>
              <Field label="Amount">
                <input name="amount" type="number" min="0" step="0.01" defaultValue={selectedEntry.amount} className={inputClass} />
              </Field>
            </div>
            <Field label="Entry date">
              <input name="entryDate" type="date" defaultValue={selectedEntry.entry_date} max={today} className={inputClass} />
            </Field>
            <Field label="Notes">
              <textarea name="notes" rows={4} defaultValue={selectedEntry.notes} className={textareaClass} placeholder="Optional details" />
            </Field>
            <PendingSubmitButton
              idleLabel="Update finance entry"
              pendingLabel="Updating entry..."
              className={`${primaryButton} gap-3`}
              pendingClassName="cursor-not-allowed bg-slate-700 hover:bg-slate-700"
            />
          </form>
        </ModalFrame>
      )}
    </>
  );
}
