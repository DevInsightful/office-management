import { SessionUser } from "@/lib/auth";
import { ensureDb, sql } from "@/lib/db";
import { seedIfEmpty } from "@/lib/seed";
import { CurrencyCode } from "@/lib/currency";
import { getCurrencySetting } from "@/lib/settings";
import { buildPublicStorageUrl } from "@/lib/supabase";

export type OrderStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "cancelled"
  | "delivered";

type OrderRow = {
  id: number;
  note: string;
  id_name: string;
  booking_date: string;
  delivery_date: string;
  customer_name: string;
  address: string;
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
  status: OrderStatus;
  created_at: string;
  updated_at: string;
  csr_user_id: number;
  csr_name: string;
};

export type OrdersData = {
  currency: CurrencyCode;
  metrics: {
    totalOrders: number;
    completedOrders: number;
    approvedOrders: number;
    pendingOrders: number;
  };
  orders: {
    id: number;
    note: string;
    idName: string;
    bookingDate: string;
    deliveryDate: string;
    customerName: string;
    address: string;
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
    status: OrderStatus;
    createdAt: string;
    updatedAt: string;
    csrUserId: number;
    csrName: string;
  }[];
};

type OrderItem = OrdersData["orders"][number];

export async function getOrdersData(user: SessionUser): Promise<OrdersData> {
  await ensureDb();
  await seedIfEmpty();

  const currencyCode = await getCurrencySetting();

  const rows =
    user.role === "employee"
      ? await sql<OrderRow[]>`
          select
            o.id,
            o.note,
            o.id_name,
            o.booking_date::text,
            o.delivery_date::text,
            o.customer_name,
            o.address,
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
            o.status,
            o.created_at::text,
            o.updated_at::text,
            o.csr_user_id,
            u.full_name as csr_name
          from orders o
          join users u on u.id = o.csr_user_id
          where o.csr_user_id = ${user.id}
          order by o.created_at desc
        `
      : await sql<OrderRow[]>`
          select
            o.id,
            o.note,
            o.id_name,
            o.booking_date::text,
            o.delivery_date::text,
            o.customer_name,
            o.address,
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
            o.status,
            o.created_at::text,
            o.updated_at::text,
            o.csr_user_id,
            u.full_name as csr_name
          from orders o
          join users u on u.id = o.csr_user_id
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
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    csrUserId: row.csr_user_id,
    csrName: row.csr_name,
  }));

  return {
    currency: currencyCode,
    metrics: {
      totalOrders: orders.length,
      completedOrders: orders.filter((order: OrderItem) => order.status === "delivered").length,
      approvedOrders: orders.filter((order: OrderItem) => order.status === "approved").length,
      pendingOrders: orders.filter((order: OrderItem) => order.status === "pending").length,
    },
    orders,
  };
}
