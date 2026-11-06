"use client";

import { useId, type ComponentProps, type ReactNode } from "react";

export function Switch({
  label,
  className = "",
  id,
  ...props
}: Omit<ComponentProps<"input">, "type" | "role"> & { label: ReactNode }) {
  const generated = useId();
  return (
    <label className={`ui-switch ${className}`} htmlFor={id ?? generated}>
      <input {...props} id={id ?? generated} type="checkbox" role="switch" />
      <span className="ui-switch-track" aria-hidden="true" />
      <span>{label}</span>
    </label>
  );
}
