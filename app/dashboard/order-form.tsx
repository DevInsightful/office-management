"use client";

import { useMemo, useState } from "react";

import { PendingSubmitButton } from "@/app/pending-controls";
import { Field, inputClass, primaryButton, textareaClass } from "@/app/ui";

type OrderFormValues = {
  id?: number;
  note?: string;
  idName?: string;
  bookingDate?: string;
  deliveryDate?: string;
  customerName?: string;
  address?: string;
  phoneNumber?: string;
  orderDetails?: string;
  color?: string;
  price?: number;
  freeDelivery?: boolean;
  deliveryPrice?: number;
  freeParking?: boolean;
  paymentMethod?: string;
  description?: string;
};

export function OrderForm({
  today,
  action,
  submitLabel,
  pendingLabel,
  initialValues,
  requireImage = true,
}: {
  today: string;
  action: (formData: FormData) => void | Promise<void>;
  submitLabel: string;
  pendingLabel: string;
  initialValues?: OrderFormValues;
  requireImage?: boolean;
}) {
  const [price, setPrice] = useState(initialValues?.price ? String(initialValues.price) : "");
  const [deliveryMode, setDeliveryMode] = useState(initialValues?.freeDelivery === false ? "paid" : "free");
  const [deliveryPrice, setDeliveryPrice] = useState(
    initialValues?.freeDelivery === false && initialValues.deliveryPrice
      ? String(initialValues.deliveryPrice)
      : "",
  );

  const total = useMemo(() => {
    const basePrice = Number(price || "0");
    const charge = deliveryMode === "paid" ? Number(deliveryPrice || "0") : 0;
    return basePrice + charge;
  }, [deliveryMode, deliveryPrice, price]);

  return (
    <form action={action} className="space-y-3">
      {initialValues?.id ? <input type="hidden" name="orderId" value={initialValues.id} /> : null}
      <Field label="Note">
        <input name="note" defaultValue={initialValues?.note} placeholder="Delivery will be Wednesday" className={inputClass} />
      </Field>
      <Field label="ID Name">
        <input name="idName" defaultValue={initialValues?.idName} placeholder="WhatsApp" className={inputClass} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Booking Date">
          <input name="bookingDate" type="date" defaultValue={initialValues?.bookingDate ?? today} className={inputClass} />
        </Field>
        <Field label="Delivery Date">
          <input name="deliveryDate" type="date" defaultValue={initialValues?.deliveryDate ?? today} className={inputClass} />
        </Field>
      </div>
      <Field label="Customer Name">
        <input name="customerName" defaultValue={initialValues?.customerName} placeholder="@Lilia Wigley" className={inputClass} />
      </Field>
      <Field label="Address">
        <textarea name="address" rows={3} defaultValue={initialValues?.address} className={textareaClass} placeholder="41 Ladywell Prospect, Sawbridgeworth..." />
      </Field>
      <Field label="Phone Number">
        <input name="phoneNumber" defaultValue={initialValues?.phoneNumber} placeholder="07846049793" className={inputClass} />
      </Field>
      <Field label="Order Details">
        <textarea
          name="orderDetails"
          rows={3}
          defaultValue={initialValues?.orderDetails}
          className={textareaClass}
          placeholder="Double bed with ottoman and orthopedic mattress"
        />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Color">
          <input name="color" defaultValue={initialValues?.color} placeholder="Mushroom" className={inputClass} />
        </Field>
        <Field label="Price">
          <input
            name="price"
            type="number"
            min="0"
            step="0.01"
            placeholder="349"
            className={inputClass}
            value={price}
            onChange={(event) => setPrice(event.target.value)}
          />
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Delivery">
          <select
            name="deliveryMode"
            value={deliveryMode}
            onChange={(event) => setDeliveryMode(event.target.value)}
            className={inputClass}
          >
            <option value="free">Free delivery</option>
            <option value="paid">Paid delivery</option>
          </select>
        </Field>
        <Field label="Free Parking Available">
          <select
            name="freeParking"
            defaultValue={initialValues?.freeParking === false ? "false" : "true"}
            className={inputClass}
          >
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        </Field>
      </div>
      {deliveryMode === "paid" ? (
        <Field label="Delivery Price">
          <input
            name="deliveryPrice"
            type="number"
            min="0"
            step="0.01"
            placeholder="20"
            className={inputClass}
            value={deliveryPrice}
            onChange={(event) => setDeliveryPrice(event.target.value)}
          />
        </Field>
      ) : (
        <>
          <input type="hidden" name="deliveryPrice" value="0" />
          <input type="hidden" name="freeDelivery" value="true" />
        </>
      )}
      {deliveryMode === "paid" ? <input type="hidden" name="freeDelivery" value="false" /> : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Total">
          <input
            name="total"
            type="number"
            readOnly
            value={Number.isFinite(total) ? total : 0}
            className={`${inputClass} bg-slate-50`}
          />
        </Field>
        <Field label="Payment Method">
          <input name="paymentMethod" defaultValue={initialValues?.paymentMethod ?? "Cash On Delivery"} className={inputClass} />
        </Field>
      </div>
      {requireImage ? (
        <Field label="Image">
          <input name="image" type="file" accept="image/*" className={inputClass} />
        </Field>
      ) : null}
      <Field label="Description (Optional)">
        <textarea name="description" rows={3} defaultValue={initialValues?.description} className={textareaClass} placeholder="Optional extra notes" />
      </Field>
      <PendingSubmitButton
        idleLabel={submitLabel}
        pendingLabel={pendingLabel}
        className={`${primaryButton} gap-3`}
        pendingClassName="cursor-not-allowed bg-slate-700 hover:bg-slate-700"
      />
    </form>
  );
}
