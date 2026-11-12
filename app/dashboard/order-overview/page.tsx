import { OrdersTableClient } from "@/app/dashboard/client-tables";
import { PageIntro } from "@/app/ui";
import { OrderOverviewFilters } from "@/app/dashboard/order-overview/order-overview-filters";
import { requireUser } from "@/lib/auth";
import { getOrdersData } from "@/lib/orders";

function dateInKarachi() {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function shiftDate(date: string, days: number) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

function weekStart(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return shiftDate(date, -((weekday + 6) % 7));
}

export default async function OrderOverviewPage() {
  const user = await requireUser();
  const { orders, currency } = await getOrdersData(user, undefined, "either");
  const today = dateInKarachi();
  const yesterday = shiftDate(today, -1);
  const tomorrow = shiftDate(today, 1);
  const thisWeekStart = weekStart(today);
  const pastSevenDaysStart = shiftDate(today, -6);

  return (
    <div className="min-w-0 space-y-4 overflow-x-hidden">
      <PageIntro eyebrow="Orders" title={user.role === "employee" ? "My Order Overview" : "Order Overview"} description={user.role === "employee" ? "Filter your orders by booking and delivery dates." : "Filter all orders by booking and delivery dates."} />
      <OrderOverviewFilters
        orders={orders}
        currencyCode={currency}
        canManageStatus={user.role !== "employee"}
        today={today}
        yesterday={yesterday}
        tomorrow={tomorrow}
        thisWeekStart={thisWeekStart}
        pastSevenDaysStart={pastSevenDaysStart}
      />
    </div>
  );
}
