import { createOrderAction, deleteOrderAction, updateOrderAction, updateOrderCommissionAction } from "@/app/actions";
import { OrdersTableClient } from "@/app/dashboard/client-tables";
import { OrderForm } from "@/app/dashboard/order-form";
import { OrderCopyButton } from "@/app/dashboard/order-copy-button";
import { PendingSubmitButton } from "@/app/pending-controls";
import { ActionLink, MetricCard, ModalFrame, PageIntro, currency } from "@/app/ui";
import { requireUser } from "@/lib/auth";
import { getOrdersData } from "@/lib/orders";

export default async function OrdersPage({
  searchParams,
}: {
  searchParams?: Promise<{ modal?: string; order?: string }>;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const user = await requireUser();
  const data = await getOrdersData(user);
  const canManageStatus = user.role !== "employee";
  const params = searchParams ? await searchParams : undefined;
  const modal = params?.modal;
  const selectedOrderId = Number(params?.order ?? 0);
  const selectedOrder = data.orders.find((order) => order.id === selectedOrderId) ?? null;

  return (
    <div className="min-w-0 overflow-x-hidden space-y-4">
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

      <OrdersTableClient orders={data.orders} canManageStatus={canManageStatus} currencyCode={data.currency} />

      {modal === "create-order" && (
        <ModalFrame
          title="Create Order"
          subtitle={`CSR will be ${user.fullName}. All fields are required except description.`}
          closeHref="/dashboard/orders"
        >
          <OrderForm
            today={today}
            action={createOrderAction}
            submitLabel="Create order"
            pendingLabel="Creating order..."
          />
        </ModalFrame>
      )}

      {modal === "details" && selectedOrder && (
        <ModalFrame
          title={`Order #${selectedOrder.id}`}
          subtitle="Full order details and image preview."
          closeHref="/dashboard/orders"
        >
          <div className="mb-4 flex flex-wrap items-center justify-end gap-2">
            <OrderCopyButton order={selectedOrder} currencyCode={data.currency} />
            <ActionLink href={`/dashboard/orders?modal=edit-order&order=${selectedOrder.id}`} label="Edit Order" />
            <form action={deleteOrderAction}>
              <input type="hidden" name="orderId" value={selectedOrder.id} />
              <PendingSubmitButton
                idleLabel="Delete Order"
                pendingLabel="Deleting..."
                className="inline-flex items-center justify-center gap-3 rounded-2xl border border-rose-200 px-4 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
                pendingClassName="cursor-not-allowed bg-rose-50 text-rose-400 hover:bg-rose-50"
              />
            </form>
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
              <p><span className="font-semibold text-slate-900">Price:</span> {currency(selectedOrder.price, data.currency)}</p>
              <p><span className="font-semibold text-slate-900">Free Delivery:</span> {selectedOrder.freeDelivery ? "Yes" : "No"}</p>
              <p><span className="font-semibold text-slate-900">Delivery Price:</span> {currency(selectedOrder.deliveryPrice, data.currency)}</p>
              <p><span className="font-semibold text-slate-900">Free Parking:</span> {selectedOrder.freeParking ? "Yes" : "No"}</p>
              <p><span className="font-semibold text-slate-900">Total:</span> {currency(selectedOrder.total, data.currency)}</p>
              <p><span className="font-semibold text-slate-900">Payment Method:</span> {selectedOrder.paymentMethod}</p>
              <p><span className="font-semibold text-slate-900">Status:</span> {selectedOrder.status}</p>
              {canManageStatus ? <p><span className="font-semibold text-slate-900">Commission:</span> {currency(selectedOrder.commissionAmount, data.currency)}</p> : null}
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
          {canManageStatus && selectedOrder.status === "delivered" && selectedOrder.csrRole === "employee" ? (
            <form action={updateOrderCommissionAction} className="mt-4 rounded-3xl border border-slate-200 bg-white p-4">
              <input type="hidden" name="orderId" value={selectedOrder.id} />
              <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Commission for CSR</label>
                  <input
                    name="commissionAmount"
                    type="number"
                    min="0"
                    step="0.01"
                    defaultValue={selectedOrder.commissionAmount}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-amber-400"
                  />
                </div>
                <PendingSubmitButton
                  idleLabel="Save commission"
                  pendingLabel="Saving..."
                  className="inline-flex items-center justify-center gap-3 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                  pendingClassName="cursor-not-allowed bg-slate-700 hover:bg-slate-700"
                />
              </div>
            </form>
          ) : null}
        </ModalFrame>
      )}

      {modal === "edit-order" && selectedOrder && (
        <ModalFrame
          title={`Edit Order #${selectedOrder.id}`}
          subtitle="Update the order details. Image stays unchanged during edit."
          closeHref={`/dashboard/orders?modal=details&order=${selectedOrder.id}`}
        >
          <OrderForm
            today={today}
            action={updateOrderAction}
            submitLabel="Update order"
            pendingLabel="Updating order..."
            requireImage={false}
            initialValues={{
              id: selectedOrder.id,
              note: selectedOrder.note,
              idName: selectedOrder.idName,
              bookingDate: selectedOrder.bookingDate,
              deliveryDate: selectedOrder.deliveryDate,
              customerName: selectedOrder.customerName,
              address: selectedOrder.address,
              phoneNumber: selectedOrder.phoneNumber,
              orderDetails: selectedOrder.orderDetails,
              color: selectedOrder.color,
              price: selectedOrder.price,
              freeDelivery: selectedOrder.freeDelivery,
              deliveryPrice: selectedOrder.deliveryPrice,
              freeParking: selectedOrder.freeParking,
              paymentMethod: selectedOrder.paymentMethod,
              description: selectedOrder.description,
            }}
          />
        </ModalFrame>
      )}
    </div>
  );
}
