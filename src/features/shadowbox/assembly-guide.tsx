"use client";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Check, RotateCcw } from "lucide-react";
import { PRINT_PARTS, type BoxSettings, type WallMask } from "./engine";
import { ASSEMBLY_STEPS } from "./assembly";
import AssemblyViewer from "./assembly-viewer";
import type { Fabrication } from "./fabrication";
import { Button, Modal, ModalHeader, ModalFooter } from "@/components/ui";
import "./assembly-guide.css";

export default function AssemblyGuide({
  name,
  settings,
  masks,
  simulation,
  onClose,
  fabrication,
}: {
  name: string;
  settings: BoxSettings;
  masks: WallMask[];
  simulation: Uint8ClampedArray;
  onClose: () => void;
  fabrication?: Fabrication;
}) {
  const [step, setStep] = useState(0);
  const current = ASSEMBLY_STEPS[step];
  const part = PRINT_PARTS.find((part) => part.id === current.part);
  return (
    <Modal
      className="assembly-dialog"
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
      <ol className="assembly-steps" aria-label="Pasos de armado">
        {ASSEMBLY_STEPS.map((item, index) => (
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
      <div className="assembly-body">
        <AssemblyViewer
          settings={settings}
          masks={masks}
          simulation={simulation}
          step={step}
          fabrication={fabrication}
        />
        <div className="assembly-instructions">
          <div aria-live="polite" aria-atomic="true">
            <span className="assembly-progress">
              PASO {step + 1} DE {ASSEMBLY_STEPS.length}
            </span>
            <h3>{current.title}</h3>
            <p>
              {fabrication && step === 1
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
            {step === 6 && (
              <div className="assembly-file">
                <span>DISTANCIA A LA PARED</span>
                <strong>
                  {(
                    (settings.depth * settings.lightPercent) /
                    100
                  ).toLocaleString("es-AR", { maximumFractionDigits: 2 })}{" "}
                  cm · centrada en la caja
                </strong>
              </div>
            )}
            {step === 7 && (
              <div className="assembly-file">
                <span>PROYECCIÓN ESTIMADA</span>
                <strong>El patrón corresponde a tu diseño actual.</strong>
              </div>
            )}
          </div>
          <p className="assembly-note">
            {fabrication
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
          {step < ASSEMBLY_STEPS.length - 1 ? (
            <Button
              variant="unstyled"
              type="button"
              className="button primary"
              onClick={() =>
                setStep((value) =>
                  Math.min(ASSEMBLY_STEPS.length - 1, value + 1),
                )
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
