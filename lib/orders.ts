import { SessionUser } from "@/lib/auth";
import { ensureDb, sql } from "@/lib/db";
import { CurrencyCode } from "@/lib/currency";
import { getCurrencySetting } from "@/lib/settings";
import { buildPublicStorageUrl } from "@/lib/supabase";
import { isValidDate, isValidDateRange, type QuickDateRange } from "@/lib/quick-date-range";

export type OrderStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "cancelled"
  | "delivered";

export type OrdersDateField = "booking" | "delivery";

type OrderRow = {
  id: number;
  note: string;
  id_name: string;
  booking_date: string;
  delivery_date: string;
  customer_name: string;
  address: string;
  postcode: string;
  phone_number: string;
  order_details: string;
  color: string;
  price: string;
  free_delivery: boolean;
  delivery_price: string;
  free_parking: boolean;
  total: string;
  payment_method: string;
  description: string;
  image_url: string;
  commission_amount: string;
  notes: string;
  supplier_id: number | null;
  supplier_name: string | null;
  vendor_cost: string;
  profit: string | null;
  status: OrderStatus;
  created_at: string;
  updated_at: string;
  csr_user_id: number;
  csr_name: string;
  csr_role: "super_admin" | "admin" | "employee";
};

export type OrdersData = {
  currency: CurrencyCode;
  metrics: {
    totalOrders: number;
    completedOrders: number;
    approvedOrders: number;
    pendingOrders: number;
    totalOrderValue: number;
    commissionEarned: number;
    totalProfit: number;
  };
  orders: {
    id: number;
    note: string;
    idName: string;
    bookingDate: string;
    deliveryDate: string;
    customerName: string;
    address: string;
    postcode: string;
    phoneNumber: string;
    orderDetails: string;
    color: string;
    price: number;
    freeDelivery: boolean;
    deliveryPrice: number;
    freeParking: boolean;
    total: number;
    paymentMethod: string;
    description: string;
    imageUrl: string;
    commissionAmount: number;
    notes: string;
    supplierId: number | null;
    supplierName: string | null;
    vendorCost: number;
    profit: number | null;
    status: OrderStatus;
    createdAt: string;
    updatedAt: string;
    csrUserId: number;
    csrName: string;
    csrRole: "super_admin" | "admin" | "employee";
  }[];
};

type OrderItem = OrdersData["orders"][number];

export async function getOrdersData(
  user: SessionUser,
  dateRange?: QuickDateRange,
  dateField: OrdersDateField = "booking",
): Promise<OrdersData> {
  await ensureDb();

  const currencyCode = await getCurrencySetting();

  const validRange = dateRange && (dateRange.from ? isValidDateRange(dateRange.from, dateRange.to) : isValidDate(dateRange.to))
    ? dateRange
    : undefined;
  const fromDate = validRange?.from || null;
  const toDate = validRange?.to ?? null;
  const rows = await sql<OrderRow[]>`
          select
            o.id,
            o.note,
            o.id_name,
            o.booking_date::text,
            o.delivery_date::text,
            o.customer_name,
            o.address,
            o.postcode,
            o.phone_number,
            o.order_details,
            o.color,
            o.price::text,
            o.free_delivery,
            o.delivery_price::text,
            o.free_parking,
            o.total::text,
            o.payment_method,
            o.description,
            o.image_url,
            o.commission_amount::text,
            o.notes,
            o.supplier_id,
            s.name as supplier_name,
            o.vendor_cost::text,
            o.profit::text,
            o.status,
            o.created_at::text,
            o.updated_at::text,
            o.csr_user_id,
            u.full_name as csr_name,
            u.role as csr_role
          from orders o
          join users u on u.id = o.csr_user_id
          left join suppliers s on s.id = o.supplier_id
          where (${user.role !== "employee"} or o.csr_user_id = ${user.id})
            and (${fromDate}::date is null or (case when ${dateField === "delivery"} then o.delivery_date else o.booking_date end) >= ${fromDate}::date)
            and (${toDate}::date is null or (case when ${dateField === "delivery"} then o.delivery_date else o.booking_date end) <= ${toDate}::date)
          order by o.created_at desc
        `;

  const orders = rows.map((row: OrderRow) => ({
    id: row.id,
    note: row.note,
    idName: row.id_name,
    bookingDate: row.booking_date,
    deliveryDate: row.delivery_date,
    customerName: row.customer_name,
    address: row.address,
    postcode: row.postcode,
    phoneNumber: row.phone_number,
    orderDetails: row.order_details,
    color: row.color,
    price: Number(row.price),
    freeDelivery: row.free_delivery,
    deliveryPrice: Number(row.delivery_price),
    freeParking: row.free_parking,
    total: Number(row.total),
    paymentMethod: row.payment_method,
    description: row.description,
    imageUrl: buildPublicStorageUrl(row.image_url),
    commissionAmount: Number(row.commission_amount),
    notes: row.notes,
    supplierId: user.role === "employee" ? null : row.supplier_id,
    supplierName: user.role === "employee" ? null : row.supplier_name,
    vendorCost: user.role === "employee" || row.profit === null ? 0 : Number(row.total) - Number(row.profit),
    profit: user.role === "employee" ? 0 : row.profit === null ? null : Number(row.profit),
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    csrUserId: row.csr_user_id,
    csrName: row.csr_name,
    csrRole: row.csr_role,
  }));

  return {
    currency: currencyCode,
    metrics: {
      totalOrders: orders.length,
      completedOrders: orders.filter((order: OrderItem) => order.status === "delivered").length,
      approvedOrders: orders.filter((order: OrderItem) => order.status === "approved").length,
      pendingOrders: orders.filter((order: OrderItem) => order.status === "pending").length,
      totalOrderValue: orders.reduce((sum: number, order: OrderItem) => sum + order.total, 0),
      commissionEarned: orders.reduce((sum: number, order: OrderItem) => sum + order.commissionAmount, 0),
      totalProfit: orders.reduce(
        (sum: number, order: OrderItem) => sum + (order.profit ?? 0),
        0,
      ),
    },
    orders,
  };
}
