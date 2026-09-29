"use client";

import type { ReactNode } from "react";
import type { QuickDatePreset } from "@/lib/quick-date-range";
import type { OrdersDateField } from "@/lib/orders";
import { OrdersDateFieldFilter } from "@/app/dashboard/orders-date-field-filter";
import { OrdersFilterNavigation, OrdersFilterResults } from "@/app/dashboard/orders-filter-navigation";
import { QuickDateFilter } from "@/app/dashboard/quick-date-filter";

export function OrdersFiltersClient({
  initialPreset,
  initialFrom,
  initialTo,
  dateField,
  children,
}: {
  initialPreset: QuickDatePreset;
  initialFrom?: string;
  initialTo?: string;
  dateField: OrdersDateField;
  children: ReactNode;
}) {
  return (
    <OrdersFilterNavigation>
      <QuickDateFilter
        initialPreset={initialPreset}
        initialFrom={initialFrom}
        initialTo={initialTo}
        extraFilter={<OrdersDateFieldFilter value={dateField} />}
      />
      <OrdersFilterResults>{children}</OrdersFilterResults>
    </OrdersFilterNavigation>
  );
}
