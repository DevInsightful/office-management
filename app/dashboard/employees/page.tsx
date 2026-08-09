import { createUserAction, updateUserAction } from "@/app/actions";
import { EmployeesDirectoryClient } from "@/app/dashboard/client-tables";
import { PendingSubmitButton } from "@/app/pending-controls";
import { ActionLink, Field, ModalFrame, PageIntro, inputClass, primaryButton } from "@/app/ui";
import { requireAdmin } from "@/lib/auth";
import { getDashboardData } from "@/lib/data";

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams?: Promise<{ modal?: string; user?: string }>;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const user = await requireAdmin();
  const data = await getDashboardData(user);
  const params = searchParams ? await searchParams : undefined;
  const modal = params?.modal;
  const selectedUserId = Number(params?.user ?? 0);
  const selectedUser = data.employees.find((employee) => employee.id === selectedUserId) ?? null;

  return (
    <>
      <PageIntro
        eyebrow="Employees"
        title="Employees and administrators"
        description="Create new employees here, and if you are super admin you can also create admins. This page is focused on the people directory and onboarding."
        action={<ActionLink href="/dashboard/employees?modal=create-user" label="Create Employee" />}
      />

      <EmployeesDirectoryClient
        employees={data.employees}
        canManageAdmins={user.role === "super_admin"}
        currencyCode={data.currency}
      />

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
                <input name="joinedOn" type="date" defaultValue={today} max={today} className={inputClass} />
              </Field>
              <Field label="Monthly salary">
                <input name="salary" type="number" min="0" step="0.01" placeholder="85000" className={inputClass} />
              </Field>
            </div>
            <PendingSubmitButton
              idleLabel="Create user"
              pendingLabel="Creating user..."
              className={`${primaryButton} gap-3`}
              pendingClassName="cursor-not-allowed bg-slate-700 hover:bg-slate-700"
            />
          </form>
        </ModalFrame>
      )}

      {modal === "edit-user" && selectedUser && (
        <ModalFrame
          title={`Edit ${selectedUser.fullName}`}
          subtitle="Update employee or admin details. Leave password empty to keep the current password."
          closeHref="/dashboard/employees"
        >
          <form action={updateUserAction} className="space-y-3">
            <input type="hidden" name="userId" value={selectedUser.id} />
            <Field label="Role">
              <select
                name="role"
                defaultValue={selectedUser.role}
                className={inputClass}
                disabled={user.role !== "super_admin"}
              >
                {user.role === "super_admin" && <option value="admin">Admin</option>}
                <option value="employee">Employee</option>
              </select>
            </Field>
            {user.role !== "super_admin" && <input type="hidden" name="role" value="employee" />}
            <Field label="Full name">
              <input name="fullName" defaultValue={selectedUser.fullName} className={inputClass} />
            </Field>
            <Field label="Email">
              <input name="email" type="email" defaultValue={selectedUser.email} className={inputClass} />
            </Field>
            <Field label="New password (optional)">
              <input name="password" type="text" placeholder="Leave blank to keep current password" className={inputClass} />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Joined on">
                <input name="joinedOn" type="date" defaultValue={selectedUser.joinedOn} max={today} className={inputClass} />
              </Field>
              <Field label="Monthly salary">
                <input name="salary" type="number" min="0" step="0.01" defaultValue={selectedUser.salary} className={inputClass} />
              </Field>
            </div>
            <PendingSubmitButton
              idleLabel="Update user"
              pendingLabel="Updating user..."
              className={`${primaryButton} gap-3`}
              pendingClassName="cursor-not-allowed bg-slate-700 hover:bg-slate-700"
            />
          </form>
        </ModalFrame>
      )}
    </>
  );
}
