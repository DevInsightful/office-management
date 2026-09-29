"use client";

import { createContext, useCallback, useContext, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";

type OrdersFilterNavigationValue = { navigate: (href: string) => void; isPending: boolean };
const OrdersFilterNavigationContext = createContext<OrdersFilterNavigationValue | null>(null);

export function OrdersFilterNavigation({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const navigate = useCallback((href: string) => {
    startTransition(() => router.replace(href, { scroll: false }));
  }, [router]);

  return (
    <OrdersFilterNavigationContext.Provider value={{ navigate, isPending }}>
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
  const { isPending } = useOrdersFilterNavigation();

  return (
    <div className="relative min-w-0" aria-busy={isPending}>
      {children}
      {isPending && (
        <div role="status" aria-live="polite" className="absolute inset-0 z-20 flex justify-center bg-white/85 px-4 pt-20 backdrop-blur-[2px]">
          <div className="flex h-fit items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-semibold text-slate-800 shadow-lg">
            <span aria-hidden="true" className="size-5 animate-spin rounded-full border-2 border-slate-200 border-t-amber-500" />
            Loading orders for the selected filters…
          </div>
        </div>
      )}
    </div>
  );
}

export function useOrdersFilterNavigationState() {
  return useOrdersFilterNavigation();
}
