"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { CircleCheck, CircleAlert, Info, TriangleAlert, X } from "lucide-react";
import { Button, IconButton } from "./button";

export type ToastVariant = "success" | "info" | "warning" | "error";
export type ToastProps = {
  title: string;
  description?: ReactNode;
  variant?: ToastVariant;
  /** Milliseconds; 0 keeps the notification open until dismissed. */
  duration?: number;
  onDismiss: () => void;
  action?: { label: string; onClick: () => void };
  /** 0–100 for measured progress; null for an indeterminate loading bar. */
  progress?: number | null;
};

const icons = {
  success: CircleCheck,
  info: Info,
  warning: TriangleAlert,
  error: CircleAlert,
};

/** Controlled notification. Use a new key for each new notification. */
export function Toast({
  title,
  description,
  variant = "info",
  progress,
  duration = progress === null || variant === "error" || variant === "warning"
    ? 0
    : 6000,
  onDismiss,
  action,
}: ToastProps) {
  const Icon = icons[variant];
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const remaining = useRef(duration);
  const dismiss = useRef(onDismiss);
  useEffect(() => {
    dismiss.current = onDismiss;
  }, [onDismiss]);
  useEffect(() => {
    remaining.current = duration;
  }, [duration]);
  useEffect(() => {
    if (duration <= 0 || hovered || focused) return;
    const started = Date.now();
    const timer = window.setTimeout(() => dismiss.current(), remaining.current);
    return () => {
      window.clearTimeout(timer);
      remaining.current = Math.max(
        0,
        remaining.current - (Date.now() - started),
      );
    };
  }, [duration, hovered, focused]);

  return (
    <div
      className={`ui-toast ui-toast-${variant}`}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          setFocused(false);
      }}
    >
      <span className="ui-toast-icon" aria-hidden="true">
        <Icon size={20} />
      </span>
      <div className="ui-toast-content">
        <div role={variant === "error" ? "alert" : "status"} aria-atomic="true">
          <strong className="ui-toast-title">{title}</strong>
          {description && (
            <div className="ui-toast-description">{description}</div>
          )}
        </div>
        {progress !== undefined && (
          <div
            className={`ui-toast-progress${progress === null ? " ui-toast-progress-indeterminate" : ""}`}
            role="progressbar"
            aria-label={title}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={
              progress === null
                ? undefined
                : Math.max(0, Math.min(100, progress))
            }
          >
            <span
              style={
                progress === null
                  ? undefined
                  : { width: `${Math.max(0, Math.min(100, progress))}%` }
              }
            />
          </div>
        )}
        {action && (
          <Button
            variant="unstyled"
            className="ui-toast-action"
            onClick={action.onClick}
          >
            {action.label}
          </Button>
        )}
      </div>
      <IconButton
        label={`Cerrar notificación: ${title}`}
        className="ui-toast-close"
        onClick={onDismiss}
      >
        <X size={17} aria-hidden="true" />
      </IconButton>
    </div>
  );
}

/** Place once per page, outside scrollable or clipped preview containers. */
export function ToastViewport({ children }: { children: ReactNode }) {
  return (
    <section className="ui-toast-viewport" aria-label="Notificaciones">
      {children}
    </section>
  );
}
