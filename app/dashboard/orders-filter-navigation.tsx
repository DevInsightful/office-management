"use client";

import { createContext, useCallback, useContext, useEffect, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { getOrdersFilterKey } from "@/lib/orders-filter-key";

type OrdersFilterNavigationValue = {
  navigate: (href: string) => void;
  retry: () => void;
  isPending: boolean;
  hasError: boolean;
};
const OrdersFilterNavigationContext = createContext<OrdersFilterNavigationValue | null>(null);

export function OrdersFilterNavigation({ children, activeKey }: { children: ReactNode; activeKey: string }) {
  const router = useRouter();
  const [transitionPending, startTransition] = useTransition();
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [failedKey, setFailedKey] = useState<string | null>(null);

  const navigate = useCallback((href: string) => {
    const url = new URL(href, window.location.origin);
    const nextKey = getOrdersFilterKey({
      period: url.searchParams.get("period") ?? undefined,
      from: url.searchParams.get("from") ?? undefined,
      to: url.searchParams.get("to") ?? undefined,
      dateField: url.searchParams.get("dateField") ?? undefined,
    });
    if (nextKey === activeKey) return;
    setPendingKey(nextKey);
    setFailedKey(null);
    startTransition(() => router.replace(href, { scroll: false }));
  }, [activeKey, router]);

  const retry = useCallback(() => {
    setFailedKey(null);
    startTransition(() => router.refresh());
  }, [router]);

  const awaitingResults = pendingKey !== null && pendingKey !== activeKey;
  const hasError = awaitingResults && failedKey === pendingKey;
  const isPending = transitionPending || (awaitingResults && !hasError);

  useEffect(() => {
    if (!awaitingResults || !pendingKey || hasError) return;
    const timer = window.setTimeout(() => setFailedKey(pendingKey), 20_000);
    return () => window.clearTimeout(timer);
  }, [awaitingResults, hasError, pendingKey]);

  useEffect(() => {
    function clearPendingOnHistoryNavigation() {
      setPendingKey(null);
      setFailedKey(null);
    }
    window.addEventListener("popstate", clearPendingOnHistoryNavigation);
    return () => window.removeEventListener("popstate", clearPendingOnHistoryNavigation);
  }, []);

  return (
    <OrdersFilterNavigationContext.Provider value={{ navigate, retry, isPending, hasError }}>
      {children}
    </OrdersFilterNavigationContext.Provider>
  );
}

function useOrdersFilterNavigation() {
  const context = useContext(OrdersFilterNavigationContext);
  if (!context) throw new Error("Orders filter controls must be inside OrdersFilterNavigation.");
  return context;
}

export function OrdersFilterResults({ children }: { children: ReactNode }) {
  const { isPending, hasError, retry } = useOrdersFilterNavigation();

  return (
    <div className="relative min-w-0" aria-busy={isPending}>
      {children}
      {(isPending || hasError) && (
        <div role="status" aria-live="polite" className="absolute inset-0 z-20 flex justify-center bg-white/85 px-4 pt-20 backdrop-blur-[2px]">
          <div className="flex h-fit items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-semibold text-slate-800 shadow-lg">
            {hasError ? (
              <>
                <span>Orders are taking too long to load.</span>
                <button type="button" onClick={retry} className="rounded-lg bg-slate-950 px-3 py-2 text-white hover:bg-slate-800">Retry</button>
              </>
            ) : (
              <>
                <span aria-hidden="true" className="size-5 animate-spin rounded-full border-2 border-slate-200 border-t-amber-500" />
                Loading orders for the selected filters…
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function useOrdersFilterNavigationState() {
  return useOrdersFilterNavigation();
}
