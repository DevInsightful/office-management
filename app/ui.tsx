import Link from "next/link";

import { loginAction } from "@/app/actions";
import { Field, inputClass, primaryButton, secondaryButton, textareaClass } from "@/app/design-system";
import { LoginSubmitButton } from "@/app/login-submit-button";

export function MissingConfigScreen() {
  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#111827_0%,#1e293b_35%,#7c2d12_100%)] px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-4xl items-center">
        <section className="w-full rounded-[2rem] border border-white/10 bg-white/10 p-8 shadow-[0_25px_80px_rgba(0,0,0,0.25)] backdrop-blur">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-amber-300">Setup required</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight">Add your Neon connection string to start the app.</h1>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-200">
            Create `frontend/.env.local` and add `DATABASE_URL`. After that, run the app again and the schema plus sample accounts will be created automatically.
          </p>
          <div className="mt-6 rounded-3xl border border-white/10 bg-slate-950/50 p-5 font-mono text-sm text-amber-100">
            DATABASE_URL=postgresql://...
          </div>
          <p className="mt-4 text-sm text-slate-300">
            Optional: set `DEFAULT_SUPER_ADMIN_PASSWORD` if you want a custom seeded super admin password.
          </p>
        </section>
      </div>
    </div>
  );
}

export function LoginScreen({ error }: { error: string | null }) {
  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#111827_0%,#1e293b_35%,#7c2d12_100%)] px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-6xl gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-[2rem] border border-white/10 bg-white/10 p-8 shadow-[0_25px_80px_rgba(0,0,0,0.25)] backdrop-blur">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-amber-300">Neon PostgreSQL app</p>
          <h1 className="mt-4 max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">
            Office management for finance, staff, attendance, tasks, and payroll.
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-200">
            This app records office income and expenses, highlights major cost and revenue drivers, gives each employee a portal, tracks attendance, stores task work logs, and monitors payroll cycles.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <FeatureCard title="Finance insights" text="See major income, major expense, net position, and where to cut cost first." />
            <FeatureCard title="Employee portals" text="Every employee logs in, marks attendance, updates tasks, and records time spent." />
            <FeatureCard title="Role control" text="Super admin can create admins and employees. Admins can create employees only." />
            <FeatureCard title="Payroll watch" text="Track join date, salary cycle creation, due date, and salary paid status." />
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-white p-8 text-slate-900 shadow-[0_25px_80px_rgba(0,0,0,0.25)]">
          <h2 className="text-2xl font-semibold tracking-tight">Login</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            On first run, the app seeds example accounts so you can enter immediately.
          </p>

          {error && (
            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          )}

          <form action={loginAction} className="mt-6 space-y-4">
            <Field label="Email">
              <input name="email" type="email" placeholder="superadmin@office.local" className={inputClass} />
            </Field>
            <Field label="Password">
              <input name="password" type="password" placeholder="Enter password" className={inputClass} />
            </Field>
            <LoginSubmitButton />
          </form>

          <div className="mt-8 space-y-3">
            <SeedCredential title="Super admin" email="superadmin@office.local" password="superadmin123" />
            <SeedCredential title="Admin" email="admin@office.local" password="admin123" />
            <SeedCredential title="Employee" email="employee@office.local" password="employee123" />
          </div>
        </section>
      </div>
    </div>
  );
}

export function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[2rem] border border-white/70 bg-white/85 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur">
      <div className="mb-4">
        <h2 className="text-xl font-semibold tracking-tight text-slate-950">{title}</h2>
        <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
      </div>
      {children}
    </section>
  );
}

export function PageIntro({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-[2rem] border border-white/70 bg-white/80 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-amber-700">{eyebrow}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{title}</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{description}</p>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </div>
  );
}

export function ActionLink({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
    >
      {label}
    </Link>
  );
}

export function ModalFrame({
  title,
  subtitle,
  closeHref,
  children,
}: {
  title: string;
  subtitle: string;
  closeHref: string;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-3 sm:p-4">
      <div className="flex max-h-[calc(100vh-1.5rem)] w-full max-w-xl flex-col overflow-hidden rounded-[1.5rem] border border-white/70 bg-white shadow-[0_30px_100px_rgba(15,23,42,0.25)] sm:max-h-[calc(100vh-2rem)]">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-6">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">{title}</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">{subtitle}</p>
          </div>
          <Link
            href={closeHref}
            className="shrink-0 rounded-2xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Close
          </Link>
        </div>
        <div className="overflow-y-auto px-5 py-4 sm:px-6">{children}</div>
      </div>
    </div>
  );
}

export function MetricCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "emerald" | "rose" | "amber" | "sky" | "violet";
}) {
  const toneClass = {
    emerald: "from-emerald-500/15 to-emerald-50 text-emerald-700",
    rose: "from-rose-500/15 to-rose-50 text-rose-700",
    amber: "from-amber-500/20 to-amber-50 text-amber-700",
    sky: "from-sky-500/15 to-sky-50 text-sky-700",
    violet: "from-violet-500/15 to-violet-50 text-violet-700",
  }[tone];

  return (
    <div className={`rounded-[1.75rem] border border-white/70 bg-gradient-to-br ${toneClass} p-5 shadow-[0_20px_50px_rgba(15,23,42,0.06)]`}>
      <p className="text-xs font-semibold uppercase tracking-[0.3em]">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{value}</p>
    </div>
  );
}

export function InsightCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">{title}</p>
      <p className="mt-3 text-sm leading-6 text-slate-700">{body}</p>
    </div>
  );
}

export function CategoryList({
  title,
  rows,
  positive = false,
}: {
  title: string;
  rows: { category: string; total: number }[];
  positive?: boolean;
}) {
  return (
    <div>
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">{title}</p>
      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row.category} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="font-medium text-slate-900">{row.category}</p>
              <p className={`font-semibold ${positive ? "text-emerald-700" : "text-rose-700"}`}>{currency(row.total)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function FeatureCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/10 p-4">
      <p className="font-semibold">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-200">{text}</p>
    </div>
  );
}

export function SeedCredential({
  title,
  email,
  password,
}: {
  title: string;
  email: string;
  password: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="font-medium text-slate-900">{title}</p>
      <p className="mt-1 text-sm text-slate-600">{email}</p>
      <p className="mt-1 text-sm text-slate-600">Password: {password}</p>
    </div>
  );
}

export function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-white">
      {children}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: "low" | "medium" | "high" }) {
  const className =
    priority === "high"
      ? "bg-rose-100 text-rose-700"
      : priority === "medium"
        ? "bg-amber-100 text-amber-700"
        : "bg-sky-100 text-sky-700";

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] ${className}`}>
      {priority}
    </span>
  );
}

export function groupPayrollRows(
  payroll: {
    id: number;
    full_name: string;
    joined_on: string;
    salary: number;
    cycle_month: string | null;
    due_date: string | null;
    paid_on: string | null;
    status: "due" | "paid" | null;
    amount: number | null;
  }[],
) {
  const groups = new Map<
    string,
    {
      name: string;
      joinedOn: string;
      salary: number;
      records: typeof payroll;
    }
  >();

  for (const row of payroll) {
    const existing = groups.get(row.full_name);
    if (existing) {
      existing.records.push(row);
      continue;
    }

    groups.set(row.full_name, {
      name: row.full_name,
      joinedOn: row.joined_on,
      salary: row.salary,
      records: [row],
    });
  }

  return Array.from(groups.values());
}

export function calculateCycleCompletion(joinedOn: string) {
  const joinedDate = new Date(joinedOn);
  const joinDay = joinedDate.getDate();
  const targetMonth = new Date();
  const daysInMonth = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0).getDate();
  targetMonth.setDate(Math.min(joinDay, daysInMonth));
  return targetMonth.toISOString().slice(0, 10);
}

export function currency(value: number) {
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 0,
  }).format(value);
}

export { Field, inputClass, primaryButton, secondaryButton, textareaClass };
