"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  formatQuickDateRange,
  getQuickDateRange,
  isValidDateRange,
  type QuickDatePreset,
} from "@/lib/quick-date-range";

type QuickDateFilterProps = {
  initialPreset?: QuickDatePreset;
  initialFrom?: string;
  initialTo?: string;
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  fiscalYearStartMonth?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
  labels?: Partial<Record<"preset" | "from" | "to", string>>;
};

const OPTIONS: { value: QuickDatePreset; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "this-week", label: "This Week" },
  { value: "this-month", label: "This Month" },
  { value: "this-quarter", label: "This Quarter" },
  { value: "this-year", label: "This Year" },
  { value: "ytd", label: "This Year to Date (YTD)" },
  { value: "custom", label: "Custom" },
];

export function QuickDateFilter({
  initialPreset = "this-month",
  initialFrom = "",
  initialTo = "",
  weekStartsOn = 1,
  fiscalYearStartMonth = 1,
  labels,
}: QuickDateFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [preset, setPreset] = useState<QuickDatePreset>(initialPreset);
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const computed = useMemo(() => {
    if (preset === "custom") return { from, to };
    return getQuickDateRange(preset, new Date(), { weekStartsOn, fiscalYearStartMonth });
  }, [fiscalYearStartMonth, from, preset, to, weekStartsOn]);
  const valid = isValidDateRange(computed.from, computed.to);
  const validationMessage = valid || !computed.from || !computed.to
    ? ""
    : "The start date must be on or before the end date.";

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      params.set("period", preset);
      if (computed.from) params.set("from", computed.from);
      else params.delete("from");
      if (computed.to) params.set("to", computed.to);
      else params.delete("to");
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    }, 150);
    return () => window.clearTimeout(timer);
  }, [computed.from, computed.to, pathname, preset, router]);

  function changePreset(value: string) {
    const next = value as QuickDatePreset;
    setPreset(next);
    if (next === "custom") {
      setFrom(initialFrom);
      setTo(initialTo);
    }
  }

  return (
    <section aria-label="Filter orders by date" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid gap-3 sm:grid-cols-[minmax(210px,280px)_minmax(160px,220px)_minmax(160px,220px)]">
          <label className="block text-sm font-medium text-slate-700">
            {labels?.preset ?? "Date range"}
            <select value={preset} onChange={(event) => changePreset(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100">
              {OPTIONS.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}
            </select>
          </label>
          {preset === "custom" && <>
            <label className="block text-sm font-medium text-slate-700">
              {labels?.from ?? "Start date (From)"}
              <input type="date" value={from} max={to || undefined} onChange={(event) => setFrom(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100" />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              {labels?.to ?? "End date (To)"}
              <input type="date" value={to} min={from || undefined} onChange={(event) => setTo(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100" />
            </label>
          </>}
        </div>
        <div className="min-w-0 rounded-xl bg-slate-50 px-4 py-3 lg:min-w-[245px]">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Applied date range</p>
          <p aria-live="polite" className="mt-1 text-sm font-semibold text-slate-900">{valid ? formatQuickDateRange(computed) : "Choose a valid date range"}</p>
          {validationMessage && <p role="alert" className="mt-1 text-xs text-rose-600">{validationMessage}</p>}
        </div>
      </div>
    </section>
  );
}
