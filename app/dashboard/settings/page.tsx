import { updateCurrencyAction } from "@/app/actions";
import { PendingSubmitButton } from "@/app/pending-controls";
import { Field, PageIntro, Panel, inputClass, primaryButton } from "@/app/ui";
import { requireAdmin } from "@/lib/auth";
import { SUPPORTED_CURRENCIES } from "@/lib/currency";
import { getCurrencySetting } from "@/lib/settings";

const CURRENCY_LABELS: Record<string, string> = {
  PKR: "PKR — Pakistani Rupee",
  USD: "USD — US Dollar",
  EUR: "EUR — Euro",
  GBP: "GBP — British Pound",
  AED: "AED — UAE Dirham",
  SAR: "SAR — Saudi Riyal",
};

export default async function SettingsPage() {
  await requireAdmin();
  const currentCurrency = await getCurrencySetting();

  return (
    <div className="space-y-4">
      <PageIntro
        eyebrow="Settings"
        title="Workspace settings"
        description="Choose the currency the whole workspace uses for finance, payroll, and orders."
      />

      <Panel title="Currency" subtitle="This currency is used everywhere money is displayed across the app.">
        <form action={updateCurrencyAction} className="max-w-sm space-y-3">
          <Field label="Currency">
            <select name="currency" defaultValue={currentCurrency} className={inputClass}>
              {SUPPORTED_CURRENCIES.map((code) => (
                <option key={code} value={code}>
                  {CURRENCY_LABELS[code] ?? code}
                </option>
              ))}
            </select>
          </Field>
          <PendingSubmitButton
            idleLabel="Save currency"
            pendingLabel="Saving..."
            className={`${primaryButton} gap-3`}
            pendingClassName="cursor-not-allowed bg-slate-700 hover:bg-slate-700"
          />
        </form>
      </Panel>
    </div>
  );
}
