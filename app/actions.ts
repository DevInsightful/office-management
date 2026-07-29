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
import { getSupabaseBucket, getSupabaseClient } from "@/lib/supabase";

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
        salary = ${salary}
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
        salary = ${salary}
      where id = ${userId}
    `;
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/employees");
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
