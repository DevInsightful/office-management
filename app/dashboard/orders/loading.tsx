export default function OrdersLoading() {
  return (
    <div className="min-w-0 space-y-4" aria-live="polite" aria-busy="true">
      <div className="rounded-[2rem] border border-white/70 bg-white/80 p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-amber-700">Orders</p>
        <p className="mt-2 text-lg font-semibold text-slate-900">Loading orders…</p>
      </div>
      <div className="h-28 animate-pulse rounded-2xl border border-slate-200 bg-white" />
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => <div key={index} className="h-28 animate-pulse rounded-[1.75rem] bg-slate-200/70" />)}
      </div>
      <div className="h-[28rem] animate-pulse rounded-[1.75rem] border border-slate-200 bg-white" />
    </div>
  );
}
