import { PerformanceTableClient } from "@/app/dashboard/client-tables";
import { PageIntro } from "@/app/ui";
import { requireUser } from "@/lib/auth";
import { getDashboardData } from "@/lib/data";

export default async function PerformancePage() {
  const user = await requireUser();
  const data = await getDashboardData(user);

  return (
    <>
      <PageIntro
        eyebrow="Performance"
        title={user.role === "employee" ? "Your performance" : "Team performance"}
        description={
          user.role === "employee"
            ? "Use this page to review your completed work, active tasks, and logged effort. Attendance now lives on its own page."
            : "Use this page to review completed work, active tasks, and logged effort across the team. Attendance now lives on its own page."
        }
      />

      <PerformanceTableClient rows={data.performance} />
    </>
  );
}
