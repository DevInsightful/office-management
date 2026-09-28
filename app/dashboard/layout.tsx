import { logoutAction } from "@/app/actions";
import { NavLink } from "@/app/dashboard/nav-link";
import { SidebarShell } from "@/app/dashboard/sidebar-shell";
import { PendingSubmitButton } from "@/app/pending-controls";
import { MissingConfigScreen } from "@/app/ui";
import { requireUser } from "@/lib/auth";
import { seedIfEmpty } from "@/lib/seed";

export const dynamic = "force-dynamic";

const adminNav = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/profile", label: "Profile" },
  { href: "/dashboard/attendance", label: "Attendance" },
  { href: "/dashboard/orders", label: "Orders" },
  { href: "/dashboard/finance", label: "Finance" },
  { href: "/dashboard/employees", label: "Employees" },
  { href: "/dashboard/facebook-ids", label: "Facebook IDs" },
  { href: "/dashboard/tasks", label: "Tasks" },
  { href: "/dashboard/performance", label: "Performance" },
  { href: "/dashboard/payroll", label: "Payroll" },
  { href: "/dashboard/settings", label: "Settings" },
];

const employeeNav = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/profile", label: "My Profile" },
  { href: "/dashboard/attendance", label: "Attendance" },
  { href: "/dashboard/orders", label: "My Orders" },
  { href: "/dashboard/facebook-ids", label: "My Facebook IDs" },
  { href: "/dashboard/tasks", label: "My Tasks" },
  { href: "/dashboard/performance", label: "Performance" },
  { href: "/dashboard/payroll", label: "My Payroll" },
];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!process.env.DATABASE_URL) {
    return <MissingConfigScreen />;
  }

  await seedIfEmpty();
  const user = await requireUser();
  const nav = user.role === "employee" ? employeeNav : adminNav;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#fef3c7_0%,#fff7ed_25%,#f8fafc_60%,#eef2ff_100%)] px-4 py-6 text-slate-900 sm:px-6 lg:px-10">
      <SidebarShell
        sidebar={
          <div className="rounded-[2rem] border border-white/70 bg-white/85 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-amber-700">
              Navigation
            </p>
            <div className="mt-5 rounded-3xl bg-slate-950 px-4 py-4 text-white">
              <p className="text-sm font-semibold">{user.fullName}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.3em] text-amber-300">
                {user.role.replace("_", " ")}
              </p>
            </div>
            <nav className="mt-5 space-y-2">
              {nav.map((item) => (
                <NavLink key={item.href} href={item.href} label={item.label} />
              ))}
            </nav>
            <form action={logoutAction} className="mt-5">
              <PendingSubmitButton
                idleLabel="Logout"
                pendingLabel="Logging out..."
                className="inline-flex w-full items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
                pendingClassName="cursor-not-allowed bg-slate-100 text-slate-500 hover:bg-slate-100"
              />
            </form>
          </div>
        }
        compactSidebar={
          <div className="rounded-[1.5rem] border border-white/70 bg-white/85 p-2 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur">
            <div className="grid size-14 place-items-center rounded-2xl bg-slate-950 text-sm font-semibold text-white" title={`${user.fullName} (${user.role.replace("_", " ")})`}>
              {user.fullName.split(" ").map((name) => name[0]).join("").slice(0, 2)}
            </div>
            <nav className="mt-3 space-y-2">
              {nav.map((item) => <NavLink key={item.href} href={item.href} label={item.label} collapsed />)}
            </nav>
            <form action={logoutAction} className="mt-3">
              <PendingSubmitButton
                idleLabel="↪"
                pendingLabel="…"
                className="inline-flex w-full items-center justify-center rounded-2xl border border-slate-200 bg-white px-2 py-3 text-base font-semibold text-slate-900 transition hover:bg-slate-50"
                pendingClassName="cursor-not-allowed bg-slate-100 text-slate-500 hover:bg-slate-100"
              />
            </form>
          </div>
        }
      >
        {children}
      </SidebarShell>
    </div>
  );
}
