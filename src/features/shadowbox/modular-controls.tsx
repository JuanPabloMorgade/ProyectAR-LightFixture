"use client";
import { useState } from "react";
import { Button, NumberField, SelectField } from "@/components/ui";
import type { BoxSettings } from "./engine";
import type { Fabrication } from "./fabrication";
import {
  defaultModular,
  modularLayout,
  modularLightPosition,
  modularCount,
  type ModularSettings,
} from "./modular";

function Measure({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <NumberField
      label={label}
      unit="mm"
      value={draft ?? String(value)}
      min={min}
      max={max}
      step={0.1}
      onChange={(e) => {
        const text = e.currentTarget.value;
        setDraft(text);
        if (text !== "" && Number.isFinite(Number(text)))
          onChange(Number(text));
      }}
      onBlur={() => setDraft(null)}
    />
  );
}
export default function ModularControls({
  settings,
  fabrication,
  onChange,
  onLightPosition,
}: {
  settings: BoxSettings;
  fabrication: Fabrication;
  onChange: (m: ModularSettings) => void;
  onLightPosition: (n: number) => void;
}) {
  const m = fabrication.modular ?? defaultModular;
  const update = (patch: Partial<ModularSettings>) =>
    onChange({ ...m, ...patch });
  let layout: ReturnType<typeof modularLayout> | undefined;
  let suggestion: number | undefined;
  try {
    layout = modularLayout(settings, fabrication);
  } catch {
    try {
      suggestion = modularLightPosition(settings, fabrication);
    } catch {
      /* Parent displays the fit error. */
    }
  }
  return (
    <div className="shadow-modular-controls">
      <div className="shadow-modular-intro">
        <strong>Una luz central, piezas desmontables</strong>
        <p>
          Base de pared con pilas y anclaje; tubo pasacables y cabezal sujeto al
          marco por detrás del LED. Paneles y embellecedor independientes.
        </p>
      </div>
      <SelectField
        label="Alimentación del modelo"
        value={m.power}
        options={[
          {
            value: "aaa",
            label: "3 pilas AAA alcalinas · base de pared",
          },
          { value: "usb", label: "USB de 5 V · cable pasante" },
        ]}
        onChange={(e) =>
          update({ power: e.target.value as ModularSettings["power"] })
        }
      />
      <div className="shadow-modular-summary" aria-live="polite">
        <strong>{modularCount(fabrication)} piezas para imprimir</strong>
        <span>
          Base, tapa electrónica, tubo, cabezal, cuatro paneles y embellecedor.
          Con pilas se agrega su tapita independiente.
        </span>
      </div>
      <h3>Estrella y LED</h3>
      <div className="shadow-two">
        {(
          [
            ["starDiameter", "Diámetro de la estrella", 15, 40],
            ["starThickness", "Espesor de la estrella", 0.6, 4],
            ["emitterHeight", "Altura del emisor sobre la estrella", 1, 15],
            ["cableDiameter", "Ancho del paso de cables", 2, 6],
          ] as const
        ).map(([key, label, min, max]) => (
          <Measure
            key={key}
            label={label}
            value={m[key]}
            min={min}
            max={max}
            onChange={(v) => update({ [key]: v })}
          />
        ))}
      </div>
      <p className="shadow-help">
        Estrella nominal: Ø20 × 1,2 mm. La altura de emisor inicial de 5 mm es
        provisional: medí desde la cara superior de la placa hasta el punto
        luminoso. El largo del poste se calcula con esa medida y la posición de
        luz.
      </p>
      {m.power === "aaa" && (
        <>
          <h3>Portapilas de 3 AAA</h3>
          <div className="shadow-two">
            {(
              [
                ["holderLength", "Largo del portapilas", 30, 100],
                ["holderWidth", "Ancho del portapilas", 20, 80],
                ["holderHeight", "Alto del portapilas", 8, 35],
              ] as const
            ).map(([key, label, min, max]) => (
              <Measure
                key={key}
                label={label}
                value={m[key]}
                min={min}
                max={max}
                onChange={(v) => update({ [key]: v })}
              />
            ))}
          </div>
          <p className="shadow-help">
            55 × 38 × 14 mm es una envolvente provisional de portapilas
            comercial. Medí el tuyo, incluyendo contactos y salida de cables,
            antes de imprimir. El portapilas va dentro de la base contra la
            pared, con tapa accesible desde atrás al descolgar el cuadro. La
            tapa electrónica tiene un hueco circular para que el tubo lleve los
            cables hacia abajo.
          </p>
        </>
      )}
      {suggestion !== undefined && (
        <Button variant="secondary" onClick={() => onLightPosition(suggestion)}>
          Ajustar posición de luz a {suggestion}% para el montaje
        </Button>
      )}
      {layout && (
        <p className="shadow-help">
          Tubo: Ø10 ×{" "}
          {layout.postLength.toLocaleString("es-AR", {
            maximumFractionDigits: 2,
          })}{" "}
          mm. Emisor a{" "}
          {(
            (settings.wallOffset ?? 0) * 10 +
            (settings.depth * 10 * settings.lightPercent) / 100
          ).toLocaleString("es-AR", { maximumFractionDigits: 2 })}{" "}
          mm de la pared. La holgura de ajuste se suma en total a los
          alojamientos.
        </p>
      )}
      <details className="shadow-modular-details">
        <summary>Conexión y prueba del prototipo</summary>
        <p>
          Para un solo LED blanco: positivo → interruptor → resistencia de 10 Ω
          / 5 W → LED → negativo. Verificá la polaridad y la corriente del LED
          real.{" "}
          {m.power === "aaa"
            ? "Las 3 AAA alcalinas entregan 4,5 V nominales; el brillo baja al descargarse. Las NiMH tienen otra tensión."
            : "Usá una salida USB regulada de 5 V y un cable preparado para alimentación. El pasacables no es un alojamiento para conector USB-C."}
        </p>
        <p>
          Elegí una alimentación por montaje. No conectes USB a las pilas. La
          placa estrella y la esfera luminosa son referencias que no se
          imprimen. Dejá libres las ventanas del cabezal y comprobá la
          temperatura del LED y la resistencia antes del montaje definitivo.
        </p>
        <p>
          La simulación mantiene una fuente puntual e incluye las piezas
          impresas. Los cables y componentes comprados no se simulan: acomodá
          los cables finos fuera de la cara luminosa y validá la sombra real.
        </p>
      </details>
    </div>
  );
}
