import { createUserAction } from "@/app/actions";
import { ActionLink, Field, ModalFrame, PageIntro, Panel, currency, inputClass, primaryButton } from "@/app/ui";
import { requireAdmin } from "@/lib/auth";
import { getDashboardData } from "@/lib/data";

const today = "2026-07-28";

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams?: Promise<{ modal?: string }>;
}) {
  const user = await requireAdmin();
  const data = await getDashboardData(user);
  const params = searchParams ? await searchParams : undefined;
  const modal = params?.modal;

  return (
    <>
      <PageIntro
        eyebrow="Employees"
        title="Employees and administrators"
        description="Create new employees here, and if you are super admin you can also create admins. This page is focused on the people directory and onboarding."
        action={<ActionLink href="/dashboard/employees?modal=create-user" label="Create Employee" />}
      />

      <section className="grid gap-4">
        <Panel title="All Team Members" subtitle="Roles, join dates, and fixed monthly salaries.">
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

      {modal === "create-user" && (
        <ModalFrame
          title="Create User"
          subtitle="Create employees here. Super admin can also create admins."
          closeHref="/dashboard/employees"
        >
          <form action={createUserAction} className="space-y-3">
            <Field label="Role">
              <select
                name="role"
                defaultValue="employee"
                className={inputClass}
                disabled={user.role !== "super_admin"}
              >
                {user.role === "super_admin" && <option value="admin">Admin</option>}
                <option value="employee">Employee</option>
              </select>
            </Field>
            {user.role !== "super_admin" && <input type="hidden" name="role" value="employee" />}
            <Field label="Full name">
              <input name="fullName" placeholder="Employee name" className={inputClass} />
            </Field>
            <Field label="Email">
              <input name="email" type="email" placeholder="name@office.com" className={inputClass} />
            </Field>
            <Field label="Password">
              <input name="password" type="text" placeholder="Temporary password" className={inputClass} />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Joined on">
                <input name="joinedOn" type="date" defaultValue={today} className={inputClass} />
              </Field>
              <Field label="Monthly salary">
                <input name="salary" type="number" min="0" step="0.01" placeholder="85000" className={inputClass} />
              </Field>
            </div>
            <button className={primaryButton}>Create user</button>
          </form>
        </ModalFrame>
      )}
    </>
  );
}
