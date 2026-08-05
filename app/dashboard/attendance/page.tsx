import { AttendanceCheckIn } from "@/app/dashboard/attendance-check-in";
import { AttendanceCalendarClient, AttendanceReportClient } from "@/app/dashboard/client-tables";
import { PageIntro, Panel } from "@/app/ui";
import { requireUser } from "@/lib/auth";
import { getDashboardData } from "@/lib/data";

const today = "2026-08-05";

export default async function AttendancePage() {
  const user = await requireUser();
  const data = await getDashboardData(user);
  const trackedEmployees = data.employees.map((employee) => ({
    id: employee.id,
    fullName: employee.fullName,
    joinedOn: employee.joinedOn,
    role: employee.role,
  }));

  return (
    <>
      <PageIntro
        eyebrow="Attendance"
        title={user.role === "super_admin" ? "Office attendance report" : "Attendance and check-in"}
        description={
          user.role === "super_admin"
            ? "Review office attendance by calendar and report filters. Super admin is excluded from attendance marking."
            : "Use this page to mark today’s attendance with GPS and review present or absent days in a dedicated calendar and report."
        }
      />

      <section className="grid gap-4">
        {user.role !== "super_admin" ? (
          <Panel title="Today Check-In" subtitle="When check-in succeeds, today is marked present for your account.">
            <AttendanceCheckIn />
          </Panel>
        ) : null}

        <AttendanceCalendarClient
          today={today}
          employees={trackedEmployees}
          attendance={data.attendance}
          defaultEmployeeId={user.role === "super_admin" ? trackedEmployees.find((employee) => employee.role !== "super_admin")?.id ?? user.id : user.id}
          allowEmployeeSelect={user.role === "super_admin" || user.role === "admin"}
        />

        <AttendanceReportClient
          today={today}
          employees={trackedEmployees}
          attendance={data.attendance}
          defaultEmployeeId={user.role === "super_admin" ? undefined : user.id}
          allowOfficeFilters={user.role === "super_admin" || user.role === "admin"}
        />
      </section>
    </>
  );
}
