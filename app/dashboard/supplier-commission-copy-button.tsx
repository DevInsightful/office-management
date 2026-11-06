"use client";

import { useState } from "react";

import { currency } from "@/lib/currency";

type PendingCommissionOrder = {
  postcode: string;
  orderDetails: string;
  total: number;
  commission: number;
};

export function SupplierCommissionCopyButton({
  orders,
  currencyCode,
}: {
  orders: PendingCommissionOrder[];
  currencyCode: string;
}) {
  const [label, setLabel] = useState("Copy pending commission");

  async function handleCopy() {
    const blocks = orders.map((order, index) =>
      [
        `${String(index + 1).padStart(2, "0")} ${order.postcode.toUpperCase()}`,
        order.orderDetails,
        `✅${currency(order.total, currencyCode)}`,
        `Commission : ${currency(order.commission, currencyCode)}`,
      ].join("\n"),
    );
    const totalCommission = orders.reduce((sum, order) => sum + order.commission, 0);
    const text = `${blocks.join("\n\n")}\n\nTotal Commission : ${currency(totalCommission, currencyCode)}.`;

    try {
      await navigator.clipboard.writeText(text);
      setLabel("Copied");
    } catch {
      setLabel("Copy failed");
    }
    window.setTimeout(() => setLabel("Copy pending commission"), 2000);
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      disabled={orders.length === 0}
      className="rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
      aria-live="polite"
    >
      {orders.length === 0 ? "No pending commission" : label}
    </button>
  );
}
