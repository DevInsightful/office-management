"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  formatQuickDateRange,
  getQuickDateRange,
  isValidDate,
  isValidDateRange,
  type QuickDatePreset,
} from "@/lib/quick-date-range";
import { useOrdersFilterNavigationState } from "@/app/dashboard/orders-filter-navigation";

type QuickDateFilterProps = {
  initialPreset?: QuickDatePreset;
  initialFrom?: string;
  initialTo?: string;
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  fiscalYearStartMonth?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
  labels?: Partial<Record<"preset" | "from" | "to", string>>;
  extraFilter?: ReactNode;
};

const OPTIONS: { value: QuickDatePreset; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "this-week", label: "This Week" },
  { value: "this-month", label: "This Month" },
  { value: "last-month", label: "Last Month" },
  { value: "this-quarter", label: "This Quarter" },
  { value: "this-year", label: "This Year" },
  { value: "ytd", label: "This Year to Date (YTD)" },
  { value: "all", label: "All" },
  { value: "custom", label: "Custom" },
];

export function QuickDateFilter({
  initialPreset = "this-month",
  initialFrom = "",
  initialTo = "",
  weekStartsOn = 1,
  fiscalYearStartMonth = 1,
  labels,
  extraFilter,
}: QuickDateFilterProps) {
  const { navigate } = useOrdersFilterNavigationState();
  const [preset, setPreset] = useState<QuickDatePreset>(initialPreset);
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const [dirty, setDirty] = useState(false);
  const computed = useMemo(() => {
    if (preset === "custom") return { from, to };
    if (preset === "all") return { from: "", to: getQuickDateRange("today").to };
    return getQuickDateRange(preset, new Date(), { weekStartsOn, fiscalYearStartMonth });
  }, [fiscalYearStartMonth, from, preset, to, weekStartsOn]);
  const valid = preset === "all" ? isValidDate(computed.to) : isValidDateRange(computed.from, computed.to);
  const validationMessage = valid || !computed.from || !computed.to
    ? ""
    : "The start date must be on or before the end date.";
  const columnCount = preset === "custom" ? (extraFilter ? "xl:grid-cols-5" : "xl:grid-cols-4") : (extraFilter ? "xl:grid-cols-3" : "xl:grid-cols-2");

  useEffect(() => {
    if (!dirty || !valid) return;
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      params.set("period", preset);
      if (preset === "custom") {
        if (computed.from) params.set("from", computed.from);
        else params.delete("from");
        if (computed.to) params.set("to", computed.to);
        else params.delete("to");
      } else {
        params.delete("from");
        params.delete("to");
      }
      const query = params.toString();
      navigate(query ? `${window.location.pathname}?${query}` : window.location.pathname);
    }, 150);
    return () => window.clearTimeout(timer);
  }, [computed.from, computed.to, dirty, navigate, preset, valid]);

  function changePreset(value: string) {
    const next = value as QuickDatePreset;
    setPreset(next);
    setDirty(true);
    if (next === "custom") {
      const hasInitialCustomRange = initialPreset === "custom";
      setFrom(hasInitialCustomRange ? initialFrom : "");
      setTo(hasInitialCustomRange ? initialTo : "");
    }
  }

  return (
    <section aria-label="Filter orders by date" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className={`grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 ${columnCount}`}>
          <label className="block text-sm font-medium text-slate-700">
            {labels?.preset ?? "Date range"}
            <select value={preset} onChange={(event) => changePreset(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100">
              {OPTIONS.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}
            </select>
          </label>
          {preset === "custom" && <>
            <label className="block text-sm font-medium text-slate-700">
              {labels?.from ?? "Start date (From)"}
          <input type="date" value={from} max={to || undefined} onChange={(event) => { setFrom(event.target.value); setDirty(true); }} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100" />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              {labels?.to ?? "End date (To)"}
          <input type="date" value={to} min={from || undefined} onChange={(event) => { setTo(event.target.value); setDirty(true); }} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100" />
            </label>
          </>}
          {extraFilter}
        <div className="min-w-0 rounded-xl bg-slate-50 px-4 py-3 sm:col-span-2 xl:col-span-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Applied date range</p>
          <p aria-live="polite" className="mt-1 text-sm font-semibold text-slate-900">{valid ? formatQuickDateRange(computed) : "Choose a valid date range"}</p>
          {validationMessage && <p role="alert" className="mt-1 text-xs text-rose-600">{validationMessage}</p>}
        </div>
      </div>
    </section>
  );
}
