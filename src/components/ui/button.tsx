import type { ComponentProps } from "react";

export type ButtonProps = ComponentProps<"button"> & {
  variant?: "primary" | "secondary" | "ghost" | "unstyled";
  loading?: boolean;
};

export function Button({
  variant = "secondary",
  type = "button",
  loading = false,
  disabled,
  className = "",
  ...props
}: ButtonProps) {
  const style =
    variant === "unstyled"
      ? ""
      : variant === "ghost"
        ? "ui-button-ghost"
        : `button ${variant}`;
  return (
    <button
      {...props}
      type={type}
      className={`${style} ${className}`.trim()}
      disabled={disabled || loading}
      aria-busy={loading || props["aria-busy"]}
    />
  );
}

export function IconButton({
  label,
  className = "",
  ...props
}: ButtonProps & { label: string }) {
  return (
    <Button
      variant="unstyled"
      {...props}
      className={`ui-icon-button ${className}`}
      aria-label={label}
      title={props.title ?? label}
    />
  );
}
