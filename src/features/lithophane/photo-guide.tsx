"use client";
import { useId, useState } from "react";
import { ArrowUpRight, CheckCircle2, Info, ScanFace } from "lucide-react";
import {
  Button,
  Modal,
  ModalHeader,
  RangeField,
  SelectField,
} from "@/components/ui";
import type { Settings } from "./mesh";
import { sphereImageGuidance, sphereImageSize } from "./sphere-export";
import { photoAdvice } from "./photo-advice";

function PhotoDiagram({
  shape,
  contain = false,
}: {
  shape: "panorama" | "standard" | "portrait";
  contain?: boolean;
}) {
  return (
    <div className={`lamp-photo-diagram ${shape}`} aria-hidden="true">
      <div className="lamp-diagram-picture">
        <span className="lamp-diagram-edge" />
        <ScanFace />
        <span className="lamp-diagram-edge" />
      </div>
      <span className="lamp-diagram-caption">
        {contain
          ? "Foto completa · Ancho ajustable"
          : shape === "panorama"
            ? "Márgenes libres · Detalles al centro"
            : shape === "standard"
              ? "Prepará un encuadre panorámico"
              : "Se ensancha al adaptarla"}
      </span>
    </div>
  );
}

export function PhotoGuide({
  settings,
  image,
  example,
  onFitChange,
  onStretchChange,
}: {
  settings: Settings;
  image: { width: number; height: number } | null;
  example: boolean;
  onFitChange: (value: NonNullable<Settings["spherePhotoFit"]>) => void;
  onStretchChange: (value: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const sphere = settings.shape === "sphere";
  const contain = sphere && settings.spherePhotoFit === "contain";
  const stretch = settings.spherePhotoStretch ?? 0;
  const stretched = contain && stretch > 0;
  const advice =
    image && !example ? photoAdvice(settings, image.width, image.height) : null;
  return (
    <div className="lamp-photo-advice">
      {sphere && (
        <SelectField
          label="Cómo aplicar la foto"
          value={settings.spherePhotoFit ?? "stretch"}
          onChange={(event) =>
            onFitChange(
              event.target.value as NonNullable<Settings["spherePhotoFit"]>,
            )
          }
          options={[
            { value: "stretch", label: "Panorámica · cubrir 360°" },
            { value: "contain", label: "Conservar proporción · foto centrada" },
          ]}
        />
      )}
      {contain && (
        <RangeField
          label="Estiramiento horizontal"
          valueLabel={stretch === 0 ? "0 % · original" : `+${stretch} %`}
          min={0}
          max={75}
          step={1}
          value={stretch}
          onChange={(event) => onStretchChange(Number(event.target.value))}
          description="Ensancha la foto sin recortarla ni cambiar su altura, hasta completar la vuelta. Probá entre 10 y 25 % para un cambio suave."
        />
      )}
      <div className="lamp-photo-tip">
        <Info size={17} aria-hidden="true" />
        <div>
          <strong>
            {sphere
              ? contain
                ? stretched
                  ? "Tu foto, un poco más ancha"
                  : "Tu foto, sin estirar"
                : "Fotografía recomendada para esferas"
              : settings.angle
                ? "Una foto para tu panel curvo"
                : "Una foto para tu panel plano"}
          </strong>
          <p className="field-hint">
            {sphere
              ? contain
                ? stretched
                  ? "La foto completa queda centrada y se ensancha según el ajuste elegido. La altura se mantiene y el resto de la esfera queda liso. Volvé a 0 % para recuperar la proporción original."
                  : "La foto completa se ajusta y queda centrada al frente; el resto de la esfera queda liso. Podés usar una imagen cuadrada, vertical u horizontal. El tamaño se adapta a la esfera, conservando la proporción."
                : `Usá una panorámica horizontal de aproximadamente ${sphereImageSize(settings)}. Ubicá los rostros al centro y dejá libres los extremos: se unen detrás de la esfera.`
              : settings.angle
                ? "Elegí una foto nítida y ubicá los detalles principales al centro del arco. La imagen completa sigue la curvatura."
                : "Elegí una foto nítida, con luces y sombras distinguibles. El encuadre completo se adapta a las medidas del panel."}
          </p>
        </div>
      </div>
      {advice && (
        <div
          className={`lamp-photo-assessment ${advice.tone}`}
          aria-live="polite"
        >
          {advice.tone === "good" ? (
            <CheckCircle2 size={16} aria-hidden="true" />
          ) : (
            <Info size={16} aria-hidden="true" />
          )}
          <div>
            <strong>{advice.title}</strong>
            <p>{advice.text}</p>
          </div>
        </div>
      )}
      <Button
        variant="unstyled"
        className="lamp-guide-link"
        onClick={() => setOpen(true)}
      >
        ¿Cómo debe ser mi fotografía?
        <ArrowUpRight size={16} aria-hidden="true" />
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        aria-labelledby={id}
        className="lamp-photo-modal"
      >
        <ModalHeader
          title="Una buena foto, un mejor relieve"
          titleId={id}
          description={
            sphere
              ? "Prepará el encuadre antes de subir la imagen."
              : "La foto completa se convierte en relieve."
          }
          onClose={() => setOpen(false)}
        />
        <div className="studio-help-body">
          {sphere ? (
            <>
              <div className="lamp-photo-examples">
                <article>
                  <PhotoDiagram shape="panorama" contain={contain} />
                  <h3>
                    {contain
                      ? "Horizontal · más ancha"
                      : "Panorámica · recomendada"}
                  </h3>
                  <p>
                    {contain
                      ? "Ocupa un sector más ancho. Si la foto es muy panorámica, se reduce la altura para que entre completa."
                      : "Conserva mejor las proporciones al envolver la esfera. Dejá aire alrededor de los rostros."}
                  </p>
                </article>
                <article>
                  <PhotoDiagram shape="standard" contain={contain} />
                  <h3>
                    {contain
                      ? "Cuadrada · sector frontal"
                      : "Convencional · adaptable"}
                  </h3>
                  <p>
                    {contain
                      ? "A 0 % conserva su relación de ancho y alto. Podés ensancharla un poco con Estiramiento horizontal; el fondo continúa liso a los lados."
                      : "Una foto común se estira hasta cubrir la franja. Elegí Conservar proporción para mostrarla centrada sin estirarla."}
                  </p>
                </article>
                <article>
                  <PhotoDiagram shape="portrait" contain={contain} />
                  <h3>
                    {contain
                      ? "Vertical · sin ensanchar"
                      : "Vertical · revisá el encuadre"}
                  </h3>
                  <p>
                    {contain
                      ? "Se ajusta a la altura disponible y ocupa menos ancho. El control permite ensancharla suavemente sin recortarla ni repetirla."
                      : "Al cubrir 360°, los rostros pueden quedar ensanchados. Podés conservar la proporción para evitar ese estiramiento."}
                  </p>
                </article>
              </div>
              <div className="lamp-photo-band">
                <span>{contain ? "Superficie lisa" : "Unión posterior"}</span>
                <strong>Rostros y detalles importantes</strong>
                <span>{contain ? "Superficie lisa" : "Unión posterior"}</span>
              </div>
              <p>
                {contain
                  ? "A 0 %, Conservar proporción evita estirar la foto para llenar la esfera. Con Estiramiento horizontal podés darle más ancho. La superficie sigue siendo curva: el aspecto cambia al girar el modelo. Los bordes se suavizan para unir el relieve con el fondo liso."
                  : "La curvatura cambia cómo se ven los bordes y las zonas cercanas a los polos. Mantené los detalles en la franja central y evitá cortar un rostro en la unión posterior."}
              </p>
              <p>{sphereImageGuidance(settings)}</p>
            </>
          ) : (
            <>
              <PhotoDiagram shape="standard" />
              <h3>Un encuadre que acompañe las medidas</h3>
              <p>
                La imagen se utiliza completa, sin recorte automático. Para
                conservar sus proporciones, hacé coincidir la relación entre{" "}
                {settings.angle ? "el ancho del arco" : "el ancho"} y el alto
                del panel con la de tu fotografía.
              </p>
              <p>
                {settings.angle
                  ? "Los extremos del panel se curvan hacia los lados. Ubicá el motivo principal en el centro para verlo de frente."
                  : "Elegí un motivo claro y bien enfocado. Revisá los detalles pequeños en la vista previa antes de imprimir."}
              </p>
              <p>
                Los tonos oscuros generan más espesor y dejan pasar menos luz.
                Podés ajustar contraste e inversión en Ajustes avanzados.
              </p>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}
