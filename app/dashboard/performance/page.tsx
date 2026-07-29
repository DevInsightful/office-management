import { AttendanceReportClient, PerformanceTableClient } from "@/app/dashboard/client-tables";
import { PageIntro, Panel } from "@/app/ui";
import { requireUser } from "@/lib/auth";
import { getDashboardData } from "@/lib/data";

const today = "2026-07-29";

export default async function PerformancePage() {
  const user = await requireUser();
  const data = await getDashboardData(user);

  return (
    <>
      <PageIntro
        eyebrow="Performance"
        title={user.role === "employee" ? "Attendance and performance" : "Attendance and team reporting"}
        description={
          user.role === "employee"
            ? "Use this page to review your own attendance, completed work, active tasks, and logged effort."
            : "Use this page to review office attendance by day, week, month, year, or the full history, with absent rows generated for missing check-ins."
        }
      />

      {user.role === "employee" ? (
        <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
          <PerformanceTableClient rows={data.performance} />

          <Panel
            title="My Attendance"
            subtitle="Latest check-ins for your own account."
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
      ) : (
        <section className="grid gap-4">
          <AttendanceReportClient
            today={today}
            employees={data.employees.map((employee) => ({
              id: employee.id,
              fullName: employee.fullName,
              joinedOn: employee.joinedOn,
              role: employee.role,
            }))}
            attendance={data.attendance}
          />

          <PerformanceTableClient rows={data.performance} />
        </section>
      )}
    </>
  );
}
