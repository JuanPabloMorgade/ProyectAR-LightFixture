"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, ArrowRight, Check, RotateCcw, X } from "lucide-react";
import { PRINT_PARTS, type BoxSettings, type WallMask } from "./engine";
import { ASSEMBLY_STEPS } from "./assembly";
import AssemblyViewer from "./assembly-viewer";
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
  const dialog = useRef<HTMLDialogElement>(null);
  const [step, setStep] = useState(0);
  const current = ASSEMBLY_STEPS[step];
  const part = PRINT_PARTS.find((part) => part.id === current.part);
  useEffect(() => {
    const node = dialog.current!;
    const opener = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    node.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      node.close();
      document.body.style.overflow = overflow;
      if (opener?.isConnected) opener.focus();
    };
  }, []);
  return createPortal(
    <dialog
      ref={dialog}
      className="assembly-dialog"
      aria-labelledby="assembly-title"
      onKeyDown={(event) => {
        if (event.key !== "Tab") return;
        const buttons = Array.from(
          event.currentTarget.querySelectorAll<HTMLButtonElement>(
            "button:not(:disabled)",
          ),
        );
        const first = buttons[0],
          last = buttons[buttons.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          const rect = event.currentTarget.getBoundingClientRect();
          if (
            event.clientX < rect.left ||
            event.clientX > rect.right ||
            event.clientY < rect.top ||
            event.clientY > rect.bottom
          )
            onClose();
        }
      }}
    >
      <div className="assembly-header">
        <div>
          <div className="eyebrow">TU DISEÑO, PIEZA POR PIEZA</div>
          <h2 id="assembly-title">Guía de armado</h2>
          <p>
            {name} · {settings.width} × {settings.height} × {settings.depth} cm
          </p>
        </div>
        <button
          type="button"
          className="assembly-close"
          aria-label="Cerrar guía de armado"
          onClick={onClose}
          autoFocus
        >
          <X size={20} />
        </button>
      </div>
      <ol className="assembly-steps" aria-label="Pasos de armado">
        {ASSEMBLY_STEPS.map((item, index) => (
          <li key={item.short}>
            <button
              type="button"
              aria-current={step === index ? "step" : undefined}
              aria-label={`Paso ${index + 1}: ${item.title}`}
              onClick={() => setStep(index)}
            >
              <span>{index < step ? <Check size={14} /> : index + 1}</span>
              {item.short}
            </button>
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
      <div className="assembly-footer">
        <button
          type="button"
          className="assembly-restart"
          disabled={step === 0}
          onClick={() => setStep(0)}
        >
          <RotateCcw size={15} /> Reiniciar
        </button>
        <div>
          <button
            type="button"
            className="button secondary"
            disabled={step === 0}
            onClick={() => setStep((value) => Math.max(0, value - 1))}
          >
            <ArrowLeft size={16} /> Anterior
          </button>
          {step < ASSEMBLY_STEPS.length - 1 ? (
            <button
              type="button"
              className="button primary"
              onClick={() =>
                setStep((value) =>
                  Math.min(ASSEMBLY_STEPS.length - 1, value + 1),
                )
              }
            >
              Siguiente <ArrowRight size={16} />
            </button>
          ) : (
            <button type="button" className="button primary" onClick={onClose}>
              Finalizar <Check size={16} />
            </button>
          )}
        </div>
      </div>
    </dialog>,
    document.body,
  );
}
