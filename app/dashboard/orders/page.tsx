import Link from "next/link";

import { updateOrderStatusAction } from "@/app/actions";
import { OrderForm } from "@/app/dashboard/order-form";
import { OrderCopyButton } from "@/app/dashboard/order-copy-button";
import {
  ActionLink,
  MetricCard,
  ModalFrame,
  PageIntro,
  Panel,
  currency,
} from "@/app/ui";
import { requireUser } from "@/lib/auth";
import { getOrdersData } from "@/lib/orders";

const today = "2026-07-28";

export default async function OrdersPage({
  searchParams,
}: {
  searchParams?: Promise<{ modal?: string; order?: string }>;
}) {
  const user = await requireUser();
  const data = await getOrdersData(user);
  const canManageStatus = user.role !== "employee";
  const params = searchParams ? await searchParams : undefined;
  const modal = params?.modal;
  const selectedOrderId = Number(params?.order ?? 0);
  const selectedOrder =
    data.orders.find((order) => order.id === selectedOrderId) ?? null;

  return (
    <>
      <PageIntro
        eyebrow="Orders"
        title={user.role === "employee" ? "My orders" : "Orders and deliveries"}
        description={
          user.role === "employee"
            ? "Create your own orders, upload one image per order, and track your current order statuses."
            : "Create orders, review all employee orders, and update statuses like approved, rejected, cancelled, or delivered."
        }
        action={<ActionLink href="/dashboard/orders?modal=create-order" label="Create Order" />}
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total Orders" value={String(data.metrics.totalOrders)} tone="sky" />
        <MetricCard label="Total Value" value={currency(data.metrics.totalValue)} tone="emerald" />
        <MetricCard label="Delivered" value={String(data.metrics.deliveredOrders)} tone="amber" />
        <MetricCard label="Pending" value={String(data.metrics.pendingOrders)} tone="violet" />
      </section>

      <section className="grid gap-4">
        <Panel
          title={user.role === "employee" ? "My Orders" : "All Orders"}
          subtitle={
            user.role === "employee"
              ? "Only your own orders are shown here."
              : "Admin and super admin can review all employee orders."
          }
        >
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-slate-500">
                <tr>
                  <th className="pb-3 pr-4 font-medium">CSR</th>
                  <th className="pb-3 pr-4 font-medium">ID Name</th>
                  <th className="pb-3 pr-4 font-medium">Customer</th>
                  <th className="pb-3 pr-4 font-medium">Booking</th>
                  <th className="pb-3 pr-4 font-medium">Delivery</th>
                  <th className="pb-3 pr-4 font-medium">Total</th>
                  <th className="pb-3 pr-4 font-medium">Status</th>
                  <th className="pb-3 pr-4 font-medium">Image</th>
                  {canManageStatus && <th className="pb-3 pr-4 font-medium">Update</th>}
                  <th className="pb-3 font-medium">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.orders.map((order) => (
                  <tr key={order.id}>
                    <td className="py-3 pr-4 font-medium text-slate-900">{order.csrName}</td>
                    <td className="py-3 pr-4 text-slate-600">{order.idName}</td>
                    <td className="py-3 pr-4 text-slate-600">{order.customerName}</td>
                    <td className="py-3 pr-4 text-slate-600">{order.bookingDate}</td>
                    <td className="py-3 pr-4 text-slate-600">{order.deliveryDate}</td>
                    <td className="py-3 pr-4 font-semibold">{currency(order.total)}</td>
                    <td className="py-3 pr-4 text-slate-600">{order.status}</td>
                    <td className="py-3 pr-4">
                      <Link
                        href={order.imageUrl}
                        target="_blank"
                        className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-900 transition hover:bg-slate-50"
                      >
                        View
                      </Link>
                    </td>
                    {canManageStatus && (
                      <td className="py-3 pr-4">
                        <form action={updateOrderStatusAction} className="flex items-center gap-2">
                          <input type="hidden" name="orderId" value={order.id} />
                          <select name="status" defaultValue={order.status} className="min-w-[138px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-amber-400">
                            <option value="pending">Pending</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                            <option value="cancelled">Cancelled</option>
                            <option value="delivered">Delivered</option>
                          </select>
                          <button className="rounded-xl bg-slate-950 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800">
                            Save
                          </button>
                        </form>
                      </td>
                    )}
                    <td className="py-3">
                      <Link
                        href={`/dashboard/orders?modal=details&order=${order.id}`}
                        className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-900 transition hover:bg-slate-50"
                      >
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </section>

      {modal === "create-order" && (
        <ModalFrame
          title="Create Order"
          subtitle={`CSR will be ${user.fullName}. All fields are required except description.`}
          closeHref="/dashboard/orders"
        >
          <OrderForm today={today} />
        </ModalFrame>
      )}

      {modal === "details" && selectedOrder && (
        <ModalFrame
          title={`Order #${selectedOrder.id}`}
          subtitle="Full order details and image preview."
          closeHref="/dashboard/orders"
        >
          <div className="mb-4 flex justify-end">
            <OrderCopyButton order={selectedOrder} />
          </div>
          <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-3 rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <p><span className="font-semibold text-slate-900">Note:</span> {selectedOrder.note}</p>
              <p><span className="font-semibold text-slate-900">CSR:</span> {selectedOrder.csrName}</p>
              <p><span className="font-semibold text-slate-900">ID Name:</span> {selectedOrder.idName}</p>
              <p><span className="font-semibold text-slate-900">Booking Date:</span> {selectedOrder.bookingDate}</p>
              <p><span className="font-semibold text-slate-900">Delivery Date:</span> {selectedOrder.deliveryDate}</p>
              <p><span className="font-semibold text-slate-900">Customer Name:</span> {selectedOrder.customerName}</p>
              <p><span className="font-semibold text-slate-900">Address:</span> {selectedOrder.address}</p>
              <p><span className="font-semibold text-slate-900">Phone Number:</span> {selectedOrder.phoneNumber}</p>
              <p><span className="font-semibold text-slate-900">Order Details:</span> {selectedOrder.orderDetails}</p>
              <p><span className="font-semibold text-slate-900">Color:</span> {selectedOrder.color}</p>
              <p><span className="font-semibold text-slate-900">Price:</span> {currency(selectedOrder.price)}</p>
              <p><span className="font-semibold text-slate-900">Free Delivery:</span> {selectedOrder.freeDelivery ? "Yes" : "No"}</p>
              <p><span className="font-semibold text-slate-900">Delivery Price:</span> {currency(selectedOrder.deliveryPrice)}</p>
              <p><span className="font-semibold text-slate-900">Free Parking:</span> {selectedOrder.freeParking ? "Yes" : "No"}</p>
              <p><span className="font-semibold text-slate-900">Total:</span> {currency(selectedOrder.total)}</p>
              <p><span className="font-semibold text-slate-900">Payment Method:</span> {selectedOrder.paymentMethod}</p>
              <p><span className="font-semibold text-slate-900">Status:</span> {selectedOrder.status}</p>
              <p><span className="font-semibold text-slate-900">Description:</span> {selectedOrder.description || "No extra description."}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <img
                src={selectedOrder.imageUrl}
                alt={selectedOrder.customerName}
                className="h-auto w-full rounded-2xl border border-slate-200 object-cover"
              />
            </div>
          </div>
        </ModalFrame>
      )}
    </>
  );
}
