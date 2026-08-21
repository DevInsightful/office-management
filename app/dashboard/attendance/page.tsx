import { markAttendanceByAdminAction } from "@/app/actions";
import { AttendanceCheckIn } from "@/app/dashboard/attendance-check-in";
import { AttendanceCalendarClient, AttendanceReportClient } from "@/app/dashboard/client-tables";
import { PendingSubmitButton } from "@/app/pending-controls";
import { Field, PageIntro, Panel, inputClass, primaryButton } from "@/app/ui";
import { getKarachiTodayIsoDate } from "@/lib/attendance-policy";
import { requireUser } from "@/lib/auth";
import { getDashboardData } from "@/lib/data";

export default async function AttendancePage() {
  const today = getKarachiTodayIsoDate(new Date());
  const user = await requireUser();
  const data = await getDashboardData(user);
  const trackedEmployees = data.employees.map((employee) => ({
    id: employee.id,
    fullName: employee.fullName,
    joinedOn: employee.joinedOn,
    role: employee.role,
  }));
  const manualAttendanceOptions = data.employees.filter((employee) => {
    if (employee.role === "super_admin") {
      return false;
    }

    if (user.role !== "super_admin" && employee.role === "admin") {
      return false;
    }

    return true;
  });

  return (
    <>
      <PageIntro
        eyebrow="Attendance"
        title={user.role === "super_admin" ? "Office attendance report" : "Attendance and check-in"}
        description={
          user.role === "super_admin"
            ? "Review office attendance by calendar and report filters. Super admin is excluded from attendance marking."
            : "Use this page to mark today’s attendance with GPS. Check-in until 3:15 PM PKT is present, later approved check-ins become half day, and final cutoffs mark the day absent."
        }
      />

      <section className="grid gap-4">
        {user.role !== "super_admin" ? (
          <Panel title="Today Check-In" subtitle="Until 3:15 PM PKT check-in is present. After that it becomes half day until 4:00 PM PKT, or 4:15 PM PKT on Friday.">
            <AttendanceCheckIn />
          </Panel>
        ) : null}

        {user.role !== "employee" ? (
          <Panel title="Manual Attendance" subtitle="If GPS fails, admin can mark attendance manually. Today still follows the same PKT cutoff rules before a record can be added.">
            <form action={markAttendanceByAdminAction} className="grid gap-3 lg:grid-cols-[1fr_220px_auto]">
              <Field label="Employee">
                <select name="userId" className={inputClass}>
                  {manualAttendanceOptions.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.fullName} ({employee.role.replace("_", " ")})
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Attendance date">
                <input name="attendanceDate" type="date" defaultValue={today} max={today} className={inputClass} />
              </Field>
              <div className="self-end">
                <PendingSubmitButton
                  idleLabel="Mark present"
                  pendingLabel="Marking..."
                  className={`${primaryButton} gap-3 lg:w-auto`}
                  pendingClassName="cursor-not-allowed bg-slate-700 hover:bg-slate-700"
                />
              </div>
            </form>
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
