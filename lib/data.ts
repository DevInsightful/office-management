import { SessionUser } from "@/lib/auth";
import { ensureDb, sql } from "@/lib/db";
import { seedIfEmpty } from "@/lib/seed";
import { CurrencyCode, currency } from "@/lib/currency";
import { getCurrencySetting } from "@/lib/settings";

export type DashboardData = {
  user: SessionUser;
  currency: CurrencyCode;
  metrics: {
    income: number;
    expense: number;
    net: number;
    employees: number;
    openTasks: number;
  };
  insights: {
    majorIncome: string;
    majorExpense: string;
    cutSuggestion: string;
    incomeSuggestion: string;
  };
  finance: {
    recent: {
      id: number;
      type: "income" | "expense";
      title: string;
      category: string;
      amount: number;
      entry_date: string;
      created_at: string;
      notes: string;
    }[];
    incomeByCategory: { category: string; total: number }[];
    expenseByCategory: { category: string; total: number }[];
  };
  employees: {
    id: number;
    fullName: string;
    email: string;
    role: "super_admin" | "admin" | "employee";
    joinedOn: string;
    salary: number;
    active: boolean;
    createdAt: string;
    canManagePages: boolean;
  }[];
  tasks: {
    id: number;
    title: string;
    details: string;
    priority: "low" | "medium" | "high";
    status: "pending" | "working" | "completed";
    timer_total_minutes: number;
    timer_started_at: string | null;
    created_at: string;
    completed_at: string | null;
    employee_name: string;
    assigned_by_name: string | null;
  }[];
  taskLogs: TaskLogRow[];
  attendance: AttendanceRow[];
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
  }[];
  performance: {
    id: number;
    fullName: string;
    attendanceCount: number;
    completedTasks: number;
    activeTasks: number;
    loggedMinutes: number;
  }[];
};

type FinanceSummaryRow = {
  type: "income" | "expense";
  total: string;
};

type GroupedMoneyRow = {
  category: string;
  total: string;
};

type EmployeeRow = {
  id: number;
  full_name: string;
  email: string;
  role: "super_admin" | "admin" | "employee";
  joined_on: string;
  salary: string;
  active: boolean;
  created_at: string;
  can_manage_pages: boolean;
};

type TaskRow = {
  id: number;
  title: string;
  details: string;
  priority: "low" | "medium" | "high";
  status: "pending" | "working" | "completed";
  timer_total_minutes: number;
  timer_started_at: string | null;
  created_at: string;
  completed_at: string | null;
  employee_name: string;
  assigned_by_name: string | null;
};

type TaskLogRow = {
  id: number;
  task_id: number;
  minutes_spent: number;
  description: string;
  created_at: string;
  user_name: string;
};

type AttendanceRow = {
  id: number;
  employee_id: number;
  attendance_date: string;
  check_in_at: string;
  full_name: string;
  accuracy: number | null;
  distanceFromOffice: number | null;
};

type AttendanceSqlRow = {
  id: number;
  employee_id: number;
  attendance_date: string;
  check_in_at: string;
  full_name: string;
  accuracy: string | null;
  distance_from_office: string | null;
};

type PayrollRow = {
  id: number;
  full_name: string;
  joined_on: string;
  salary: string;
  cycle_month: string | null;
  due_date: string | null;
  paid_on: string | null;
  status: "due" | "paid" | null;
  amount: string | null;
};

type PerformanceRow = {
  id: number;
  full_name: string;
  attendance_count: string;
  completed_tasks: string;
  active_tasks: string;
  logged_minutes: string;
};

export async function getDashboardData(user: SessionUser): Promise<DashboardData> {
  await ensureDb();
  await seedIfEmpty();

  const currencyCode = await getCurrencySetting();

  const [financeSummary, topIncomeCategories, topExpenseCategories, recentFinanceRows] =
    await Promise.all([
      sql<FinanceSummaryRow[]>`
        select type, coalesce(sum(amount), 0)::text as total
        from finance_entries
        group by type
      `,
      sql<GroupedMoneyRow[]>`
        select category, sum(amount)::text as total
        from finance_entries
        where type = 'income'
        group by category
        order by sum(amount) desc
        limit 5
      `,
      sql<GroupedMoneyRow[]>`
        select category, sum(amount)::text as total
        from finance_entries
        where type = 'expense'
        group by category
        order by sum(amount) desc
        limit 5
      `,
      sql<{
        id: number;
        type: "income" | "expense";
        title: string;
        category: string;
        amount: string;
        entry_date: string;
        created_at: string;
        notes: string;
      }[]>`
        select id, type, title, category, amount::text, entry_date::text, created_at::text, notes
        from finance_entries
        order by entry_date desc, id desc
      `,
    ]);

  const employeesPromise =
    user.role === "employee"
      ? sql<EmployeeRow[]>`
          select id, full_name, email, role, joined_on::text, salary::text, active, created_at::text, can_manage_pages
          from users
          where id = ${user.id}
        `
      : sql<EmployeeRow[]>`
          select id, full_name, email, role, joined_on::text, salary::text, active, created_at::text, can_manage_pages
          from users
          order by
            case role
              when 'super_admin' then 1
              when 'admin' then 2
              else 3
            end,
            full_name asc
        `;

  const tasksPromise =
    user.role === "employee"
      ? sql<TaskRow[]>`
          select
            t.id,
            t.title,
            t.details,
            t.priority,
            t.status,
            t.timer_total_minutes,
            to_char(t.timer_started_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as timer_started_at,
            t.created_at::text,
            t.completed_at::text,
            assignee.full_name as employee_name,
            assigner.full_name as assigned_by_name
          from tasks t
          join users assignee on assignee.id = t.assigned_to
          left join users assigner on assigner.id = t.assigned_by
          where t.assigned_to = ${user.id}
          order by
            case t.status
              when 'working' then 1
              when 'pending' then 2
              else 3
            end,
            t.created_at desc
        `
      : sql<TaskRow[]>`
          select
            t.id,
            t.title,
            t.details,
            t.priority,
            t.status,
            t.timer_total_minutes,
            to_char(t.timer_started_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as timer_started_at,
            t.created_at::text,
            t.completed_at::text,
            assignee.full_name as employee_name,
            assigner.full_name as assigned_by_name
          from tasks t
          join users assignee on assignee.id = t.assigned_to
          left join users assigner on assigner.id = t.assigned_by
          order by
            case t.status
              when 'working' then 1
              when 'pending' then 2
              else 3
            end,
            t.created_at desc
        `;

  const taskLogsPromise =
    user.role === "employee"
      ? sql<TaskLogRow[]>`
          select
            l.id,
            l.task_id,
            l.minutes_spent,
            l.description,
            l.created_at::text,
            u.full_name as user_name
          from task_logs l
          join users u on u.id = l.user_id
          where l.user_id = ${user.id}
          order by l.created_at desc
          limit 20
        `
      : sql<TaskLogRow[]>`
          select
            l.id,
            l.task_id,
            l.minutes_spent,
            l.description,
            l.created_at::text,
            u.full_name as user_name
          from task_logs l
          join users u on u.id = l.user_id
          order by l.created_at desc
          limit 30
        `;

  const attendancePromise =
    user.role === "employee"
      ? sql<AttendanceSqlRow[]>`
          select
            a.id,
            a.employee_id,
            a.check_in_time::date::text as attendance_date,
            to_char(a.check_in_time at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as check_in_at,
            u.full_name,
            a.accuracy::text,
            a.distance_from_office::text
          from attendance_records a
          join users u on u.id = a.employee_id
          where a.employee_id = ${user.id}
          order by a.check_in_time desc
          limit 15
        `
      : sql<AttendanceSqlRow[]>`
          select
            a.id,
            a.employee_id,
            a.check_in_time::date::text as attendance_date,
            to_char(a.check_in_time at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as check_in_at,
            u.full_name,
            a.accuracy::text,
            a.distance_from_office::text
          from attendance_records a
          join users u on u.id = a.employee_id
          order by a.check_in_time desc, a.id desc
        `;

  const payrollPromise =
    user.role === "employee"
      ? sql<PayrollRow[]>`
          select
            sp.id,
            u.full_name,
            u.joined_on::text,
            u.salary::text,
            sp.cycle_month::text,
            sp.due_date::text,
            sp.paid_on::text,
            sp.status,
            sp.amount::text
          from users u
          left join salary_payments sp on sp.user_id = u.id
          where u.id = ${user.id}
          order by sp.cycle_month desc nulls last
        `
      : sql<PayrollRow[]>`
          select
            sp.id,
            u.full_name,
            u.joined_on::text,
            u.salary::text,
            sp.cycle_month::text,
            sp.due_date::text,
            sp.paid_on::text,
            sp.status,
            sp.amount::text
          from users u
          left join salary_payments sp on sp.user_id = u.id
          where u.role = 'employee'
          order by u.full_name asc, sp.cycle_month desc nulls last
        `;

  const performancePromise =
    user.role === "employee"
      ? sql<PerformanceRow[]>`
          select
            u.id,
            u.full_name,
            count(distinct a.id)::text as attendance_count,
            count(distinct t.id) filter (where t.status = 'completed')::text as completed_tasks,
            count(distinct t.id) filter (where t.status in ('pending', 'working'))::text as active_tasks,
            coalesce(sum(l.minutes_spent), 0)::text as logged_minutes
          from users u
          left join attendance_records a on a.employee_id = u.id
          left join tasks t on t.assigned_to = u.id
          left join task_logs l on l.user_id = u.id
          where u.id = ${user.id}
          group by u.id, u.full_name
        `
      : sql<PerformanceRow[]>`
          select
            u.id,
            u.full_name,
            count(distinct a.id)::text as attendance_count,
            count(distinct t.id) filter (where t.status = 'completed')::text as completed_tasks,
            count(distinct t.id) filter (where t.status in ('pending', 'working'))::text as active_tasks,
            coalesce(sum(l.minutes_spent), 0)::text as logged_minutes
          from users u
          left join attendance_records a on a.employee_id = u.id
          left join tasks t on t.assigned_to = u.id
          left join task_logs l on l.user_id = u.id
          where u.role = 'employee'
          group by u.id, u.full_name
          order by coalesce(sum(l.minutes_spent), 0) desc
        `;

  const [employees, tasks, taskLogs, attendance, payroll, performance] = await Promise.all([
    employeesPromise,
    tasksPromise,
    taskLogsPromise,
    attendancePromise,
    payrollPromise,
    performancePromise,
  ]);

  const financeTotals = financeSummary.reduce(
    (acc: Record<"income" | "expense", number>, item: FinanceSummaryRow) => {
      acc[item.type] = Number(item.total);
      return acc;
    },
    { income: 0, expense: 0 } as Record<"income" | "expense", number>,
  );

  const net = financeTotals.income - financeTotals.expense;
  const majorIncome = topIncomeCategories[0];
  const majorExpense = topExpenseCategories[0];

  return {
    user,
    currency: currencyCode,
    metrics: {
      income: financeTotals.income,
      expense: financeTotals.expense,
      net,
      employees: employees.filter((employee: EmployeeRow) => employee.role === "employee").length,
      openTasks: tasks.filter((task: TaskRow) => task.status !== "completed").length,
    },
    insights: {
      majorIncome: majorIncome
        ? `${majorIncome.category} is the strongest income stream at ${currency(Number(majorIncome.total), currencyCode)}.`
        : "No income recorded yet.",
      majorExpense: majorExpense
        ? `${majorExpense.category} is the highest expense bucket at ${currency(Number(majorExpense.total), currencyCode)}.`
        : "No expenses recorded yet.",
      cutSuggestion: majorExpense
        ? `Review ${majorExpense.category}. It is the biggest cost center and should be audited first for possible cuts.`
        : "Add some expense records to generate cost-cutting suggestions.",
      incomeSuggestion: majorIncome
        ? `Protect and grow ${majorIncome.category}. It currently contributes the most income and deserves closer follow-up.`
        : "Add income records to see which revenue stream needs the most attention.",
    },
    finance: {
      recent: recentFinanceRows.map((row: {
        id: number;
        type: "income" | "expense";
        title: string;
        category: string;
        amount: string;
        entry_date: string;
        created_at: string;
        notes: string;
      }) => ({
        ...row,
        amount: Number(row.amount),
      })),
      incomeByCategory: topIncomeCategories.map((row: GroupedMoneyRow) => ({
        category: row.category,
        total: Number(row.total),
      })),
      expenseByCategory: topExpenseCategories.map((row: GroupedMoneyRow) => ({
        category: row.category,
        total: Number(row.total),
      })),
    },
    employees: employees.map((employee: EmployeeRow) => ({
      id: employee.id,
      fullName: employee.full_name,
      email: employee.email,
      role: employee.role,
      joinedOn: employee.joined_on,
      salary: Number(employee.salary),
      active: employee.active,
      createdAt: employee.created_at,
      canManagePages: employee.can_manage_pages,
    })),
    tasks: tasks.map((task: TaskRow) => ({
      ...task,
      completed_at: task.completed_at,
      created_at: task.created_at,
      timer_started_at: task.timer_started_at,
    })),
    taskLogs,
    attendance: attendance.map((row: AttendanceSqlRow) => ({
      ...row,
      accuracy: row.accuracy ? Number(row.accuracy) : null,
      distanceFromOffice: row.distance_from_office ? Number(row.distance_from_office) : null,
    })),
    payroll: payroll.map((row: PayrollRow) => ({
      ...row,
      salary: Number(row.salary),
      amount: row.amount ? Number(row.amount) : null,
    })),
    performance: performance.map((row: PerformanceRow) => ({
      id: row.id,
      fullName: row.full_name,
      attendanceCount: Number(row.attendance_count),
      completedTasks: Number(row.completed_tasks),
      activeTasks: Number(row.active_tasks),
      loggedMinutes: Number(row.logged_minutes),
    })),
  };
}
