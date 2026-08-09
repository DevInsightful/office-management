export const SUPPORTED_CURRENCIES = ["PKR", "USD", "EUR", "GBP", "AED", "SAR"] as const;

export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number];

export const DEFAULT_CURRENCY: CurrencyCode = "PKR";

export function isSupportedCurrency(value: string): value is CurrencyCode {
  return (SUPPORTED_CURRENCIES as readonly string[]).includes(value);
}

export function currency(value: number, currencyCode: string = DEFAULT_CURRENCY) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 0,
  }).format(value);
}
