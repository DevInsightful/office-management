"use client";

import { useState } from "react";
import { formatDateDDMMYY } from "@/lib/date-format";

type CopyOrder = {
  bookingDate: string;
  deliveryDate: string;
  postcode: string;
  customerName: string;
  address: string;
  phoneNumber: string;
  orderDetails: string;
  color: string;
  price: number;
  freeDelivery: boolean;
  freeParking: boolean;
  total: number;
  paymentMethod: string;
  description: string;
  imageUrl: string;
};

function buildOrderText(order: CopyOrder, currencyCode: string) {
  const lines = [
    `Booking Date: ${formatDateDDMMYY(order.bookingDate)}`,
    `Delivery Date: ${formatDateDDMMYY(order.deliveryDate)}`,
    "",
    `Customer Name: ${order.customerName}`,
    `Address: ${order.address}`,
    `Postcode: ${order.postcode || "-"}`,
    `Phone Number: ${order.phoneNumber}`,
    `Order Details: ${order.orderDetails}`,
    `Color: ${order.color}`,
    `Price: ${currencyCode} ${order.price}`,
    `Free delivery: ${order.freeDelivery ? "Yes" : "No"}`,
    `Free parking available: ${order.freeParking ? "Yes" : "No"}`,
    `Total: ${currencyCode} ${order.total} ${order.paymentMethod}`,
  ];

  if (order.description) {
    lines.push(`Description: ${order.description}`);
  }

  return lines.join("\n");
}

export function OrderCopyButton({ order, currencyCode }: { order: CopyOrder; currencyCode: string }) {
  const [textLabel, setTextLabel] = useState("Copy text");
  const [imageLabel, setImageLabel] = useState("Copy image");

  async function handleCopyText() {
    try {
      await navigator.clipboard.writeText(buildOrderText(order, currencyCode));
      setTextLabel("Copied");
      window.setTimeout(() => setTextLabel("Copy text"), 2000);
    } catch {
      setTextLabel("Copy failed");
      window.setTimeout(() => setTextLabel("Copy text"), 2000);
    }
  }

  async function handleCopyImage() {
    try {
      if (
        typeof window !== "undefined" &&
        "ClipboardItem" in window &&
        navigator.clipboard?.write
      ) {
        const response = await fetch(order.imageUrl);
        const blob = await response.blob();

        await navigator.clipboard.write([
          new ClipboardItem({
            [blob.type || "image/jpeg"]: blob,
          }),
        ]);

        setImageLabel("Copied");
        window.setTimeout(() => setImageLabel("Copy image"), 2000);
        return;
      }
    } catch {
      // Fall back to copying the image URL.
    }

    try {
      await navigator.clipboard.writeText(order.imageUrl);
      setImageLabel("Copied URL");
      window.setTimeout(() => setImageLabel("Copy image"), 2000);
    } catch {
      setImageLabel("Copy failed");
      window.setTimeout(() => setImageLabel("Copy image"), 2000);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={handleCopyText}
        className="rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
      >
        {textLabel}
      </button>
      <button
        type="button"
        onClick={handleCopyImage}
        className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
      >
        {imageLabel}
      </button>
    </div>
  );
}
