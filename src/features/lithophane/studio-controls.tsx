"use client";
import { useId, type ReactNode } from "react";
import { Check } from "lucide-react";
export { Disclosure, FieldHelp } from "@/components/ui/studio";

export function StudioStep({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <section className="lamp-step" aria-labelledby={id}>
      <h3 id={id}>
        <span aria-hidden="true">{number}</span>
        {title}
      </h3>
      {children}
    </section>
  );
}

function VariantDrawing({ variant }: { variant: string }) {
  return (
    <svg viewBox="0 0 80 64" fill="none" aria-hidden="true">
      {variant === "sphere" ? (
        <>
          <path d="M35 10V6h10v4" stroke="currentColor" strokeWidth="2" />
          <circle
            cx="40"
            cy="34"
            r="24"
            fill="currentColor"
            fillOpacity=".1"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <ellipse
            cx="40"
            cy="34"
            rx="13"
            ry="24"
            stroke="currentColor"
            strokeOpacity=".35"
          />
          <path
            d="M17 31c14-9 32-9 46 0M17 38l13-9 12 10 10-7 11 7"
            stroke="currentColor"
            strokeOpacity=".6"
          />
        </>
      ) : variant === "0" ? (
        <>
          <path
            d="M18 9h42v45H18z"
            fill="currentColor"
            fillOpacity=".1"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path
            d="M23 46l12-16 9 9 6-7 7 14M60 9l5 4v44H23l-5-3"
            stroke="currentColor"
            strokeOpacity=".55"
          />
          <circle cx="47" cy="23" r="4" fill="currentColor" fillOpacity=".6" />
        </>
      ) : (
        <>
          <path
            d="M16 13q24-12 48 0v40q-24-12-48 0z"
            fill="currentColor"
            fillOpacity=".1"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path
            d="M21 43l13-16 9 9 8-8 9 14M20 56q20-9 40 0"
            stroke="currentColor"
            strokeOpacity=".55"
          />
          <circle cx="48" cy="19" r="4" fill="currentColor" fillOpacity=".6" />
        </>
      )}
    </svg>
  );
}

export function VariantPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const id = useId();
  const options = [
    { value: "0", name: "Plana", description: "Tu foto en un panel" },
    { value: "120", name: "Curva", description: "Relieve en un arco" },
    {
      value: "sphere",
      name: "Esfera navideña",
      description: "Un recuerdo en 360°",
    },
    ...(!["0", "120", "sphere"].includes(value)
      ? [
          {
            value,
            name: `Panel de ${value}°`,
            description: "Proyecto anterior",
          },
        ]
      : []),
  ];
  return (
    <fieldset className="lamp-variants">
      <legend className="lamp-sr-only">Variante de litofanía</legend>
      {options.map((option) => (
        <label key={option.value} className="lamp-variant">
          <input
            type="radio"
            name={id}
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
            aria-label={option.name}
          />
          <span className="lamp-variant-face">
            <Check
              className="lamp-variant-check"
              size={14}
              aria-hidden="true"
            />
            <VariantDrawing variant={option.value} />
            <strong>{option.name}</strong>
            <small>{option.description}</small>
          </span>
        </label>
      ))}
    </fieldset>
  );
}
