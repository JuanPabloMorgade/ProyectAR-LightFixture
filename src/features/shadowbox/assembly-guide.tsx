"use client";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Check, RotateCcw } from "lucide-react";
import { PRINT_PARTS, type BoxSettings, type WallMask } from "./engine";
import { ASSEMBLY_STEPS } from "./assembly";
import AssemblyViewer from "./assembly-viewer";
import { Button, Modal, ModalHeader, ModalFooter } from "@/components/ui";
import "./assembly-guide.css";

export default function AssemblyGuide({
  name,
  settings,
  masks,
  simulation,
  onClose,
}: {
  name: string;
  settings: BoxSettings;
  masks: WallMask[];
  simulation: Uint8ClampedArray;
  onClose: () => void;
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
        />
        <div className="assembly-instructions">
          <div aria-live="polite" aria-atomic="true">
            <span className="assembly-progress">
              PASO {step + 1} DE {ASSEMBLY_STEPS.length}
            </span>
            <h3>{current.title}</h3>
            <p>{current.description}</p>
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
            Guía de orientación. Las piezas no tienen encastres: probá el ajuste
            antes de fijarlas. La esfera representa la posición de la luz.
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
