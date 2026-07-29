import { addFinanceEntryAction } from "@/app/actions";
import { FinanceLedgerClient } from "@/app/dashboard/client-tables";
import { PendingSubmitButton } from "@/app/pending-controls";
import { ActionLink, Field, ModalFrame, PageIntro, inputClass, primaryButton, textareaClass } from "@/app/ui";
import { requireAdmin } from "@/lib/auth";
import { getDashboardData } from "@/lib/data";

const today = "2026-07-29";

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

      <FinanceLedgerClient entries={data.finance.recent} today={today} />

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
    </>
  );
}
