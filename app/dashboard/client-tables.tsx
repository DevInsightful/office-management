"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import {
  deleteFinanceEntryAction,
  deleteUserAction,
  markSalaryPaidAction,
  startTaskTimerAction,
  stopTaskTimerAction,
  updateOrderStatusAction,
  updateTaskStatusAction,
} from "@/app/actions";
import { LiveTaskTimer } from "@/app/dashboard/live-task-timer";
import { InlinePendingState, PendingSubmitButton } from "@/app/pending-controls";
import { Badge, Field, MetricCard, Panel, PriorityBadge, currency, inputClass } from "@/app/ui";

type SortDirection = "asc" | "desc";

function compareString(left: string, right: string, direction: SortDirection) {
  return left.localeCompare(right) * (direction === "asc" ? 1 : -1);
}

function compareNumber(left: number, right: number, direction: SortDirection) {
  return (left - right) * (direction === "asc" ? 1 : -1);
}

function matchesSearch(search: string, ...values: Array<string | number | null | undefined>) {
  const query = search.trim().toLowerCase();

  if (!query) {
    return true;
  }

  return values.some((value) => String(value ?? "").toLowerCase().includes(query));
}

function nextDirection(currentSort: string, nextSort: string, currentDirection: SortDirection): SortDirection {
  if (currentSort !== nextSort) {
    return "asc";
  }

  return currentDirection === "asc" ? "desc" : "asc";
}

function SortButton({
  label,
  active,
  direction,
  onClick,
}: {
  label: string;
  active: boolean;
  direction: SortDirection;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 transition hover:text-slate-900 ${
        active ? "text-slate-900" : ""
      }`}
    >
      <span>{label}</span>
      <span className="text-[10px]">{active ? (direction === "asc" ? "↑" : "↓") : "↕"}</span>
    </button>
  );
}

function SearchPanel({
  title,
  subtitle,
  placeholder,
  value,
  onChange,
}: {
  title: string;
  subtitle: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Panel title={title} subtitle={subtitle}>
      <Field label="Search">
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className={inputClass}
        />
      </Field>
    </Panel>
  );
}

type FinanceEntry = {
  id: number;
  type: "income" | "expense";
  title: string;
  category: string;
  amount: number;
  entry_date: string;
  created_at: string;
  notes: string;
};

function getFinanceRange(period: string, today: string, from: string, to: string) {
  if (period === "all") {
    return { from: "", to: "" };
  }

  if (period === "custom") {
    return { from, to };
  }

  const now = new Date(`${today}T12:00:00`);
  const startOfToday = new Date(`${today}T00:00:00`);

  if (period === "day") {
    return { from: today, to: today };
  }

  if (period === "week") {
    const day = now.getDay();
    const distanceFromMonday = day === 0 ? 6 : day - 1;
    const weekStart = new Date(startOfToday);
    weekStart.setDate(startOfToday.getDate() - distanceFromMonday);
    return {
      from: weekStart.toISOString().slice(0, 10),
      to: today,
    };
  }

  if (period === "month") {
    return {
      from: `${today.slice(0, 7)}-01`,
      to: today,
    };
  }

  if (period === "year") {
    return {
      from: `${today.slice(0, 4)}-01-01`,
      to: today,
    };
  }

  return { from: "", to: "" };
}

export function FinanceLedgerClient({
  entries,
  today,
}: {
  entries: FinanceEntry[];
  today: string;
}) {
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sort, setSort] = useState<"type" | "title" | "category" | "entry_date" | "amount">("entry_date");
  const [direction, setDirection] = useState<SortDirection>("desc");

  const activeRange = useMemo(() => getFinanceRange(period, today, from, to), [from, period, to, today]);

  const filteredEntries = useMemo(() => {
    return [...entries]
      .filter((entry) => {
        const matchesQuery = matchesSearch(
          search,
          entry.type,
          entry.title,
          entry.category,
          entry.notes,
          entry.entry_date,
          entry.amount,
        );
        const matchesFrom = !activeRange.from || entry.entry_date >= activeRange.from;
        const matchesTo = !activeRange.to || entry.entry_date <= activeRange.to;

        return matchesQuery && matchesFrom && matchesTo;
      })
      .sort((left, right) => {
        if (sort === "amount") {
          return compareNumber(left.amount, right.amount, direction);
        }

        const leftValue =
          sort === "type"
            ? left.type
            : sort === "title"
              ? left.title
              : sort === "category"
                ? left.category
                : left.entry_date;
        const rightValue =
          sort === "type"
            ? right.type
            : sort === "title"
              ? right.title
              : sort === "category"
                ? right.category
                : right.entry_date;

        return compareString(leftValue, rightValue, direction);
      });
  }, [activeRange.from, activeRange.to, direction, entries, search, sort]);

  const totals = useMemo(
    () =>
      filteredEntries.reduce(
        (acc, entry) => {
          if (entry.type === "income") {
            acc.income += entry.amount;
          } else {
            acc.expense += entry.amount;
          }

          return acc;
        },
        { income: 0, expense: 0 },
      ),
    [filteredEntries],
  );

  function toggleSort(nextSort: typeof sort) {
    setDirection((currentDirection) => nextDirection(sort, nextSort, currentDirection));
    setSort(nextSort);
  }

  function handlePeriodChange(nextPeriod: string) {
    setPeriod(nextPeriod);

    if (nextPeriod === "all") {
      setFrom("");
      setTo("");
      return;
    }

    if (nextPeriod === "custom") {
      return;
    }

    const nextRange = getFinanceRange(nextPeriod, today, from, to);
    setFrom(nextRange.from);
    setTo(nextRange.to);
  }

  return (
    <section className="grid gap-4">
      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Total Income" value={currency(totals.income)} tone="emerald" />
        <MetricCard label="Total Expense" value={currency(totals.expense)} tone="rose" />
        <MetricCard label="Net Position" value={currency(totals.income - totals.expense)} tone="amber" />
      </section>

      <Panel title="Filters" subtitle="Frontend search and asc/desc column sorting.">
        <div className="grid gap-3 lg:grid-cols-[1fr_180px_180px_180px]">
          <Field label="Search">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search title, category, notes, or type"
              className={inputClass}
            />
          </Field>
          <Field label="Period">
            <select value={period} onChange={(event) => handlePeriodChange(event.target.value)} className={inputClass}>
              <option value="all">All</option>
              <option value="day">Day</option>
              <option value="week">Week</option>
              <option value="month">Month</option>
              <option value="year">Year</option>
              <option value="custom">Custom period</option>
            </select>
          </Field>
          <Field label="From">
            <input
              type="date"
              value={period === "custom" ? from : activeRange.from}
              onChange={(event) => setFrom(event.target.value)}
              max={today}
              disabled={period !== "custom"}
              className={inputClass}
            />
          </Field>
          <Field label="To">
            <input
              type="date"
              value={period === "custom" ? to : activeRange.to}
              onChange={(event) => setTo(event.target.value)}
              max={today}
              disabled={period !== "custom"}
              className={inputClass}
            />
          </Field>
        </div>
      </Panel>

      <Panel title="All Finance Entries" subtitle="Latest office income and expenses.">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-slate-500">
              <tr>
                <th className="pb-3 pr-4 font-medium"><SortButton label="Type" active={sort === "type"} direction={direction} onClick={() => toggleSort("type")} /></th>
                <th className="pb-3 pr-4 font-medium"><SortButton label="Title" active={sort === "title"} direction={direction} onClick={() => toggleSort("title")} /></th>
                <th className="pb-3 pr-4 font-medium"><SortButton label="Category" active={sort === "category"} direction={direction} onClick={() => toggleSort("category")} /></th>
                <th className="pb-3 pr-4 font-medium"><SortButton label="Date" active={sort === "entry_date"} direction={direction} onClick={() => toggleSort("entry_date")} /></th>
                <th className="pb-3 pr-4 font-medium">Created</th>
                <th className="pb-3 pr-4 font-medium"><SortButton label="Amount" active={sort === "amount"} direction={direction} onClick={() => toggleSort("amount")} /></th>
                <th className="pb-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEntries.length > 0 ? (
                filteredEntries.map((entry) => (
                  <tr key={entry.id}>
                    <td className="py-3 pr-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] ${
                          entry.type === "income" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                        }`}
                      >
                        {entry.type}
                      </span>
                    </td>
                    <td className="py-3 pr-4">{entry.title}</td>
                    <td className="py-3 pr-4 text-slate-600">{entry.category}</td>
                    <td className="py-3 pr-4 text-slate-600">{entry.entry_date}</td>
                    <td className="py-3 pr-4 text-slate-600">{new Date(entry.created_at).toLocaleString()}</td>
                    <td className="py-3 pr-4 font-semibold">{currency(entry.amount)}</td>
                    <td className="py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/dashboard/finance?modal=edit-entry&entry=${entry.id}`}
                          className="inline-flex rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-900 transition hover:bg-slate-50"
                        >
                          Edit
                        </Link>
                        <form action={deleteFinanceEntryAction}>
                          <input type="hidden" name="entryId" value={entry.id} />
                          <PendingSubmitButton
                            idleLabel="Delete"
                            pendingLabel="Deleting..."
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-50"
                            pendingClassName="cursor-not-allowed bg-rose-50 text-rose-400 hover:bg-rose-50"
                          />
                        </form>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No finance entries match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </section>
  );
}

type EmployeeRow = {
  id: number;
  fullName: string;
  email: string;
  role: "super_admin" | "admin" | "employee";
  joinedOn: string;
  salary: number;
  active: boolean;
  createdAt: string;
};

export function EmployeesDirectoryClient({
  employees,
  canManageAdmins,
}: {
  employees: EmployeeRow[];
  canManageAdmins: boolean;
}) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"fullName" | "email" | "role" | "joinedOn" | "salary">("fullName");
  const [direction, setDirection] = useState<SortDirection>("asc");

  const filteredEmployees = useMemo(() => {
    return [...employees]
      .filter((employee) =>
        matchesSearch(search, employee.fullName, employee.email, employee.role, employee.joinedOn, employee.salary),
      )
      .sort((left, right) => {
        if (sort === "salary") {
          return compareNumber(left.salary, right.salary, direction);
        }

        const leftValue =
          sort === "email" ? left.email : sort === "role" ? left.role : sort === "joinedOn" ? left.joinedOn : left.fullName;
        const rightValue =
          sort === "email" ? right.email : sort === "role" ? right.role : sort === "joinedOn" ? right.joinedOn : right.fullName;

        return compareString(leftValue, rightValue, direction);
      });
  }, [direction, employees, search, sort]);

  function toggleSort(nextSort: typeof sort) {
    setDirection((currentDirection) => nextDirection(sort, nextSort, currentDirection));
    setSort(nextSort);
  }

  return (
    <section className="grid gap-4">
      <SearchPanel
        title="Search Directory"
        subtitle="Search instantly and toggle each column between ascending and descending."
        placeholder="Search name, email, role, join date, or salary"
        value={search}
        onChange={setSearch}
      />
      <Panel title="All Team Members" subtitle="Roles, join dates, and fixed monthly salaries.">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-slate-500">
              <tr>
                <th className="pb-3 pr-4 font-medium"><SortButton label="Name" active={sort === "fullName"} direction={direction} onClick={() => toggleSort("fullName")} /></th>
                <th className="pb-3 pr-4 font-medium"><SortButton label="Email" active={sort === "email"} direction={direction} onClick={() => toggleSort("email")} /></th>
                <th className="pb-3 pr-4 font-medium"><SortButton label="Role" active={sort === "role"} direction={direction} onClick={() => toggleSort("role")} /></th>
                <th className="pb-3 pr-4 font-medium"><SortButton label="Joined" active={sort === "joinedOn"} direction={direction} onClick={() => toggleSort("joinedOn")} /></th>
                <th className="pb-3 pr-4 font-medium"><SortButton label="Salary" active={sort === "salary"} direction={direction} onClick={() => toggleSort("salary")} /></th>
                <th className="pb-3 pr-4 font-medium">Created</th>
                <th className="pb-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEmployees.map((employee) => (
                <tr key={employee.id}>
                  <td className="py-3 pr-4 font-medium text-slate-900">{employee.fullName}</td>
                  <td className="py-3 pr-4 text-slate-600">{employee.email}</td>
                  <td className="py-3 pr-4 text-slate-600">{employee.role.replace("_", " ")}</td>
                  <td className="py-3 pr-4 text-slate-600">{employee.joinedOn}</td>
                  <td className="py-3 pr-4 font-semibold">{currency(employee.salary)}</td>
                  <td className="py-3 pr-4 text-slate-600">{new Date(employee.createdAt).toLocaleDateString()}</td>
                  <td className="py-3">
                    {employee.role === "super_admin" || (!canManageAdmins && employee.role === "admin") ? (
                      <span className="text-sm text-slate-400">-</span>
                    ) : (
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/dashboard/employees?modal=edit-user&user=${employee.id}`}
                          className="inline-flex rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-900 transition hover:bg-slate-50"
                        >
                          Edit
                        </Link>
                        <form action={deleteUserAction}>
                          <input type="hidden" name="userId" value={employee.id} />
                          <PendingSubmitButton
                            idleLabel="Delete"
                            pendingLabel="Deleting..."
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-50"
                            pendingClassName="cursor-not-allowed bg-rose-50 text-rose-400 hover:bg-rose-50"
                          />
                        </form>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </section>
  );
}

type OrderRow = {
  id: number;
  csrName: string;
  idName: string;
  customerName: string;
  orderDetails: string;
  bookingDate: string;
  deliveryDate: string;
  total: number;
  status: string;
  imageUrl: string;
  createdAt: string;
};

export function OrdersTableClient({
  orders,
  canManageStatus,
}: {
  orders: OrderRow[];
  canManageStatus: boolean;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"csrName" | "idName" | "customerName" | "bookingDate" | "deliveryDate" | "total" | "status">("bookingDate");
  const [direction, setDirection] = useState<SortDirection>("desc");

  const filteredOrders = useMemo(() => {
    return [...orders]
      .filter((order) =>
        matchesSearch(
          search,
          order.csrName,
          order.idName,
          order.customerName,
          order.bookingDate,
          order.deliveryDate,
          order.total,
          order.status,
        ),
      )
      .sort((left, right) => {
        if (sort === "total") {
          return compareNumber(left.total, right.total, direction);
        }

        const leftValue =
          sort === "csrName"
            ? left.csrName
            : sort === "idName"
              ? left.idName
              : sort === "customerName"
                ? left.customerName
                : sort === "bookingDate"
                  ? left.bookingDate
                  : sort === "deliveryDate"
                    ? left.deliveryDate
                    : left.status;
        const rightValue =
          sort === "csrName"
            ? right.csrName
            : sort === "idName"
              ? right.idName
              : sort === "customerName"
                ? right.customerName
                : sort === "bookingDate"
                  ? right.bookingDate
                  : sort === "deliveryDate"
                    ? right.deliveryDate
                    : right.status;

        return compareString(leftValue, rightValue, direction);
      });
  }, [direction, orders, search, sort]);

  function toggleSort(nextSort: typeof sort) {
    setDirection((currentDirection) => nextDirection(sort, nextSort, currentDirection));
    setSort(nextSort);
  }

  return (
    <section className="grid gap-4">
      <SearchPanel
        title="Search Orders"
        subtitle="Frontend search plus asc/desc sort on every main order column."
        placeholder="Search CSR, customer, ID name, dates, total, or status"
        value={search}
        onChange={setSearch}
      />
      <Panel title="All Orders" subtitle="Order list with row click details and instant status updates for managers.">
        <div className="max-w-full overflow-x-auto">
          <table className="min-w-[980px] table-fixed text-sm">
            <thead className="text-left text-slate-500">
              <tr>
                <th className="w-[14%] pb-3 pr-3 font-medium"><SortButton label="CSR" active={sort === "csrName"} direction={direction} onClick={() => toggleSort("csrName")} /></th>
                <th className="w-[12%] pb-3 pr-3 font-medium"><SortButton label="ID Name" active={sort === "idName"} direction={direction} onClick={() => toggleSort("idName")} /></th>
                <th className="w-[20%] pb-3 pr-3 font-medium"><SortButton label="Customer" active={sort === "customerName"} direction={direction} onClick={() => toggleSort("customerName")} /></th>
                <th className="w-[12%] pb-3 pr-3 font-medium"><SortButton label="Booking" active={sort === "bookingDate"} direction={direction} onClick={() => toggleSort("bookingDate")} /></th>
                <th className="w-[12%] pb-3 pr-3 font-medium"><SortButton label="Delivery" active={sort === "deliveryDate"} direction={direction} onClick={() => toggleSort("deliveryDate")} /></th>
                <th className="w-[10%] pb-3 pr-3 font-medium"><SortButton label="Total" active={sort === "total"} direction={direction} onClick={() => toggleSort("total")} /></th>
                <th className="w-[12%] pb-3 pr-3 font-medium"><SortButton label="Status" active={sort === "status"} direction={direction} onClick={() => toggleSort("status")} /></th>
                <th className="w-[10%] pb-3 pr-3 font-medium">Created</th>
                <th className="w-[8%] pb-3 pr-3 font-medium">Image</th>
                <th className="w-[10%] pb-3 font-medium">Edit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.map((order) => (
                <tr
                  key={order.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => router.push(`/dashboard/orders?modal=details&order=${order.id}`)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      router.push(`/dashboard/orders?modal=details&order=${order.id}`);
                    }
                  }}
                  className="cursor-pointer transition hover:bg-slate-50/80 focus:outline-none focus:ring-2 focus:ring-amber-300"
                >
                  <td className="py-3 pr-3 font-medium text-slate-900">{order.csrName}</td>
                  <td className="py-3 pr-3 text-slate-600">{order.idName}</td>
                  <td className="py-3 pr-3 text-slate-600">
                    <div>
                      <p className="break-words font-medium text-slate-900">{order.customerName}</p>
                      <p className="mt-1 line-clamp-2 break-words text-xs text-slate-500">{order.orderDetails}</p>
                    </div>
                  </td>
                  <td className="py-3 pr-3 text-slate-600">{order.bookingDate}</td>
                  <td className="py-3 pr-3 text-slate-600">{order.deliveryDate}</td>
                  <td className="py-3 pr-3 font-semibold">{currency(order.total)}</td>
                  <td className="py-3 pr-3">
                    {canManageStatus ? (
                      <form
                        action={updateOrderStatusAction}
                        className="inline-flex items-center gap-2"
                        onClick={(event) => event.stopPropagation()}
                        onKeyDown={(event) => event.stopPropagation()}
                      >
                        <input type="hidden" name="orderId" value={order.id} />
                        <select
                          name="status"
                          defaultValue={order.status}
                          aria-label={`Update status for order ${order.id}`}
                          onChange={(event) => event.currentTarget.form?.requestSubmit()}
                          className="min-w-[150px] rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-slate-900 outline-none transition hover:border-slate-300 focus:border-amber-400"
                        >
                          <option value="pending">Pending</option>
                          <option value="approved">Approved</option>
                          <option value="rejected">Rejected</option>
                          <option value="cancelled">Cancelled</option>
                          <option value="delivered">Delivered</option>
                        </select>
                        <InlinePendingState pendingLabel="Saving..." />
                      </form>
                    ) : (
                      <Badge>{order.status}</Badge>
                    )}
                  </td>
                  <td className="py-3 pr-3 text-slate-600">{new Date(order.createdAt).toLocaleDateString()}</td>
                  <td className="py-3 pr-3">
                    <Link
                      href={order.imageUrl}
                      target="_blank"
                      onClick={(event) => event.stopPropagation()}
                      className="inline-flex rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-900 transition hover:bg-slate-50"
                    >
                      View
                    </Link>
                  </td>
                  <td className="py-3" onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
                    <Link
                      href={`/dashboard/orders?modal=edit-order&order=${order.id}`}
                      className="inline-flex rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-900 transition hover:bg-slate-50"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </section>
  );
}

type PayrollRow = {
  id: number;
  full_name: string;
  email: string;
  role: string;
  joined_on: string;
  cycle_month: string | null;
  due_date: string | null;
  amount: number | null;
  salary: number;
  status: "due" | "paid" | null;
  monthComplete: string;
};

export function PayrollTableClient({
  payroll,
  canManage,
}: {
  payroll: PayrollRow[];
  canManage: boolean;
}) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"full_name" | "joined_on" | "cycle_month" | "due_date" | "amount" | "status">("full_name");
  const [direction, setDirection] = useState<SortDirection>("asc");

  const filteredPayroll = useMemo(() => {
    return [...payroll]
      .filter((record) =>
        matchesSearch(
          search,
          record.full_name,
          record.email,
          record.role,
          record.joined_on,
          record.cycle_month,
          record.due_date,
          record.amount ?? record.salary,
          record.status,
        ),
      )
      .sort((left, right) => {
        if (sort === "amount") {
          return compareNumber(left.amount ?? left.salary, right.amount ?? right.salary, direction);
        }

        const leftValue =
          sort === "joined_on"
            ? left.joined_on
            : sort === "cycle_month"
              ? left.cycle_month ?? ""
              : sort === "due_date"
                ? left.due_date ?? ""
                : sort === "status"
                  ? left.status ?? ""
                  : left.full_name;
        const rightValue =
          sort === "joined_on"
            ? right.joined_on
            : sort === "cycle_month"
              ? right.cycle_month ?? ""
              : sort === "due_date"
                ? right.due_date ?? ""
                : sort === "status"
                  ? right.status ?? ""
                  : right.full_name;

        return compareString(leftValue, rightValue, direction);
      });
  }, [direction, payroll, search, sort]);

  function toggleSort(nextSort: typeof sort) {
    setDirection((currentDirection) => nextDirection(sort, nextSort, currentDirection));
    setSort(nextSort);
  }

  return (
    <section className="grid gap-4">
      <SearchPanel
        title="Search Payroll"
        subtitle="Search instantly and toggle payroll columns between ascending and descending."
        placeholder="Search employee, email, role, cycle, due date, status, or amount"
        value={search}
        onChange={setSearch}
      />
      <Panel title="Payroll Management" subtitle="Directory, salaries, due cycles, and payment status in one table.">
        <div className="max-w-full overflow-x-auto">
          <table className="min-w-[1220px] table-fixed text-sm">
            <thead className="text-left text-slate-500">
              <tr>
                <th className="w-[14%] pb-3 pr-3 font-medium"><SortButton label="Employee" active={sort === "full_name"} direction={direction} onClick={() => toggleSort("full_name")} /></th>
                <th className="w-[16%] pb-3 pr-3 font-medium">Email</th>
                <th className="w-[9%] pb-3 pr-3 font-medium">Role</th>
                <th className="w-[10%] pb-3 pr-3 font-medium"><SortButton label="Joined" active={sort === "joined_on"} direction={direction} onClick={() => toggleSort("joined_on")} /></th>
                <th className="w-[9%] pb-3 pr-3 font-medium"><SortButton label="Cycle" active={sort === "cycle_month"} direction={direction} onClick={() => toggleSort("cycle_month")} /></th>
                <th className="w-[10%] pb-3 pr-3 font-medium"><SortButton label="Due" active={sort === "due_date"} direction={direction} onClick={() => toggleSort("due_date")} /></th>
                <th className="w-[10%] pb-3 pr-3 font-medium">Salary</th>
                <th className="w-[10%] pb-3 pr-3 font-medium"><SortButton label="Amount" active={sort === "amount"} direction={direction} onClick={() => toggleSort("amount")} /></th>
                <th className="w-[10%] pb-3 pr-3 font-medium"><SortButton label="Status" active={sort === "status"} direction={direction} onClick={() => toggleSort("status")} /></th>
                <th className="w-[10%] pb-3 pr-3 font-medium">Month Complete</th>
                {canManage ? <th className="w-[12%] pb-3 font-medium">Action</th> : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPayroll.map((record, index) => (
                <tr key={record.id ?? `${record.full_name}-${record.cycle_month ?? index}`}>
                  <td className="py-3 pr-3 font-medium text-slate-900">{record.full_name}</td>
                  <td className="py-3 pr-3 text-slate-600">{record.email}</td>
                  <td className="py-3 pr-3 text-slate-600">{record.role.replace("_", " ")}</td>
                  <td className="py-3 pr-3 text-slate-600">{record.joined_on}</td>
                  <td className="py-3 pr-3 text-slate-600">{record.cycle_month || "Not created"}</td>
                  <td className="py-3 pr-3 text-slate-600">{record.due_date || "Pending"}</td>
                  <td className="py-3 pr-3 font-semibold">{currency(record.salary)}</td>
                  <td className="py-3 pr-3 font-semibold">{currency(record.amount ?? record.salary)}</td>
                  <td className="py-3 pr-3 text-slate-600">{record.status || "not created"}</td>
                  <td className="py-3 pr-3 text-slate-600">{record.monthComplete}</td>
                  {canManage ? (
                    <td className="py-3">
                      {record.id && record.status === "due" ? (
                        <form action={markSalaryPaidAction} className="flex items-center gap-2">
                          <input type="hidden" name="paymentId" value={record.id} />
                          <PendingSubmitButton
                            idleLabel="Mark paid"
                            pendingLabel="Saving..."
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-900 transition hover:bg-slate-50"
                            pendingClassName="cursor-not-allowed bg-slate-100 text-slate-500 hover:bg-slate-100"
                          />
                        </form>
                      ) : (
                        <span className="text-sm text-slate-400">-</span>
                      )}
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </section>
  );
}

type PerformanceRow = {
  id: number;
  fullName: string;
  attendanceCount: number;
  completedTasks: number;
  activeTasks: number;
  loggedMinutes: number;
};

export function PerformanceTableClient({ rows }: { rows: PerformanceRow[] }) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"fullName" | "attendanceCount" | "completedTasks" | "activeTasks" | "loggedMinutes">("fullName");
  const [direction, setDirection] = useState<SortDirection>("asc");

  const filteredRows = useMemo(() => {
    return [...rows]
      .filter((row) =>
        matchesSearch(search, row.fullName, row.attendanceCount, row.completedTasks, row.activeTasks, row.loggedMinutes),
      )
      .sort((left, right) => {
        if (sort === "attendanceCount" || sort === "completedTasks" || sort === "activeTasks" || sort === "loggedMinutes") {
          return compareNumber(left[sort], right[sort], direction);
        }

        return compareString(left.fullName, right.fullName, direction);
      });
  }, [direction, rows, search, sort]);

  function toggleSort(nextSort: typeof sort) {
    setDirection((currentDirection) => nextDirection(sort, nextSort, currentDirection));
    setSort(nextSort);
  }

  return (
    <section className="grid gap-4">
      <SearchPanel
        title="Search Performance"
        subtitle="Search instantly and toggle performance columns between ascending and descending."
        placeholder="Search employee, attendance, completed, active, or minutes"
        value={search}
        onChange={setSearch}
      />
      <Panel title="Team Performance" subtitle="Attendance, completed work, and logged time by employee.">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-slate-500">
              <tr>
                <th className="pb-3 pr-4 font-medium"><SortButton label="Employee" active={sort === "fullName"} direction={direction} onClick={() => toggleSort("fullName")} /></th>
                <th className="pb-3 pr-4 font-medium"><SortButton label="Attendance" active={sort === "attendanceCount"} direction={direction} onClick={() => toggleSort("attendanceCount")} /></th>
                <th className="pb-3 pr-4 font-medium"><SortButton label="Completed" active={sort === "completedTasks"} direction={direction} onClick={() => toggleSort("completedTasks")} /></th>
                <th className="pb-3 pr-4 font-medium"><SortButton label="Active" active={sort === "activeTasks"} direction={direction} onClick={() => toggleSort("activeTasks")} /></th>
                <th className="pb-3 font-medium"><SortButton label="Minutes" active={sort === "loggedMinutes"} direction={direction} onClick={() => toggleSort("loggedMinutes")} /></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRows.map((row) => (
                <tr key={row.id}>
                  <td className="py-3 pr-4 font-medium">{row.fullName}</td>
                  <td className="py-3 pr-4">{row.attendanceCount}</td>
                  <td className="py-3 pr-4">{row.completedTasks}</td>
                  <td className="py-3 pr-4">{row.activeTasks}</td>
                  <td className="py-3">{row.loggedMinutes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </section>
  );
}

type TaskRow = {
  id: number;
  title: string;
  details: string;
  priority: "low" | "medium" | "high";
  status: "pending" | "working" | "completed";
  timer_total_minutes: number;
  timer_started_at: string | null;
  employee_name: string;
};

export function TasksBoardClient({ tasks }: { tasks: TaskRow[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"title" | "employee_name" | "priority" | "status" | "timer_total_minutes">("title");
  const [direction, setDirection] = useState<SortDirection>("asc");

  const filteredTasks = useMemo(() => {
    return [...tasks]
      .filter((task) =>
        matchesSearch(search, task.title, task.employee_name, task.priority, task.status, task.details, task.timer_total_minutes),
      )
      .sort((left, right) => {
        if (sort === "timer_total_minutes") {
          return compareNumber(left.timer_total_minutes, right.timer_total_minutes, direction);
        }

        const leftValue =
          sort === "employee_name"
            ? left.employee_name
            : sort === "priority"
              ? left.priority
              : sort === "status"
                ? left.status
                : left.title;
        const rightValue =
          sort === "employee_name"
            ? right.employee_name
            : sort === "priority"
              ? right.priority
              : sort === "status"
                ? right.status
                : right.title;

        return compareString(leftValue, rightValue, direction);
      });
  }, [direction, search, sort, tasks]);

  function toggleSort(nextSort: typeof sort) {
    setDirection((currentDirection) => nextDirection(sort, nextSort, currentDirection));
    setSort(nextSort);
  }

  return (
    <section className="grid gap-4">
      <SearchPanel
        title="Search Tasks"
        subtitle="Search instantly and toggle task columns between ascending and descending."
        placeholder="Search task, employee, priority, status, notes, or minutes"
        value={search}
        onChange={setSearch}
      />
      <Panel title="Task Board" subtitle="Table view for all tasks with quick status and timer actions.">
        <div className="max-w-full overflow-x-auto">
          <table className="min-w-[840px] table-fixed text-sm">
            <thead className="text-left text-slate-500">
              <tr>
                <th className="w-[32%] pb-3 pr-3 font-medium"><SortButton label="Task" active={sort === "title"} direction={direction} onClick={() => toggleSort("title")} /></th>
                <th className="w-[18%] pb-3 pr-3 font-medium"><SortButton label="Employee" active={sort === "employee_name"} direction={direction} onClick={() => toggleSort("employee_name")} /></th>
                <th className="w-[14%] pb-3 pr-3 font-medium"><SortButton label="Priority" active={sort === "priority"} direction={direction} onClick={() => toggleSort("priority")} /></th>
                <th className="w-[18%] pb-3 pr-3 font-medium"><SortButton label="Status" active={sort === "status"} direction={direction} onClick={() => toggleSort("status")} /></th>
                <th className="w-[18%] pb-3 font-medium"><SortButton label="Time" active={sort === "timer_total_minutes"} direction={direction} onClick={() => toggleSort("timer_total_minutes")} /></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTasks.map((task) => (
                <tr
                  key={task.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => router.push(`/dashboard/tasks?modal=task-details&task=${task.id}`)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      router.push(`/dashboard/tasks?modal=task-details&task=${task.id}`);
                    }
                  }}
                  className="cursor-pointer transition hover:bg-slate-50/80 focus:outline-none focus:ring-2 focus:ring-amber-300"
                >
                  <td className="py-3 pr-3 align-top">
                    <div>
                      <p className="break-words font-medium text-slate-900">{task.title}</p>
                      <p className="mt-1 line-clamp-2 break-words text-xs text-slate-500">{task.details}</p>
                    </div>
                  </td>
                  <td className="py-3 pr-3 align-top text-slate-600">
                    <span className="break-words">{task.employee_name}</span>
                  </td>
                  <td className="py-3 pr-3 align-top">
                    <PriorityBadge priority={task.priority} />
                  </td>
                  <td className="py-3 pr-3 align-top">
                    <form
                      action={updateTaskStatusAction}
                      className="inline-flex items-center gap-2"
                      onClick={(event) => event.stopPropagation()}
                      onKeyDown={(event) => event.stopPropagation()}
                    >
                      <input type="hidden" name="taskId" value={task.id} />
                      <input type="hidden" name="description" value="" />
                      <input type="hidden" name="minutesSpent" value="0" />
                      <select
                        name="status"
                        defaultValue={task.status}
                        aria-label={`Update status for ${task.title}`}
                        onChange={(event) => event.currentTarget.form?.requestSubmit()}
                        className="min-w-[150px] rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-900 outline-none transition hover:border-slate-300 focus:border-amber-400"
                      >
                        <option value="pending">Pending</option>
                        <option value="working">Working</option>
                        <option value="completed">Completed</option>
                      </select>
                      <InlinePendingState pendingLabel="Saving..." />
                    </form>
                  </td>
                  <td className="py-3 align-top">
                    <div className="space-y-2" onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
                      <div className="flex flex-wrap items-center gap-2">
                        {task.timer_started_at ? (
                          <form action={stopTaskTimerAction}>
                            <input type="hidden" name="taskId" value={task.id} />
                            <input type="hidden" name="description" value="Timer session recorded from task table." />
                            <PendingSubmitButton
                              idleLabel="Stop"
                              pendingLabel="Stopping..."
                              className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-500"
                              pendingClassName="cursor-not-allowed bg-emerald-500 hover:bg-emerald-500"
                            />
                          </form>
                        ) : (
                          <form action={startTaskTimerAction}>
                            <input type="hidden" name="taskId" value={task.id} />
                            <PendingSubmitButton
                              idleLabel="Start"
                              pendingLabel="Starting..."
                              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-900 transition hover:bg-slate-50"
                              pendingClassName="cursor-not-allowed bg-slate-100 text-slate-500 hover:bg-slate-100"
                            />
                          </form>
                        )}
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-slate-700">{task.timer_total_minutes} min logged</p>
                          <LiveTaskTimer startedAt={task.timer_started_at} />
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </section>
  );
}
