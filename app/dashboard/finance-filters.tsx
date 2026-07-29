"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { Field, inputClass } from "@/app/ui";

type FinanceFiltersProps = {
  today: string;
  initialSearch: string;
  initialPeriod: string;
  initialFrom: string;
  initialTo: string;
};

function getPeriodRange(period: string, today: string) {
  if (period === "all") {
    return { from: "", to: "" };
  }

  const now = new Date(`${today}T12:00:00`);
  const startOfToday = new Date(`${today}T00:00:00`);

  if (period === "day") {
    return { from: today, to: today };
  }

  if (period === "week") {
    const day = now.getDay();
    const distanceFromMonday = day === 0 ? 6 : day - 1;
    const weekStart = new Date(startOfToday);
    weekStart.setDate(startOfToday.getDate() - distanceFromMonday);
    return {
      from: weekStart.toISOString().slice(0, 10),
      to: today,
    };
  }

  if (period === "month") {
    return {
      from: `${today.slice(0, 7)}-01`,
      to: today,
    };
  }

  if (period === "year") {
    return {
      from: `${today.slice(0, 4)}-01-01`,
      to: today,
    };
  }

  return { from: "", to: "" };
}

export function FinanceFilters({
  today,
  initialSearch,
  initialPeriod,
  initialFrom,
  initialTo,
}: FinanceFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [period, setPeriod] = useState(initialPeriod);
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const [search, setSearch] = useState(initialSearch);

  const computedRange = useMemo(() => getPeriodRange(period, today), [period, today]);

  useEffect(() => {
    setPeriod(initialPeriod);
    setFrom(initialFrom);
    setTo(initialTo);
    setSearch(initialSearch);
  }, [initialFrom, initialPeriod, initialSearch, initialTo]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const next = new URLSearchParams();
      const activeFrom = period === "custom" ? from : computedRange.from;
      const activeTo = period === "custom" ? to : computedRange.to;
      const trimmedSearch = search.trim();

      if (trimmedSearch) {
        next.set("q", trimmedSearch);
      }

      if (period && period !== "all") {
        next.set("period", period);
      }

      if (period === "custom") {
        if (activeFrom) {
          next.set("from", activeFrom);
        }

        if (activeTo) {
          next.set("to", activeTo);
        }
      }

      const query = next.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [computedRange.from, computedRange.to, from, pathname, period, router, search, to]);

  function handlePeriodChange(nextPeriod: string) {
    setPeriod(nextPeriod);

    if (nextPeriod === "custom") {
      setFrom(initialFrom || "");
      setTo(initialTo || "");
      return;
    }

    const range = getPeriodRange(nextPeriod, today);
    setFrom(range.from);
    setTo(range.to);
  }

  return (
    <div className="grid gap-3 lg:grid-cols-[1fr_180px_180px_180px]">
      <Field label="Search">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search title, category, notes, or type"
          className={inputClass}
        />
      </Field>
      <Field label="Period">
        <select
          value={period}
          onChange={(event) => handlePeriodChange(event.target.value)}
          className={inputClass}
        >
          <option value="all">All</option>
          <option value="day">Day</option>
          <option value="week">Week</option>
          <option value="month">Month</option>
          <option value="year">Year</option>
          <option value="custom">Custom period</option>
        </select>
      </Field>
      <Field label="From">
        <input
          type="date"
          value={period === "custom" ? from : computedRange.from}
          max={today}
          onChange={(event) => setFrom(event.target.value)}
          className={inputClass}
        />
      </Field>
      <Field label="To">
        <input
          type="date"
          value={period === "custom" ? to : computedRange.to}
          max={today}
          onChange={(event) => setTo(event.target.value)}
          className={inputClass}
        />
      </Field>
    </div>
  );
}
