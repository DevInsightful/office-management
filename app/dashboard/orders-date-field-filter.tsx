"use client";

import type { OrdersDateField } from "@/lib/orders";
import { useOrdersFilterNavigationState } from "@/app/dashboard/orders-filter-navigation";

export function OrdersDateFieldFilter({ value }: { value: OrdersDateField }) {
  const { navigate } = useOrdersFilterNavigationState();

  function updateDateField(nextValue: OrdersDateField) {
    const params = new URLSearchParams(window.location.search);
    params.set("dateField", nextValue);
    const query = params.toString();
    navigate(query ? `${window.location.pathname}?${query}` : window.location.pathname);
  }

  return (
    <label className="block min-w-0 text-sm font-medium text-slate-700">
      Filter orders by
      <select value={value} onChange={(event) => updateDateField(event.target.value as OrdersDateField)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100">
        <option value="booking">Booking date</option>
        <option value="delivery">Delivery date</option>
      </select>
    </label>
  );
}
