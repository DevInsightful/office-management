"use client";

import { useState } from "react";
import { Field, inputClass } from "@/app/ui";

const MAX_SOURCE_SIZE = 20 * 1024 * 1024;
const MAX_UPLOAD_SIZE = 750 * 1024;

function formatSize(bytes: number) {
  return bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function canvasBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", quality));
}

async function optimizeImage(file: File) {
  if (file.size <= MAX_UPLOAD_SIZE) return file;
  if (file.size > MAX_SOURCE_SIZE) throw new Error("Choose an image smaller than 20 MB.");

  const bitmap = await createImageBitmap(file);
  try {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) throw new Error("This browser could not optimize the image.");

    let scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    for (let dimensionAttempt = 0; dimensionAttempt < 6; dimensionAttempt += 1) {
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

      for (const quality of [0.82, 0.72, 0.62, 0.52, 0.42]) {
        const blob = await canvasBlob(canvas, quality);
        if (blob && blob.size <= MAX_UPLOAD_SIZE) {
          const name = file.name.replace(/\.[^.]+$/, "") || "order-image";
          return new File([blob], `${name}.webp`, { type: "image/webp", lastModified: Date.now() });
        }
      }
      scale *= 0.8;
    }
  } finally {
    bitmap.close();
  }
  throw new Error("The image could not be reduced below 750 KB. Choose a smaller image.");
}

export function OptimizedOrderImageInput({
  required = false,
  onProcessingChange,
}: {
  required?: boolean;
  onProcessingChange: (processing: boolean) => void;
}) {
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);

  async function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const original = input.files?.[0];
    if (!original) {
      setMessage("");
      setFailed(false);
      return;
    }

    onProcessingChange(true);
    setFailed(false);
    setMessage("Optimizing image…");
    try {
      const optimized = await optimizeImage(original);
      const transfer = new DataTransfer();
      transfer.items.add(optimized);
      input.files = transfer.files;
      setMessage(optimized === original ? `Image ready (${formatSize(optimized.size)}).` : `Optimized to ${formatSize(optimized.size)}.`);
    } catch (error) {
      input.value = "";
      setFailed(true);
      setMessage(error instanceof Error ? error.message : "Image optimization failed. Choose another image.");
    } finally {
      onProcessingChange(false);
    }
  }

  return <Field label={required ? "Image (optimized before upload)" : "Replace image (optional, optimized before upload)"}>
    <input name="image" type="file" accept="image/*" required={required} onChange={handleChange} className={inputClass} />
    <p role={failed ? "alert" : "status"} className={`mt-2 text-xs ${failed ? "text-rose-700" : "text-slate-500"}`}>{message || "Images above 750 KB are resized and compressed before upload. Source limit: 20 MB."}</p>
  </Field>;
}
