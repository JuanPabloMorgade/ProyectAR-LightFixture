"use client";
import { useId, useState, type ReactNode } from "react";
import { ChevronDown, CircleHelp } from "lucide-react";
import { IconButton } from "./button";
import { Modal, ModalHeader } from "./modal";
import "./studio.css";

export function Disclosure({
  title,
  subtitle,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <details className={`studio-disclosure ${className}`}>
      <summary>
        <span>
          {title}
          {subtitle && <small>{subtitle}</small>}
        </span>
        <ChevronDown size={18} aria-hidden="true" />
      </summary>
      <div className="studio-disclosure-content">{children}</div>
    </details>
  );
}

export function FieldHelp({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <>
      <IconButton
        label={`Ayuda: ${title}`}
        className="studio-help-button"
        onClick={() => setOpen(true)}
      >
        <CircleHelp size={17} />
      </IconButton>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        aria-labelledby={id}
        className="studio-help-modal"
      >
        <ModalHeader
          title={title}
          titleId={id}
          onClose={() => setOpen(false)}
        />
        <div className="studio-help-body">{children}</div>
      </Modal>
    </>
  );
}
