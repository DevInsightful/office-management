import { createSalaryRecordAction } from "@/app/actions";
import { PayrollTableClient } from "@/app/dashboard/client-tables";
import { PendingSubmitButton } from "@/app/pending-controls";
import {
  ActionLink,
  Field,
  ModalFrame,
  PageIntro,
  calculateCycleCompletion,
  inputClass,
  primaryButton,
} from "@/app/ui";
import { requireUser } from "@/lib/auth";
import { getDashboardData } from "@/lib/data";

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
  const params = searchParams ? await searchParams : undefined;
  const modal = params?.modal;

  return (
    <div className="min-w-0 overflow-x-hidden space-y-4">
      <PageIntro
        eyebrow="Payroll"
        title={user.role === "employee" ? "Your salary records" : "Payroll and salary cycles"}
        description="Salary cycles, due dates, paid statuses, and monthly completion dates live here so payroll stays isolated from general employee and finance management."
        action={canManage ? <ActionLink href="/dashboard/payroll?modal=new-cycle" label="New Salary Cycle" /> : undefined}
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
    </div>
  );
}
