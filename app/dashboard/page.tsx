import {
  InsightCard,
  MetricCard,
  PageIntro,
  Panel,
  currency,
} from "@/app/ui";
import { requireUser } from "@/lib/auth";
import { getDashboardData } from "@/lib/data";

export default async function DashboardHomePage() {
  const user = await requireUser();
  const data = await getDashboardData(user);
  const personalPerformance = data.performance[0];
  const latestPayroll = data.payroll[0];

  return (
    <>
      <PageIntro
        eyebrow="Overview"
        title={user.role === "employee" ? "Your work summary" : "Business snapshot"}
        description={
          user.role === "employee"
            ? "This page shows only your own tasks, attendance, time logged, and salary status."
            : "This page gives you the current financial position, major insights, and a quick attendance action without crowding the rest of the system."
        }
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {user.role === "employee" ? (
          <>
            <MetricCard
              label="Active Tasks"
              value={String(personalPerformance?.activeTasks ?? 0)}
              tone="violet"
            />
            <MetricCard
              label="Completed Tasks"
              value={String(personalPerformance?.completedTasks ?? 0)}
              tone="emerald"
            />
            <MetricCard
              label="Attendance Days"
              value={String(personalPerformance?.attendanceCount ?? 0)}
              tone="sky"
            />
            <MetricCard
              label="Logged Minutes"
              value={String(personalPerformance?.loggedMinutes ?? 0)}
              tone="amber"
            />
            <MetricCard
              label="Joined On"
              value={user.joinedOn}
              tone="rose"
            />
          </>
        ) : (
          <>
            <MetricCard label="Total Income" value={currency(data.metrics.income, data.currency)} tone="emerald" />
            <MetricCard label="Total Expenses" value={currency(data.metrics.expense, data.currency)} tone="rose" />
            <MetricCard label="Net Position" value={currency(data.metrics.net, data.currency)} tone="amber" />
            <MetricCard label="Employees" value={String(data.metrics.employees)} tone="sky" />
            <MetricCard label="Open Tasks" value={String(data.metrics.openTasks)} tone="violet" />
          </>
        )}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.4fr_0.9fr]">
        {user.role === "employee" ? (
          <Panel title="Your Progress" subtitle="A simple summary of your own work only.">
            <div className="grid gap-4 md:grid-cols-2">
              <InsightCard
                title="Task focus"
                body={`You currently have ${personalPerformance?.activeTasks ?? 0} active task(s) and ${personalPerformance?.completedTasks ?? 0} completed task(s).`}
              />
              <InsightCard
                title="Time logged"
                body={`You have logged ${personalPerformance?.loggedMinutes ?? 0} minutes of work in the system.`}
              />
              <InsightCard
                title="Attendance"
                body={`You have ${personalPerformance?.attendanceCount ?? 0} attendance record(s) available right now.`}
              />
              <InsightCard
                title="Payroll status"
                body={`Your current payroll status is ${latestPayroll?.status ?? "not created"}${latestPayroll?.due_date ? ` and the due date is ${latestPayroll.due_date}.` : "."}`}
              />
            </div>
          </Panel>
        ) : (
          <Panel title="Business Insights" subtitle="Major income and cost signals from your ledger.">
            <div className="grid gap-4 md:grid-cols-2">
              <InsightCard title="Major income" body={data.insights.majorIncome} />
              <InsightCard title="Major expense" body={data.insights.majorExpense} />
              <InsightCard title="Expense to cut first" body={data.insights.cutSuggestion} />
              <InsightCard title="Income side to protect" body={data.insights.incomeSuggestion} />
            </div>
          </Panel>
        )}

        <Panel title="Attendance Page" subtitle="Attendance now lives on its own page with a dedicated check-in flow, calendar, and office report.">
          <div className="space-y-3">
            <InsightCard
              title="Separate flow"
              body="Use the Attendance page to mark today present and review monthly calendar status without mixing it into overview or performance."
            />
            <InsightCard
              title="Office report"
              body="Admins and super admin can review filtered present and absent rows by day, week, month, year, or all history."
            />
          </div>
        </Panel>
      </section>
    </>
  );
}
