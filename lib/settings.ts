import { ensureDb, sql } from "@/lib/db";
import { CurrencyCode, DEFAULT_CURRENCY, isSupportedCurrency } from "@/lib/currency";

const CURRENCY_SETTING_KEY = "currency";
const GBP_TO_PKR_KEY = "finance_gbp_to_pkr";
const USD_TO_PKR_KEY = "finance_usd_to_pkr";

export type FinanceExchangeRates = {
  GBP: number | null;
  USD: number | null;
};

export async function getFinanceExchangeRates(): Promise<FinanceExchangeRates> {
  await ensureDb();

  const rows = await sql<{ key: string; value: string }[]>`
    select key, value from app_settings
    where key in (${GBP_TO_PKR_KEY}, ${USD_TO_PKR_KEY})
  `;
  const settings = new Map<string, number>(rows.map((row: { key: string; value: string }) => [row.key, Number(row.value)]));
  const gbp = settings.get(GBP_TO_PKR_KEY);
  const usd = settings.get(USD_TO_PKR_KEY);
  return {
    GBP: gbp && Number.isFinite(gbp) && gbp > 0 ? gbp : null,
    USD: usd && Number.isFinite(usd) && usd > 0 ? usd : null,
  };
}

export async function setFinanceExchangeRates(rates: FinanceExchangeRates) {
  if (
    rates.GBP === null || !Number.isFinite(rates.GBP) || rates.GBP <= 0 ||
    rates.USD === null || !Number.isFinite(rates.USD) || rates.USD <= 0
  ) {
    throw new Error("Finance exchange rates must be positive numbers.");
  }

  await ensureDb();
  await sql`
    insert into app_settings (key, value, updated_at)
    values
      (${GBP_TO_PKR_KEY}, ${String(rates.GBP)}, now()),
      (${USD_TO_PKR_KEY}, ${String(rates.USD)}, now())
    on conflict (key) do update set value = excluded.value, updated_at = now()
  `;
}

export async function getCurrencySetting(): Promise<CurrencyCode> {
  await ensureDb();

  const rows = await sql<{ value: string }[]>`
    select value from app_settings where key = ${CURRENCY_SETTING_KEY} limit 1
  `;

  const value = rows[0]?.value;
  return value && isSupportedCurrency(value) ? value : DEFAULT_CURRENCY;
}

export async function setCurrencySetting(code: string) {
  if (!isSupportedCurrency(code)) {
    throw new Error(`Unsupported currency: ${code}`);
  }

  await ensureDb();

  await sql`
    insert into app_settings (key, value, updated_at)
    values (${CURRENCY_SETTING_KEY}, ${code}, now())
    on conflict (key) do update set value = excluded.value, updated_at = now()
  `;
}
