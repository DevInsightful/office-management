"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLink({
  href,
  label,
  collapsed = false,
}: {
  href: string;
  label: string;
  collapsed?: boolean;
}) {
  const pathname = usePathname();
  const active = pathname === href;

  return (
    <Link
      href={href}
      aria-label={label}
      title={collapsed ? label : undefined}
      className={`${collapsed ? "justify-center px-2 py-3" : "justify-between px-4 py-3"} flex items-center rounded-2xl border text-sm font-medium transition ${
        active
          ? "border-amber-300 bg-amber-50 text-slate-950"
          : "border-slate-200 bg-slate-50 text-slate-700 hover:border-amber-300 hover:bg-amber-50 hover:text-slate-950"
      }`}
    >
      {collapsed ? (
        <span aria-hidden="true" className="text-base font-semibold">{NAV_SYMBOLS[label] ?? label.slice(0, 1)}</span>
      ) : (
        <span>{label}</span>
      )}
    </Link>
  );
}

const NAV_SYMBOLS: Record<string, string> = {
  Overview: "⌂",
  Profile: "◎",
  "My Profile": "◎",
  Attendance: "◷",
  Orders: "□",
  "My Orders": "□",
  Finance: "$",
  Employees: "♙",
  "Facebook IDs": "f",
  "My Facebook IDs": "f",
  Tasks: "✓",
  "My Tasks": "✓",
  Performance: "↗",
  Payroll: "₿",
  "My Payroll": "₿",
  Settings: "⚙",
};
