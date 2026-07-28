"use client";

import { useFormStatus } from "react-dom";

export function LoginSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={`inline-flex w-full items-center justify-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-white transition ${
        pending ? "cursor-not-allowed bg-slate-700" : "bg-slate-950 hover:bg-slate-800"
      }`}
    >
      {pending && (
        <span
          className="h-4 w-4 animate-spin rounded-full border-2 border-white/35 border-t-white"
          aria-hidden="true"
        />
      )}
      <span>{pending ? "Logging in..." : "Enter dashboard"}</span>
    </button>
  );
}
