"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ICONS: Record<string, string> = {
  Overview: "M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z",
  Profile: "M20 21a8 8 0 0 0-16 0m8-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z",
  Attendance: "M8 3v4m8-4v4M4 9h16M5 5h14a1 1 0 0 1 1 1v13H4V6a1 1 0 0 1 1-1Zm3 8 2 2 4-4",
  Orders: "M6 3h12v18H6zM9 8h6m-6 4h6m-6 4h4",
  Finance: "M12 2v20m5-16H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",
  Employees: "M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2m6-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm6-7a4 4 0 0 1 0 8m2 3h2a2 2 0 0 1 2 2v2",
  "Facebook IDs": "M14 8h3V4h-3a5 5 0 0 0-5 5v3H6v4h3v5h4v-5h3l1-4h-4V9a1 1 0 0 1 1-1Z",
  Tasks: "m5 12 4 4L19 6",
  Performance: "M3 17l6-6 4 4 8-9m0 0h-6m6 0v6",
  Payroll: "M12 2v20m5-16H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",
  Settings: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm0-5v2m0 14v2m9-9h-2M5 12H3m15.36-6.36-1.42 1.42M7.06 16.94l-1.42 1.42m12.72 0-1.42-1.42M7.06 7.06 5.64 5.64",
};

export function NavLink({ href, label, collapsed = false }: { href: string; label: string; collapsed?: boolean }) {
  const pathname = usePathname();
  const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(`${href}/`));
  const iconLabel = label.replace(/^(My) /, "");

  return (
    <Link href={href} aria-label={label} title={collapsed ? label : undefined} aria-current={active ? "page" : undefined} className={`${collapsed ? "justify-center px-2" : "gap-3 px-3"} flex min-h-11 items-center rounded-xl border text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 ${active ? "border-amber-200 bg-amber-50 text-slate-950 shadow-sm" : "border-transparent text-slate-600 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-950"}`}>
      <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d={ICONS[iconLabel] ?? "M5 5h14v14H5z"} /></svg>
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  );
}
