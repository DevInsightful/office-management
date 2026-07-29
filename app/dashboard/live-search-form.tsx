"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { Field, inputClass } from "@/app/ui";

type LiveSearchFormProps = {
  label?: string;
  placeholder: string;
  initialValue: string;
  preserve?: Record<string, string | undefined>;
};

export function LiveSearchForm({
  label = "Search",
  placeholder,
  initialValue,
  preserve = {},
}: LiveSearchFormProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const next = new URLSearchParams();

      for (const [key, preservedValue] of Object.entries(preserve)) {
        if (!preservedValue) {
          continue;
        }

        next.set(key, preservedValue);
      }

      const trimmed = value.trim();

      if (trimmed) {
        next.set("q", trimmed);
      }

      const query = next.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [pathname, preserve, router, value]);

  return (
    <Field label={label}>
      <input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        className={inputClass}
      />
    </Field>
  );
}
