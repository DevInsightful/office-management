import { createSalaryRecordAction, markSalaryPaidAction } from "@/app/actions";
import {
  ActionLink,
  Field,
  ModalFrame,
  PageIntro,
  Panel,
  calculateCycleCompletion,
  currency,
  inputClass,
  primaryButton,
  secondaryButton,
} from "@/app/ui";
import { requireUser } from "@/lib/auth";
import { getDashboardData } from "@/lib/data";

const today = "2026-07-28";
const currentMonth = "2026-07";

export default async function PayrollPage({
  searchParams,
}: {
  searchParams?: Promise<{ modal?: string }>;
}) {
  const user = await requireUser();
  const data = await getDashboardData(user);
  const canManage = user.role !== "employee";
  const params = searchParams ? await searchParams : undefined;
  const modal = params?.modal;

  return (
    <>
      <PageIntro
        eyebrow="Payroll"
        title={user.role === "employee" ? "Your salary records" : "Payroll and salary cycles"}
        description="Salary cycles, due dates, paid statuses, and monthly completion dates live here so payroll stays isolated from general employee and finance management."
        action={canManage ? <ActionLink href="/dashboard/payroll?modal=new-cycle" label="New Salary Cycle" /> : undefined}
      />

      <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Panel
          title={user.role === "employee" ? "My Payroll" : "Payroll Management"}
          subtitle="Track join date, monthly completion, due salaries, and paid cycles."
        >
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-slate-500">
                <tr>
                  <th className="pb-3 pr-4 font-medium">Employee</th>
                  <th className="pb-3 pr-4 font-medium">Joined</th>
                  <th className="pb-3 pr-4 font-medium">Cycle</th>
                  <th className="pb-3 pr-4 font-medium">Due</th>
                  <th className="pb-3 pr-4 font-medium">Amount</th>
                  <th className="pb-3 pr-4 font-medium">Status</th>
                  <th className="pb-3 pr-4 font-medium">Month Complete</th>
                  {canManage && <th className="pb-3 font-medium">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.payroll.map((record, index) => (
                  <tr key={record.id ?? `${record.full_name}-${record.cycle_month ?? index}`}>
                    <td className="py-3 pr-4 font-medium text-slate-900">{record.full_name}</td>
                    <td className="py-3 pr-4 text-slate-600">{record.joined_on}</td>
                    <td className="py-3 pr-4 text-slate-600">{record.cycle_month || "Not created"}</td>
                    <td className="py-3 pr-4 text-slate-600">{record.due_date || "Pending"}</td>
                    <td className="py-3 pr-4 font-semibold">{currency(record.amount ?? record.salary)}</td>
                    <td className="py-3 pr-4 text-slate-600">{record.status || "not created"}</td>
                    <td className="py-3 pr-4 text-slate-600">{calculateCycleCompletion(record.joined_on)}</td>
                    {canManage && (
                      <td className="py-3">
                        {record.id && record.status === "due" ? (
                          <form action={markSalaryPaidAction}>
                            <input type="hidden" name="paymentId" value={record.id} />
                            <button className={secondaryButton}>Mark paid</button>
                          </form>
                        ) : (
                          <span className="text-sm text-slate-400">-</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="People Directory" subtitle="Roles, join dates, and fixed monthly salaries.">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-slate-500">
                <tr>
                  <th className="pb-3 pr-4 font-medium">Name</th>
                  <th className="pb-3 pr-4 font-medium">Email</th>
                  <th className="pb-3 pr-4 font-medium">Role</th>
                  <th className="pb-3 pr-4 font-medium">Joined</th>
                  <th className="pb-3 font-medium">Salary</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.employees.map((employee) => (
                  <tr key={employee.id}>
                    <td className="py-3 pr-4 font-medium text-slate-900">{employee.fullName}</td>
                    <td className="py-3 pr-4 text-slate-600">{employee.email}</td>
                    <td className="py-3 pr-4 text-slate-600">{employee.role.replace("_", " ")}</td>
                    <td className="py-3 pr-4 text-slate-600">{employee.joinedOn}</td>
                    <td className="py-3 font-semibold">{currency(employee.salary)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </section>

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
            <button className={primaryButton}>Create or update salary cycle</button>
          </form>
        </ModalFrame>
      )}
    </>
  );
}
