"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import {
  assignFacebookIdAction,
  deleteFacebookIdAction,
  deleteFinanceEntryAction,
  deleteUserAction,
  markSalaryPaidAction,
  startTaskTimerAction,
  stopTaskTimerAction,
  unassignFacebookIdAction,
  updateOrderStatusAction,
  updateTaskStatusAction,
} from "@/app/actions";
import { LiveTaskTimer } from "@/app/dashboard/live-task-timer";
import { InlinePendingState, PendingSubmitButton } from "@/app/pending-controls";
import { Badge, Field, MetricCard, Panel, PriorityBadge, currency, inputClass, primaryButton } from "@/app/ui";
import { findCsvColumnIndex, parseCsv } from "@/lib/csv";
import { validateFacebookIdRow } from "@/lib/facebook-id-validation";

type SortDirection = "asc" | "desc";

function formatDateTime(value: string | Date) {
  return new Date(value).toLocaleString("en-GB", { timeZone: "Asia/Karachi" });
}

function formatDate(value: string | Date) {
  return new Date(value).toLocaleDateString("en-GB", { timeZone: "Asia/Karachi" });
}

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

function formatLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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
  currencyCode,
}: {
  entries: FinanceEntry[];
  today: string;
  currencyCode: string;
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
        <MetricCard label="Total Income" value={currency(totals.income, currencyCode)} tone="emerald" />
        <MetricCard label="Total Expense" value={currency(totals.expense, currencyCode)} tone="rose" />
        <MetricCard label="Net Position" value={currency(totals.income - totals.expense, currencyCode)} tone="amber" />
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
                    <td className="py-3 pr-4 text-slate-600">{formatDateTime(entry.created_at)}</td>
                    <td className="py-3 pr-4 font-semibold">{currency(entry.amount, currencyCode)}</td>
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
  currencyCode,
}: {
  employees: EmployeeRow[];
  canManageAdmins: boolean;
  currencyCode: string;
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
                  <td className="py-3 pr-4 font-semibold">{currency(employee.salary, currencyCode)}</td>
                  <td className="py-3 pr-4 text-slate-600">{formatDate(employee.createdAt)}</td>
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
  currencyCode,
}: {
  orders: OrderRow[];
  canManageStatus: boolean;
  currencyCode: string;
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
                  <td className="py-3 pr-3 font-semibold">{currency(order.total, currencyCode)}</td>
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
                          key={order.status}
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
                  <td className="py-3 pr-3 text-slate-600">{formatDate(order.createdAt)}</td>
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
  currencyCode,
}: {
  payroll: PayrollRow[];
  canManage: boolean;
  currencyCode: string;
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
                  <td className="py-3 pr-3 font-semibold">{currency(record.salary, currencyCode)}</td>
                  <td className="py-3 pr-3 font-semibold">{currency(record.amount ?? record.salary, currencyCode)}</td>
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

type AttendanceReportEmployee = {
  id: number;
  fullName: string;
  joinedOn: string;
  role: "super_admin" | "admin" | "employee";
};

type AttendanceReportEntry = {
  id: number;
  employee_id: number;
  attendance_date: string;
  check_in_at: string;
  full_name: string;
  accuracy: number | null;
  distanceFromOffice: number | null;
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

function buildAttendanceRange(period: string, today: string, earliestJoinedOn: string) {
  if (period === "today") {
    return { from: today, to: today };
  }

  const startOfToday = new Date(`${today}T00:00:00`);

  if (period === "week") {
    const day = startOfToday.getDay();
    const distanceFromMonday = day === 0 ? 6 : day - 1;
    const weekStart = new Date(startOfToday);
    weekStart.setDate(startOfToday.getDate() - distanceFromMonday);
    return { from: formatLocalDate(weekStart), to: today };
  }

  if (period === "month") {
    return { from: `${today.slice(0, 7)}-01`, to: today };
  }

  if (period === "year") {
    return { from: `${today.slice(0, 4)}-01-01`, to: today };
  }

  return { from: earliestJoinedOn, to: today };
}

function clampDate(date: string, min: string, max: string) {
  if (!date) {
    return "";
  }

  if (date < min) {
    return min;
  }

  if (date > max) {
    return max;
  }

  return date;
}

function listDays(from: string, to: string) {
  const days: string[] = [];
  const cursor = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);

  while (cursor <= end) {
    days.push(formatLocalDate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return days;
}

export function AttendanceReportClient({
  employees,
  attendance,
  today,
  defaultEmployeeId,
  allowOfficeFilters = true,
}: {
  employees: AttendanceReportEmployee[];
  attendance: AttendanceReportEntry[];
  today: string;
  defaultEmployeeId?: number;
  allowOfficeFilters?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState<"today" | "week" | "month" | "year" | "specific" | "custom" | "all">("today");
  const [employeeId, setEmployeeId] = useState(defaultEmployeeId ? String(defaultEmployeeId) : "all");
  const [specificDate, setSpecificDate] = useState(today);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sort, setSort] = useState<"full_name" | "attendance_date" | "status">("attendance_date");
  const [direction, setDirection] = useState<SortDirection>("desc");

  const employeeOptions = useMemo(
    () =>
      employees
        .filter((employee) => employee.role !== "super_admin")
        .sort((left, right) => left.fullName.localeCompare(right.fullName)),
    [employees],
  );

  const earliestJoinedOn = employeeOptions.reduce((earliest, employee) => {
    if (!earliest || employee.joinedOn < earliest) {
      return employee.joinedOn;
    }

    return earliest;
  }, employeeOptions[0]?.joinedOn ?? today);

  const activeRange = useMemo(() => {
    if (period === "specific") {
      const safeDate = clampDate(specificDate || today, earliestJoinedOn, today);
      return { from: safeDate, to: safeDate };
    }

    if (period === "custom") {
      const normalizedFrom = clampDate(from || earliestJoinedOn, earliestJoinedOn, today);
      const normalizedTo = clampDate(to || today, earliestJoinedOn, today);

      return normalizedFrom <= normalizedTo
        ? { from: normalizedFrom, to: normalizedTo }
        : { from: normalizedTo, to: normalizedFrom };
    }

    return buildAttendanceRange(period, today, earliestJoinedOn);
  }, [earliestJoinedOn, from, period, specificDate, to, today]);

  const filteredEmployees = useMemo(() => {
    if (!allowOfficeFilters && defaultEmployeeId) {
      return employeeOptions.filter((employee) => employee.id === defaultEmployeeId);
    }

    if (employeeId === "all") {
      return employeeOptions;
    }

    return employeeOptions.filter((employee) => String(employee.id) === employeeId);
  }, [allowOfficeFilters, defaultEmployeeId, employeeId, employeeOptions]);

  const attendanceRows = useMemo(() => {
    const selectedEmployeeIds = new Set(filteredEmployees.map((employee) => employee.id));
    const attendanceByEmployeeAndDate = new Map<string, AttendanceReportEntry>();

    for (const entry of attendance) {
      if (!selectedEmployeeIds.has(entry.employee_id)) {
        continue;
      }

      if (entry.attendance_date < activeRange.from || entry.attendance_date > activeRange.to) {
        continue;
      }

      attendanceByEmployeeAndDate.set(`${entry.employee_id}-${entry.attendance_date}`, entry);
    }

    const rows = filteredEmployees.flatMap((employee) => {
      const from = employee.joinedOn > activeRange.from ? employee.joinedOn : activeRange.from;
      const days = listDays(from, activeRange.to);

      return days.map((day) => {
        const match = attendanceByEmployeeAndDate.get(`${employee.id}-${day}`);
        const status = match ? "present" : "absent";

        return {
          key: `${employee.id}-${day}`,
          employeeId: employee.id,
          full_name: employee.fullName,
          attendance_date: day,
          status,
          check_in_at: match?.check_in_at ?? null,
          accuracy: match?.accuracy ?? null,
          distanceFromOffice: match?.distanceFromOffice ?? null,
        };
      });
    });

    return rows
      .filter((row) => matchesSearch(search, row.full_name, row.attendance_date, row.status))
      .sort((left, right) => {
        if (sort === "attendance_date") {
          return compareString(left.attendance_date, right.attendance_date, direction);
        }

        if (sort === "status") {
          return compareString(left.status, right.status, direction);
        }

        return compareString(left.full_name, right.full_name, direction);
      });
  }, [activeRange.from, activeRange.to, attendance, direction, filteredEmployees, search, sort]);

  const totals = useMemo(
    () =>
      attendanceRows.reduce(
        (acc, row) => {
          acc.total += 1;
          if (row.status === "present") {
            acc.present += 1;
          } else {
            acc.absent += 1;
          }
          return acc;
        },
        { total: 0, present: 0, absent: 0 },
      ),
    [attendanceRows],
  );

  function toggleSort(nextSort: typeof sort) {
    setDirection((currentDirection) => nextDirection(sort, nextSort, currentDirection));
    setSort(nextSort);
  }

  function handlePeriodChange(nextPeriod: typeof period) {
    setPeriod(nextPeriod);

    if (nextPeriod === "specific") {
      setSpecificDate(today);
      return;
    }

    if (nextPeriod === "custom") {
      setFrom(earliestJoinedOn);
      setTo(today);
    }
  }

  return (
    <section className="grid gap-4">
      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Rows In Period" value={String(totals.total)} tone="sky" />
        <MetricCard label="Present" value={String(totals.present)} tone="emerald" />
        <MetricCard label="Absent" value={String(totals.absent)} tone="rose" />
      </section>

      <Panel
        title="Attendance Filters"
        subtitle={
          allowOfficeFilters
            ? "Default view shows today for the whole office. Switch period or focus on one employee."
            : "Review your own attendance by today, week, month, year, one exact date, or a custom range."
        }
      >
        <div className={`grid gap-3 ${allowOfficeFilters ? "lg:grid-cols-[1fr_180px_220px_180px_180px]" : "lg:grid-cols-[180px_180px_180px]"}`}>
          {allowOfficeFilters ? (
            <Field label="Search">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search employee, date, or status"
                className={inputClass}
              />
            </Field>
          ) : null}
          <Field label="Period">
            <select value={period} onChange={(event) => handlePeriodChange(event.target.value as typeof period)} className={inputClass}>
              <option value="today">Today</option>
              <option value="week">Week</option>
              <option value="month">Month</option>
              <option value="year">Year</option>
              <option value="specific">Specific date</option>
              <option value="custom">Custom period</option>
              <option value="all">All</option>
            </select>
          </Field>
          {allowOfficeFilters ? (
            <Field label="Employee">
              <select value={employeeId} onChange={(event) => setEmployeeId(event.target.value)} className={inputClass}>
                <option value="all">All employees</option>
                {employeeOptions.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.fullName}
                  </option>
                ))}
              </select>
            </Field>
          ) : null}
          <Field label={period === "specific" ? "Date" : "From"}>
            <input
              type="date"
              value={period === "specific" ? specificDate : period === "custom" ? from : activeRange.from}
              onChange={(event) => {
                if (period === "specific") {
                  setSpecificDate(event.target.value);
                  return;
                }

                setFrom(event.target.value);
              }}
              min={earliestJoinedOn}
              max={today}
              disabled={period !== "specific" && period !== "custom"}
              className={inputClass}
            />
          </Field>
          <Field label="To">
            <input
              type="date"
              value={period === "custom" ? to : activeRange.to}
              onChange={(event) => setTo(event.target.value)}
              min={earliestJoinedOn}
              max={today}
              disabled={period !== "custom"}
              className={inputClass}
            />
          </Field>
        </div>
      </Panel>

      <Panel
        title="Attendance Report"
        subtitle={`Showing ${activeRange.from} to ${activeRange.to}. Employees without a check-in in this range are marked absent.`}
      >
        <div className="max-w-full overflow-x-auto">
          <table className="min-w-[900px] table-fixed text-sm">
            <thead className="text-left text-slate-500">
              <tr>
                <th className="w-[22%] pb-3 pr-3 font-medium"><SortButton label="Employee" active={sort === "full_name"} direction={direction} onClick={() => toggleSort("full_name")} /></th>
                <th className="w-[16%] pb-3 pr-3 font-medium"><SortButton label="Date" active={sort === "attendance_date"} direction={direction} onClick={() => toggleSort("attendance_date")} /></th>
                <th className="w-[14%] pb-3 pr-3 font-medium"><SortButton label="Status" active={sort === "status"} direction={direction} onClick={() => toggleSort("status")} /></th>
                <th className="w-[20%] pb-3 pr-3 font-medium">Check In</th>
                <th className="w-[14%] pb-3 pr-3 font-medium">Distance</th>
                <th className="w-[14%] pb-3 font-medium">Accuracy</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {attendanceRows.length > 0 ? (
                attendanceRows.map((row) => (
                  <tr key={row.key}>
                    <td className="py-3 pr-3 font-medium text-slate-900">{row.full_name}</td>
                    <td className="py-3 pr-3 text-slate-600">{row.attendance_date}</td>
                    <td className="py-3 pr-3">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] ${
                          row.status === "present" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="py-3 pr-3 text-slate-600">
                      {row.check_in_at ? formatDateTime(row.check_in_at) : "-"}
                    </td>
                    <td className="py-3 pr-3 text-slate-600">
                      {row.distanceFromOffice !== null ? `${row.distanceFromOffice.toFixed(1)} m` : "-"}
                    </td>
                    <td className="py-3 text-slate-600">
                      {row.accuracy !== null ? `${row.accuracy.toFixed(1)} m` : "-"}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No attendance rows match the current filters.
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

export function AttendanceCalendarClient({
  employees,
  attendance,
  today,
  defaultEmployeeId,
  allowEmployeeSelect = true,
}: {
  employees: AttendanceReportEmployee[];
  attendance: AttendanceReportEntry[];
  today: string;
  defaultEmployeeId: number;
  allowEmployeeSelect?: boolean;
}) {
  const [employeeId, setEmployeeId] = useState(String(defaultEmployeeId));

  const employeeOptions = useMemo(
    () =>
      employees
        .filter((employee) => employee.role !== "super_admin")
        .sort((left, right) => left.fullName.localeCompare(right.fullName)),
    [employees],
  );

  const selectedEmployee =
    employeeOptions.find((employee) => String(employee.id) === employeeId) ?? employeeOptions[0] ?? null;

  const monthStart = `${today.slice(0, 7)}-01`;
  const monthEndDate = new Date(`${monthStart}T00:00:00`);
  monthEndDate.setMonth(monthEndDate.getMonth() + 1);
  monthEndDate.setDate(0);
  const monthEnd = formatLocalDate(monthEndDate);

  const effectiveEmployee =
    allowEmployeeSelect
      ? selectedEmployee
      : employeeOptions.find((employee) => employee.id === defaultEmployeeId) ?? selectedEmployee;

  const attendanceDates = useMemo(() => {
    const dates = new Set<string>();

    for (const entry of attendance) {
      if (!effectiveEmployee || entry.employee_id !== effectiveEmployee.id) {
        continue;
      }

      if (entry.attendance_date >= monthStart && entry.attendance_date <= monthEnd) {
        dates.add(entry.attendance_date);
      }
    }

    return dates;
  }, [attendance, effectiveEmployee, monthEnd, monthStart]);

  const visibleDays = useMemo(() => {
    if (!effectiveEmployee) {
      return [];
    }

    const effectiveStart = effectiveEmployee.joinedOn > monthStart ? effectiveEmployee.joinedOn : monthStart;
    return listDays(effectiveStart, monthEnd).map((date) => ({
      date,
      status: attendanceDates.has(date) ? "present" : "absent",
      isToday: date === today,
    }));
  }, [attendanceDates, effectiveEmployee, monthEnd, monthStart, today]);

  return (
    <section className="grid gap-4">
      <Panel title="Attendance Calendar" subtitle="Current month calendar for one staff member. Present days turn green; missing days stay absent.">
        <div className={`grid gap-3 ${allowEmployeeSelect ? "lg:grid-cols-[260px_1fr]" : "lg:grid-cols-1"}`}>
          {allowEmployeeSelect ? (
            <Field label="Employee">
              <select value={employeeId} onChange={(event) => setEmployeeId(event.target.value)} className={inputClass}>
                {employeeOptions.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.fullName}
                  </option>
                ))}
              </select>
            </Field>
          ) : null}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {visibleDays.map((day) => (
              <div
                key={day.date}
                className={`rounded-2xl border p-3 text-sm ${
                  day.status === "present"
                    ? "border-emerald-200 bg-emerald-50"
                    : "border-rose-200 bg-rose-50"
                } ${day.isToday ? "ring-2 ring-amber-300" : ""}`}
              >
                <p className="font-semibold text-slate-900">{day.date.slice(8, 10)}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-600">{day.status}</p>
              </div>
            ))}
          </div>
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
  const [statusOverrides, setStatusOverrides] = useState<Record<number, TaskRow["status"]>>({});
  const [pendingStatusTaskIds, setPendingStatusTaskIds] = useState<number[]>([]);
  const [, startTransition] = useTransition();

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

  function updateTaskStatus(taskId: number, status: TaskRow["status"]) {
    setStatusOverrides((current) => ({
      ...current,
      [taskId]: status,
    }));
    setPendingStatusTaskIds((current) => [...current, taskId]);

    startTransition(async () => {
      const formData = new FormData();
      formData.set("taskId", String(taskId));
      formData.set("status", status);
      formData.set("description", "");
      formData.set("minutesSpent", "0");

      try {
        await updateTaskStatusAction(formData);
        router.refresh();
      } finally {
        setPendingStatusTaskIds((current) => current.filter((id) => id !== taskId));
      }
    });
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
                    <div
                      className="inline-flex items-center gap-2"
                      onClick={(event) => event.stopPropagation()}
                      onKeyDown={(event) => event.stopPropagation()}
                    >
                      <select
                        value={statusOverrides[task.id] ?? task.status}
                        aria-label={`Update status for ${task.title}`}
                        onChange={(event) => {
                          const nextStatus = event.target.value as TaskRow["status"];
                          updateTaskStatus(task.id, nextStatus);
                        }}
                        disabled={pendingStatusTaskIds.includes(task.id)}
                        className="min-w-[150px] rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-900 outline-none transition hover:border-slate-300 focus:border-amber-400"
                      >
                        <option value="pending">Pending</option>
                        <option value="working">Working</option>
                        <option value="completed">Completed</option>
                      </select>
                      {pendingStatusTaskIds.includes(task.id) ? <InlinePendingState pendingLabel="Saving..." /> : null}
                    </div>
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

function MaskedPassword({ value }: { value: string | null }) {
  const [visible, setVisible] = useState(false);

  if (!value) {
    return <span className="text-sm text-slate-400">-</span>;
  }

  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-sm text-slate-700">{visible ? value : "••••••••"}</span>
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        className="rounded-lg border border-slate-200 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-600 transition hover:bg-slate-50"
      >
        {visible ? "Hide" : "Show"}
      </button>
    </div>
  );
}

type FacebookPage = {
  id: number;
  name: string;
  password: string;
};

type FacebookIdRecord = {
  id: number;
  email: string;
  facebookPassword: string | null;
  emailPassword: string | null;
  assignedTo: number | null;
  assignedToName: string | null;
  dateCreated: string;
  createdAt: string;
  pages: FacebookPage[] | null;
};

type FacebookEmployeeOption = {
  id: number;
  fullName: string;
  role: string;
};

export function FacebookIdsClient({
  records,
  employees,
  isAdmin,
  canManagePages,
}: {
  records: FacebookIdRecord[];
  employees: FacebookEmployeeOption[];
  isAdmin: boolean;
  canManagePages: boolean;
}) {
  const [search, setSearch] = useState("");
  const [assignmentFilter, setAssignmentFilter] = useState("all");
  const [employeeFilter, setEmployeeFilter] = useState("all");
  const [pagesFilter, setPagesFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sort, setSort] = useState<"email" | "assignedToName" | "dateCreated">("dateCreated");
  const [direction, setDirection] = useState<SortDirection>("desc");

  const filteredRecords = useMemo(() => {
    return [...records]
      .filter((record) => {
        const matchesQuery = matchesSearch(search, record.email);

        const matchesAssignment =
          assignmentFilter === "all" ||
          (assignmentFilter === "assigned" && record.assignedTo !== null) ||
          (assignmentFilter === "free" && record.assignedTo === null);

        const matchesEmployee =
          employeeFilter === "all" || String(record.assignedTo ?? "") === employeeFilter;

        const matchesPages =
          pagesFilter === "all" ||
          (pagesFilter === "has" && !!record.pages && record.pages.length > 0) ||
          (pagesFilter === "none" && (!record.pages || record.pages.length === 0));

        const matchesFrom = !dateFrom || record.dateCreated >= dateFrom;
        const matchesTo = !dateTo || record.dateCreated <= dateTo;

        return matchesQuery && matchesAssignment && matchesEmployee && matchesPages && matchesFrom && matchesTo;
      })
      .sort((left, right) => {
        const leftValue =
          sort === "email" ? left.email : sort === "assignedToName" ? left.assignedToName ?? "" : left.dateCreated;
        const rightValue =
          sort === "email" ? right.email : sort === "assignedToName" ? right.assignedToName ?? "" : right.dateCreated;

        return compareString(leftValue, rightValue, direction);
      });
  }, [assignmentFilter, dateFrom, dateTo, direction, employeeFilter, pagesFilter, records, search, sort]);

  function toggleSort(nextSort: typeof sort) {
    setDirection((currentDirection) => nextDirection(sort, nextSort, currentDirection));
    setSort(nextSort);
  }

  return (
    <section className="grid gap-4">
      {isAdmin && (
        <Panel title="Filters" subtitle="Search and filter the Facebook ID pool.">
          <div className="grid gap-3 lg:grid-cols-3 xl:grid-cols-6">
            <Field label="Search email">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by email"
                className={inputClass}
              />
            </Field>
            <Field label="Assignment">
              <select value={assignmentFilter} onChange={(event) => setAssignmentFilter(event.target.value)} className={inputClass}>
                <option value="all">All</option>
                <option value="assigned">Assigned</option>
                <option value="free">Free</option>
              </select>
            </Field>
            <Field label="Employee">
              <select value={employeeFilter} onChange={(event) => setEmployeeFilter(event.target.value)} className={inputClass}>
                <option value="all">All employees</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.fullName}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Pages">
              <select value={pagesFilter} onChange={(event) => setPagesFilter(event.target.value)} className={inputClass}>
                <option value="all">All</option>
                <option value="has">Has pages</option>
                <option value="none">No pages</option>
              </select>
            </Field>
            <Field label="Created from">
              <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} className={inputClass} />
            </Field>
            <Field label="Created to">
              <input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} className={inputClass} />
            </Field>
          </div>
        </Panel>
      )}

      <Panel
        title={isAdmin ? "All Facebook IDs" : "My Facebook IDs"}
        subtitle={
          isAdmin
            ? "Credentials, assignment, and pages for every Facebook ID in the pool."
            : "Facebook IDs currently assigned to you."
        }
      >
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-slate-500">
              <tr>
                <th className="pb-3 pr-4 font-medium">
                  <SortButton label="Email" active={sort === "email"} direction={direction} onClick={() => toggleSort("email")} />
                </th>
                {isAdmin && (
                  <th className="pb-3 pr-4 font-medium">
                    <SortButton
                      label="Assigned To"
                      active={sort === "assignedToName"}
                      direction={direction}
                      onClick={() => toggleSort("assignedToName")}
                    />
                  </th>
                )}
                {!isAdmin && <th className="pb-3 pr-4 font-medium">Facebook Password</th>}
                {!isAdmin && <th className="pb-3 pr-4 font-medium">Email/Gmail Password</th>}
                <th className="pb-3 pr-4 font-medium">Pages</th>
                <th className="pb-3 pr-4 font-medium">
                  <SortButton
                    label="Date Created"
                    active={sort === "dateCreated"}
                    direction={direction}
                    onClick={() => toggleSort("dateCreated")}
                  />
                </th>
                <th className="pb-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.length === 0 && (
                <tr>
                  <td colSpan={isAdmin ? 5 : 6} className="py-6 text-center text-sm text-slate-500">
                    No Facebook IDs found.
                  </td>
                </tr>
              )}
              {filteredRecords.map((record) => (
                <tr key={record.id}>
                  <td className="py-3 pr-4 font-medium text-slate-900">{record.email}</td>
                  {isAdmin && (
                    <td className="py-3 pr-4">
                      {record.assignedTo ? (
                        <span className="text-slate-700">{record.assignedToName}</span>
                      ) : (
                        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-emerald-700">
                          Free
                        </span>
                      )}
                    </td>
                  )}
                  {!isAdmin && (
                    <td className="py-3 pr-4">
                      <MaskedPassword value={record.facebookPassword} />
                    </td>
                  )}
                  {!isAdmin && (
                    <td className="py-3 pr-4">
                      <MaskedPassword value={record.emailPassword} />
                    </td>
                  )}
                  <td className="py-3 pr-4">
                    <Link
                      href={`/dashboard/facebook-ids?modal=pages&facebookId=${record.id}`}
                      className="inline-flex rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-900 transition hover:bg-slate-50"
                    >
                      {record.pages && record.pages.length > 0 ? `${record.pages.length} page${record.pages.length === 1 ? "" : "s"}` : "No pages"}
                    </Link>
                  </td>
                  <td className="py-3 pr-4 text-slate-600">{formatDate(record.dateCreated)}</td>
                  <td className="py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {isAdmin && (
                        <>
                          <Link
                            href={`/dashboard/facebook-ids?modal=assign&facebookId=${record.id}`}
                            className="inline-flex rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-900 transition hover:bg-slate-50"
                          >
                            {record.assignedTo ? "Reassign" : "Assign"}
                          </Link>
                          {record.assignedTo && (
                            <form action={unassignFacebookIdAction}>
                              <input type="hidden" name="facebookIdId" value={record.id} />
                              <PendingSubmitButton
                                idleLabel="Unassign"
                                pendingLabel="Unassigning..."
                                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-900 transition hover:bg-slate-50"
                                pendingClassName="cursor-not-allowed bg-slate-100 text-slate-500 hover:bg-slate-100"
                              />
                            </form>
                          )}
                          <Link
                            href={`/dashboard/facebook-ids?modal=edit-id&facebookId=${record.id}`}
                            className="inline-flex rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-900 transition hover:bg-slate-50"
                          >
                            Edit
                          </Link>
                          <form action={deleteFacebookIdAction}>
                            <input type="hidden" name="facebookIdId" value={record.id} />
                            <PendingSubmitButton
                              idleLabel="Delete"
                              pendingLabel="Deleting..."
                              className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-50"
                              pendingClassName="cursor-not-allowed bg-rose-50 text-rose-400 hover:bg-rose-50"
                            />
                          </form>
                        </>
                      )}
                      {!isAdmin && canManagePages && (
                        <Link
                          href={`/dashboard/facebook-ids?modal=pages&facebookId=${record.id}`}
                          className="inline-flex rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-900 transition hover:bg-slate-50"
                        >
                          Manage Pages
                        </Link>
                      )}
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

export function AssignFacebookIdForm({
  facebookIdId,
  employees,
}: {
  facebookIdId: number;
  employees: FacebookEmployeeOption[];
}) {
  return (
    <form action={assignFacebookIdAction} className="space-y-3">
      <input type="hidden" name="facebookIdId" value={facebookIdId} />
      <Field label="Assign to employee">
        <select name="assigneeId" defaultValue="" className={inputClass} required>
          <option value="" disabled>
            Select an employee
          </option>
          {employees.map((employee) => (
            <option key={employee.id} value={employee.id}>
              {employee.fullName} ({employee.role.replace("_", " ")})
            </option>
          ))}
        </select>
      </Field>
      <PendingSubmitButton
        idleLabel="Assign Facebook ID"
        pendingLabel="Assigning..."
        className={`${primaryButton} gap-3`}
        pendingClassName="cursor-not-allowed bg-slate-700 hover:bg-slate-700"
      />
    </form>
  );
}

const FACEBOOK_CSV_HEADERS = {
  email: "Email *",
  facebookPassword: "Facebook Password *",
  emailPassword: "Email/Gmail Password",
};

type CsvPreviewRow = {
  row: number;
  email: string;
  facebookPassword: string;
  emailPassword: string;
  status: "valid" | "existing" | "invalid";
  reason: string | null;
};

function buildCsvPreview(text: string, existingEmails: Set<string>): CsvPreviewRow[] {
  const rows = parseCsv(text);

  if (rows.length === 0) {
    return [];
  }

  const header = rows[0].map((cell) => cell.trim());
  const emailIndex = findCsvColumnIndex(header, FACEBOOK_CSV_HEADERS.email);
  const facebookPasswordIndex = findCsvColumnIndex(header, FACEBOOK_CSV_HEADERS.facebookPassword);
  const emailPasswordIndex = findCsvColumnIndex(header, FACEBOOK_CSV_HEADERS.emailPassword);

  if (emailIndex === -1 || facebookPasswordIndex === -1 || emailPasswordIndex === -1) {
    return [];
  }

  const dataRows = rows.slice(1).filter((cells) => cells.some((cell) => cell.trim() !== ""));
  const seenInFile = new Set<string>();

  return dataRows.map((cells, index) => {
    const emailRaw = (cells[emailIndex] ?? "").trim();
    const facebookPasswordRaw = (cells[facebookPasswordIndex] ?? "").trim();
    const emailPasswordRaw = (cells[emailPasswordIndex] ?? "").trim();

    const validation = validateFacebookIdRow({
      email: cells[emailIndex] ?? "",
      facebookPassword: cells[facebookPasswordIndex] ?? "",
      emailPassword: cells[emailPasswordIndex] ?? "",
    });

    const base = {
      row: index + 2,
      email: emailRaw,
      facebookPassword: facebookPasswordRaw,
      emailPassword: emailPasswordRaw,
    };

    if (!validation.valid) {
      return { ...base, status: "invalid" as const, reason: validation.reason };
    }

    const normalizedEmail = validation.data.email.toLowerCase();

    if (existingEmails.has(normalizedEmail)) {
      return { ...base, status: "existing" as const, reason: "Already in database" };
    }

    if (seenInFile.has(normalizedEmail)) {
      return { ...base, status: "invalid" as const, reason: "Duplicate email in this file" };
    }

    seenInFile.add(normalizedEmail);
    return { ...base, status: "valid" as const, reason: null };
  });
}

function CsvStatusBadge({ status }: { status: CsvPreviewRow["status"] }) {
  if (status === "valid") {
    return (
      <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
        Valid to import
      </span>
    );
  }

  if (status === "existing") {
    return (
      <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
        Already in DB
      </span>
    );
  }

  return (
    <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-rose-700">
      Invalid
    </span>
  );
}

export function FacebookIdsCsvFileField({ existingEmails }: { existingEmails: string[] }) {
  const [preview, setPreview] = useState<CsvPreviewRow[] | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const normalizedExisting = useMemo(() => new Set(existingEmails.map((email) => email.toLowerCase())), [existingEmails]);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      setPreview(null);
      setFileName(null);
      return;
    }

    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      setPreview(buildCsvPreview(text, normalizedExisting));
    };
    reader.readAsText(file);
  }

  const validCount = preview?.filter((row) => row.status === "valid").length ?? 0;
  const existingCount = preview?.filter((row) => row.status === "existing").length ?? 0;
  const invalidCount = preview?.filter((row) => row.status === "invalid").length ?? 0;

  return (
    <div className="space-y-3">
      <Field label="CSV file">
        <input
          name="file"
          type="file"
          accept=".csv,text/csv"
          required
          onChange={handleFileChange}
          className={inputClass}
        />
      </Field>

      {preview && (
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-slate-900">{fileName}</p>
            <p className="text-xs text-slate-600">
              {validCount} valid to import · {existingCount} already in DB · {invalidCount} invalid
            </p>
          </div>
          <p className="text-xs font-medium text-slate-600">
            Only rows marked &ldquo;Valid to import&rdquo; will be imported. Rows already in the database or with missing/invalid data will be skipped.
          </p>
          {preview.length === 0 ? (
            <p className="text-sm text-rose-600">
              Could not read this file. Make sure it has the headers: Email *, Facebook Password *, Email/Gmail Password.
            </p>
          ) : (
            <div className="max-h-72 overflow-auto rounded-xl border border-slate-200 bg-white">
              <table className="min-w-full text-sm">
                <thead className="sticky top-0 bg-white text-left text-slate-500">
                  <tr>
                    <th className="px-3 py-2 font-medium">Row</th>
                    <th className="px-3 py-2 font-medium">Email</th>
                    <th className="px-3 py-2 font-medium">Facebook Password</th>
                    <th className="px-3 py-2 font-medium">Email/Gmail Password</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {preview.map((row) => (
                    <tr key={row.row}>
                      <td className="px-3 py-2 text-slate-600">{row.row}</td>
                      <td className="px-3 py-2 text-slate-900">{row.email || "-"}</td>
                      <td className="px-3 py-2 font-mono text-slate-600">{row.facebookPassword || "-"}</td>
                      <td className="px-3 py-2 font-mono text-slate-600">{row.emailPassword || "-"}</td>
                      <td className="px-3 py-2">
                        <div className="flex flex-col gap-1">
                          <CsvStatusBadge status={row.status} />
                          {row.reason && row.status !== "valid" && (
                            <span className="text-[11px] text-slate-500">{row.reason}</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
