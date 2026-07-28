"use client";

import { useState } from "react";

import {
  addFinanceEntryAction,
  createSalaryRecordAction,
  createTaskAction,
  createUserAction,
} from "@/app/actions";
import { Field, inputClass, primaryButton, textareaClass } from "@/app/design-system";

function ModalShell({
  open,
  title,
  subtitle,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  subtitle: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
      <div className="w-full max-w-2xl rounded-[2rem] border border-white/70 bg-white p-6 shadow-[0_30px_100px_rgba(15,23,42,0.25)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Close
          </button>
        </div>
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}

function ModalTrigger({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
    >
      {label}
    </button>
  );
}

export function NewFinanceEntryModal() {
  const [open, setOpen] = useState(false);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <ModalTrigger label="New Expense / Income" onClick={() => setOpen(true)} />
      <ModalShell
        open={open}
        title="New Finance Entry"
        subtitle="Record a new income or expense without leaving the finance page."
        onClose={() => setOpen(false)}
      >
        <form action={addFinanceEntryAction} className="space-y-3">
          <Field label="Type">
            <select name="type" defaultValue="expense" className={inputClass}>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
          </Field>
          <Field label="Title">
            <input name="title" placeholder="Office rent" className={inputClass} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Category">
              <input name="category" placeholder="Rent" className={inputClass} />
            </Field>
            <Field label="Amount">
              <input name="amount" type="number" min="0" step="0.01" placeholder="50000" className={inputClass} />
            </Field>
          </div>
          <Field label="Entry date">
            <input name="entryDate" type="date" defaultValue={today} className={inputClass} />
          </Field>
          <Field label="Notes">
            <textarea name="notes" rows={4} className={textareaClass} placeholder="Optional details" />
          </Field>
          <button className={primaryButton}>Save finance entry</button>
        </form>
      </ModalShell>
    </>
  );
}

export function CreateUserModal({
  canCreateAdmin,
}: {
  canCreateAdmin: boolean;
}) {
  const [open, setOpen] = useState(false);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <ModalTrigger label="Create Employee" onClick={() => setOpen(true)} />
      <ModalShell
        open={open}
        title="Create User"
        subtitle="Create employees here. Super admin can also create admins."
        onClose={() => setOpen(false)}
      >
        <form action={createUserAction} className="space-y-3">
          <Field label="Role">
            <select
              name="role"
              defaultValue="employee"
              className={inputClass}
              disabled={!canCreateAdmin}
            >
              {canCreateAdmin && <option value="admin">Admin</option>}
              <option value="employee">Employee</option>
            </select>
          </Field>
          {!canCreateAdmin && <input type="hidden" name="role" value="employee" />}
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
      </ModalShell>
    </>
  );
}

export function AssignTaskModal({
  employees,
}: {
  employees: { id: number; fullName: string }[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <ModalTrigger label="Assign Task" onClick={() => setOpen(true)} />
      <ModalShell
        open={open}
        title="Assign Task"
        subtitle="Create a new task and assign it to an employee."
        onClose={() => setOpen(false)}
      >
        <form action={createTaskAction} className="space-y-3">
          <Field label="Assign to">
            <select name="assignedTo" className={inputClass}>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.fullName}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Task title">
            <input name="title" placeholder="Prepare August budget" className={inputClass} />
          </Field>
          <Field label="Details">
            <textarea name="details" rows={4} className={textareaClass} placeholder="Task details and expectations" />
          </Field>
          <Field label="Priority">
            <select name="priority" defaultValue="medium" className={inputClass}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </Field>
          <button className={primaryButton}>Assign task</button>
        </form>
      </ModalShell>
    </>
  );
}

export function SalaryCycleModal({
  employees,
}: {
  employees: { id: number; fullName: string }[];
}) {
  const [open, setOpen] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const currentMonth = today.slice(0, 7);

  return (
    <>
      <ModalTrigger label="New Salary Cycle" onClick={() => setOpen(true)} />
      <ModalShell
        open={open}
        title="New Salary Cycle"
        subtitle="Create or update a monthly salary cycle for an employee."
        onClose={() => setOpen(false)}
      >
        <form action={createSalaryRecordAction} className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Employee">
              <select name="userId" className={inputClass}>
                {employees.map((employee) => (
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
      </ModalShell>
    </>
  );
}
