"use client";
import { isWallMount } from "./enclosure-config";
import { wallPartInfo } from "./wallmount";
import { useState, useEffect, useRef, type CSSProperties } from "react";
import { ArrowLeft, ArrowRight, Check, RotateCcw } from "lucide-react";
import { PRINT_PARTS, type BoxSettings, type WallMask } from "./engine";
import { assemblySequence } from "./assembly";
import { hasEnclosure, enclosureGuide } from "./enclosure";
import AssemblyViewer from "./assembly-viewer";
import { isCob, cobGuide, cobLayout } from "./cob";
import type { Fabrication } from "./fabrication";
import { isModular, modularCount, modularGuide } from "./modular";
import { Button, Modal, ModalHeader, ModalFooter } from "@/components/ui";
import "./assembly-guide.css";

export default function AssemblyGuide({
  name,
  settings,
  masks,
  simulation,
  artwork,
  onClose,
  fabrication,
}: {
  name: string;
  settings: BoxSettings;
  masks: WallMask[];
  simulation: Uint8ClampedArray;
  artwork?: Uint8ClampedArray;
  onClose: () => void;
  fabrication?: Fabrication;
}) {
  const [step, setStep] = useState(0);
  const body = useRef<HTMLDivElement>(null);
  const instructions = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (body.current) body.current.scrollTop = 0;
    if (instructions.current) instructions.current.scrollTop = 0;
  }, [step]);
  const mounted = isWallMount(fabrication);
  const modular = isModular(fabrication);
  const separated = hasEnclosure(fabrication);
  const { steps, lightStep, resultStep } = assemblySequence(fabrication);
  const current = steps[step];
  const cob =
    fabrication && isCob(fabrication)
      ? cobLayout(settings, fabrication)
      : undefined;
  const primary = PRINT_PARTS.find((part) => part.id === current.part);
  const n = modular ? 8 : 6;
  const metadata = mounted
    ? wallPartInfo(fabrication!).find((p) => p.id === current.part)
    : undefined;
  const part =
    metadata ??
    (primary
      ? {
          ...primary,
          filename:
            separated && primary.id === "front"
              ? mounted
                ? "05-embellecedor"
                : "05-placa-portaluces"
              : primary.filename,
        }
      : current.part === "electronics"
        ? { filename: `0${n}-caja-electronica` }
        : current.part === "face"
          ? { filename: `0${n + 1}-tapa-exterior` }
          : current.part === "post"
            ? { filename: "06-poste-hueco" }
            : undefined);
  return (
    <Modal
      className={`assembly-dialog${cob || modular ? " assembly-dialog-cob" : ""}`}
      aria-labelledby="assembly-title"
      onClose={onClose}
    >
      <ModalHeader
        className="assembly-header"
        title="Guía de armado"
        titleId="assembly-title"
        closeLabel="Cerrar guía de armado"
        onClose={onClose}
        description={
          <>
            {name} · {settings.width} × {settings.height} × {settings.depth} cm
          </>
        }
      >
        <div className="eyebrow">TU DISEÑO, PIEZA POR PIEZA</div>
      </ModalHeader>
      <ol
        className="assembly-steps"
        aria-label="Pasos de armado"
        style={{ "--assembly-step-count": steps.length } as CSSProperties}
      >
        {steps.map((item, index) => (
          <li key={item.short}>
            <Button
              variant="unstyled"
              type="button"
              aria-current={step === index ? "step" : undefined}
              aria-label={`Paso ${index + 1}: ${item.title}`}
              onClick={() => setStep(index)}
            >
              <span>{index < step ? <Check size={14} /> : index + 1}</span>
              {item.short}
            </Button>
          </li>
        ))}
      </ol>
      <div className="assembly-body" ref={body}>
        <AssemblyViewer
          settings={settings}
          masks={masks}
          simulation={simulation}
          artwork={artwork}
          step={step}
          fabrication={fabrication}
        />
        <div
          className="assembly-instructions"
          ref={instructions}
          tabIndex={0}
          role="region"
          aria-label="Instrucciones del paso"
        >
          <div aria-live="polite" aria-atomic="true">
            <span className="assembly-progress">
              PASO {step + 1} DE {steps.length}
            </span>
            <h3>{current.title}</h3>
            <p>
              {separated
                ? current.description
                : modular && step === 1
                  ? "Identificá la pieza 05: la base incorpora el alojamiento del poste y, según la alimentación, el compartimento de 3 AAA o un pasacables USB. Imprimí su cara exterior contra la cama."
                  : modular && step === 6
                    ? "Presentá el poste 06 en el alojamiento central, con su entrada lateral hacia los cables. Encastrá el cabezal 07 en el otro extremo, instalá la estrella con el LED hacia la pared y conectá una sola alimentación. En la variante de pilas, cerrá el compartimento con la tapita 08 después de probar."
                    : cob && step === 1
                      ? "Identificá la pieza 05 con rebajes COB: imprimí la cara exterior contra la cama y los rebajes hacia arriba. La raya de orientación A queda fuera de la zona de pegado."
                      : cob && step === 6
                        ? "Presentá los tramos en los rebajes de la cara interior y comprobá la lista de cortes. Dejá libres los contactos de ambos extremos; soldá y probá antes de pegar definitivamente."
                        : fabrication && step === 1
                          ? "Identificá la pieza 05: imprimí la cara exterior contra la cama y los soportes cilíndricos hacia arriba. Los soportes quedan hacia el interior al armar."
                          : fabrication && step === 6
                            ? `Colocá ${fabrication.ledCount} LED(s) en los asientos, con las cabezas expuestas hacia la pared. Pasá las patas por los conductos de la tapa; comprobá la polaridad y la limitación de corriente. Fijá con un punto de adhesivo si el ajuste queda suelto.`
                            : current.description}
            </p>
            {part && (
              <div className="assembly-file">
                <span>PIEZA DEL ARCHIVO</span>
                <strong>{part.filename}.stl</strong>
              </div>
            )}
            {cob &&
              (step === (separated ? 2 : 1) ||
                step === lightStep ||
                step === resultStep) && (
                <div className="assembly-file">
                  <span>MONTAJE COB · CORTES Y CONEXIÓN</span>
                  {cobGuide(settings, fabrication!).map((line, i) => (
                    <p key={i}>{line}</p>
                  ))}
                </div>
              )}
            {modular && !mounted && step === lightStep && (
              <div className="assembly-file">
                <span>PIEZAS Y CONEXIÓN DEL MÓDULO</span>
                <strong>
                  06-poste-hueco.stl · 07-cabezal-estrella.stl
                  {!separated && modularCount(fabrication) === 8
                    ? " · 08-tapa-3-AAA.stl"
                    : ""}
                </strong>
                {modularGuide(settings, fabrication!).map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
              </div>
            )}
            {separated &&
              (step === 1 ||
                step === 2 ||
                step === 8 ||
                (mounted && step === 10)) && (
                <div className="assembly-file">
                  <span>SEPARACIÓN Y ORIENTACIÓN</span>
                  {enclosureGuide(settings, fabrication!).map((line, i) => (
                    <p key={i}>{line}</p>
                  ))}
                </div>
              )}
            {step === lightStep && !cob && (
              <div className="assembly-file">
                <span>DISTANCIA A LA PARED</span>
                <strong>
                  {(
                    (settings.wallOffset ?? 0) +
                    (settings.depth * settings.lightPercent) / 100
                  ).toLocaleString("es-AR", { maximumFractionDigits: 2 })}{" "}
                  cm · centrada en la caja
                </strong>
              </div>
            )}
            {step === resultStep && (
              <div className="assembly-file">
                <span>PROYECCIÓN ESTIMADA</span>
                <strong>El patrón corresponde a tu diseño actual.</strong>
              </div>
            )}
          </div>
          <p className="assembly-note">
            {separated
              ? mounted
                ? "La base y el anclaje van contra la pared. Pilas, tapa electrónica, tubo, paneles y embellecedor se montan en ese orden. Comprobá encastres y carga del anclaje con un prototipo."
                : "Tapa exterior hacia la persona, sombra en la pared de atrás. La electrónica y la placa portaluces son piezas independientes. Verificá medidas y ajuste antes de fijar."
              : modular
                ? "Poste, cabezal y tapita tienen ajuste guiado, sin traba. Medí el hardware y probá la holgura antes de fijar. La simulación puntual no incluye la oclusión de los soportes."
                : fabrication
                  ? `${fabrication.joints ? "Las lengüetas entran en las ranuras de la tapa; alterná los dientes entre paredes. Son guías de armado, sin traba." : "Encastres desactivados: presentá los bordes planos antes de fijarlos."} Probá la holgura antes del montaje definitivo. La simulación usa una fuente central; varios LEDs pueden desplazar las sombras.`
                  : "Guía de orientación. Las piezas no tienen encastres: probá el ajuste antes de fijarlas. La esfera representa la posición de la luz."}
          </p>
        </div>
      </div>
      <ModalFooter className="assembly-footer">
        <Button
          variant="unstyled"
          type="button"
          className="assembly-restart"
          disabled={step === 0}
          onClick={() => setStep(0)}
        >
          <RotateCcw size={15} /> Reiniciar
        </Button>
        <div>
          <Button
            variant="unstyled"
            type="button"
            className="button secondary"
            disabled={step === 0}
            onClick={() => setStep((value) => Math.max(0, value - 1))}
          >
            <ArrowLeft size={16} /> Anterior
          </Button>
          {step < steps.length - 1 ? (
            <Button
              variant="unstyled"
              type="button"
              className="button primary"
              onClick={() =>
                setStep((value) => Math.min(steps.length - 1, value + 1))
              }
            >
              Siguiente <ArrowRight size={16} />
            </Button>
          ) : (
            <Button
              variant="unstyled"
              type="button"
              className="button primary"
              onClick={onClose}
            >
              Finalizar <Check size={16} />
            </Button>
          )}
        </div>
      </ModalFooter>
    </Modal>
  );
}
