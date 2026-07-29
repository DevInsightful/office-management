"use client";

import { useFormStatus } from "react-dom";

type PendingSubmitButtonProps = {
  idleLabel: string;
  pendingLabel: string;
  className: string;
  pendingClassName?: string;
};

export function PendingSubmitButton({
  idleLabel,
  pendingLabel,
  className,
  pendingClassName,
}: PendingSubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={`${className} ${pending ? pendingClassName ?? "cursor-not-allowed opacity-70" : ""}`}
    >
      {pending ? (
        <>
          <span
            className="h-4 w-4 animate-spin rounded-full border-2 border-current/30 border-t-current"
            aria-hidden="true"
          />
          <span>{pendingLabel}</span>
        </>
      ) : (
        <span>{idleLabel}</span>
      )}
    </button>
  );
}

export function InlinePendingState({
  idleLabel = "",
  pendingLabel,
  className = "text-xs font-medium text-slate-500",
}: {
  idleLabel?: string;
  pendingLabel: string;
  className?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      {pending ? (
        <>
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" aria-hidden="true" />
          <span>{pendingLabel}</span>
        </>
      ) : (
        idleLabel
      )}
    </span>
  );
}
