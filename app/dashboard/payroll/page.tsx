import { createSalaryRecordAction, createStaffPaymentAction } from "@/app/actions";
import { PayrollTableClient } from "@/app/dashboard/client-tables";
import { StaffPaymentForm } from "@/app/dashboard/staff-payment-form";
import { PendingSubmitButton } from "@/app/pending-controls";
import {
  ActionLink,
  Field,
  ModalFrame,
  PageIntro,
  calculateCycleCompletion,
  currency,
  inputClass,
  primaryButton,
} from "@/app/ui";
import { requireUser } from "@/lib/auth";
import { getDashboardData } from "@/lib/data";
import { ensureDb, sql } from "@/lib/db";

type PaymentRecipientRow = {
  id: number;
  full_name: string;
  role: "admin" | "employee";
  email: string;
  personal_email: string | null;
  account_title: string | null;
  bank_account_no: string | null;
  bank_iban: string | null;
  bank_name: string | null;
};

type StaffPaymentRow = {
  id: number;
  recipient_name: string;
  recipient_role: "admin" | "employee";
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

export default async function PayrollPage({
  searchParams,
}: {
  searchParams?: Promise<{ modal?: string }>;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const currentMonth = today.slice(0, 7);
  const user = await requireUser();
  const data = await getDashboardData(user);
  const canManage = user.role !== "employee";
  await ensureDb();
  const params = searchParams ? await searchParams : undefined;
  const modal = params?.modal;
  const paymentRecipients = canManage
    ? await sql<PaymentRecipientRow[]>`
        select
          id,
          full_name,
          role,
          email,
          personal_email,
          account_title,
          bank_account_no,
          bank_iban,
          bank_name
        from users
        where role in ('admin', 'employee')
          and active = true
        order by
          case role
            when 'admin' then 1
            else 2
          end,
          full_name asc
      `
    : [];
  const staffPayments = canManage
    ? await sql<StaffPaymentRow[]>`
        select
          sp.id,
          sp.recipient_name,
          sp.recipient_role,
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
        order by sp.paid_on desc, sp.id desc
        limit 100
      `
    : [];

  return (
    <div className="min-w-0 overflow-x-hidden space-y-4">
      <PageIntro
        eyebrow="Payroll"
        title={user.role === "employee" ? "Your salary records" : "Payroll and salary cycles"}
        description="Salary cycles, due dates, paid statuses, and monthly completion dates live here so payroll stays isolated from general employee and finance management."
        action={
          canManage ? (
            <div className="flex flex-wrap gap-2">
              <ActionLink href="/dashboard/payroll?modal=new-cycle" label="New Salary Cycle" />
              <ActionLink href="/dashboard/payroll?modal=add-payment" label="Add Payment" />
            </div>
          ) : undefined
        }
      />

      <PayrollTableClient
        payroll={data.payroll.map((record) => {
          const employee = data.employees.find((item) => item.fullName === record.full_name);

          return {
            ...record,
            email: employee?.email ?? "-",
            role: employee?.role ?? "employee",
            monthComplete: calculateCycleCompletion(record.joined_on),
          };
        })}
        canManage={canManage}
        currencyCode={data.currency}
      />

      {canManage ? (
        <section className="rounded-[2rem] border border-white/70 bg-white/85 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="mb-4">
            <h2 className="text-xl font-semibold tracking-tight text-slate-950">Staff Payment Records</h2>
            <p className="mt-1 text-sm text-slate-600">Admin-only payment history for employees and admins. Each payment stores the account details used at the time of payment.</p>
          </div>
          <div className="max-w-full overflow-x-auto">
            <table className="min-w-[1320px] table-fixed text-sm">
              <thead className="text-left text-slate-500">
                <tr>
                  <th className="w-[12%] pb-3 pr-3 font-medium">Recipient</th>
                  <th className="w-[8%] pb-3 pr-3 font-medium">Role</th>
                  <th className="w-[12%] pb-3 pr-3 font-medium">Primary Email</th>
                  <th className="w-[12%] pb-3 pr-3 font-medium">Secondary Email</th>
                  <th className="w-[10%] pb-3 pr-3 font-medium">Account Title</th>
                  <th className="w-[10%] pb-3 pr-3 font-medium">Account No</th>
                  <th className="w-[10%] pb-3 pr-3 font-medium">IBAN</th>
                  <th className="w-[10%] pb-3 pr-3 font-medium">Bank</th>
                  <th className="w-[8%] pb-3 pr-3 font-medium">Amount</th>
                  <th className="w-[8%] pb-3 pr-3 font-medium">Paid On</th>
                  <th className="w-[10%] pb-3 pr-3 font-medium">Paid By</th>
                  <th className="w-[10%] pb-3 font-medium">Purpose</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {staffPayments.length > 0 ? (
                  staffPayments.map((payment: StaffPaymentRow) => (
                    <tr key={payment.id}>
                      <td className="py-3 pr-3 font-medium text-slate-900">{payment.recipient_name}</td>
                      <td className="py-3 pr-3 text-slate-600 capitalize">{payment.recipient_role}</td>
                      <td className="py-3 pr-3 text-slate-600 break-words">{payment.primary_email}</td>
                      <td className="py-3 pr-3 text-slate-600 break-words">{payment.secondary_email || "-"}</td>
                      <td className="py-3 pr-3 text-slate-600">{payment.account_title || "-"}</td>
                      <td className="py-3 pr-3 text-slate-600">{payment.bank_account_no || "-"}</td>
                      <td className="py-3 pr-3 text-slate-600">{payment.bank_iban || "-"}</td>
                      <td className="py-3 pr-3 text-slate-600">{payment.bank_name || "-"}</td>
                      <td className="py-3 pr-3 font-semibold">{currency(Number(payment.amount_paid), data.currency)}</td>
                      <td className="py-3 pr-3 text-slate-600">{payment.paid_on}</td>
                      <td className="py-3 pr-3 text-slate-600">{payment.paid_by_name}</td>
                      <td className="py-3 text-slate-600">{payment.purpose || "-"}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={12} className="py-8 text-center text-slate-500">No staff payment records yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {canManage && modal === "new-cycle" && (
        <ModalFrame
          title="New Salary Cycle"
          subtitle="Create or update a monthly salary cycle for an employee."
          closeHref="/dashboard/payroll"
        >
          <form action={createSalaryRecordAction} className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Employee">
                <select name="userId" className={inputClass}>
                  {data.employees
                    .filter((employee) => employee.role === "employee")
                    .map((employee) => (
                      <option key={employee.id} value={employee.id}>
                        {employee.fullName}
                      </option>
                    ))}
                </select>
              </Field>
              <Field label="Cycle month">
                <input name="cycleMonth" type="month" defaultValue={currentMonth} className={inputClass} />
              </Field>
              <Field label="Due date">
                <input name="dueDate" type="date" defaultValue={today} className={inputClass} />
              </Field>
              <Field label="Amount">
                <input name="amount" type="number" min="0" step="0.01" placeholder="85000" className={inputClass} />
              </Field>
            </div>
            <PendingSubmitButton
              idleLabel="Create or update salary cycle"
              pendingLabel="Saving salary cycle..."
              className={`${primaryButton} gap-3`}
              pendingClassName="cursor-not-allowed bg-slate-700 hover:bg-slate-700"
            />
          </form>
        </ModalFrame>
      )}

      {canManage && modal === "add-payment" && paymentRecipients.length > 0 ? (
        <ModalFrame
          title="Add Staff Payment"
          subtitle="Record a payment to any admin or employee. Account details start from the user profile and can be changed before saving."
          closeHref="/dashboard/payroll"
        >
          <StaffPaymentForm
            recipients={paymentRecipients.map((recipient: PaymentRecipientRow) => ({
              id: recipient.id,
              fullName: recipient.full_name,
              role: recipient.role,
              primaryEmail: recipient.email,
              secondaryEmail: recipient.personal_email ?? "",
              accountTitle: recipient.account_title ?? "",
              bankAccountNo: recipient.bank_account_no ?? "",
              bankIban: recipient.bank_iban ?? "",
              bankName: recipient.bank_name ?? "",
            }))}
            today={today}
            action={createStaffPaymentAction}
          />
        </ModalFrame>
      ) : null}
    </div>
  );
}
