"use client";

import { useState } from "react";

export function SidebarShell({
  sidebar,
  children,
}: {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 xl:grid xl:grid-cols-[260px_minmax(0,1fr)] xl:gap-6">
      <div className="flex items-center justify-between rounded-[1.5rem] border border-white/70 bg-white/80 px-4 py-3 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur xl:hidden">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-amber-700">
            Navigation
          </p>
          <p className="mt-1 text-sm text-slate-600">Open the sidebar to switch pages.</p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          {open ? "Close Menu" : "Open Menu"}
        </button>
      </div>

      {open && (
        <button
          type="button"
          aria-label="Close navigation overlay"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-30 bg-slate-950/35 xl:hidden"
        />
      )}

      <aside
        className={`${
          open ? "translate-x-0" : "-translate-x-[115%]"
        } fixed left-4 top-4 z-40 w-[min(320px,calc(100vw-2rem))] transition-transform duration-200 xl:static xl:w-auto xl:translate-x-0 xl:self-start`}
      >
        <div onClick={() => setOpen(false)}>{sidebar}</div>
      </aside>

      <div className="flex min-w-0 flex-col gap-6 xl:pl-0">{children}</div>
    </div>
  );
}
