"use client";

import { useState } from "react";
import { currency } from "@/lib/currency";

type CopyOrder = {
  csrName: string;
  idName: string;
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
  imageUrl: string;
};

function formatCopyDate(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return `${match[2]}-${match[3]}-${match[1]}`;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  }).format(date).replaceAll("/", "-");
}

function buildOrderText(order: CopyOrder, currencyCode: string) {
  const lines = [
    `CSR : ${order.csrName}`,
    `ID Name : ${order.idName}`,
    "",
    `Booking Date :  ${formatCopyDate(order.bookingDate)}`,
    `Delivery Date :  ${formatCopyDate(order.deliveryDate)}`,
    "",
    `Customer Name: ${order.customerName}`,
    `Address 🏠: ${order.address}`,
    `Postcode : ${order.postcode}`,
    `Phone Number : ${order.phoneNumber}`,
    `Order Details : ${order.orderDetails}`,
    "",
    `Color  : ${order.color}`,
    `Price   : ${currency(order.price, currencyCode)}`,
    `Free delivery  ${order.freeDelivery ? "✅" : "❌"}`,
    `Free parking available ${order.freeParking ? "✅" : "❌"}`,
    "---------------",
    `Total: ${currency(order.total, currencyCode)} ${order.paymentMethod.replaceAll(" ", " ")}`,
  ];

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
