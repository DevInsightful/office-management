import { ensureDb, sql } from "@/lib/db";

export type SupplierSummary = {
  id: number;
  name: string;
  contactDetails: string;
  totalOrders: number;
  deliveredThisMonth: number;
  deliveredValueThisMonth: number;
  undeliveredThisMonth: number;
  undeliveredValueThisMonth: number;
  totalOrderValue: number;
  totalProfit: number;
  remainingCommission: number;
};

type SupplierSummaryRow = {
  id: number;
  name: string;
  contact_details: string;
  total_orders: number;
  delivered_this_month: number;
  delivered_value_this_month: string;
  undelivered_this_month: number;
  undelivered_value_this_month: string;
  total_order_value: string;
  total_profit: string;
  remaining_commission: string;
};

export async function getSupplierSummaries(): Promise<SupplierSummary[]> {
  await ensureDb();

  const rows = await sql<SupplierSummaryRow[]>`
    select
      s.id,
      s.name,
      concat_ws(' · ', nullif(s.phone, ''), nullif(s.company, ''), nullif(s.address, '')) as contact_details,
      count(o.id)::int as total_orders,
      count(o.id) filter (
        where o.status = 'delivered'
          and o.delivery_date >= date_trunc('month', current_date)::date
          and o.delivery_date < (date_trunc('month', current_date) + interval '1 month')::date
      )::int as delivered_this_month,
      coalesce(sum(o.total) filter (
        where o.status = 'delivered'
          and o.delivery_date >= date_trunc('month', current_date)::date
          and o.delivery_date < (date_trunc('month', current_date) + interval '1 month')::date
      ), 0)::text as delivered_value_this_month,
      count(o.id) filter (
        where o.status <> 'delivered'
          and o.delivery_date >= date_trunc('month', current_date)::date
          and o.delivery_date < (date_trunc('month', current_date) + interval '1 month')::date
      )::int as undelivered_this_month,
      coalesce(sum(o.total) filter (
        where o.status <> 'delivered'
          and o.delivery_date >= date_trunc('month', current_date)::date
          and o.delivery_date < (date_trunc('month', current_date) + interval '1 month')::date
      ), 0)::text as undelivered_value_this_month,
      coalesce(sum(o.total), 0)::text as total_order_value,
      coalesce(sum(o.profit), 0)::text as total_profit,
      coalesce(sum(o.profit) filter (where o.profit is not null and not o.profit_received), 0)::text as remaining_commission
    from suppliers s
    left join orders o on o.supplier_id = s.id
    group by s.id, s.name, s.phone, s.company, s.address
    order by s.name
  `;

  return rows.map((row: SupplierSummaryRow) => ({
    id: row.id,
    name: row.name,
    contactDetails: row.contact_details,
    totalOrders: row.total_orders,
    deliveredThisMonth: row.delivered_this_month,
    deliveredValueThisMonth: Number(row.delivered_value_this_month),
    undeliveredThisMonth: row.undelivered_this_month,
    undeliveredValueThisMonth: Number(row.undelivered_value_this_month),
    totalOrderValue: Number(row.total_order_value),
    totalProfit: Number(row.total_profit),
    remainingCommission: Number(row.remaining_commission),
  }));
}
