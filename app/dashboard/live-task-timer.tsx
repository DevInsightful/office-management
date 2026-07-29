"use client";

import { useEffect, useState } from "react";

function formatElapsed(startedAt: string, currentTime: number) {
  const started = new Date(startedAt).getTime();
  const diff = Math.max(0, Math.floor((currentTime - started) / 1000));

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
  const [currentTime, setCurrentTime] = useState(() => Date.now());

  useEffect(() => {
    if (!startedAt) {
      return;
    }

    const timer = window.setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => window.clearInterval(timer);
  }, [startedAt]);

  const elapsed = startedAt ? formatElapsed(startedAt, currentTime) : "Not running";

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
