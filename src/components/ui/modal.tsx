"use client";
import {
  useEffect,
  useId,
  useRef,
  type ComponentProps,
  type ReactNode,
} from "react";
import { X } from "lucide-react";
import { IconButton } from "./button";

let scrollLocks = 0;
let previousOverflow = "";
type ModalProps = Omit<ComponentProps<"dialog">, "open" | "onClose"> & {
  open?: boolean;
  onClose: () => void;
};

export function Modal({
  open = true,
  onClose,
  className = "",
  children,
  onKeyDown,
  onCancel,
  onClick,
  ...props
}: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (!open) return;
    const node = ref.current!;
    const opener = document.activeElement as HTMLElement | null;
    node.showModal();
    if (scrollLocks++ === 0) {
      previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    return () => {
      node.close();
      if (--scrollLocks === 0) document.body.style.overflow = previousOverflow;
      if (opener?.isConnected) opener.focus();
    };
  }, [open]);
  if (!open) return null;
  return (
    <dialog
      {...props}
      ref={ref}
      className={`ui-modal ${className}`}
      onCancel={(event) => {
        onCancel?.(event);
        if (!event.defaultPrevented) {
          event.preventDefault();
          onClose();
        }
      }}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented || event.target !== event.currentTarget)
          return;
        const rect = event.currentTarget.getBoundingClientRect();
        if (
          event.clientX < rect.left ||
          event.clientX > rect.right ||
          event.clientY < rect.top ||
          event.clientY > rect.bottom
        )
          onClose();
      }}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        if (event.defaultPrevented || event.key !== "Tab") return;
        const controls = Array.from(
          event.currentTarget.querySelectorAll<HTMLElement>(
            "button, a[href], input, select, textarea, [tabindex]",
          ),
        ).filter(
          (node) =>
            !node.matches(
              ':disabled, [hidden], input[type="hidden"], [tabindex="-1"]',
            ) && !node.closest("[hidden], [inert]"),
        );
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
      {children}
    </dialog>
  );
}

export function ModalHeader({
  title,
  titleId,
  description,
  onClose,
  children,
  className = "",
  closeLabel = "Cerrar modal",
}: {
  title: ReactNode;
  titleId?: string;
  description?: ReactNode;
  onClose: () => void;
  children?: ReactNode;
  className?: string;
  closeLabel?: string;
}) {
  const generated = useId();
  return (
    <div className={`ui-modal-header ${className}`}>
      <div>
        {children}
        <h2 id={titleId ?? generated}>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      <IconButton
        label={closeLabel}
        className="ui-modal-close"
        onClick={onClose}
        autoFocus
      >
        <X size={20} />
      </IconButton>
    </div>
  );
}
export function ModalFooter({
  className = "",
  ...props
}: ComponentProps<"div">) {
  return <div {...props} className={`ui-modal-footer ${className}`} />;
}
