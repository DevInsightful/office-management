import { addTaskLogAction, createTaskAction, startTaskTimerAction, stopTaskTimerAction, updateTaskStatusAction } from "@/app/actions";
import { TasksBoardClient } from "@/app/dashboard/client-tables";
import { PendingSubmitButton } from "@/app/pending-controls";
import {
  ActionLink,
  Badge,
  Field,
  ModalFrame,
  PageIntro,
  Panel,
  PriorityBadge,
  inputClass,
  primaryButton,
  secondaryButton,
  textareaClass,
} from "@/app/ui";
import { requireUser } from "@/lib/auth";
import { getDashboardData } from "@/lib/data";

function formatDateTime(value: string | Date) {
  return new Date(value).toLocaleString("en-GB", { timeZone: "Asia/Karachi" });
}

export default async function TasksPage({
  searchParams,
}: {
  searchParams?: Promise<{ modal?: string; task?: string }>;
}) {
  const user = await requireUser();
  const data = await getDashboardData(user);
  const canAssign = user.role !== "employee";
  const params = searchParams ? await searchParams : undefined;
  const modal = params?.modal;
  const selectedTaskId = Number(params?.task ?? data.tasks[0]?.id ?? 0);
  const selectedTask = data.tasks.find((task) => task.id === selectedTaskId) ?? data.tasks[0] ?? null;
  const selectedTaskLogs = selectedTask ? data.taskLogs.filter((log) => log.task_id === selectedTask.id) : [];

  return (
    <>
      <PageIntro
        eyebrow="Tasks"
        title={user.role === "employee" ? "My tasks and work logs" : "Task board and assignment"}
        description="This page is dedicated to task execution. Use the table for quick actions and open a single task when you need the full context."
        action={canAssign ? <ActionLink href="/dashboard/tasks?modal=assign-task" label="Assign Task" /> : undefined}
      />

      <section className="grid gap-4 overflow-x-hidden">
        <TasksBoardClient tasks={data.tasks} />

        <Panel title="Recent Work Logs" subtitle="Proof of work and time spent on tasks.">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-slate-500">
                <tr>
                  <th className="pb-3 pr-4 font-medium">Employee</th>
                  <th className="pb-3 pr-4 font-medium">Task</th>
                  <th className="pb-3 pr-4 font-medium">Minutes</th>
                  <th className="pb-3 pr-4 font-medium">Description</th>
                  <th className="pb-3 font-medium">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.taskLogs.map((log) => (
                  <tr key={log.id}>
                    <td className="py-3 pr-4 font-medium text-slate-900">{log.user_name}</td>
                    <td className="py-3 pr-4 text-slate-600">#{log.task_id}</td>
                    <td className="py-3 pr-4 text-slate-600">{log.minutes_spent}</td>
                    <td className="py-3 pr-4 text-slate-600">{log.description || "No description added."}</td>
                    <td className="py-3 text-slate-600">{formatDateTime(log.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </section>

      {canAssign && modal === "assign-task" && (
        <ModalFrame
          title="Assign Task"
          subtitle="Create a new task and assign it to an employee."
          closeHref="/dashboard/tasks"
        >
          <form action={createTaskAction} className="space-y-3">
            <Field label="Assign to">
              <select name="assignedTo" className={inputClass}>
                {data.employees
                  .filter((employee) => employee.role === "employee")
                  .map((employee) => (
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
            <PendingSubmitButton
              idleLabel="Assign task"
              pendingLabel="Assigning task..."
              className={`${primaryButton} gap-3`}
              pendingClassName="cursor-not-allowed bg-slate-700 hover:bg-slate-700"
            />
          </form>
        </ModalFrame>
      )}

      {modal === "task-details" && selectedTask && (
        <ModalFrame
          title={`Task Details: ${selectedTask.title}`}
          subtitle="Full task context, notes, timer controls, and work logs for the selected task."
          closeHref="/dashboard/tasks"
        >
          <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
            <div className="space-y-4">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge>{selectedTask.status}</Badge>
                  <PriorityBadge priority={selectedTask.priority} />
                </div>
                <p className="mt-3 text-sm leading-7 text-slate-700">{selectedTask.details || "No task details provided."}</p>
                <div className="mt-4 grid gap-2 text-sm text-slate-600">
                  <p>Assigned to: {selectedTask.employee_name}</p>
                  <p>Assigned by: {selectedTask.assigned_by_name || "system"}</p>
                  <p>Created: {formatDateTime(selectedTask.created_at)}</p>
                  <p>Minutes logged: {selectedTask.timer_total_minutes}</p>
                </div>
              </div>

              <form action={updateTaskStatusAction} className="space-y-3 rounded-3xl border border-slate-200 bg-white p-4">
                <input type="hidden" name="taskId" value={selectedTask.id} />
                <Field label="Update status">
                  <select name="status" defaultValue={selectedTask.status} className={inputClass}>
                    <option value="pending">Pending</option>
                    <option value="working">Working</option>
                    <option value="completed">Completed</option>
                  </select>
                </Field>
                <Field label="Status note">
                  <textarea
                    name="description"
                    rows={4}
                    className={textareaClass}
                    placeholder="Explain what was completed or blocked."
                  />
                </Field>
                <Field label="Manual minutes">
                  <input name="minutesSpent" type="number" min="0" defaultValue={0} className={inputClass} />
                </Field>
                <PendingSubmitButton
                  idleLabel="Save status"
                  pendingLabel="Saving status..."
                  className={`${primaryButton} gap-3`}
                  pendingClassName="cursor-not-allowed bg-slate-700 hover:bg-slate-700"
                />
              </form>
            </div>

            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <form action={startTaskTimerAction}>
                  <input type="hidden" name="taskId" value={selectedTask.id} />
                  <PendingSubmitButton
                    idleLabel="Start timer"
                    pendingLabel="Starting timer..."
                    className={`${secondaryButton} gap-3`}
                    pendingClassName="cursor-not-allowed bg-slate-100 text-slate-500 hover:bg-slate-100"
                  />
                </form>
                <form action={stopTaskTimerAction} className="space-y-3">
                  <input type="hidden" name="taskId" value={selectedTask.id} />
                  <input
                    name="description"
                    placeholder="What was done in this session?"
                    className={inputClass}
                  />
                  <PendingSubmitButton
                    idleLabel="Stop timer"
                    pendingLabel="Stopping timer..."
                    className={`${secondaryButton} gap-3`}
                    pendingClassName="cursor-not-allowed bg-slate-100 text-slate-500 hover:bg-slate-100"
                  />
                </form>
              </div>

              <form action={addTaskLogAction} className="space-y-3 rounded-3xl border border-slate-200 bg-white p-4">
                <input type="hidden" name="taskId" value={selectedTask.id} />
                <Field label="Add work log">
                  <textarea
                    name="description"
                    rows={4}
                    className={textareaClass}
                    placeholder="Document exactly what work was done."
                  />
                </Field>
                <Field label="Minutes spent">
                  <input name="minutesSpent" type="number" min="0" defaultValue={30} className={inputClass} />
                </Field>
                <PendingSubmitButton
                  idleLabel="Add work log"
                  pendingLabel="Saving work log..."
                  className={`${primaryButton} gap-3`}
                  pendingClassName="cursor-not-allowed bg-slate-700 hover:bg-slate-700"
                />
              </form>

              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-900">Selected Task Logs</p>
                <div className="mt-3 space-y-3">
                  {selectedTaskLogs.length > 0 ? (
                    selectedTaskLogs.map((log) => (
                      <div key={log.id} className="rounded-2xl border border-slate-200 bg-white p-3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-medium text-slate-900">{log.user_name}</p>
                          <p className="text-xs uppercase tracking-[0.25em] text-slate-500">{log.minutes_spent} min</p>
                        </div>
                        <p className="mt-2 text-sm text-slate-600">{log.description || "No description added."}</p>
                        <p className="mt-2 text-xs text-slate-500">{formatDateTime(log.created_at)}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">No logs recorded for this task yet.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </ModalFrame>
      )}
    </>
  );
}
