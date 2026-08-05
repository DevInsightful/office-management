"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { useGeolocation } from "@/hooks/useGeolocation";
import { getPublicAttendanceConfig } from "@/lib/config";

type CheckInResponse = {
  success: boolean;
  distance?: number;
  message: string;
};

export function AttendanceCheckIn() {
  const router = useRouter();
  const { isLoading, error, requestLocation, retry, permission } = useGeolocation();
  const { maxGpsAccuracyMeters } = getPublicAttendanceConfig();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

  async function handleCheckIn() {
    setMessage(null);
    setDistance(null);
    setAccuracy(null);
    setStatus("idle");

    // First collect the browser GPS fix, then submit it for server-side validation.
    const location = await requestLocation();

    if (!location) {
      setStatus("error");
      return;
    }

    setAccuracy(location.accuracy);

    if (location.accuracy > maxGpsAccuracyMeters) {
      setStatus("error");
      setMessage(
        `GPS accuracy is too low (${location.accuracy.toFixed(1)} m). Required: ${maxGpsAccuracyMeters} m or better.`,
      );
      return;
    }

    setIsSubmitting(true);

    try {
      // The backend is the only place that decides whether the check-in is valid.
      const response = await fetch("/api/attendance/check-in", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(location),
      });

      const contentType = response.headers.get("content-type") ?? "";

      if (!contentType.includes("application/json")) {
        setStatus("error");
        setMessage(`Attendance request failed with status ${response.status}.`);
        return;
      }

      const payload = (await response.json()) as CheckInResponse;

      setMessage(payload.message);
      setDistance(typeof payload.distance === "number" ? payload.distance : null);
      setStatus(payload.success ? "success" : "error");
      if (payload.success) {
        router.refresh();
      }
    } catch {
      setStatus("error");
      setMessage("Unable to submit attendance right now.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const buttonLabel = isLoading
    ? "Requesting GPS..."
    : isSubmitting
      ? "Marking attendance..."
      : "Check in with GPS";
  const locationError = message ?? error;
  const showPermissionError = permission === "denied" || Boolean(error);
  const showDistanceError = status === "error" && !showPermissionError && message && distance !== null;
  const showGenericError = status === "error" && !showPermissionError && Boolean(message) && distance === null;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
        <p className="font-medium text-slate-900">GPS office check-in</p>
        <p className="mt-1 leading-6">
          Attendance is marked only after the server verifies your live coordinates against the office geofence.
        </p>
        <p className="mt-2 text-xs text-slate-500">
          Current accuracy requirement: {maxGpsAccuracyMeters} metres or better.
        </p>
      </div>

      <button
        type="button"
        onClick={handleCheckIn}
        disabled={isLoading || isSubmitting}
        className="inline-flex w-full items-center justify-center rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
      >
        {buttonLabel}
      </button>

      {showPermissionError || showGenericError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          <p>{locationError}</p>
          {accuracy !== null ? <p className="mt-2">Measured accuracy: {accuracy.toFixed(1)} metres.</p> : null}
          <button
            type="button"
            onClick={retry}
            className="mt-3 inline-flex rounded-xl border border-rose-200 bg-white px-3 py-2 font-semibold text-rose-700 transition hover:bg-rose-100"
          >
            Retry
          </button>
        </div>
      ) : null}

      {status === "success" && message ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          <p>{message}</p>
          {accuracy !== null ? <p className="mt-2">Measured accuracy: {accuracy.toFixed(1)} metres.</p> : null}
          {distance !== null ? <p className="mt-2">Distance from office: {distance.toFixed(1)} metres.</p> : null}
        </div>
      ) : null}

      {showDistanceError ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <p>{message}</p>
          {accuracy !== null ? <p className="mt-2">Measured accuracy: {accuracy.toFixed(1)} metres.</p> : null}
          <p className="mt-2">Distance from office: {distance.toFixed(1)} metres.</p>
        </div>
      ) : null}
    </div>
  );
}
