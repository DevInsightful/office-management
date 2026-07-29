"use client";

import { PendingSubmitButton } from "@/app/pending-controls";

export function LoginSubmitButton() {
  return (
    <PendingSubmitButton
      idleLabel="Enter dashboard"
      pendingLabel="Logging in..."
      className="inline-flex w-full items-center justify-center gap-3 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
      pendingClassName="cursor-not-allowed bg-slate-700 hover:bg-slate-700"
    />
  );
}
