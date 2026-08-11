"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  clearSession,
  createSession,
  hashPassword,
  requireAdmin,
  requireUser,
  verifyPassword,
} from "@/lib/auth";
import { ensureDb, sql } from "@/lib/db";
import { seedIfEmpty } from "@/lib/seed";
import { SUPPORTED_CURRENCIES } from "@/lib/currency";
import { setCurrencySetting } from "@/lib/settings";
import { getSupabaseBucket, getSupabaseClient } from "@/lib/supabase";
import { findCsvColumnIndex, parseCsv } from "@/lib/csv";
import { assertFacebookIdAccess } from "@/lib/facebook-ids";
import { validateFacebookIdRow } from "@/lib/facebook-id-validation";

function cleanText(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

function cleanNumber(value: FormDataEntryValue | null) {
  return Number(String(value ?? "0").trim());
}

function cleanDate(value: FormDataEntryValue | null) {
  const parsed = cleanText(value);
  return parsed || new Date().toISOString().slice(0, 10);
}

export async function updateCurrencyAction(formData: FormData) {
  await requireAdmin();

  const currencyCode = cleanText(formData.get("currency"));

  if (!(SUPPORTED_CURRENCIES as readonly string[]).includes(currencyCode)) {
    redirect("/dashboard/settings?error=invalid_currency");
  }

  await setCurrencySetting(currencyCode);

  revalidatePath("/dashboard", "layout");
  redirect("/dashboard/settings?success=currency_updated");
}

function cleanBoolean(value: FormDataEntryValue | null) {
  return value === "on" || value === "true";
}

export async function loginAction(formData: FormData) {
  await ensureDb();
  await seedIfEmpty();

  const email = cleanText(formData.get("email")).toLowerCase();
  const password = cleanText(formData.get("password"));

  if (!email || !password) {
    redirect("/?error=missing_credentials");
  }

  const users = await sql<
    {
      id: number;
      password_hash: string;
      active: boolean;
    }[]
  >`
    select id, password_hash, active
    from users
    where lower(email) = ${email}
    limit 1
  `;

  const user = users[0];

  if (!user?.active) {
    redirect("/?error=invalid_credentials");
  }

  const valid = await verifyPassword(password, user.password_hash);

  if (!valid) {
    redirect("/?error=invalid_credentials");
  }

  await createSession(user.id);
  redirect("/dashboard");
}

export async function logoutAction() {
  await clearSession();
  redirect("/");
}

export async function createUserAction(formData: FormData) {
  const actor = await requireAdmin();

  const role = cleanText(formData.get("role"));
  const fullName = cleanText(formData.get("fullName"));
  const email = cleanText(formData.get("email")).toLowerCase();
  const password = cleanText(formData.get("password"));
  const joinedOn = cleanDate(formData.get("joinedOn"));
  const salary = cleanNumber(formData.get("salary"));

  if (!fullName || !email || !password) {
    redirect("/?error=missing_user_fields");
  }

  if (role === "admin" && actor.role !== "super_admin") {
    redirect("/?error=forbidden");
  }

  if (!["admin", "employee"].includes(role)) {
    redirect("/?error=invalid_role");
  }

  const passwordHash = await hashPassword(password);

  await sql`
    insert into users (full_name, email, password_hash, role, joined_on, salary, created_by)
    values (${fullName}, ${email}, ${passwordHash}, ${role}, ${joinedOn}, ${salary}, ${actor.id})
    on conflict (email) do nothing
  `;

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/employees");
  redirect("/dashboard/employees");
}

export async function updateUserAction(formData: FormData) {
  const actor = await requireAdmin();

  const userId = cleanNumber(formData.get("userId"));
  const role = cleanText(formData.get("role"));
  const fullName = cleanText(formData.get("fullName"));
  const email = cleanText(formData.get("email")).toLowerCase();
  const password = cleanText(formData.get("password"));
  const joinedOn = cleanDate(formData.get("joinedOn"));
  const salary = cleanNumber(formData.get("salary"));
  const canManagePages = cleanBoolean(formData.get("canManagePages"));

  if (!userId || !fullName || !email || !["admin", "employee"].includes(role)) {
    redirect("/dashboard/employees?error=invalid_user_fields");
  }

  const users = await sql<{ id: number; role: "super_admin" | "admin" | "employee" }[]>`
    select id, role
    from users
    where id = ${userId}
    limit 1
  `;

  const target = users[0];

  if (!target || target.role === "super_admin") {
    redirect("/dashboard/employees?error=invalid_user_target");
  }

  if (actor.role !== "super_admin" && (role !== "employee" || target.role !== "employee")) {
    redirect("/dashboard/employees?error=forbidden");
  }

  if (role === "admin" && actor.role !== "super_admin") {
    redirect("/dashboard/employees?error=forbidden");
  }

  if (password) {
    const passwordHash = await hashPassword(password);

    await sql`
      update users
      set
        role = ${role},
        full_name = ${fullName},
        email = ${email},
        password_hash = ${passwordHash},
        joined_on = ${joinedOn},
        salary = ${salary},
        can_manage_pages = ${canManagePages}
      where id = ${userId}
    `;
  } else {
    await sql`
      update users
      set
        role = ${role},
        full_name = ${fullName},
        email = ${email},
        joined_on = ${joinedOn},
        salary = ${salary},
        can_manage_pages = ${canManagePages}
      where id = ${userId}
    `;
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/employees");
  revalidatePath("/dashboard/facebook-ids");
  redirect("/dashboard/employees");
}

export async function deleteUserAction(formData: FormData) {
  const actor = await requireAdmin();
  const userId = cleanNumber(formData.get("userId"));

  if (!userId || userId === actor.id) {
    redirect("/dashboard/employees?error=invalid_delete_target");
  }

  const users = await sql<{ id: number; role: "super_admin" | "admin" | "employee" }[]>`
    select id, role
    from users
    where id = ${userId}
    limit 1
  `;

  const target = users[0];

  if (!target || target.role === "super_admin") {
    redirect("/dashboard/employees?error=invalid_delete_target");
  }

  if (actor.role !== "super_admin" && target.role !== "employee") {
    redirect("/dashboard/employees?error=forbidden");
  }

  await sql`delete from users where id = ${userId}`;

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/employees");
  revalidatePath("/dashboard/orders");
  revalidatePath("/dashboard/tasks");
  revalidatePath("/dashboard/payroll");
  revalidatePath("/dashboard/performance");
  redirect("/dashboard/employees");
}

export async function addFinanceEntryAction(formData: FormData) {
  const actor = await requireAdmin();

  const type = cleanText(formData.get("type"));
  const title = cleanText(formData.get("title"));
  const category = cleanText(formData.get("category"));
  const amount = cleanNumber(formData.get("amount"));
  const entryDate = cleanDate(formData.get("entryDate"));
  const notes = cleanText(formData.get("notes"));

  if (!title || !category || !amount || !["income", "expense"].includes(type)) {
    redirect("/?error=invalid_finance_entry");
  }

  await sql`
    insert into finance_entries (type, title, category, amount, entry_date, notes, created_by)
    values (${type}, ${title}, ${category}, ${amount}, ${entryDate}, ${notes}, ${actor.id})
  `;

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/finance");
  redirect("/dashboard/finance");
}

export async function updateFinanceEntryAction(formData: FormData) {
  await requireAdmin();

  const entryId = cleanNumber(formData.get("entryId"));
  const type = cleanText(formData.get("type"));
  const title = cleanText(formData.get("title"));
  const category = cleanText(formData.get("category"));
  const amount = cleanNumber(formData.get("amount"));
  const entryDate = cleanDate(formData.get("entryDate"));
  const notes = cleanText(formData.get("notes"));

  if (!entryId || !title || !category || !amount || !["income", "expense"].includes(type)) {
    redirect("/dashboard/finance?error=invalid_finance_entry");
  }

  await sql`
    update finance_entries
    set
      type = ${type},
      title = ${title},
      category = ${category},
      amount = ${amount},
      entry_date = ${entryDate},
      notes = ${notes}
    where id = ${entryId}
  `;

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/finance");
  redirect("/dashboard/finance");
}

export async function deleteFinanceEntryAction(formData: FormData) {
  await requireAdmin();
  const entryId = cleanNumber(formData.get("entryId"));

  if (!entryId) {
    redirect("/dashboard/finance?error=invalid_finance_entry");
  }

  await sql`delete from finance_entries where id = ${entryId}`;

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/finance");
  redirect("/dashboard/finance");
}

export async function markAttendanceAction(formData: FormData) {
  const actor = await requireUser();

  const requestedUserId = Number(cleanText(formData.get("userId")) || actor.id);
  const attendanceDate = cleanDate(formData.get("attendanceDate"));
  const notes = cleanText(formData.get("notes"));

  if (actor.role === "employee" && actor.id !== requestedUserId) {
    redirect("/?error=forbidden");
  }

  await sql`
    insert into attendance (user_id, attendance_date, notes)
    values (${requestedUserId}, ${attendanceDate}, ${notes})
    on conflict (user_id, attendance_date) do nothing
  `;

  revalidatePath("/dashboard");
}

export async function markAttendanceByAdminAction(formData: FormData) {
  const actor = await requireAdmin();

  const userId = cleanNumber(formData.get("userId"));
  const attendanceDate = cleanDate(formData.get("attendanceDate"));

  if (!userId || !attendanceDate) {
    redirect("/dashboard/attendance?error=invalid_attendance");
  }

  const users = await sql<{ id: number; role: "super_admin" | "admin" | "employee"; active: boolean }[]>`
    select id, role, active
    from users
    where id = ${userId}
    limit 1
  `;

  const target = users[0];

  if (!target || !target.active || target.role === "super_admin") {
    redirect("/dashboard/attendance?error=invalid_attendance_target");
  }

  if (actor.role !== "super_admin" && target.role === "admin") {
    redirect("/dashboard/attendance?error=forbidden");
  }

  const existing = await sql<{ id: number }[]>`
    select id
    from attendance_records
    where employee_id = ${userId}
      and check_in_time::date = ${attendanceDate}::date
    limit 1
  `;

  if (!existing[0]) {
    await sql`
      insert into attendance_records (
        employee_id,
        check_in_time,
        office_radius,
        user_agent
      )
      values (
        ${userId},
        (${attendanceDate}::date + time '09:00')::timestamptz,
        0,
        ${`Marked manually by ${actor.fullName} (${actor.role})`}
      )
    `;
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/attendance");
  revalidatePath("/dashboard/performance");
  redirect("/dashboard/attendance");
}

export async function createTaskAction(formData: FormData) {
  const actor = await requireAdmin();

  const assignedTo = cleanNumber(formData.get("assignedTo"));
  const title = cleanText(formData.get("title"));
  const details = cleanText(formData.get("details"));
  const priority = cleanText(formData.get("priority"));

  if (!assignedTo || !title || !["low", "medium", "high"].includes(priority)) {
    redirect("/?error=invalid_task");
  }

  await sql`
    insert into tasks (assigned_to, assigned_by, title, details, priority)
    values (${assignedTo}, ${actor.id}, ${title}, ${details}, ${priority})
  `;

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/tasks");
  revalidatePath("/dashboard/performance");
  redirect("/dashboard/tasks");
}

export async function updateTaskStatusAction(formData: FormData) {
  const actor = await requireUser();

  const taskId = cleanNumber(formData.get("taskId"));
  const status = cleanText(formData.get("status"));
  const description = cleanText(formData.get("description"));
  const minutesSpent = cleanNumber(formData.get("minutesSpent"));

  if (!taskId || !["pending", "working", "completed"].includes(status)) {
    redirect("/?error=invalid_task_status");
  }

  const tasks = await sql<
    {
      id: number;
      assigned_to: number;
    }[]
  >`
    select id, assigned_to
    from tasks
    where id = ${taskId}
    limit 1
  `;

  const task = tasks[0];

  if (!task) {
    redirect("/?error=task_not_found");
  }

  if (actor.role === "employee" && task.assigned_to !== actor.id) {
    redirect("/?error=forbidden");
  }

  await sql`
    update tasks
    set
      status = ${status},
      updated_at = now(),
      completed_at = case when ${status} = 'completed' then now() else null end
    where id = ${taskId}
  `;

  if (description || minutesSpent > 0) {
    await sql`
      insert into task_logs (task_id, user_id, minutes_spent, description)
      values (${taskId}, ${actor.id}, ${Math.max(minutesSpent, 0)}, ${description})
    `;

    if (minutesSpent > 0) {
      await sql`
        update tasks
        set timer_total_minutes = timer_total_minutes + ${minutesSpent}
        where id = ${taskId}
      `;
    }
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/tasks");
  revalidatePath("/dashboard/performance");
}

export async function startTaskTimerAction(formData: FormData) {
  const actor = await requireUser();
  const taskId = cleanNumber(formData.get("taskId"));

  const rows = await sql<
    {
      assigned_to: number;
    }[]
  >`
    select assigned_to from tasks where id = ${taskId} limit 1
  `;

  const task = rows[0];

  if (!task || (actor.role === "employee" && task.assigned_to !== actor.id)) {
    redirect("/?error=forbidden");
  }

  await sql`
    update tasks
    set status = 'working', timer_started_at = now(), updated_at = now()
    where id = ${taskId}
  `;

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/tasks");
}

export async function stopTaskTimerAction(formData: FormData) {
  const actor = await requireUser();
  const taskId = cleanNumber(formData.get("taskId"));
  const description = cleanText(formData.get("description"));

  const rows = await sql<
    {
      assigned_to: number;
      timer_started_at: Date | null;
    }[]
  >`
    select assigned_to, timer_started_at
    from tasks
    where id = ${taskId}
    limit 1
  `;

  const task = rows[0];

  if (!task || (actor.role === "employee" && task.assigned_to !== actor.id)) {
    redirect("/?error=forbidden");
  }

  const minutesSpent = task.timer_started_at
    ? Math.max(
        1,
        Math.round((Date.now() - new Date(task.timer_started_at).getTime()) / 60000),
      )
    : 0;

  await sql`
    update tasks
    set
      timer_total_minutes = timer_total_minutes + ${minutesSpent},
      timer_started_at = null,
      updated_at = now()
    where id = ${taskId}
  `;

  if (minutesSpent > 0 || description) {
    await sql`
      insert into task_logs (task_id, user_id, minutes_spent, description)
      values (${taskId}, ${actor.id}, ${minutesSpent}, ${description || "Timer session recorded."})
    `;
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/tasks");
  revalidatePath("/dashboard/performance");
}

export async function addTaskLogAction(formData: FormData) {
  const actor = await requireUser();
  const taskId = cleanNumber(formData.get("taskId"));
  const description = cleanText(formData.get("description"));
  const minutesSpent = cleanNumber(formData.get("minutesSpent"));

  const rows = await sql<
    {
      assigned_to: number;
    }[]
  >`
    select assigned_to from tasks where id = ${taskId} limit 1
  `;

  const task = rows[0];

  if (!task || (actor.role === "employee" && task.assigned_to !== actor.id)) {
    redirect("/?error=forbidden");
  }

  await sql`
    insert into task_logs (task_id, user_id, minutes_spent, description)
    values (${taskId}, ${actor.id}, ${Math.max(minutesSpent, 0)}, ${description})
  `;

  await sql`
    update tasks
    set timer_total_minutes = timer_total_minutes + ${Math.max(minutesSpent, 0)}, updated_at = now()
    where id = ${taskId}
  `;

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/tasks");
  revalidatePath("/dashboard/performance");
}

export async function createSalaryRecordAction(formData: FormData) {
  await requireAdmin();

  const userId = cleanNumber(formData.get("userId"));
  const cycleMonth = cleanText(formData.get("cycleMonth"));
  const dueDate = cleanDate(formData.get("dueDate"));
  const amount = cleanNumber(formData.get("amount"));

  if (!userId || !cycleMonth || !amount) {
    redirect("/?error=invalid_salary_record");
  }

  const monthStart = `${cycleMonth}-01`;

  await sql`
    insert into salary_payments (user_id, cycle_month, due_date, amount, status)
    values (${userId}, ${monthStart}, ${dueDate}, ${amount}, 'due')
    on conflict (user_id, cycle_month)
    do update set due_date = excluded.due_date, amount = excluded.amount
  `;

  revalidatePath("/dashboard");
}

export async function markSalaryPaidAction(formData: FormData) {
  await requireAdmin();
  const paymentId = cleanNumber(formData.get("paymentId"));

  await sql`
    update salary_payments
    set status = 'paid', paid_on = current_date
    where id = ${paymentId}
  `;

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/payroll");
}

export async function createOrderAction(formData: FormData) {
  const actor = await requireUser();

  const note = cleanText(formData.get("note"));
  const idName = cleanText(formData.get("idName"));
  const bookingDate = cleanDate(formData.get("bookingDate"));
  const deliveryDate = cleanDate(formData.get("deliveryDate"));
  const customerName = cleanText(formData.get("customerName"));
  const address = cleanText(formData.get("address"));
  const phoneNumber = cleanText(formData.get("phoneNumber"));
  const orderDetails = cleanText(formData.get("orderDetails"));
  const color = cleanText(formData.get("color"));
  const price = cleanNumber(formData.get("price"));
  const deliveryMode = cleanText(formData.get("deliveryMode"));
  const freeDelivery = cleanBoolean(formData.get("freeDelivery"));
  const deliveryPrice = cleanNumber(formData.get("deliveryPrice"));
  const freeParking = cleanBoolean(formData.get("freeParking"));
  const paymentMethod = cleanText(formData.get("paymentMethod"));
  const description = cleanText(formData.get("description"));
  const image = formData.get("image");
  const normalizedFreeDelivery = deliveryMode === "paid" ? false : freeDelivery || deliveryMode === "free";
  const normalizedDeliveryPrice = normalizedFreeDelivery ? 0 : deliveryPrice;
  const total = price + normalizedDeliveryPrice;

  if (
    !note ||
    !idName ||
    !bookingDate ||
    !deliveryDate ||
    !customerName ||
    !address ||
    !phoneNumber ||
    !orderDetails ||
    !color ||
    !price ||
    !paymentMethod ||
    !["free", "paid"].includes(deliveryMode) ||
    (!normalizedFreeDelivery && normalizedDeliveryPrice <= 0) ||
    !(image instanceof File) ||
    image.size === 0
  ) {
    redirect("/dashboard/orders?error=invalid_order");
  }

  const supabase = getSupabaseClient();
  const bucket = getSupabaseBucket();
  const safeName = image.name.replace(/[^a-zA-Z0-9.\-_]/g, "-");
  const filePath = `orders/${actor.id}/${Date.now()}-${safeName}`;

  const upload = await supabase.storage.from(bucket).upload(filePath, image, {
    cacheControl: "3600",
    upsert: false,
    contentType: image.type || "application/octet-stream",
  });

  if (upload.error) {
    redirect("/dashboard/orders?error=image_upload_failed");
  }

  await sql`
    insert into orders (
      csr_user_id,
      note,
      id_name,
      booking_date,
      delivery_date,
      customer_name,
      address,
      phone_number,
      order_details,
      color,
      price,
      free_delivery,
      delivery_price,
      free_parking,
      total,
      payment_method,
      description,
      image_url
    )
    values (
      ${actor.id},
      ${note},
      ${idName},
      ${bookingDate},
      ${deliveryDate},
      ${customerName},
      ${address},
      ${phoneNumber},
      ${orderDetails},
      ${color},
      ${price},
      ${normalizedFreeDelivery},
      ${normalizedDeliveryPrice},
      ${freeParking},
      ${total},
      ${paymentMethod},
      ${description},
      ${filePath}
    )
  `;

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/orders");
  redirect("/dashboard/orders");
}

export async function updateOrderStatusAction(formData: FormData) {
  await requireAdmin();

  const orderId = cleanNumber(formData.get("orderId"));
  const status = cleanText(formData.get("status"));

  if (!orderId || !["pending", "approved", "rejected", "cancelled", "delivered"].includes(status)) {
    redirect("/dashboard/orders?error=invalid_order_status");
  }

  await sql`
    update orders
    set status = ${status}, updated_at = now()
    where id = ${orderId}
  `;

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/orders");
}

export async function updateOrderAction(formData: FormData) {
  const actor = await requireUser();

  const orderId = cleanNumber(formData.get("orderId"));
  const note = cleanText(formData.get("note"));
  const idName = cleanText(formData.get("idName"));
  const bookingDate = cleanDate(formData.get("bookingDate"));
  const deliveryDate = cleanDate(formData.get("deliveryDate"));
  const customerName = cleanText(formData.get("customerName"));
  const address = cleanText(formData.get("address"));
  const phoneNumber = cleanText(formData.get("phoneNumber"));
  const orderDetails = cleanText(formData.get("orderDetails"));
  const color = cleanText(formData.get("color"));
  const price = cleanNumber(formData.get("price"));
  const deliveryMode = cleanText(formData.get("deliveryMode"));
  const freeDelivery = cleanBoolean(formData.get("freeDelivery"));
  const deliveryPrice = cleanNumber(formData.get("deliveryPrice"));
  const freeParking = cleanBoolean(formData.get("freeParking"));
  const paymentMethod = cleanText(formData.get("paymentMethod"));
  const description = cleanText(formData.get("description"));
  const normalizedFreeDelivery = deliveryMode === "paid" ? false : freeDelivery || deliveryMode === "free";
  const normalizedDeliveryPrice = normalizedFreeDelivery ? 0 : deliveryPrice;
  const total = price + normalizedDeliveryPrice;

  if (
    !orderId ||
    !note ||
    !idName ||
    !bookingDate ||
    !deliveryDate ||
    !customerName ||
    !address ||
    !phoneNumber ||
    !orderDetails ||
    !color ||
    !price ||
    !paymentMethod ||
    !["free", "paid"].includes(deliveryMode) ||
    (!normalizedFreeDelivery && normalizedDeliveryPrice <= 0)
  ) {
    redirect(`/dashboard/orders?modal=edit-order&order=${orderId}&error=invalid_order`);
  }

  const rows = await sql<{ csr_user_id: number }[]>`
    select csr_user_id
    from orders
    where id = ${orderId}
    limit 1
  `;

  const order = rows[0];

  if (!order || (actor.role === "employee" && order.csr_user_id !== actor.id)) {
    redirect("/dashboard/orders?error=forbidden");
  }

  await sql`
    update orders
    set
      note = ${note},
      id_name = ${idName},
      booking_date = ${bookingDate},
      delivery_date = ${deliveryDate},
      customer_name = ${customerName},
      address = ${address},
      phone_number = ${phoneNumber},
      order_details = ${orderDetails},
      color = ${color},
      price = ${price},
      free_delivery = ${normalizedFreeDelivery},
      delivery_price = ${normalizedDeliveryPrice},
      free_parking = ${freeParking},
      total = ${total},
      payment_method = ${paymentMethod},
      description = ${description},
      updated_at = now()
    where id = ${orderId}
  `;

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/orders");
  redirect(`/dashboard/orders?modal=details&order=${orderId}`);
}

export async function deleteOrderAction(formData: FormData) {
  const actor = await requireUser();
  const orderId = cleanNumber(formData.get("orderId"));

  if (!orderId) {
    redirect("/dashboard/orders?error=invalid_order");
  }

  const rows = await sql<{ csr_user_id: number }[]>`
    select csr_user_id
    from orders
    where id = ${orderId}
    limit 1
  `;

  const order = rows[0];

  if (!order || (actor.role === "employee" && order.csr_user_id !== actor.id)) {
    redirect("/dashboard/orders?error=forbidden");
  }

  await sql`delete from orders where id = ${orderId}`;

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/orders");
  redirect("/dashboard/orders");
}

export async function createFacebookIdAction(formData: FormData) {
  await requireAdmin();

  const validation = validateFacebookIdRow({
    email: cleanText(formData.get("email")),
    facebookPassword: cleanText(formData.get("facebookPassword")),
    emailPassword: cleanText(formData.get("emailPassword")),
  });

  if (!validation.valid) {
    redirect(`/dashboard/facebook-ids?modal=new-id&error=${encodeURIComponent(validation.reason)}`);
  }

  await sql`
    insert into facebook_ids (email, facebook_password, email_password)
    values (${validation.data.email}, ${validation.data.facebookPassword}, ${validation.data.emailPassword})
    on conflict (email) do nothing
  `;

  revalidatePath("/dashboard/facebook-ids");
  redirect("/dashboard/facebook-ids");
}

export async function updateFacebookIdAction(formData: FormData) {
  await requireAdmin();

  const facebookIdId = cleanNumber(formData.get("facebookIdId"));

  const validation = validateFacebookIdRow({
    email: cleanText(formData.get("email")),
    facebookPassword: cleanText(formData.get("facebookPassword")),
    emailPassword: cleanText(formData.get("emailPassword")),
  });

  if (!facebookIdId || !validation.valid) {
    redirect(
      `/dashboard/facebook-ids?modal=edit-id&facebookId=${facebookIdId}&error=${encodeURIComponent(
        !facebookIdId ? "Invalid record" : (validation as { reason: string }).reason,
      )}`,
    );
  }

  await sql`
    update facebook_ids
    set
      email = ${validation.data.email},
      facebook_password = ${validation.data.facebookPassword},
      email_password = ${validation.data.emailPassword},
      updated_at = now()
    where id = ${facebookIdId}
  `;

  revalidatePath("/dashboard/facebook-ids");
  redirect("/dashboard/facebook-ids");
}

export async function deleteFacebookIdAction(formData: FormData) {
  await requireAdmin();
  const facebookIdId = cleanNumber(formData.get("facebookIdId"));

  if (!facebookIdId) {
    redirect("/dashboard/facebook-ids?error=invalid_facebook_id");
  }

  await sql`delete from facebook_ids where id = ${facebookIdId}`;

  revalidatePath("/dashboard/facebook-ids");
  redirect("/dashboard/facebook-ids");
}

export async function assignFacebookIdAction(formData: FormData) {
  await requireAdmin();

  const facebookIdId = cleanNumber(formData.get("facebookIdId"));
  const assigneeId = cleanNumber(formData.get("assigneeId"));

  if (!facebookIdId || !assigneeId) {
    redirect("/dashboard/facebook-ids?error=invalid_assignment");
  }

  const users = await sql<{ id: number; active: boolean; role: "super_admin" | "admin" | "employee" }[]>`
    select id, active, role
    from users
    where id = ${assigneeId}
    limit 1
  `;

  const target = users[0];

  if (!target || !target.active || target.role === "super_admin") {
    redirect("/dashboard/facebook-ids?error=invalid_assignment_target");
  }

  await sql`
    update facebook_ids
    set assigned_to = ${assigneeId}, updated_at = now()
    where id = ${facebookIdId}
  `;

  revalidatePath("/dashboard/facebook-ids");
  redirect("/dashboard/facebook-ids");
}

export async function unassignFacebookIdAction(formData: FormData) {
  await requireAdmin();
  const facebookIdId = cleanNumber(formData.get("facebookIdId"));

  if (!facebookIdId) {
    redirect("/dashboard/facebook-ids?error=invalid_facebook_id");
  }

  await sql`
    update facebook_ids
    set assigned_to = null, updated_at = now()
    where id = ${facebookIdId}
  `;

  revalidatePath("/dashboard/facebook-ids");
  redirect("/dashboard/facebook-ids");
}

async function requirePageManageAccess(facebookIdId: number) {
  const actor = await requireUser();

  if (actor.role === "employee" && !actor.canManagePages) {
    redirect("/dashboard/facebook-ids?error=forbidden");
  }

  const record = await assertFacebookIdAccess(actor, facebookIdId);

  if (!record) {
    redirect("/dashboard/facebook-ids?error=forbidden");
  }

  return actor;
}

export async function addFacebookPageAction(formData: FormData) {
  const facebookIdId = cleanNumber(formData.get("facebookIdId"));
  const name = cleanText(formData.get("name"));
  const password = cleanText(formData.get("password"));

  if (!facebookIdId) {
    redirect("/dashboard/facebook-ids?error=invalid_facebook_id");
  }

  await requirePageManageAccess(facebookIdId);

  if (!name || !password) {
    redirect(`/dashboard/facebook-ids?modal=pages&facebookId=${facebookIdId}&error=invalid_page`);
  }

  await sql`
    insert into facebook_id_pages (facebook_id_id, name, password)
    values (${facebookIdId}, ${name}, ${password})
  `;

  revalidatePath("/dashboard/facebook-ids");
  redirect(`/dashboard/facebook-ids?modal=pages&facebookId=${facebookIdId}`);
}

export async function updateFacebookPageAction(formData: FormData) {
  const facebookIdId = cleanNumber(formData.get("facebookIdId"));
  const pageId = cleanNumber(formData.get("pageId"));
  const name = cleanText(formData.get("name"));
  const password = cleanText(formData.get("password"));

  if (!facebookIdId || !pageId) {
    redirect("/dashboard/facebook-ids?error=invalid_facebook_id");
  }

  await requirePageManageAccess(facebookIdId);

  if (!name || !password) {
    redirect(`/dashboard/facebook-ids?modal=pages&facebookId=${facebookIdId}&error=invalid_page`);
  }

  await sql`
    update facebook_id_pages
    set name = ${name}, password = ${password}
    where id = ${pageId} and facebook_id_id = ${facebookIdId}
  `;

  revalidatePath("/dashboard/facebook-ids");
  redirect(`/dashboard/facebook-ids?modal=pages&facebookId=${facebookIdId}`);
}

export async function deleteFacebookPageAction(formData: FormData) {
  const facebookIdId = cleanNumber(formData.get("facebookIdId"));
  const pageId = cleanNumber(formData.get("pageId"));

  if (!facebookIdId || !pageId) {
    redirect("/dashboard/facebook-ids?error=invalid_facebook_id");
  }

  await requirePageManageAccess(facebookIdId);

  await sql`
    delete from facebook_id_pages
    where id = ${pageId} and facebook_id_id = ${facebookIdId}
  `;

  revalidatePath("/dashboard/facebook-ids");
  redirect(`/dashboard/facebook-ids?modal=pages&facebookId=${facebookIdId}`);
}

const FACEBOOK_CSV_HEADERS = {
  email: "Email *",
  facebookPassword: "Facebook Password *",
  emailPassword: "Email/Gmail Password",
};

export type FacebookImportResult = {
  totalRows: number;
  successCount: number;
  duplicateCount: number;
  invalidCount: number;
  failedRows: { row: number; email: string; reason: string }[];
  duplicateRows: { row: number; email: string; reason: string }[];
};

export async function importFacebookIdsCsvAction(formData: FormData) {
  await requireAdmin();

  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    redirect("/dashboard/facebook-ids?modal=import-csv&error=missing_file");
  }

  const text = await file.text();
  const rows = parseCsv(text);

  if (rows.length === 0) {
    redirect("/dashboard/facebook-ids?modal=import-csv&error=empty_file");
  }

  const header = rows[0].map((cell) => cell.trim());
  const emailIndex = findCsvColumnIndex(header, FACEBOOK_CSV_HEADERS.email);
  const facebookPasswordIndex = findCsvColumnIndex(header, FACEBOOK_CSV_HEADERS.facebookPassword);
  const emailPasswordIndex = findCsvColumnIndex(header, FACEBOOK_CSV_HEADERS.emailPassword);

  if (emailIndex === -1 || facebookPasswordIndex === -1 || emailPasswordIndex === -1) {
    redirect("/dashboard/facebook-ids?modal=import-csv&error=invalid_headers");
  }

  const dataRows = rows.slice(1).filter((cells) => cells.some((cell) => cell.trim() !== ""));

  const existingEmailRows = await sql<{ email: string }[]>`
    select lower(email) as email from facebook_ids
  `;
  const existingEmails = new Set(existingEmailRows.map((row: { email: string }) => row.email));
  const seenInFile = new Set<string>();

  const failedRows: FacebookImportResult["failedRows"] = [];
  const duplicateRows: FacebookImportResult["duplicateRows"] = [];
  const toInsert: { email: string; facebookPassword: string | null; emailPassword: string | null }[] = [];

  dataRows.forEach((cells, index) => {
    const rowNumber = index + 2;
    const emailRaw = (cells[emailIndex] ?? "").trim();

    const validation = validateFacebookIdRow({
      email: cells[emailIndex] ?? "",
      facebookPassword: cells[facebookPasswordIndex] ?? "",
      emailPassword: cells[emailPasswordIndex] ?? "",
    });

    if (!validation.valid) {
      failedRows.push({ row: rowNumber, email: emailRaw, reason: validation.reason });
      return;
    }

    const normalizedEmail = validation.data.email.toLowerCase();

    if (existingEmails.has(normalizedEmail) || seenInFile.has(normalizedEmail)) {
      duplicateRows.push({ row: rowNumber, email: validation.data.email, reason: "Duplicate email" });
      return;
    }

    seenInFile.add(normalizedEmail);
    toInsert.push(validation.data);
  });

  if (toInsert.length > 0) {
    await sql`
      insert into facebook_ids ${sql(
        toInsert.map((item) => ({
          email: item.email,
          facebook_password: item.facebookPassword,
          email_password: item.emailPassword,
        })),
        "email",
        "facebook_password",
        "email_password",
      )}
    `;
  }

  const result: FacebookImportResult = {
    totalRows: dataRows.length,
    successCount: toInsert.length,
    duplicateCount: duplicateRows.length,
    invalidCount: failedRows.length,
    failedRows,
    duplicateRows,
  };

  const importRef = crypto.randomUUID();

  await sql`
    insert into app_settings (key, value, updated_at)
    values (${`import_result:${importRef}`}, ${JSON.stringify(result)}, now())
    on conflict (key) do update set value = excluded.value, updated_at = now()
  `;

  revalidatePath("/dashboard/facebook-ids");
  redirect(`/dashboard/facebook-ids?importResult=${importRef}`);
}
