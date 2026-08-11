import { hashPassword } from "@/lib/auth";
import { ensureDb, sql } from "@/lib/db";

export async function seedIfEmpty() {
  await ensureDb();

  const existing = await sql<{ count: string }[]>`
    select count(*)::text as count from users
  `;

  if (Number(existing[0]?.count ?? "0") > 0) {
    return;
  }

  const superAdminPassword = await hashPassword(
    process.env.DEFAULT_SUPER_ADMIN_PASSWORD || "superadmin123",
  );
  const adminPassword = await hashPassword("admin123");
  const employeePassword = await hashPassword("employee123");

  const insertedUsers = await sql<{ id: number; role: string }[]>`
    insert into users (full_name, email, password_hash, role, joined_on, salary)
    values
      ('Super Admin', 'superadmin@office.local', ${superAdminPassword}, 'super_admin', current_date - interval '180 days', 250000),
      ('Office Admin', 'admin@office.local', ${adminPassword}, 'admin', current_date - interval '120 days', 140000),
      ('Areeba Khan', 'employee@office.local', ${employeePassword}, 'employee', current_date - interval '75 days', 85000)
    returning id, role
  `;

  const superAdminId = insertedUsers.find((user: { id: number; role: string }) => user.role === "super_admin")?.id;
  const adminId = insertedUsers.find((user: { id: number; role: string }) => user.role === "admin")?.id;
  const employeeId = insertedUsers.find((user: { id: number; role: string }) => user.role === "employee")?.id;

  if (!superAdminId || !adminId || !employeeId) {
    return;
  }

  await sql`
    update users
    set created_by = ${superAdminId}
    where id in (${adminId}, ${employeeId})
  `;

  await sql`
    insert into finance_entries (type, title, category, amount, entry_date, notes, created_by)
    values
      ('income', 'Client retainer', 'Retainers', 320000, current_date - interval '18 days', 'Monthly retainer from long-term client', ${adminId}),
      ('income', 'Consulting sprint', 'Projects', 180000, current_date - interval '9 days', 'One-off operational improvement project', ${adminId}),
      ('expense', 'Office rent', 'Rent', 95000, current_date - interval '21 days', 'Main office monthly rent', ${adminId}),
      ('expense', 'Marketing ads', 'Marketing', 62000, current_date - interval '12 days', 'Paid acquisition experiment', ${adminId}),
      ('expense', 'Snacks and pantry', 'Office Ops', 18000, current_date - interval '5 days', 'Pantry refill and staff tea', ${adminId})
  `;

  await sql`
    insert into attendance (user_id, attendance_date, check_in_at, notes)
    values
      (${employeeId}, current_date - interval '2 days', now() - interval '2 days' + interval '9 hours', 'Reached on time'),
      (${employeeId}, current_date - interval '1 day', now() - interval '1 day' + interval '9 hours 15 minutes', 'Worked on reporting')
    on conflict (user_id, attendance_date) do nothing
  `;

  const seededTask = await sql<{ id: number }[]>`
    insert into tasks (assigned_to, assigned_by, title, details, priority, status, timer_total_minutes)
    values
      (${employeeId}, ${adminId}, 'Prepare weekly expense summary', 'Review expenses, flag overspend, and share summary with admin.', 'high', 'working', 120),
      (${employeeId}, ${adminId}, 'Call vendor shortlist', 'Speak with 3 vendors and compare rates for office supplies.', 'medium', 'pending', 0)
    returning id
  `;

  if (seededTask[0]?.id) {
    await sql`
      insert into task_logs (task_id, user_id, minutes_spent, description)
      values
        (${seededTask[0].id}, ${employeeId}, 120, 'Reviewed ledgers and prepared the first draft of the summary.')
    `;
  }

  await sql`
    insert into salary_payments (user_id, cycle_month, due_date, paid_on, amount, status)
    values
      (${employeeId}, date_trunc('month', current_date)::date, current_date + interval '3 days', null, 85000, 'due'),
      (${employeeId}, date_trunc('month', current_date - interval '1 month')::date, current_date - interval '25 days', current_date - interval '24 days', 85000, 'paid')
    on conflict (user_id, cycle_month) do nothing
  `;

  await sql`
    update users set can_manage_pages = true where id = ${employeeId}
  `;

  const seededFacebookIds = await sql<{ id: number }[]>`
    insert into facebook_ids (email, facebook_password, email_password, assigned_to)
    values
      ('assigned.account@gmail.com', 'fbpass123', 'gmailpass123', ${employeeId}),
      ('free.account@gmail.com', 'fbpass456', null, null)
    on conflict (email) do nothing
    returning id, email
  `;

  const assignedFacebookId = seededFacebookIds.find(
    (row: { id: number; email: string }) => row.email === "assigned.account@gmail.com",
  );

  if (assignedFacebookId?.id) {
    await sql`
      insert into facebook_id_pages (facebook_id_id, name, password)
      values (${assignedFacebookId.id}, 'ABC Furniture UK', 'pagepass123')
    `;
  }
}
