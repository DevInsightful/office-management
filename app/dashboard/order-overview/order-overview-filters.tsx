"use client";

import { useMemo, useState } from "react";
import { OrdersTableClient } from "@/app/dashboard/client-tables";
import type { OrdersData } from "@/lib/orders";

type Order = OrdersData["orders"][number];
type FilterKey = "today-booked" | "yesterday-booked" | "this-week-booked" | "today-delivery" | "tomorrow-delivery" | "this-week-delivery" | "yesterday-delivered" | "past-seven-delivered";

const options: { value: FilterKey; label: string }[] = [
  { value: "today-booked", label: "Today booked orders" },
  { value: "yesterday-booked", label: "Yesterday booked orders" },
  { value: "this-week-booked", label: "Orders booked this week" },
  { value: "today-delivery", label: "Deliveries today" },
  { value: "tomorrow-delivery", label: "Deliveries tomorrow" },
  { value: "this-week-delivery", label: "Deliveries this week" },
  { value: "yesterday-delivered", label: "Delivered yesterday" },
  { value: "past-seven-delivered", label: "Delivered in past 7 days" },
];

export function OrderOverviewFilters({
  orders,
  currencyCode,
  canManageStatus,
  today,
  yesterday,
  tomorrow,
  thisWeekStart,
  pastSevenDaysStart,
}: {
  orders: Order[];
  currencyCode: string;
  canManageStatus: boolean;
  today: string;
  yesterday: string;
  tomorrow: string;
  thisWeekStart: string;
  pastSevenDaysStart: string;
}) {
  const [filter, setFilter] = useState<FilterKey>("today-booked");
  const selected = options.find((option) => option.value === filter)!;
  const filteredOrders = useMemo(() => orders.filter((order) => {
    switch (filter) {
      case "today-booked": return order.bookingDate === today;
      case "yesterday-booked": return order.bookingDate === yesterday;
      case "this-week-booked": return order.bookingDate >= thisWeekStart && order.bookingDate <= today;
      case "today-delivery": return order.deliveryDate === today;
      case "tomorrow-delivery": return order.deliveryDate === tomorrow;
      case "this-week-delivery": return order.deliveryDate >= thisWeekStart && order.deliveryDate <= shiftWeekEnd(today);
      case "yesterday-delivered": return order.status === "delivered" && order.deliveryDate === yesterday;
      case "past-seven-delivered": return order.status === "delivered" && order.deliveryDate >= pastSevenDaysStart && order.deliveryDate <= today;
    }
  }), [filter, orders, today, yesterday, tomorrow, thisWeekStart, pastSevenDaysStart]);

  return (
    <OrdersTableClient
      orders={filteredOrders}
      canManageStatus={canManageStatus}
      currencyCode={currencyCode}
      title={
        <span className="flex w-full flex-wrap items-center justify-between gap-3">
          <span>{selected.label}</span>
          <span className="flex flex-wrap items-center gap-3">
          <label htmlFor="order-period-filter" className="sr-only">Filter orders</label>
          <select id="order-period-filter" value={filter} onChange={(event) => setFilter(event.target.value as FilterKey)} style={{ fontSize: "12px", lineHeight: "16px", fontWeight: 500 }} className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-900 outline-none focus:border-amber-400">
            {options.map((option) => <option key={option.value} value={option.value} style={{ fontSize: "12px" }}>{option.label}</option>)}
          </select>
          <span className="text-sm font-normal text-slate-500">{filteredOrders.length} order(s)</span>
          </span>
        </span>
      }
      subtitle="Filtered order list. Select a row to view its details."
    />
  );
}

function shiftWeekEnd(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return new Date(Date.UTC(year, month - 1, day + (7 - weekday) % 7)).toISOString().slice(0, 10);
}
