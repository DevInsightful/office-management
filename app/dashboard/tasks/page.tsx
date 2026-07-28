import Link from "next/link";

import {
  addTaskLogAction,
  createTaskAction,
  startTaskTimerAction,
  stopTaskTimerAction,
  updateTaskStatusAction,
} from "@/app/actions";
import { LiveTaskTimer } from "@/app/dashboard/live-task-timer";
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
  const selectedTaskLogs = selectedTask
    ? data.taskLogs.filter((log) => log.task_id === selectedTask.id)
    : [];

  return (
    <>
      <PageIntro
        eyebrow="Tasks"
        title={user.role === "employee" ? "My tasks and work logs" : "Task board and assignment"}
        description="This page is dedicated to task execution. Use the table for quick actions and open a single task when you need the full context."
        action={canAssign ? <ActionLink href="/dashboard/tasks?modal=assign-task" label="Assign Task" /> : undefined}
      />

      <section className="grid gap-4">
        <Panel title="Task Board" subtitle="Table view for all tasks with quick status and timer actions.">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-slate-500">
                <tr>
                  <th className="pb-3 pr-4 font-medium">Task</th>
                  <th className="pb-3 pr-4 font-medium">Employee</th>
                  <th className="pb-3 pr-4 font-medium">Priority</th>
                  <th className="pb-3 pr-4 font-medium">Status</th>
                  <th className="pb-3 pr-4 font-medium">Time</th>
                  <th className="pb-3 pr-4 font-medium">Timer</th>
                  <th className="pb-3 pr-4 font-medium">Quick status</th>
                  <th className="pb-3 font-medium">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.tasks.map((task) => {
                  const detailsHref = `/dashboard/tasks?modal=task-details&task=${task.id}`;

                  return (
                    <tr key={task.id} className={task.id === selectedTask?.id ? "bg-amber-50/50" : ""}>
                      <td className="py-3 pr-4">
                        <div>
                          <p className="font-medium text-slate-900">{task.title}</p>
                          <p className="mt-1 max-w-xs truncate text-xs text-slate-500">{task.details}</p>
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-slate-600">{task.employee_name}</td>
                      <td className="py-3 pr-4">
                        <PriorityBadge priority={task.priority} />
                      </td>
                      <td className="py-3 pr-4">
                        <Badge>{task.status}</Badge>
                      </td>
                      <td className="py-3 pr-4">
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-slate-700">{task.timer_total_minutes} min logged</p>
                          <LiveTaskTimer startedAt={task.timer_started_at} />
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex gap-2">
                          <form action={startTaskTimerAction}>
                            <input type="hidden" name="taskId" value={task.id} />
                            <button
                              className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${
                                task.timer_started_at
                                  ? "border border-emerald-200 bg-emerald-600 text-white hover:bg-emerald-500"
                                  : "border border-slate-200 text-slate-900 hover:bg-slate-50"
                              }`}
                            >
                              Start
                            </button>
                          </form>
                          <form action={stopTaskTimerAction}>
                            <input type="hidden" name="taskId" value={task.id} />
                            <input type="hidden" name="description" value="Timer session recorded from task table." />
                            <button className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-900 transition hover:bg-slate-50">
                              Stop
                            </button>
                          </form>
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        <form action={updateTaskStatusAction} className="flex items-center gap-2">
                          <input type="hidden" name="taskId" value={task.id} />
                          <input type="hidden" name="description" value="" />
                          <input type="hidden" name="minutesSpent" value="0" />
                          <select name="status" defaultValue={task.status} className="min-w-[130px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-amber-400">
                            <option value="pending">Pending</option>
                            <option value="working">Working</option>
                            <option value="completed">Completed</option>
                          </select>
                          <button className="rounded-xl bg-slate-950 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800">
                            Save
                          </button>
                        </form>
                      </td>
                      <td className="py-3">
                        <Link
                          href={detailsHref}
                          className="inline-flex rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-900 transition hover:bg-slate-50"
                        >
                          Open
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>

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
                    <td className="py-3 text-slate-600">{new Date(log.created_at).toLocaleString()}</td>
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
            <button className={primaryButton}>Assign task</button>
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
                  <p>Created: {new Date(selectedTask.created_at).toLocaleString()}</p>
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
                <button className={primaryButton}>Save status</button>
              </form>
            </div>

            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <form action={startTaskTimerAction}>
                  <input type="hidden" name="taskId" value={selectedTask.id} />
                  <button className={secondaryButton}>Start timer</button>
                </form>
                <form action={stopTaskTimerAction} className="space-y-3">
                  <input type="hidden" name="taskId" value={selectedTask.id} />
                  <input
                    name="description"
                    placeholder="What was done in this session?"
                    className={inputClass}
                  />
                  <button className={secondaryButton}>Stop timer</button>
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
                <button className={primaryButton}>Add work log</button>
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
                        <p className="mt-2 text-xs text-slate-500">{new Date(log.created_at).toLocaleString()}</p>
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
