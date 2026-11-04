"use client";
import { Check, Trash2 } from "lucide-react";
import { IconButton } from "./button";
import { FormField, Select } from "./form";

export function SavedDesigns({
  items,
  selected,
  onSelect,
  onOpen,
  onRemove,
  busy = false,
  fieldClassName = "",
}: {
  items: { id: string; label: string }[];
  selected: string;
  onSelect: (id: string) => void;
  onOpen: () => void;
  onRemove: () => void;
  busy?: boolean;
  fieldClassName?: string;
}) {
  return (
    <FormField
      label="Diseños guardados"
      fieldClassName={`ui-saved-designs ${fieldClassName}`}
    >
      {(meta) => (
        <div>
          <Select
            {...meta}
            value={selected}
            onChange={(e) => onSelect(e.target.value)}
            disabled={busy}
          >
            <option value="">Elegir diseño…</option>
            {items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </Select>
          <IconButton
            label="Aplicar diseño guardado"
            disabled={!selected || busy}
            onClick={onOpen}
          >
            <Check size={16} aria-hidden="true" />
          </IconButton>
          <IconButton
            label="Eliminar diseño guardado"
            disabled={!selected || busy}
            onClick={onRemove}
          >
            <Trash2 size={16} aria-hidden="true" />
          </IconButton>
        </div>
      )}
    </FormField>
  );
}
