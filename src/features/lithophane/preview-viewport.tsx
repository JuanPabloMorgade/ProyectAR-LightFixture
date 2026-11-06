"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Maximize, Minimize } from "lucide-react";
import { IconButton } from "@/components/ui";

export function PreviewViewport({
  controls,
  children,
}: {
  controls: ReactNode;
  children: ReactNode;
}) {
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const [mode, setMode] = useState<"inline" | "native" | "window">("inline");
  const expanded = mode !== "inline";

  useEffect(() => {
    const changed = () =>
      setMode(
        document.fullscreenElement === root.current ? "native" : "inline",
      );
    document.addEventListener("fullscreenchange", changed);
    return () => document.removeEventListener("fullscreenchange", changed);
  }, []);

  useEffect(() => {
    if (!expanded) return;
    button.current?.focus();
    return () => button.current?.focus();
  }, [expanded]);

  useEffect(() => {
    if (mode !== "window") return;
    // In browsers without native fullscreen, isolate the expanded viewer like a modal.
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const siblings: { element: HTMLElement; inert: boolean }[] = [];
    let current: HTMLElement | null = root.current;
    while (current && current !== document.body) {
      for (const sibling of current.parentElement?.children ?? [])
        if (sibling !== current && sibling instanceof HTMLElement) {
          siblings.push({ element: sibling, inert: sibling.inert });
          sibling.inert = true;
        }
      current = current.parentElement;
    }
    return () => {
      document.body.style.overflow = overflow;
      for (const { element, inert } of siblings) element.inert = inert;
    };
  }, [mode]);

  async function toggle() {
    const node = root.current;
    if (!node) return;
    if (document.fullscreenElement === node) {
      await document.exitFullscreen();
    } else if (mode === "window") {
      setMode("inline");
    } else {
      try {
        if (!node.requestFullscreen) throw new Error("Fullscreen unavailable");
        await node.requestFullscreen();
      } catch {
        setMode("window");
      }
    }
  }

  return (
    <div
      ref={root}
      className={`lamp-preview-viewport${expanded ? " is-expanded" : ""}${mode === "window" ? " is-window-fullscreen" : ""}`}
      role={mode === "window" ? "dialog" : undefined}
      aria-modal={mode === "window" ? true : undefined}
      aria-label="Vista previa 3D"
      onKeyDown={(event) => {
        if (expanded && event.key === "Escape") {
          event.preventDefault();
          if (document.fullscreenElement === root.current)
            void document.exitFullscreen().catch(() => {});
          else setMode("inline");
        }
        if (!expanded || event.key !== "Tab") return;
        const controls = Array.from(
          event.currentTarget.querySelectorAll<HTMLElement>(
            "button, input, select, [tabindex]",
          ),
        ).filter((node) => !node.matches(':disabled, [tabindex="-1"]'));
        const first = controls[0],
          last = controls.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }}
    >
      <div className="preview-toolbar">
        <span className="preview-title">
          <span /> VISTA PREVIA 3D
        </span>
        <div className="lamp-preview-controls">{controls}</div>
        <IconButton
          ref={button}
          className="lamp-fullscreen-toggle"
          label={
            expanded ? "Salir de pantalla completa" : "Ver en pantalla completa"
          }
          aria-pressed={expanded}
          onClick={toggle}
        >
          {expanded ? (
            <Minimize size={20} aria-hidden="true" />
          ) : (
            <Maximize size={20} aria-hidden="true" />
          )}
        </IconButton>
      </div>
      {children}
    </div>
  );
}
