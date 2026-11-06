import { useId, useState, type ReactNode } from "react";
import { Check, RotateCcw, Settings2 } from "lucide-react";
import {
  Button,
  Modal,
  ModalHeader,
  ModalFooter,
  RangeField,
  Disclosure,
} from "@/components/ui";
import {
  defaultTextureOptions,
  FRAME_CORNER_MAX_RADIUS,
  frameCornerRadius,
  frameTextures,
  textureCategories,
  texturesInCategory,
  textureDefinitions,
  type TextureCategory,
  textureAreas,
  textureIntensity,
  textureIntensities,
  textureLimits,
  textureOptions,
  type FrameTextureOptions,
} from "./frame-texture-config";
import { TextureThumbnail } from "./texture-thumbnail";
import "./texture-customizer.css";

export function TextureSummary({
  options,
  onCustomize,
}: {
  options?: Partial<FrameTextureOptions>;
  onCustomize: () => void;
}) {
  const config = textureOptions(options);
  const texture = frameTextures.find(
    (item) => item.value === config.frameTexture,
  )!;
  const enabled = config.frameTexture !== "none";
  const rounded = config.frameCornerRounding > 0;
  return (
    <section className="texture-summary" aria-label="Textura del marco">
      <h4>Textura del marco</h4>
      <div className="texture-summary-selection">
        <TextureThumbnail
          texture={config.frameTexture}
          scale={config.frameTextureScale}
          depth={config.frameTextureDepth}
        />
        <div>
          <strong>{texture.label}</strong>
          <span>
            {enabled
              ? `Relieve ${textureIntensity(config.frameTextureDepth).toLowerCase()} · ${textureAreas.find((item) => item.value === config.frameTextureArea)!.shortLabel}`
              : "Acabado liso"}
            {rounded && (
              <span className="texture-corner-summary">
                Esquinas redondeadas · {config.frameCornerRounding} %
              </span>
            )}
          </span>
        </div>
        <span
          className={`texture-state${enabled || rounded ? " is-active" : ""}`}
          title={
            enabled
              ? "Textura aplicada"
              : rounded
                ? "Esquinas redondeadas"
                : "Sin personalización"
          }
          aria-label={
            enabled
              ? "Textura aplicada"
              : rounded
                ? "Esquinas redondeadas"
                : "Sin personalización"
          }
        />
      </div>
      <Button
        className="texture-customize-button"
        aria-haspopup="dialog"
        onClick={(event) => {
          event.currentTarget.focus();
          onCustomize();
        }}
      >
        <Settings2 size={16} aria-hidden="true" /> Personalizar textura
      </Button>
    </section>
  );
}

export function TextureCustomizer({
  options,
  onChange,
  onCancel,
  onApply,
  preview,
  busy,
  error,
}: {
  options: FrameTextureOptions;
  onChange: (next: FrameTextureOptions) => void;
  onCancel: () => void;
  onApply: () => void;
  preview: ReactNode;
  busy: boolean;
  error: string;
}) {
  const id = useId();
  const [category, setCategory] = useState<TextureCategory>("all");
  const selectedTexture = textureDefinitions[options.frameTexture];
  const enabled = options.frameTexture !== "none";
  const intensity = textureIntensity(options.frameTextureDepth);
  const patch = (next: Partial<FrameTextureOptions>) =>
    onChange({ ...options, ...next });
  return (
    <Modal
      className="texture-modal"
      onClose={onCancel}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          onCancel();
        }
      }}
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-description`}
    >
      <ModalHeader
        title="Personalizá la textura de tu marco"
        titleId={`${id}-title`}
        onClose={onCancel}
        closeLabel="Cerrar personalización de textura"
      />
      <p id={`${id}-description`} className="texture-modal-description">
        Elegí un acabado y ajustá sus detalles para darle un estilo único a tu
        litofanía.
      </p>
      <div className="texture-modal-body">
        <div className="texture-modal-settings">
          <fieldset className="texture-fieldset texture-corners-section">
            <legend>Esquinas del marco</legend>
            <div className="texture-segments texture-corner-shapes">
              {[
                { label: "Rectas", rounded: false },
                { label: "Redondeadas", rounded: true },
              ].map((shape) => (
                <label
                  key={shape.label}
                  className={
                    options.frameCornerRounding > 0 === shape.rounded
                      ? "is-selected"
                      : ""
                  }
                >
                  <input
                    type="radio"
                    name={`${id}-corners`}
                    checked={options.frameCornerRounding > 0 === shape.rounded}
                    onChange={() =>
                      patch({
                        frameCornerRounding: shape.rounded
                          ? options.frameCornerRounding || 50
                          : 0,
                      })
                    }
                  />
                  <svg
                    width="28"
                    height="24"
                    viewBox="0 0 28 24"
                    fill="none"
                    aria-hidden="true"
                  >
                    <rect
                      x="3"
                      y="3"
                      width="22"
                      height="18"
                      rx={shape.rounded ? 6 : 0}
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />
                  </svg>
                  {shape.label}
                </label>
              ))}
            </div>
            <RangeField
              label="Redondeo de esquinas"
              aria-label="Redondeo de esquinas"
              min={textureLimits.corners.min}
              max={textureLimits.corners.max}
              step={textureLimits.corners.step}
              value={options.frameCornerRounding}
              valueLabel={`${options.frameCornerRounding} %`}
              description={`Radio actual: ${frameCornerRadius(options.frameCornerRounding).toLocaleString("es-AR", { maximumFractionDigits: 2 })} mm. 0 % conserva las puntas; 100 % usa ${FRAME_CORNER_MAX_RADIUS.toLocaleString("es-AR")} mm. Solo afecta las esquinas exteriores: la foto y los encastres se conservan.`}
              onChange={(e) =>
                patch({ frameCornerRounding: Number(e.target.value) })
              }
            />
          </fieldset>
          <fieldset className="texture-fieldset">
            <legend>Texturas del marco</legend>
            <div
              className="texture-filters"
              role="group"
              aria-label="Filtrar texturas"
            >
              {textureCategories.map((item) => (
                <button
                  type="button"
                  key={item.value}
                  aria-pressed={category === item.value}
                  onClick={() => setCategory(item.value)}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <p className="texture-current" role="status">
              Seleccionada: <strong>{selectedTexture.label}</strong>
            </p>
            <div className="texture-gallery">
              {texturesInCategory(category).map((texture) => (
                <label
                  key={texture.value}
                  className={`texture-card${options.frameTexture === texture.value ? " is-selected" : ""}`}
                >
                  <input
                    type="radio"
                    name={`${id}-texture`}
                    value={texture.value}
                    checked={options.frameTexture === texture.value}
                    onChange={() => patch({ frameTexture: texture.value })}
                    aria-label={texture.label}
                  />
                  <TextureThumbnail
                    texture={texture.value}
                    scale={options.frameTextureScale}
                    depth={options.frameTextureDepth}
                  />
                  <span className="texture-card-name">
                    {texture.label}
                    {options.frameTexture === texture.value && (
                      <Check size={15} aria-hidden="true" />
                    )}
                  </span>
                  <small>{texture.description}</small>
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset className="texture-fieldset" disabled={!enabled}>
            <legend>Zona de aplicación</legend>
            <div className="texture-segments">
              {textureAreas.map((area) => (
                <label
                  key={area.value}
                  className={
                    options.frameTextureArea === area.value ? "is-selected" : ""
                  }
                >
                  <input
                    type="radio"
                    name={`${id}-area`}
                    checked={options.frameTextureArea === area.value}
                    onChange={() => patch({ frameTextureArea: area.value })}
                  />
                  {area.label}
                </label>
              ))}
            </div>
            <p className="field-hint">
              Todo el exterior incluye el frente, los laterales y el dorso de la
              tapa. Los encastres quedan lisos.
            </p>
            {options.frameTextureArea === "all" &&
              selectedTexture.lidPrintNote && (
                <p className="field-hint">{selectedTexture.lidPrintNote}</p>
              )}
          </fieldset>
          <fieldset className="texture-fieldset" disabled={!enabled}>
            <legend>
              Intensidad del relieve{" "}
              <span>
                {intensity === "Personalizado"
                  ? "Personalizado"
                  : `${options.frameTextureDepth.toLocaleString("es-AR")} mm`}
              </span>
            </legend>
            <div className="texture-segments">
              {textureIntensities.map((item) => (
                <label
                  key={item.label}
                  className={intensity === item.label ? "is-selected" : ""}
                >
                  <input
                    type="radio"
                    name={`${id}-intensity`}
                    checked={intensity === item.label}
                    onChange={() => patch({ frameTextureDepth: item.depth })}
                  />
                  <span>
                    {item.label}
                    <small>{item.description}</small>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <Disclosure
            title="Ajustes avanzados"
            subtitle="Controlá el relieve, la escala y los detalles de la textura."
            className="texture-advanced"
          >
            <fieldset className="texture-fieldset" disabled={!enabled}>
              <RangeField
                label="Profundidad del relieve"
                aria-label="Profundidad del relieve"
                min={textureLimits.depth.min}
                max={textureLimits.depth.max}
                step={textureLimits.depth.step}
                value={options.frameTextureDepth}
                valueLabel={`${options.frameTextureDepth.toLocaleString("es-AR")} mm`}
                description="De 0,15 a 0,6 mm hacia adentro. Conserva al menos 1,5 mm de pared frontal."
                onChange={(e) =>
                  patch({ frameTextureDepth: Number(e.target.value) })
                }
              />
              <RangeField
                label="Escala del patrón"
                aria-label="Escala del patrón"
                min={textureLimits.scale.min}
                max={textureLimits.scale.max}
                step={textureLimits.scale.step}
                value={options.frameTextureScale}
                valueLabel={`${options.frameTextureScale.toLocaleString("es-AR")}×`}
                description={`De 0,75 a 2×. ${selectedTexture.sizeLabel}: ${(selectedTexture.size * options.frameTextureScale).toLocaleString("es-AR")} mm.`}
                onChange={(e) =>
                  patch({ frameTextureScale: Number(e.target.value) })
                }
              />
            </fieldset>
            <p className="field-hint">
              Para boquilla de 0,4 mm, revisá el detalle y los puentes en el
              laminador. Los relieves suaves pueden perder definición con capas
              gruesas; probá una muestra antes de imprimir el marco completo.
            </p>
          </Disclosure>
        </div>
        <aside
          className="texture-preview"
          aria-label="Vista previa de la textura"
        >
          <div className="texture-preview-heading">
            <strong>Tu marco en 3D</strong>
            <span>Cambios sin aplicar</span>
          </div>
          <div className="texture-preview-stage">
            {preview}
            {busy && (
              <span className="calculating" role="status">
                Actualizando marco…
              </span>
            )}
          </div>
          <p>Arrastrá para girar · Rueda para acercar</p>
          <p className="field-hint">
            La textura y el redondeo se incluyen en los STL. La foto y los
            encastres se conservan.
          </p>
          {error && (
            <p role="alert" className="texture-error">
              {error}
            </p>
          )}
        </aside>
      </div>
      <ModalFooter>
        <Button
          variant="ghost"
          className="texture-reset"
          onClick={() => onChange({ ...defaultTextureOptions })}
        >
          <RotateCcw size={15} aria-hidden="true" />
          Restablecer
        </Button>
        <Button onClick={onCancel}>Cancelar</Button>
        <Button variant="primary" disabled={busy || !!error} onClick={onApply}>
          Aplicar textura
        </Button>
      </ModalFooter>
    </Modal>
  );
}
