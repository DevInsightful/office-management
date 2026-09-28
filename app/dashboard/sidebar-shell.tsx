"use client";

import { useState } from "react";

export function SidebarShell({
  sidebar,
  compactSidebar,
  children,
}: {
  sidebar: React.ReactNode;
  compactSidebar: React.ReactNode;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const showExpanded = expanded || mobileOpen;

  return (
    <div className="mx-auto flex w-full max-w-none flex-col gap-4 xl:grid xl:grid-cols-[76px_minmax(0,1fr)] xl:gap-6">
      <div className="flex items-center justify-between rounded-[1.5rem] border border-white/70 bg-white/80 px-4 py-3 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur xl:hidden">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-amber-700">
            Navigation
          </p>
          <p className="mt-1 text-sm text-slate-600">Open the sidebar to switch pages.</p>
        </div>
        <button
          type="button"
          onClick={() => setMobileOpen((value) => !value)}
          className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          {mobileOpen ? "Close Menu" : "Open Menu"}
        </button>
      </div>

      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation overlay"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-30 bg-slate-950/35 xl:hidden"
        />
      )}

      <aside
        className={`${
          mobileOpen ? "translate-x-0" : "-translate-x-[115%]"
        } fixed left-4 top-4 z-40 w-[min(320px,calc(100vw-2rem))] transition-transform duration-200 xl:static xl:w-auto xl:translate-x-0 xl:self-start`}
      >
        <div className="hidden xl:fixed xl:left-0 xl:top-0 xl:z-[60] xl:flex xl:w-[76px] xl:justify-center">
          <button
            type="button"
            aria-label={expanded ? "Collapse navigation" : "Expand navigation"}
            title={expanded ? "Collapse navigation" : "Expand navigation"}
            onClick={() => setExpanded((value) => !value)}
            className="grid size-12 place-items-center rounded-2xl border border-white/70 bg-white/85 text-xl font-semibold text-slate-900 shadow-[0_12px_30px_rgba(15,23,42,0.08)] backdrop-blur transition hover:bg-amber-50"
          >
            {expanded ? "‹" : "☰"}
          </button>
        </div>
        <div
          onClick={() => setMobileOpen(false)}
          className={showExpanded ? "xl:fixed xl:left-0 xl:top-0 xl:z-50 xl:w-[260px]" : "xl:fixed xl:left-0 xl:top-[4.5rem] xl:z-40 xl:w-[76px]"}
        >
          {showExpanded ? sidebar : compactSidebar}
        </div>
      </aside>

      <div className="flex min-w-0 flex-col gap-6 xl:pl-0">{children}</div>
    </div>
  );
}
