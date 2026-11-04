import { RotateCcw } from "lucide-react";
import {
  Button,
  Checkbox,
  NumberField,
  RangeField,
  SelectField,
} from "@/components/ui";
import { PANEL_ULTRA_RESOLUTION, type Settings } from "./mesh";
import { DEFAULT_OPENING_DIAMETER, SPHERE_ULTRA_RESOLUTION } from "./sphere";
import {
  defaultHousing,
  hasHousing,
  type HousingSettings,
} from "./housing-config";
import { hasPrintStand } from "./print-stand";
import { Disclosure, FieldHelp } from "./studio-controls";

export function DesignSettings({
  settings,
  change,
  updateHousing,
  reset,
}: {
  settings: Settings;
  change: (
    key: Exclude<keyof Settings, "housing" | "shape">,
    value: number | boolean,
  ) => void;
  updateHousing: (patch: Partial<HousingSettings>) => void;
  reset: () => void;
}) {
  const sphere = settings.shape === "sphere";
  const housing = settings.housing ?? defaultHousing;
  const boxEnabled = hasHousing(settings);
  return (
    <>
      <p className="lamp-step-intro">
        Empezá con estas medidas. Los valores iniciales te sirven para una
        primera prueba.
      </p>
      <div className="two-fields">
        {(sphere ? (["width"] as const) : (["width", "height"] as const)).map(
          (key) => (
            <NumberField
              key={key}
              label={
                sphere
                  ? "Diámetro de la esfera"
                  : key === "width"
                    ? "Ancho / arco"
                    : "Alto"
              }
              unit="mm"
              min={30}
              max={250}
              value={settings[key]}
              onChange={(e) => change(key, Number(e.target.value))}
            />
          ),
        )}
        {sphere && (
          <div className="lamp-help-field">
            <NumberField
              label="Abertura para los LED"
              unit="mm"
              min={8}
              max={30}
              step={0.1}
              value={settings.sphereOpeningDiameter ?? DEFAULT_OPENING_DIAMETER}
              onChange={(e) =>
                change("sphereOpeningDiameter", Number(e.target.value))
              }
            />
            <FieldHelp title="Abertura para los LED">
              <p>
                Diámetro interior libre del cuello: entre 8 y 30 mm. Inicial: 22
                mm. Medí la parte más ancha del conjunto de LED y cables y dejá
                holgura.
              </p>
              <p>
                La boca tiene reborde exterior y entrada suavizada. La esfera
                debe medir al menos 8 mm más que la abertura.
              </p>
            </FieldHelp>
          </div>
        )}
      </div>
      {!sphere && (
        <div className="lamp-options">
          <Checkbox
            label="Exportar de pie con soporte removible"
            checked={hasPrintStand(settings)}
            onChange={(e) => change("printStand", e.target.checked)}
          />
          <Checkbox
            label="Generar caja trasera"
            checked={boxEnabled}
            disabled={settings.angle === 180}
            onChange={(e) => updateHousing({ enabled: e.target.checked })}
          />
          {settings.angle === 180 ? (
            <p className="field-hint">
              La caja está disponible para Plano y Curvo. Este panel anterior de
              180° conserva su forma independiente.
            </p>
          ) : (
            boxEnabled && (
              <div className="lamp-help-field">
                <NumberField
                  label="Espacio para la luz"
                  unit="mm"
                  min={12}
                  max={80}
                  step={1}
                  value={housing.depth}
                  onChange={(e) =>
                    updateHousing({ depth: Number(e.target.value) })
                  }
                />
                <FieldHelp title="Espacio para la luz">
                  <p>
                    Profundidad disponible para la iluminación: entre 12 y 80
                    mm. En Curvo sigue el radio del panel. El marco y las tapas
                    agregan espesor exterior.
                  </p>
                  <p>
                    El kit incluye foto, caja, marco y tapa; no incluye LED ni
                    fuente.
                  </p>
                </FieldHelp>
              </div>
            )
          )}
        </div>
      )}
      <Disclosure
        title="Ajustes avanzados"
        subtitle="Relieve, contraste y detalle"
        className="lamp-advanced"
      >
        <div className="lamp-help-field">
          <div className="two-fields">
            {(["min", "max"] as const).map((key) => (
              <NumberField
                key={key}
                label={`Espesor ${key === "min" ? "mín." : "máx."}`}
                unit="mm"
                min={0.6}
                max={5}
                step={0.1}
                value={settings[key]}
                onChange={(e) => change(key, Number(e.target.value))}
              />
            ))}
          </div>
          <FieldHelp title="Espesores">
            <p>
              El espesor mínimo corresponde a las zonas claras y el máximo a las
              oscuras. Más espesor deja pasar menos luz. El máximo debe superar
              al mínimo.
            </p>
            <p>
              Probá una pieza pequeña para calibrar el material, la impresión y
              la iluminación.
            </p>
          </FieldHelp>
        </div>
        <RangeField
          label="Contraste"
          valueLabel={`${settings.contrast.toFixed(1)}×`}
          min={0.5}
          max={2}
          step={0.1}
          value={settings.contrast}
          onChange={(e) => change("contrast", Number(e.target.value))}
        />
        <div className="lamp-help-field">
          <SelectField
            label="Detalle"
            value={settings.resolution}
            onChange={(e) => change("resolution", Number(e.target.value))}
            options={[
              { value: 80, label: "Borrador · 80 puntos" },
              { value: 160, label: "Equilibrado · 160 puntos" },
              { value: 256, label: "Alto · 256 puntos" },
              { value: 384, label: "Muy alto · 384 puntos" },
              {
                value: sphere
                  ? SPHERE_ULTRA_RESOLUTION
                  : PANEL_ULTRA_RESOLUTION,
                label: sphere ? "Ultra · 512 puntos" : "Ultra · 448 puntos",
              },
              ...(![
                80,
                160,
                256,
                384,
                sphere ? SPHERE_ULTRA_RESOLUTION : PANEL_ULTRA_RESOLUTION,
              ].includes(settings.resolution)
                ? [
                    {
                      value: settings.resolution,
                      label: `Personalizado · ${settings.resolution} puntos`,
                    },
                  ]
                : []),
            ]}
          />
          <FieldHelp title="Detalle de la malla">
            <p>
              Una malla más fina puede representar mejor el relieve. Equilibrado
              permite empezar rápido; Ultra crea archivos más pesados y tarda
              más en calcular.
            </p>
            <p>
              Más puntos no agregan detalle que no exista en la foto ni
              sustituyen una impresión fina. La vista y el STL usan la misma
              malla.
            </p>
          </FieldHelp>
        </div>
        {settings.resolution > 384 && (
          <p className="field-hint">
            Ultra genera un STL pesado y tarda más en calcular.
          </p>
        )}
        <Checkbox
          label="Invertir claros y oscuros"
          checked={settings.invert}
          onChange={(e) => change("invert", e.target.checked)}
        />
        {boxEnabled && (
          <div className="lamp-help-field">
            <NumberField
              label="Holgura de encastre"
              unit="mm"
              min={0.1}
              max={0.6}
              step={0.05}
              value={housing.clearance}
              onChange={(e) =>
                updateHousing({ clearance: Number(e.target.value) })
              }
            />
            <FieldHelp title="Holgura de encastre">
              <p>
                Separación entre piezas de la caja: de 0,1 a 0,6 mm. Probá el
                encastre con tu material antes de imprimir el kit completo. Los
                cierres son guiados, sin pestillo.
              </p>
            </FieldHelp>
          </div>
        )}
        <Button variant="unstyled" className="text-button" onClick={reset}>
          <RotateCcw size={14} />
          Restablecer parámetros
        </Button>
      </Disclosure>
    </>
  );
}
