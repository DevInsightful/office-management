import { ensureDb, sql } from "@/lib/db";
import { CurrencyCode, DEFAULT_CURRENCY, isSupportedCurrency } from "@/lib/currency";

const CURRENCY_SETTING_KEY = "currency";

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
