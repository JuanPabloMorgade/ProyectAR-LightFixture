"use client";
import { useId, type ComponentProps, type ReactNode } from "react";

export function Input({ className = "", ...props }: ComponentProps<"input">) {
  return <input {...props} className={`ui-control ${className}`} />;
}
export function TextArea({
  className = "",
  ...props
}: ComponentProps<"textarea">) {
  return (
    <textarea {...props} className={`ui-control ui-textarea ${className}`} />
  );
}
export type SelectOption = {
  value: string | number;
  label: ReactNode;
  disabled?: boolean;
};
export function Select({
  className = "",
  options,
  children,
  ...props
}: ComponentProps<"select"> & { options?: readonly SelectOption[] }) {
  return (
    <select {...props} className={`ui-control ui-select ${className}`}>
      {options
        ? options.map((option) => (
            <option
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </option>
          ))
        : children}
    </select>
  );
}

type FieldOptions = {
  label: ReactNode;
  description?: ReactNode;
  error?: ReactNode;
  fieldClassName?: string;
  id?: string;
};
type ControlMeta = {
  id: string;
  "aria-describedby"?: string;
  "aria-invalid"?: true;
};
const describedBy = (...ids: (string | undefined)[]) =>
  ids.filter(Boolean).join(" ") || undefined;

/** For custom controls; ordinary fields below avoid repeating this layout. */
export function FormField({
  label,
  description,
  error,
  fieldClassName = "",
  id,
  children,
}: FieldOptions & { children: (meta: ControlMeta) => ReactNode }) {
  const generated = useId();
  const controlId = id ?? generated;
  const meta: ControlMeta = {
    id: controlId,
    "aria-describedby": describedBy(
      description ? `${controlId}-description` : undefined,
      error ? `${controlId}-error` : undefined,
    ),
    "aria-invalid": error ? true : undefined,
  };
  return (
    <div className={`ui-field ${fieldClassName}`}>
      <label className="ui-label" htmlFor={controlId}>
        {label}
      </label>
      {children(meta)}
      {description && (
        <p className="ui-field-hint" id={`${controlId}-description`}>
          {description}
        </p>
      )}
      {error && (
        <p className="ui-field-error" role="alert" id={`${controlId}-error`}>
          {error}
        </p>
      )}
    </div>
  );
}

type TextFieldProps = FieldOptions &
  ComponentProps<typeof Input> & { unit?: ReactNode };
export function TextField({
  label,
  description,
  error,
  fieldClassName,
  id,
  unit,
  ...props
}: TextFieldProps) {
  return (
    <FormField
      label={label}
      description={description}
      error={error}
      fieldClassName={fieldClassName}
      id={id}
    >
      {(meta) => {
        const input = (
          <Input
            type="text"
            {...props}
            {...meta}
            aria-describedby={describedBy(
              meta["aria-describedby"],
              props["aria-describedby"],
            )}
            aria-invalid={meta["aria-invalid"] ?? props["aria-invalid"]}
          />
        );
        return unit ? (
          <div
            className="ui-unit-input"
            data-disabled={props.disabled || undefined}
          >
            {input}
            <span aria-hidden="true">{unit}</span>
          </div>
        ) : (
          input
        );
      }}
    </FormField>
  );
}
export function NumberField(props: Omit<TextFieldProps, "type">) {
  return <TextField {...props} type="number" />;
}
export function SelectField({
  label,
  description,
  error,
  fieldClassName,
  id,
  ...props
}: FieldOptions & ComponentProps<typeof Select>) {
  return (
    <FormField
      label={label}
      description={description}
      error={error}
      fieldClassName={fieldClassName}
      id={id}
    >
      {(meta) => (
        <Select
          {...props}
          {...meta}
          aria-describedby={describedBy(
            meta["aria-describedby"],
            props["aria-describedby"],
          )}
          aria-invalid={meta["aria-invalid"] ?? props["aria-invalid"]}
        />
      )}
    </FormField>
  );
}
export function TextAreaField({
  label,
  description,
  error,
  fieldClassName,
  id,
  ...props
}: FieldOptions & ComponentProps<typeof TextArea>) {
  return (
    <FormField
      label={label}
      description={description}
      error={error}
      fieldClassName={fieldClassName}
      id={id}
    >
      {(meta) => (
        <TextArea
          {...props}
          {...meta}
          aria-describedby={describedBy(
            meta["aria-describedby"],
            props["aria-describedby"],
          )}
          aria-invalid={meta["aria-invalid"] ?? props["aria-invalid"]}
        />
      )}
    </FormField>
  );
}
export function RangeField({
  label,
  description,
  error,
  fieldClassName = "",
  id,
  valueLabel,
  ...props
}: FieldOptions &
  Omit<ComponentProps<"input">, "type"> & { valueLabel?: ReactNode }) {
  return (
    <FormField
      label={
        <>
          {label}
          {valueLabel != null && <span aria-hidden="true">{valueLabel}</span>}
        </>
      }
      description={description}
      error={error}
      fieldClassName={`ui-range-field ${fieldClassName}`}
      id={id}
    >
      {(meta) => (
        <Input
          {...props}
          {...meta}
          type="range"
          aria-describedby={describedBy(
            meta["aria-describedby"],
            props["aria-describedby"],
          )}
        />
      )}
    </FormField>
  );
}
export function Checkbox({
  label,
  className = "",
  id,
  ...props
}: Omit<ComponentProps<"input">, "type"> & { label: ReactNode }) {
  const generated = useId();
  return (
    <label className={`ui-checkbox ${className}`} htmlFor={id ?? generated}>
      <input {...props} id={id ?? generated} type="checkbox" />
      {label}
    </label>
  );
}
export function FileInput({
  hidden = true,
  ...props
}: Omit<ComponentProps<"input">, "type">) {
  return <input {...props} hidden={hidden} type="file" />;
}
