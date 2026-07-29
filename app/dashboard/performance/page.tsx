import { PageIntro, Panel } from "@/app/ui";
import { requireUser } from "@/lib/auth";
import { getDashboardData } from "@/lib/data";

export default async function PerformancePage() {
  const user = await requireUser();
  const data = await getDashboardData(user);

  return (
    <>
      <PageIntro
        eyebrow="Performance"
        title={user.role === "employee" ? "Attendance and performance" : "Team performance and attendance"}
        description="Use this page to review attendance, completed work, active tasks, and logged effort without mixing performance reporting with payroll or task creation."
      />

      <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <Panel
          title={user.role === "employee" ? "My Performance" : "Team Performance"}
          subtitle="Attendance, completed work, and logged time by employee."
        >
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-slate-500">
                <tr>
                  <th className="pb-3 pr-4 font-medium">Employee</th>
                  <th className="pb-3 pr-4 font-medium">Attendance</th>
                  <th className="pb-3 pr-4 font-medium">Completed</th>
                  <th className="pb-3 pr-4 font-medium">Active</th>
                  <th className="pb-3 font-medium">Minutes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.performance.map((row) => (
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

        <Panel
          title={user.role === "employee" ? "My Attendance" : "Attendance Feed"}
          subtitle="Latest check-ins across the office."
        >
          <div className="space-y-3">
            {data.attendance.map((item) => (
              <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-slate-900">{item.full_name}</p>
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-500">{item.attendance_date}</p>
                </div>
                <p className="mt-1 text-sm text-slate-600">
                  {item.distanceFromOffice !== null && item.accuracy !== null
                    ? `Distance ${item.distanceFromOffice.toFixed(1)} m | Accuracy ${item.accuracy.toFixed(1)} m`
                    : "Legacy attendance record without GPS audit data."}
                </p>
                <p className="mt-2 text-xs text-slate-500">{new Date(item.check_in_at).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </Panel>
      </section>
    </>
  );
}
