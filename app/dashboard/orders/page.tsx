import { OrdersTableClient } from "@/app/dashboard/client-tables";
import { OrderForm } from "@/app/dashboard/order-form";
import { OrderCopyButton } from "@/app/dashboard/order-copy-button";
import { ActionLink, MetricCard, ModalFrame, PageIntro, currency } from "@/app/ui";
import { requireUser } from "@/lib/auth";
import { getOrdersData } from "@/lib/orders";

const today = "2026-07-29";

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
  const selectedOrder = data.orders.find((order) => order.id === selectedOrderId) ?? null;

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
        <MetricCard label="Completed Orders" value={String(data.metrics.completedOrders)} tone="emerald" />
        <MetricCard label="Approved" value={String(data.metrics.approvedOrders)} tone="amber" />
        <MetricCard label="Pending" value={String(data.metrics.pendingOrders)} tone="violet" />
      </section>

      <OrdersTableClient orders={data.orders} canManageStatus={canManageStatus} />

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
