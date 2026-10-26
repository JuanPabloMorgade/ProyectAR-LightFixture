"use client";
import type { ReactNode } from "react";
import { Button } from "./button";

export function SegmentedControl<T extends string | number>({
  label,
  options,
  value,
  onValueChange,
  disabled = false,
  className = "segmented",
}: {
  label: string;
  options: readonly { value: T; label: ReactNode; disabled?: boolean }[];
  value: T;
  onValueChange: (value: T) => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <div role="group" aria-label={label} className={className}>
      {options.map((option) => (
        <Button
          key={option.value}
          variant="unstyled"
          className={value === option.value ? "selected" : ""}
          aria-pressed={value === option.value}
          disabled={disabled || option.disabled}
          onClick={() => onValueChange(option.value)}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}
