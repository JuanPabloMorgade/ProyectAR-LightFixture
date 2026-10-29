"use client";
import { useState } from "react";
import { NumberField, SelectField } from "@/components/ui";
import {
  defaultEnclosure,
  wallPanelStart,
  type EnclosureSettings,
} from "./enclosure-config";
import { wallMountLayout } from "./wallmount";
import type { BoxSettings } from "./engine";
import type { Fabrication } from "./fabrication";

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
      onChange={(event) => {
        const v = event.currentTarget.value;
        setDraft(v);
        if (v !== "" && Number.isFinite(Number(v))) onChange(Number(v));
      }}
      onBlur={() => setDraft(null)}
    />
  );
}
export default function EnclosureControls({
  settings,
  fabrication,
  onChange,
}: {
  settings: BoxSettings;
  fabrication: Fabrication;
  onChange: (e: EnclosureSettings) => void;
}) {
  const e = fabrication.enclosure ?? defaultEnclosure;
  const update = (patch: Partial<EnclosureSettings>) =>
    onChange({ ...e, ...patch, layout: "wall" });
  let total: number | undefined;
  let panelDepth: number | undefined;
  let trim: number | undefined;
  try {
    const layout = wallMountLayout(settings, fabrication);
    total = layout.outerFace;
    panelDepth = layout.panelDepth;
    trim = layout.frontTrim;
  } catch {
    /* Parent displays the error. */
  }
  return (
    <div className="shadow-enclosure-controls">
      <h3>Base de pared y marco abierto</h3>
      <p className="shadow-help">
        Desde la pared hacia la persona, como en el modelo de referencia:
      </p>
      <ol
        className="shadow-enclosure-layers"
        aria-label="Armado desde la pared hacia la persona"
      >
        <li>Base con anclaje y pilas</li>
        <li>Tapitas y paso central</li>
        <li>Tubo y LED</li>
        <li>Paneles de sombra</li>
        <li>Marco frontal abierto</li>
      </ol>
      <Measure
        label="Profundidad de la base"
        value={e.depth}
        min={12}
        max={50}
        onChange={(depth) => update({ depth })}
      />
      <div className="shadow-two">
        <Measure
          label="Entrada de cabeza del tornillo"
          value={e.hangerEntry ?? 8}
          min={6}
          max={12}
          onChange={(hangerEntry) => update({ hangerEntry })}
        />
        <Measure
          label="Guía del cuello del tornillo"
          value={e.hangerNeck ?? 4}
          min={2}
          max={(e.hangerEntry ?? 8) - 2}
          onChange={(hangerNeck) => update({ hangerNeck })}
        />
      </div>
      <p className="shadow-help">
        El ojo de cerradura está reforzado en la cara posterior de la base. La
        entrada es circular y el cuello termina redondeado. La guía retiene la
        cabeza del tornillo. Medí el tornillo y comprobá el ajuste y la carga en
        tu pared.
      </p>
      <SelectField
        label="Diseño de la tapa trasera"
        value={e.front ?? "plain"}
        options={[
          { value: "plain", label: "Liso · sin dibujo" },
          { value: "design", label: "Mismo diseño de la sombra · relieve" },
        ]}
        onChange={(event) =>
          update({ front: event.target.value as EnclosureSettings["front"] })
        }
      />
      {e.front === "design" && (
        <Measure
          label="Altura del relieve trasero"
          value={e.relief ?? 0.6}
          min={0.3}
          max={1.5}
          onChange={(relief) => update({ relief })}
        />
      )}
      <p className="shadow-help">
        El frente es un marco abierto: permite ver el tubo y los paneles. El
        cierre queda atrás, sobre el compartimiento de electrónica, junto a la
        pared. Esta tapa puede ser lisa o llevar el mismo diseño en relieve y
        conserva el agujero central circular para el tubo y los cables. La tapa
        de pilas queda al ras de la cara posterior: descolgá el cuadro para
        cambiar las pilas sin desmontar los paneles. La base inicial mide 20 mm;
        aumentá esa altura si tu portapilas real lo requiere.
      </p>
      {total !== undefined && (
        <p className="shadow-help">
          Los recortes de sombra arrancan a{" "}
          {wallPanelStart(fabrication).toLocaleString("es-AR")} mm de la pared,
          por encima de la tapa electrónica. La parte inferior de cada pared
          baja por fuera del único perímetro de la base hasta su reborde, sin
          canal entre dos paredes de base. Largo del tramo de sombra:{" "}
          {panelDepth!.toLocaleString("es-AR", { maximumFractionDigits: 2 })}{" "}
          mm. No hay recortes escondidos por debajo de la tapa.
          {fabrication.joints &&
            " Alineá las dos guías finas de la base con las ranuras interiores de cada pared y deslizá la pared hasta el reborde inferior."}
          {fabrication.illumination === "modular" &&
            " La profundidad configurada es el máximo: el tramo delantero sin función óptica se acorta hasta dejar la holgura del cabezal."}
          {trim! > 0 &&
            ` Se acortan ${trim!.toLocaleString("es-AR", { maximumFractionDigits: 2 })} mm del extremo delantero, dejando espacio para el cabezal.`}{" "}
          Profundidad total desde la pared:{" "}
          {total.toLocaleString("es-AR", { maximumFractionDigits: 2 })} mm. Los
          recortes se calculan incluyendo la separación de la base.
        </p>
      )}
    </div>
  );
}
