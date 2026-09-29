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
  const [expanded, setExpanded] = useState(true);
  const showExpanded = expanded || mobileOpen;

  return (
    <div className="min-h-screen w-full">
      <div className="mb-4 flex items-center justify-between rounded-2xl border border-white/70 bg-white/85 px-4 py-3 shadow-sm backdrop-blur xl:hidden">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-700">Navigation</p>
          <p className="mt-1 text-sm text-slate-600">Go to another section</p>
        </div>
        <button type="button" aria-expanded={mobileOpen} onClick={() => setMobileOpen((value) => !value)} className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800">
          {mobileOpen ? "Close menu" : "Open menu"}
        </button>
      </div>

      {mobileOpen && <button type="button" aria-label="Close navigation" onClick={() => setMobileOpen(false)} className="fixed inset-0 z-40 bg-slate-950/40 xl:hidden" />}

      <aside className={`${mobileOpen ? "translate-x-0" : "-translate-x-full xl:translate-x-0"} fixed inset-y-0 left-0 z-50 w-[min(320px,85vw)] overflow-hidden border-r border-slate-200/80 bg-white/95 shadow-2xl backdrop-blur transition-[width,transform] duration-200 xl:w-[var(--sidebar-width)] xl:shadow-lg ${expanded ? "[--sidebar-width:272px]" : "[--sidebar-width:80px]"}`}>
        <div className="flex h-full min-h-0 flex-col">
          <div className={`hidden shrink-0 border-b border-slate-200/80 p-3 xl:flex ${expanded ? "justify-end" : "justify-center"}`}>
            <button type="button" aria-label={expanded ? "Collapse navigation" : "Expand navigation"} title={expanded ? "Collapse navigation" : "Expand navigation"} aria-expanded={expanded} onClick={() => setExpanded((value) => !value)} className="grid size-10 place-items-center rounded-xl text-slate-600 transition hover:bg-amber-50 hover:text-slate-950 focus-visible:outline-2 focus-visible:outline-amber-500">
              {expanded ? <ChevronLeft /> : <MenuIcon />}
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 [scrollbar-gutter:stable]" onClick={(event) => { if ((event.target as HTMLElement).closest("a")) setMobileOpen(false); }}>
            {showExpanded ? sidebar : compactSidebar}
          </div>
        </div>
      </aside>

      <main className={`min-w-0 transition-[margin] duration-200 xl:ml-[var(--sidebar-width)] ${expanded ? "[--sidebar-width:272px]" : "[--sidebar-width:80px]"}`}>
        {children}
      </main>
    </div>
  );
}

function ChevronLeft() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="m14.5 5-7 7 7 7" /></svg>;
}

function MenuIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" /></svg>;
}
