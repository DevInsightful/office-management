export type OrdersFilterKeyParts = {
  period?: string;
  from?: string;
  to?: string;
  dateField?: string;
};

export function getOrdersFilterKey(parts: OrdersFilterKeyParts) {
  const period = parts.period || "this-month";
  const isCustom = period === "custom";
  return [
    period,
    isCustom ? parts.from || "" : "",
    isCustom ? parts.to || "" : "",
    parts.dateField === "delivery" ? "delivery" : "booking",
  ].join("|");
}
