export type OrdersFilterKeyParts = {
  period?: string;
  from?: string;
  to?: string;
  dateField?: string;
};

export function getOrdersFilterKey(parts: OrdersFilterKeyParts) {
  return [
    parts.period || "this-month",
    parts.from || "",
    parts.to || "",
    parts.dateField === "delivery" ? "delivery" : "booking",
  ].join("|");
}
