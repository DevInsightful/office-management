import { notFound, redirect } from "next/navigation";

import { ActionLink, Badge, MetricCard, PageIntro, Panel, PriorityBadge, currency } from "@/app/ui";
import { requireAdmin } from "@/lib/auth";
import { ensureDb, sql } from "@/lib/db";
import { getCurrencySetting } from "@/lib/settings";

type EmployeeProfileRow = {
  id: number;
  full_name: string;
  email: string;
  role: "super_admin" | "admin" | "employee";
  joined_on: string;
  salary: string;
  active: boolean;
  created_at: string;
  personal_email: string | null;
  bank_account_no: string | null;
  bank_iban: string | null;
  bank_name: string | null;
  account_title: string | null;
  can_manage_pages: boolean;
  profile_details_updated_at: string | null;
};

type EmployeeAttendanceRow = {
  id: number;
  attendance_date: string;
  check_in_at: string;
  status: "present" | "half_day";
  accuracy: string | null;
  distance_from_office: string | null;
};

type EmployeeTaskRow = {
  id: number;
  title: string;
  details: string;
  priority: "low" | "medium" | "high";
  status: "pending" | "working" | "completed";
  timer_total_minutes: number;
  created_at: string;
  completed_at: string | null;
  assigned_by_name: string | null;
};

type EmployeeTaskLogRow = {
  id: number;
  task_id: number;
  minutes_spent: number;
  description: string;
  created_at: string;
};

type EmployeePayrollRow = {
  id: number;
  cycle_month: string;
  due_date: string;
  paid_on: string | null;
  amount: string;
  status: "due" | "paid";
};

type EmployeeStaffPaymentRow = {
  id: number;
  primary_email: string;
  secondary_email: string | null;
  account_title: string | null;
  bank_account_no: string | null;
  bank_iban: string | null;
  bank_name: string | null;
  amount_paid: string;
  paid_on: string;
  purpose: string;
  paid_by_name: string;
};

type EmployeeProgressRow = {
  attendance_count: string;
  present_count: string;
  half_day_count: string;
  completed_tasks: string;
  active_tasks: string;
  pending_tasks: string;
  logged_minutes: string;
};

function formatDateTime(value: string | Date) {
  return new Date(value).toLocaleString("en-GB", { timeZone: "Asia/Karachi" });
}

function formatDate(value: string | Date) {
  return new Date(value).toLocaleDateString("en-GB", { timeZone: "Asia/Karachi" });
}

function valueOrFallback(value: string | null) {
  return value && value.trim() ? value : "Not provided";
}

function getAttendanceBadgeClass(status: "present" | "half_day") {
  return status === "present" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800";
}

export default async function EmployeeDetailsPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const actor = await requireAdmin();
  await ensureDb();

  const { userId } = await params;
  const employeeId = Number(userId);

  if (!Number.isInteger(employeeId) || employeeId <= 0) {
    notFound();
  }

  const currencyCode = await getCurrencySetting();

  const [profiles, attendanceRows, taskRows, taskLogRows, payrollRows, staffPaymentRows, progressRows] = await Promise.all([
    sql<EmployeeProfileRow[]>`
      select
        id,
        full_name,
        email,
        role,
        joined_on::text,
        salary::text,
        active,
        created_at::text,
        personal_email,
        bank_account_no,
        bank_iban,
        bank_name,
        account_title,
        can_manage_pages,
        profile_details_updated_at::text
      from users
      where id = ${employeeId}
      limit 1
    `,
    sql<EmployeeAttendanceRow[]>`
      select
        id,
        timezone('Asia/Karachi', check_in_time)::date::text as attendance_date,
        to_char(check_in_time at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as check_in_at,
        status,
        accuracy::text,
        distance_from_office::text
      from attendance_records
      where employee_id = ${employeeId}
      order by check_in_time desc, id desc
      limit 30
    `,
    sql<EmployeeTaskRow[]>`
      select
        t.id,
        t.title,
        t.details,
        t.priority,
        t.status,
        t.timer_total_minutes,
        t.created_at::text,
        t.completed_at::text,
        assigner.full_name as assigned_by_name
      from tasks t
      left join users assigner on assigner.id = t.assigned_by
      where t.assigned_to = ${employeeId}
      order by
        case t.status
          when 'working' then 1
          when 'pending' then 2
          else 3
        end,
        t.created_at desc
      limit 20
    `,
    sql<EmployeeTaskLogRow[]>`
      select
        l.id,
        l.task_id,
        l.minutes_spent,
        l.description,
        l.created_at::text
      from task_logs l
      where l.user_id = ${employeeId}
      order by l.created_at desc
      limit 20
    `,
    sql<EmployeePayrollRow[]>`
      select
        id,
        cycle_month::text,
        due_date::text,
        paid_on::text,
        amount::text,
        status
      from salary_payments
      where user_id = ${employeeId}
      order by cycle_month desc
      limit 12
    `,
    sql<EmployeeStaffPaymentRow[]>`
      select
        sp.id,
        sp.primary_email,
        sp.secondary_email,
        sp.account_title,
        sp.bank_account_no,
        sp.bank_iban,
        sp.bank_name,
        sp.amount_paid::text,
        sp.paid_on::text,
        sp.purpose,
        payer.full_name as paid_by_name
      from staff_payments sp
      join users payer on payer.id = sp.paid_by_user_id
      where sp.recipient_user_id = ${employeeId}
      order by sp.paid_on desc, sp.id desc
      limit 20
    `,
    sql<EmployeeProgressRow[]>`
      select
        (
          select count(*)
          from attendance_records a
          where a.employee_id = u.id
        )::text as attendance_count,
        (
          select count(*)
          from attendance_records a
          where a.employee_id = u.id
            and a.status = 'present'
        )::text as present_count,
        (
          select count(*)
          from attendance_records a
          where a.employee_id = u.id
            and a.status = 'half_day'
        )::text as half_day_count,
        (
          select count(*)
          from tasks t
          where t.assigned_to = u.id
            and t.status = 'completed'
        )::text as completed_tasks,
        (
          select count(*)
          from tasks t
          where t.assigned_to = u.id
            and t.status = 'working'
        )::text as active_tasks,
        (
          select count(*)
          from tasks t
          where t.assigned_to = u.id
            and t.status = 'pending'
        )::text as pending_tasks,
        (
          select coalesce(sum(l.minutes_spent), 0)
          from task_logs l
          where l.user_id = u.id
        )::text as logged_minutes
      from users u
      where u.id = ${employeeId}
      limit 1
    `,
  ]);

  const profile = profiles[0];

  if (!profile || profile.role === "super_admin") {
    notFound();
  }

  if (actor.role !== "super_admin" && profile.role !== "employee") {
    redirect("/dashboard/employees");
  }

  const progress = progressRows[0] ?? {
    attendance_count: "0",
    present_count: "0",
    half_day_count: "0",
    completed_tasks: "0",
    active_tasks: "0",
    pending_tasks: "0",
    logged_minutes: "0",
  };

  return (
    <div className="space-y-4">
      <PageIntro
        eyebrow="Employee Details"
        title={profile.full_name}
        description="Admin view of profile details, attendance, task progress, payroll, account details, and both primary and secondary email addresses."
        action={<ActionLink href="/dashboard/employees" label="Back to Employees" />}
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Attendance Days" value={progress.attendance_count} tone="sky" />
        <MetricCard label="Present Days" value={progress.present_count} tone="emerald" />
        <MetricCard label="Half Days" value={progress.half_day_count} tone="amber" />
        <MetricCard label="Completed Tasks" value={progress.completed_tasks} tone="violet" />
        <MetricCard label="Logged Minutes" value={progress.logged_minutes} tone="rose" />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <Panel title="Profile Details" subtitle="Primary employment details and contact emails.">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Full name</p>
              <p className="mt-2 text-sm font-medium text-slate-900">{profile.full_name}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Role</p>
              <p className="mt-2 text-sm font-medium capitalize text-slate-900">{profile.role.replace("_", " ")}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Primary email</p>
              <p className="mt-2 text-sm font-medium text-slate-900">{profile.email}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Secondary email</p>
              <p className="mt-2 text-sm font-medium text-slate-900">{valueOrFallback(profile.personal_email)}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Joined on</p>
              <p className="mt-2 text-sm font-medium text-slate-900">{profile.joined_on}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Salary</p>
              <p className="mt-2 text-sm font-medium text-slate-900">{currency(Number(profile.salary), currencyCode)}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Status</p>
              <p className="mt-2 text-sm font-medium text-slate-900">{profile.active ? "Active" : "Inactive"}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Created</p>
              <p className="mt-2 text-sm font-medium text-slate-900">{formatDate(profile.created_at)}</p>
            </div>
          </div>
        </Panel>

        <Panel title="Account Details" subtitle="Bank and account information saved in the employee profile.">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Account title</p>
              <p className="mt-2 text-sm font-medium text-slate-900">{valueOrFallback(profile.account_title)}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Bank name</p>
              <p className="mt-2 text-sm font-medium text-slate-900">{valueOrFallback(profile.bank_name)}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Account no</p>
              <p className="mt-2 text-sm font-medium text-slate-900">{valueOrFallback(profile.bank_account_no)}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">IBAN</p>
              <p className="mt-2 text-sm font-medium text-slate-900">{valueOrFallback(profile.bank_iban)}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Profile details updated</p>
              <p className="mt-2 text-sm font-medium text-slate-900">
                {profile.profile_details_updated_at ? formatDate(profile.profile_details_updated_at) : "Not updated yet"}
              </p>
            </div>
            {profile.role === "employee" ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Facebook page access</p>
                <p className="mt-2 text-sm font-medium text-slate-900">
                  {profile.can_manage_pages ? "Allowed to manage pages on assigned Facebook IDs" : "No page-management permission"}
                </p>
              </div>
            ) : null}
          </div>
        </Panel>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Panel title="Attendance History" subtitle="Latest attendance records in Pakistan time.">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-slate-500">
                <tr>
                  <th className="pb-3 pr-4 font-medium">Date</th>
                  <th className="pb-3 pr-4 font-medium">Status</th>
                  <th className="pb-3 pr-4 font-medium">Check In</th>
                  <th className="pb-3 pr-4 font-medium">Distance</th>
                  <th className="pb-3 font-medium">Accuracy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {attendanceRows.length > 0 ? (
                  attendanceRows.map((row: EmployeeAttendanceRow) => (
                    <tr key={row.id}>
                      <td className="py-3 pr-4 text-slate-700">{row.attendance_date}</td>
                      <td className="py-3 pr-4">
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] ${getAttendanceBadgeClass(row.status)}`}>
                          {row.status}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-slate-700">{formatDateTime(row.check_in_at)}</td>
                      <td className="py-3 pr-4 text-slate-700">{row.distance_from_office ? `${Number(row.distance_from_office).toFixed(1)} m` : "-"}</td>
                      <td className="py-3 text-slate-700">{row.accuracy ? `${Number(row.accuracy).toFixed(1)} m` : "-"}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500">No attendance records yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="Task Progress" subtitle="Current and recent assigned tasks for this employee.">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Working</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{progress.active_tasks}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Pending</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{progress.pending_tasks}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Completed</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{progress.completed_tasks}</p>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {taskRows.length > 0 ? (
              taskRows.map((task: EmployeeTaskRow) => (
                <div key={task.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge>{task.status}</Badge>
                    <PriorityBadge priority={task.priority} />
                  </div>
                  <p className="mt-3 font-medium text-slate-900">{task.title}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{task.details || "No task details provided."}</p>
                  <div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                    <p>Assigned by: {task.assigned_by_name || "System"}</p>
                    <p>Minutes logged: {task.timer_total_minutes}</p>
                    <p>Created: {formatDateTime(task.created_at)}</p>
                    <p>Completed: {task.completed_at ? formatDateTime(task.completed_at) : "Not completed"}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">No tasks assigned yet.</p>
            )}
          </div>
        </Panel>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Panel title="Recent Work Logs" subtitle="Latest proof-of-work entries recorded by this employee.">
          <div className="space-y-3">
            {taskLogRows.length > 0 ? (
              taskLogRows.map((log: EmployeeTaskLogRow) => (
                <div key={log.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-slate-900">Task #{log.task_id}</p>
                    <p className="text-xs uppercase tracking-[0.25em] text-slate-500">{log.minutes_spent} min</p>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{log.description || "No description added."}</p>
                  <p className="mt-2 text-xs text-slate-500">{formatDateTime(log.created_at)}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">No work logs recorded yet.</p>
            )}
          </div>
        </Panel>

        <Panel title="Payroll Records" subtitle="Latest salary cycle records for this employee.">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-slate-500">
                <tr>
                  <th className="pb-3 pr-4 font-medium">Cycle</th>
                  <th className="pb-3 pr-4 font-medium">Due</th>
                  <th className="pb-3 pr-4 font-medium">Paid On</th>
                  <th className="pb-3 pr-4 font-medium">Amount</th>
                  <th className="pb-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payrollRows.length > 0 ? (
                  payrollRows.map((row: EmployeePayrollRow) => (
                    <tr key={row.id}>
                      <td className="py-3 pr-4 text-slate-700">{row.cycle_month}</td>
                      <td className="py-3 pr-4 text-slate-700">{row.due_date}</td>
                      <td className="py-3 pr-4 text-slate-700">{row.paid_on ?? "-"}</td>
                      <td className="py-3 pr-4 font-semibold text-slate-900">{currency(Number(row.amount), currencyCode)}</td>
                      <td className="py-3">
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] ${row.status === "paid" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800"}`}>
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500">No payroll records yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Panel>
      </section>

      <Panel title="Payment Records" subtitle="Admin-only history of direct payments made to this user, including the account details used at payment time.">
        <div className="overflow-x-auto">
          <table className="min-w-[1180px] table-fixed text-sm">
            <thead className="text-left text-slate-500">
              <tr>
                <th className="w-[12%] pb-3 pr-3 font-medium">Paid On</th>
                <th className="w-[10%] pb-3 pr-3 font-medium">Amount</th>
                <th className="w-[12%] pb-3 pr-3 font-medium">Paid By</th>
                <th className="w-[12%] pb-3 pr-3 font-medium">Primary Email</th>
                <th className="w-[12%] pb-3 pr-3 font-medium">Secondary Email</th>
                <th className="w-[10%] pb-3 pr-3 font-medium">Account Title</th>
                <th className="w-[10%] pb-3 pr-3 font-medium">Account No</th>
                <th className="w-[10%] pb-3 pr-3 font-medium">IBAN</th>
                <th className="w-[10%] pb-3 pr-3 font-medium">Bank</th>
                <th className="w-[12%] pb-3 font-medium">Purpose</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {staffPaymentRows.length > 0 ? (
                staffPaymentRows.map((row: EmployeeStaffPaymentRow) => (
                  <tr key={row.id}>
                    <td className="py-3 pr-3 text-slate-700">{row.paid_on}</td>
                    <td className="py-3 pr-3 font-semibold text-slate-900">{currency(Number(row.amount_paid), currencyCode)}</td>
                    <td className="py-3 pr-3 text-slate-700">{row.paid_by_name}</td>
                    <td className="py-3 pr-3 text-slate-700 break-words">{row.primary_email}</td>
                    <td className="py-3 pr-3 text-slate-700 break-words">{row.secondary_email || "-"}</td>
                    <td className="py-3 pr-3 text-slate-700">{row.account_title || "-"}</td>
                    <td className="py-3 pr-3 text-slate-700">{row.bank_account_no || "-"}</td>
                    <td className="py-3 pr-3 text-slate-700">{row.bank_iban || "-"}</td>
                    <td className="py-3 pr-3 text-slate-700">{row.bank_name || "-"}</td>
                    <td className="py-3 text-slate-700">{row.purpose || "-"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-500">No direct payment records yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
