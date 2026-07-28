"use client";

import { useEffect, useState } from "react";

function formatElapsed(startedAt: string) {
  const started = new Date(startedAt).getTime();
  const now = Date.now();
  const diff = Math.max(0, Math.floor((now - started) / 1000));

  const hours = Math.floor(diff / 3600);
  const minutes = Math.floor((diff % 3600) / 60);
  const seconds = diff % 60;

  return `${hours}h ${minutes}m ${seconds}s`;
}

export function LiveTaskTimer({
  startedAt,
}: {
  startedAt: string | null;
}) {
  const [elapsed, setElapsed] = useState(
    startedAt ? formatElapsed(startedAt) : "Not running",
  );

  useEffect(() => {
    if (!startedAt) {
      setElapsed("Not running");
      return;
    }

    setElapsed(formatElapsed(startedAt));
    const timer = window.setInterval(() => {
      setElapsed(formatElapsed(startedAt));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [startedAt]);

  return (
    <span
      className={`text-xs font-semibold ${
        startedAt ? "text-emerald-700" : "text-slate-500"
      }`}
    >
      {elapsed}
    </span>
  );
}
