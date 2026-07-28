"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLink({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  const pathname = usePathname();
  const active = pathname === href;

  return (
    <Link
      href={href}
      className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-sm font-medium transition ${
        active
          ? "border-amber-300 bg-amber-50 text-slate-950"
          : "border-slate-200 bg-slate-50 text-slate-700 hover:border-amber-300 hover:bg-amber-50 hover:text-slate-950"
      }`}
    >
      <span>{label}</span>
      <span className="text-xs uppercase tracking-[0.25em] text-slate-400">{active ? "Open" : "Go"}</span>
    </Link>
  );
}
