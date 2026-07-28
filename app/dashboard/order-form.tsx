"use client";

import { useMemo, useState } from "react";

import { createOrderAction } from "@/app/actions";
import { Field, inputClass, primaryButton, textareaClass } from "@/app/ui";

export function OrderForm({ today }: { today: string }) {
  const [price, setPrice] = useState("");
  const [deliveryMode, setDeliveryMode] = useState("free");
  const [deliveryPrice, setDeliveryPrice] = useState("");

  const total = useMemo(() => {
    const basePrice = Number(price || "0");
    const charge = deliveryMode === "paid" ? Number(deliveryPrice || "0") : 0;
    return basePrice + charge;
  }, [price, deliveryMode, deliveryPrice]);

  return (
    <form action={createOrderAction} className="space-y-3">
      <Field label="Note">
        <input name="note" placeholder="Delivery will be Wednesday" className={inputClass} />
      </Field>
      <Field label="ID Name">
        <input name="idName" placeholder="WhatsApp" className={inputClass} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Booking Date">
          <input name="bookingDate" type="date" defaultValue={today} className={inputClass} />
        </Field>
        <Field label="Delivery Date">
          <input name="deliveryDate" type="date" defaultValue={today} className={inputClass} />
        </Field>
      </div>
      <Field label="Customer Name">
        <input name="customerName" placeholder="@Lilia Wigley" className={inputClass} />
      </Field>
      <Field label="Address">
        <textarea name="address" rows={3} className={textareaClass} placeholder="41 Ladywell Prospect, Sawbridgeworth..." />
      </Field>
      <Field label="Phone Number">
        <input name="phoneNumber" placeholder="07846049793" className={inputClass} />
      </Field>
      <Field label="Order Details">
        <textarea name="orderDetails" rows={3} className={textareaClass} placeholder="Double bed with ottoman and orthopedic mattress" />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Color">
          <input name="color" placeholder="Mushroom" className={inputClass} />
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
          <select name="freeParking" defaultValue="true" className={inputClass}>
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
      {deliveryMode === "paid" && <input type="hidden" name="freeDelivery" value="false" />}
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
          <input name="paymentMethod" defaultValue="Cash On Delivery" className={inputClass} />
        </Field>
      </div>
      <Field label="Image">
        <input name="image" type="file" accept="image/*" className={inputClass} />
      </Field>
      <Field label="Description (Optional)">
        <textarea name="description" rows={3} className={textareaClass} placeholder="Optional extra notes" />
      </Field>
      <button className={primaryButton}>Create order</button>
    </form>
  );
}
