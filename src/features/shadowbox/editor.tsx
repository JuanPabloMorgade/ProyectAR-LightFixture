"use client";
import { projectionSettings } from "./projection-settings";
import { fitWallLight } from "./light-position";
import {
  fixtureShadow,
  reachableMasks,
  occludeSimulation,
} from "./projection-occlusion";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  Download,
  Upload,
  Save,
  FolderOpen,
  Sun,
  Box,
  PenLine,
  RotateCcw,
  FileDown,
  ChevronDown,
  Eye,
  Info,
  ShieldCheck,
} from "lucide-react";
import {
  IMAGE_SIZE,
  LOW_DETAIL,
  MEDIUM_DETAIL,
  HIGH_DETAIL,
  VERY_HIGH_DETAIL,
  masksFromImage,
  simulatedImage,
  maskSVG,
  validateBox,
  type BoxSettings,
  type WallMask,
  type Face,
} from "./engine";
import {
  presetArt,
  imageFromFile,
  rasterizeCrop,
  type Preset,
} from "./artwork";
import ShadowViewer from "./viewer";
import AssemblyGuide from "./assembly-guide";
import EnclosureControls from "./enclosure-controls";
import { currentFabrication, defaultEditorBox } from "./editor-defaults";
import ModularControls from "./modular-controls";
import { isModular, modularCount } from "./modular";
import {
  fabricationMasks,
  lightingLayout,
  validateFabrication,
  type Fabrication,
} from "./fabrication";
import {
  Button,
  Disclosure,
  FieldHelp,
  SavedDesigns,
  Input,
  TextField,
  NumberField,
  SelectField,
  RangeField,
  Checkbox,
  FileInput,
  Modal,
  ModalHeader,
  ModalFooter,
  Toast,
  ToastViewport,
} from "@/components/ui";
import type { STLExportMode, STLExportResult } from "./stl-export";
import "./shadowbox.css";
import {
  type Project,
  checkProject,
  readOld,
  shadowProjectStorage,
} from "./projects";
import { useSavedDesigns } from "@/hooks/use-saved-designs";

type Crop = {
  image: HTMLImageElement;
  filename: string;
  zoom: number;
  panX: number;
  panY: number;
  threshold: number;
  invert: boolean;
};
type ShadowStep = "how" | "design" | "three";
type PreviewNotice = {
  id: number;
  kind: "detail" | "design" | "image";
  detail?: number;
  message?: string;
  status: "loading" | "done" | "error";
  hidden: boolean;
};
const previewTitles = {
  detail: {
    loading: "Cargando detalles…",
    done: "Detalles actualizados",
    error: "No se pudieron cargar los detalles",
  },
  design: {
    loading: "Cargando diseño…",
    done: "Diseño actualizado",
    error: "No se pudo cargar el diseño",
  },
  image: {
    loading: "Cargando imagen…",
    done: "Imagen lista para recortar",
    error: "No se pudo cargar la imagen",
  },
};
const labels: Record<Face, string> = {
  top: "Superior",
  bottom: "Inferior",
  left: "Izquierdo",
  right: "Derecho",
};
function download(content: BlobPart, name: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
function safeName(name: string) {
  return (
    name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9_-]+/g, "_")
      .slice(0, 80) || "cuadro"
  );
}
function MaskPreview({ mask }: { mask: WallMask }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    c.width = mask.columns;
    c.height = mask.rows;
    const ctx = c.getContext("2d")!,
      im = ctx.createImageData(c.width, c.height);
    for (let y = 0; y < c.height; y++)
      for (let x = 0; x < c.width; x++) {
        const i = (y * c.width + x) * 4,
          cut = mask.cells[y * c.width + x];
        im.data[i] = cut ? 250 : 33;
        im.data[i + 1] = cut ? 207 : 49;
        im.data[i + 2] = cut ? 140 : 53;
        im.data[i + 3] = 255;
      }
    ctx.putImageData(im, 0, 0);
  }, [mask]);
  return (
    <canvas
      ref={canvas}
      role="img"
      aria-label={`Patrón del panel ${labels[mask.face].toLowerCase()}`}
    />
  );
}

export default function ShadowEditor() {
  const previewVersion = useRef(0);
  const previewFrames = useRef<number[]>([]);
  const cancelPreview = useRef<(() => void) | null>(null);
  const [appliedPreview, setAppliedPreview] = useState(0);
  const [previewPending, startPreviewTransition] = useTransition();
  const [previewNotice, setPreviewNotice] = useState<PreviewNotice | null>(
    null,
  );
  const previewLoading = previewNotice?.status === "loading" || previewPending;
  const art = useRef<HTMLCanvasElement>(null),
    artModel = useRef<HTMLCanvasElement | null>(null),
    simCanvas = useRef<HTMLCanvasElement>(null),
    cropCanvas = useRef<HTMLCanvasElement>(null),
    stepButtons = useRef<Array<HTMLButtonElement | null>>([]),
    uploadInput = useRef<HTMLInputElement>(null),
    importInput = useRef<HTMLInputElement>(null),
    exportJob = useRef<Worker | null>(null),
    draw = useRef(false),
    last = useRef<[number, number] | null>(null),
    panOrigin = useRef<{
      x: number;
      y: number;
      panX: number;
      panY: number;
    } | null>(null);
  const [settings, setSettings] = useState<BoxSettings>(defaultEditorBox),
    [fabrication, setFabrication] = useState<Fabrication>(() =>
      currentFabrication(),
    ),
    [fabricationDrafts, setFabricationDrafts] = useState<
      Partial<Record<keyof Fabrication, string>>
    >({}),
    [numberDrafts, setNumberDrafts] = useState<
      Partial<Record<keyof BoxSettings, string>>
    >({}),
    [name, setName] = useState("Mi cuadro de sombra"),
    [target, setTarget] = useState<Uint8ClampedArray | null>(null),
    [step, setStep] = useState<ShadowStep>("how"),
    [brush, setBrush] = useState(18),
    [erase, setErase] = useState(false),
    [crop, setCrop] = useState<Crop | null>(null),
    [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [working, setWorking] = useState(false),
    [exportMode, setExportMode] = useState<STLExportMode>("combined"),
    [assemblyOpen, setAssemblyOpen] = useState(false),
    [showInterior, setShowInterior] = useState(false);
  const designs = useSavedDesigns(shadowProjectStorage);
  const steps = [
    {
      id: "how" as const,
      number: 1,
      label: "Cómo funciona",
      description: "Concepto y armado",
      Icon: Sun,
    },
    {
      id: "design" as const,
      number: 2,
      label: "Diseñador de patrones",
      description: "Imagen y proyección",
      Icon: PenLine,
    },
    {
      id: "three" as const,
      number: 3,
      label: "Vista 3D",
      description: "Modelo y descarga",
      Icon: Box,
    },
  ];
  const opticalSettings = useMemo(
    () => projectionSettings(settings, fabrication),
    [settings, fabrication],
  );
  const maskProjection = useMemo(() => {
    if (!target)
      return {
        masks: [] as WallMask[],
        blocked: new Uint8Array(IMAGE_SIZE * IMAGE_SIZE),
        blockedApertureFraction: 0,
      };
    try {
      const blocked = fixtureShadow(opticalSettings, fabrication, target);
      const reachable = reachableMasks(
        masksFromImage(target, opticalSettings),
        opticalSettings,
        blocked,
      );
      return {
        blocked,
        blockedApertureFraction: reachable.blockedApertureFraction,
        masks: fabricationMasks(reachable.masks, opticalSettings, {
          joints: fabrication.joints,
          clearance: fabrication.clearance,
        }),
      };
    } catch {
      return {
        masks: [] as WallMask[],
        blocked: new Uint8Array(IMAGE_SIZE * IMAGE_SIZE),
        blockedApertureFraction: 0,
      };
    }
  }, [target, opticalSettings, fabrication]);
  const masks = maskProjection.masks;
  useEffect(() => {
    if (
      previewNotice?.status === "loading" &&
      !previewPending &&
      appliedPreview === previewNotice.id
    ) {
      setPreviewNotice({
        ...previewNotice,
        status:
          previewNotice.kind === "image" || masks.length === 4
            ? "done"
            : "error",
      });
    }
  }, [previewNotice, previewPending, appliedPreview, masks]);
  const simulation = useMemo(
    () =>
      masks.length === 4
        ? occludeSimulation(
            simulatedImage(
              masks,
              opticalSettings,
              fabrication.enclosure?.layout === "wall",
            ),
            maskProjection.blocked,
          ).pixels
        : null,
    [
      masks,
      opticalSettings,
      maskProjection.blocked,
      fabrication.enclosure?.layout,
    ],
  );
  const fabricationError = useMemo(() => {
    try {
      lightingLayout(settings, fabrication);
      return "";
    } catch (e) {
      return e instanceof Error ? e.message : "Revisá el soporte LED.";
    }
  }, [settings, fabrication]);
  function commit() {
    const source = art.current || artModel.current;
    if (!source) return;
    if (art.current && artModel.current)
      artModel.current.getContext("2d")!.drawImage(art.current, 0, 0);
    setTarget(
      new Uint8ClampedArray(
        source
          .getContext("2d", { willReadFrequently: true })!
          .getImageData(0, 0, IMAGE_SIZE, IMAGE_SIZE).data,
      ),
    );
    setError("");
  }
  function prepareArtwork(source: HTMLCanvasElement | HTMLImageElement) {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = IMAGE_SIZE;
    const ctx = canvas.getContext("2d", {
      willReadFrequently: true,
    })!;
    ctx.drawImage(source, 0, 0, IMAGE_SIZE, IMAGE_SIZE);
    const pixels = new Uint8ClampedArray(
      ctx.getImageData(0, 0, IMAGE_SIZE, IMAGE_SIZE).data,
    );
    return () => {
      artModel.current = canvas;
      art.current?.getContext("2d")!.drawImage(canvas, 0, 0);
      setTarget(pixels);
      setError("");
    };
  }
  function setArtwork(source: HTMLCanvasElement | HTMLImageElement) {
    prepareArtwork(source)();
  }
  useEffect(() => {
    setArtwork(presetArt("rays"));
    try {
      designs.refresh();
    } catch {
      setMessage("El navegador no permite ver los proyectos guardados.");
    }
    return () => {
      exportJob.current?.terminate();
      stopPreviewChange();
    };
  }, []);
  useEffect(() => {
    if (step === "design" && art.current && artModel.current)
      art.current.getContext("2d")!.drawImage(artModel.current, 0, 0);
  }, [step]);
  useEffect(() => {
    if (!simulation || !simCanvas.current) return;
    const c = simCanvas.current;
    c.width = c.height = IMAGE_SIZE;
    c.getContext("2d")!.putImageData(
      new ImageData(new Uint8ClampedArray(simulation), IMAGE_SIZE, IMAGE_SIZE),
      0,
      0,
    );
  }, [simulation, step]);
  useEffect(() => {
    if (!crop || !cropCanvas.current) return;
    const c = cropCanvas.current;
    c.width = c.height = IMAGE_SIZE;
    c.getContext("2d")!.drawImage(
      rasterizeCrop(
        crop.image,
        crop.zoom,
        crop.panX,
        crop.panY,
        crop.threshold,
        crop.invert,
      ),
      0,
      0,
    );
  }, [crop]);
  function preset(value: Preset, reset = false) {
    void updatePreview("design", () => ({
      apply: prepareArtwork(presetArt(value)),
      message: reset ? "Patrón restablecido." : "Patrón actualizado.",
    }));
  }
  function point(
    event: React.PointerEvent<HTMLCanvasElement>,
  ): [number, number] {
    const rect = event.currentTarget.getBoundingClientRect();
    return [
      ((event.clientX - rect.left) / rect.width) * IMAGE_SIZE,
      ((event.clientY - rect.top) / rect.height) * IMAGE_SIZE,
    ];
  }
  function stroke(p: [number, number], remove: boolean) {
    const c = art.current!.getContext("2d", { willReadFrequently: true })!;
    c.strokeStyle = remove ? "#10191b" : "#fff";
    c.fillStyle = c.strokeStyle;
    c.lineWidth = brush;
    c.lineCap = "round";
    c.lineJoin = "round";
    c.beginPath();
    const previous = last.current || p;
    c.moveTo(...previous);
    c.lineTo(...p);
    c.stroke();
    last.current = p;
  }
  function change<K extends keyof BoxSettings>(key: K, value: number) {
    setSettings((s) => ({ ...s, [key]: value }));
    setMessage("");
  }
  function stopPreviewChange() {
    previewVersion.current++;
    previewFrames.current.forEach((frame) => cancelAnimationFrame(frame));
    previewFrames.current = [];
    cancelPreview.current?.();
    cancelPreview.current = null;
  }
  function updatePreview(
    kind: PreviewNotice["kind"],
    prepare: () =>
      | { apply: () => void; message?: string }
      | Promise<{ apply: () => void; message?: string }>,
    detail?: number,
  ): Promise<boolean> {
    stopPreviewChange();
    const id = previewVersion.current;
    setMessage("");
    setError("");
    setPreviewNotice({ id, kind, detail, status: "loading", hidden: false });
    return new Promise((resolve) => {
      cancelPreview.current = () => resolve(false);
      // Let the loading notice paint before decoding or calculating the model.
      previewFrames.current = [
        requestAnimationFrame(() => {
          previewFrames.current.push(
            requestAnimationFrame(async () => {
              try {
                const prepared = await prepare();
                if (id !== previewVersion.current) return;
                startPreviewTransition(() => {
                  prepared.apply();
                  setAppliedPreview(id);
                  setPreviewNotice((notice) =>
                    notice?.id === id
                      ? { ...notice, message: prepared.message }
                      : notice,
                  );
                });
                cancelPreview.current = null;
                resolve(true);
              } catch (error) {
                if (id !== previewVersion.current) return;
                const message =
                  error instanceof Error
                    ? error.message
                    : "No se pudo cargar el diseño.";
                setPreviewNotice((notice) =>
                  notice?.id === id
                    ? { ...notice, status: "error", message }
                    : notice,
                );
                setError(message);
                cancelPreview.current = null;
                resolve(false);
              }
            }),
          );
        }),
      ];
    });
  }
  function changeDetail(detail: number) {
    if (detail === settings.detail) {
      stopPreviewChange();
      setPreviewNotice(null);
      return;
    }
    void updatePreview(
      "detail",
      () => ({ apply: () => setSettings((s) => ({ ...s, detail })) }),
      detail,
    );
  }
  function selectStep(next: typeof step, reveal = false) {
    if (next === "three") {
      const adjusted = fitWallLight(settings, fabrication);
      if (adjusted.lightPercent !== settings.lightPercent) {
        setSettings(adjusted);
        setNumberDrafts({});
        setMessage(
          `Posición del LED ajustada de ${settings.lightPercent}% a ${adjusted.lightPercent}% para que el cabezal entre en el modelo.`,
        );
      }
    }
    setStep(next);
    if (reveal && window.matchMedia?.("(max-width: 1000px)").matches)
      requestAnimationFrame(() =>
        document
          .getElementById("shadow-active-step")
          ?.scrollIntoView({ block: "start" }),
      );
  }
  async function prepareProject(project: Project) {
    validateBox(project.settings);
    const nextFabrication = currentFabrication(project.fabrication);
    const projectSettings =
      project.settings.detail === 96
        ? { ...project.settings, detail: LOW_DETAIL }
        : project.settings;
    const adjusted = fitWallLight(projectSettings, nextFabrication);
    const image = new Image();
    image.src = project.image;
    await image.decode();
    const applyArtwork = prepareArtwork(image);
    return {
      apply: () => {
        setSettings(adjusted);
        setNumberDrafts({});
        setFabrication(nextFabrication);
        setShowInterior(false);
        setFabricationDrafts({});
        setName(project.name);
        applyArtwork();
        setStep("design");
      },
      message: `Proyecto «${project.name}» abierto.${project.fabrication?.illumination !== "modular" ? " La iluminación anterior se actualizó a LED de 1 W; revisá el montaje." : ""}${adjusted.lightPercent !== project.settings.lightPercent ? ` Posición del LED ajustada de ${project.settings.lightPercent}% a ${adjusted.lightPercent}% para que entre el cabezal.` : ""}`,
    };
  }
  function loadProject(project: Project) {
    return updatePreview("design", () => prepareProject(project));
  }
  function currentProject(): Project {
    return {
      version: 2,
      name: name.trim() || "Mi cuadro",
      settings,
      image: artModel.current!.toDataURL("image/png"),
      fabrication,
    };
  }
  function save() {
    try {
      validateBox(settings);
      validateFabrication(fabrication);
      const p = currentProject();
      designs.save(p);
      setMessage("Diseño guardado en este navegador.");
      setError("");
    } catch {
      setError("No se pudo guardar. Descargá una copia del proyecto.");
    }
  }
  async function openSelected() {
    stopPreviewChange();
    setPreviewNotice(null);
    try {
      await designs.openSelected(async (project) => {
        if (!(await loadProject(project)))
          throw new DOMException("Carga cancelada", "AbortError");
      });
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      setError(
        e instanceof Error ? e.message : "No se pudo abrir el proyecto.",
      );
    }
  }
  function removeSelected() {
    try {
      if (designs.removeSelected()) setMessage("Proyecto eliminado.");
    } catch {
      setError("No se pudo eliminar el proyecto.");
    }
  }
  async function onPhoto(file?: File) {
    if (!file) return;
    await updatePreview("image", async () => {
      const image = await imageFromFile(file);
      return {
        apply: () =>
          setCrop({
            image,
            filename: file.name,
            zoom: 1,
            panX: 0,
            panY: 0,
            threshold: 128,
            invert: false,
          }),
      };
    });
  }
  async function exportSTL() {
    if (
      masks.length !== 4 ||
      exportJob.current ||
      fabricationError ||
      previewLoading
    )
      return;
    setWorking(true);
    setError("");
    let worker: Worker;
    try {
      worker = new Worker(new URL("./export.worker.ts", import.meta.url));
    } catch {
      setWorking(false);
      setError(
        "No se pudo iniciar la exportación. Recargá la página e intentá de nuevo.",
      );
      return;
    }
    exportJob.current = worker;
    worker.onmessage = ({
      data,
    }: MessageEvent<STLExportResult | { error: string }>) => {
      worker.terminate();
      exportJob.current = null;
      setWorking(false);
      if ("error" in data) {
        setError(data.error);
        return;
      }
      download(data.buffer, data.filename, data.mime);
      setMessage(
        data.mime === "application/zip"
          ? `ZIP generado: ${modularCount(fabrication)} STL separados y una guía de armado.`
          : `STL generado: ${data.triangles.toLocaleString("es-AR")} triángulos.`,
      );
    };
    worker.onerror = () => {
      worker.terminate();
      exportJob.current = null;
      setWorking(false);
      setError("No se pudo generar el STL. Probá con menos detalle.");
    };
    worker.postMessage({
      settings: opticalSettings,
      artwork: target,
      masks,
      mode: exportMode,
      name: safeName(name),
      fabrication,
    });
  }
  const number = (
    key: keyof BoxSettings,
    label: string,
    min: number,
    max: number,
    step: number,
    unit: string,
  ) => (
    <NumberField
      key={key}
      label={label}
      unit={unit}
      min={min}
      max={max}
      step={step}
      value={numberDrafts[key] ?? String(settings[key])}
      onChange={(e) => {
        const text = e.currentTarget.value;
        setNumberDrafts((drafts) => ({ ...drafts, [key]: text }));
        if (text !== "" && Number.isFinite(Number(text)))
          change(key, Number(text));
      }}
      onBlur={() => {
        setNumberDrafts((drafts) => {
          const next = { ...drafts };
          delete next[key];
          return next;
        });
      }}
    />
  );
  const fabricationNumber = (
    key: "ledDiameter" | "flangeDiameter" | "ledHeight" | "clearance",
    label: string,
    min: number,
    max: number,
  ) => (
    <NumberField
      label={label}
      unit="mm"
      min={min}
      max={max}
      step={0.05}
      value={fabricationDrafts[key] ?? String(fabrication[key])}
      onChange={(e) => {
        const text = e.currentTarget.value;
        setFabricationDrafts((drafts) => ({ ...drafts, [key]: text }));
        if (text !== "" && Number.isFinite(Number(text))) {
          setFabrication((f) => ({ ...f, [key]: Number(text) }));
          setMessage("");
        }
      }}
      onBlur={() =>
        setFabricationDrafts((drafts) => {
          const next = { ...drafts };
          delete next[key];
          return next;
        })
      }
    />
  );
  return (
    <div className="shadow-workspace">
      <div className="shadow-header">
        <div>
          <div className="eyebrow">ESTUDIO / CUADROS DE SOMBRA</div>
          <h1>Dibujá con luz.</h1>
          <p>
            Diseñá una imagen, ajustá la caja y convertí la luz en piezas
            reales.
          </p>
        </div>
        <a
          href="#shadow-active-step"
          className="button secondary shadow-work-link"
        >
          <Eye size={16} />
          Ir al área de trabajo
        </a>
      </div>
      <section className="shadow-project-bar" aria-label="Proyecto y archivos">
        <TextField
          label="Nombre"
          value={name}
          maxLength={100}
          onChange={(e) => setName(e.target.value)}
        />
        <SavedDesigns
          items={designs.items}
          selected={designs.selected}
          onSelect={designs.select}
          onOpen={() => void openSelected()}
          onRemove={removeSelected}
          fieldClassName="shadow-saved"
        />
        <div className="shadow-header-actions">
          <Button
            variant="secondary"
            disabled={previewLoading}
            onClick={() =>
              download(
                JSON.stringify(currentProject()),
                `${safeName(name)}.json`,
                "application/json",
              )
            }
          >
            <FileDown size={16} />
            Exportar proyecto
          </Button>
          <Button
            variant="secondary"
            onClick={() => importInput.current?.click()}
          >
            <FolderOpen size={16} />
            Importar
          </Button>
          <Button variant="primary" disabled={previewLoading} onClick={save}>
            <Save size={16} />
            Guardar
          </Button>
          <FileInput
            hidden
            ref={importInput}

            accept=".json,application/json"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              try {
                await updatePreview("design", async () => {
                  if (file.size > 5_000_000)
                    throw new Error("El archivo supera los 5 MB.");
                  const raw = await file.text();
                  const data = JSON.parse(raw);
                  const project =
                    data.version === 1
                      ? readOld(raw, file.name)
                      : checkProject(data);
                  return prepareProject(project);
                });
              } catch (err) {
                setError(
                  err instanceof Error
                    ? err.message
                    : "No se pudo importar el diseño.",
                );
              }
            }}
          />
        </div>
      </section>
      <nav className="shadow-stepper" aria-label="Recorrido del editor">
        <ol>
          {steps.map(({ id, number, label, description, Icon }, index) => (
            <li key={id}>
              <Button
                variant="unstyled"
                ref={(button) => {
                  stepButtons.current[index] = button;
                }}
                className={step === id ? "selected" : ""}
                aria-label={label}
                aria-current={step === id ? "step" : undefined}
                onClick={(event) => selectStep(id, event.detail > 0)}
                onKeyDown={(event) => {
                  const targetIndex =
                    event.key === "ArrowRight"
                      ? (index + 1) % steps.length
                      : event.key === "ArrowLeft"
                        ? (index - 1 + steps.length) % steps.length
                        : event.key === "Home"
                          ? 0
                          : event.key === "End"
                            ? steps.length - 1
                            : null;
                  if (targetIndex === null) return;
                  event.preventDefault();
                  selectStep(steps[targetIndex].id);
                  stepButtons.current[targetIndex]?.focus();
                }}
              >
                <span className="shadow-step-number" aria-hidden="true">
                  {number}
                </span>
                <Icon size={16} aria-hidden="true" />
                <span className="shadow-step-label">
                  {label}
                  <small aria-hidden="true">{description}</small>
                </span>
              </Button>
            </li>
          ))}
        </ol>
      </nav>
      <div className="shadow-layout">
        <aside className="shadow-sidebar" aria-label="Configurar tu cuadro">
          <section
            className="shadow-sidebar-section"
            aria-labelledby="shadow-dimensions-title"
          >
            <div className="shadow-panel-head">
              <h2 id="shadow-dimensions-title">Medidas principales</h2>
            </div>
            <div className="shadow-two">
              {number("width", "Ancho", 6, 80, 0.01, "cm")}
              {number("height", "Alto", 6, 100, 0.01, "cm")}
              {number("depth", "Profundidad", 3, 50, 0.01, "cm")}
              <div className="shadow-help-field">
                {number("radius", "Radio de proyección", 15, 150, 1, "cm")}
                <FieldHelp title="Radio de proyección">
                  <p>
                    Define el radio de la imagen objetivo sobre la pared. Revisá
                    cómo cambia la proyección estimada al modificarlo.
                  </p>
                  <p>
                    La luz real, su posición y el montaje pueden cambiar el
                    resultado. Probá primero con un diseño simple.
                  </p>
                </FieldHelp>
              </div>
              <div className="shadow-help-field">
                {number("lightPercent", "Posición de luz", 10, 95, 1, "%")}
                <FieldHelp title="Posición de luz">
                  <p>
                    Ubica la luz a lo largo de la profundidad óptica, en
                    porcentaje. Al entrar en Vista 3D, una posición incompatible
                    se ajusta al valor válido más cercano para que entre el
                    cabezal.
                  </p>
                  <p>
                    El largo del tubo depende de esta posición y de la altura
                    real del emisor sobre la estrella.
                  </p>
                </FieldHelp>
              </div>
              {number("margin", "Margen de corte", 0, 10, 1, "mm")}
              {number("thickness", "Espesor", 0.6, 12, 0.2, "mm")}
            </div>
            <Disclosure
              title="Ajustes avanzados"
              subtitle="Detalle de los recortes y exportación"
              className="shadow-settings-disclosure"
            >
              <SelectField
                label="Detalle"
                value={
                  previewNotice?.kind === "detail" &&
                  previewNotice.status === "loading"
                    ? previewNotice.detail
                    : settings.detail
                }
                disabled={previewLoading && previewNotice?.kind !== "detail"}
                onChange={(e) => changeDetail(Number(e.target.value))}
                options={[
                  { value: LOW_DETAIL, label: "Bajo" },
                  { value: MEDIUM_DETAIL, label: "Medio" },
                  { value: HIGH_DETAIL, label: "Alto" },
                  {
                    value: VERY_HIGH_DETAIL,
                    label: "Muy alto",
                  },
                ]}
              />
              <p className="shadow-help">
                Todas las medidas de exportación se convierten a milímetros.
              </p>
              <p className="shadow-help">
                Las partes sin unión al marco se eliminan tanto en la proyección
                estimada como en los archivos exportados.
              </p>
            </Disclosure>
          </section>
          <div className="shadow-context" aria-live="polite">
            <Info size={18} aria-hidden="true" />
            <div>
              <strong>
                {step === "how"
                  ? "Empezá con un ejemplo"
                  : step === "design"
                    ? "Contraste y formas simples"
                    : "Antes de imprimir"}
              </strong>
              <p>
                {step === "how"
                  ? "Podés probar el flujo con las medidas iniciales y ajustar tu cuadro después."
                  : step === "design"
                    ? "Los contrastes marcados producen cortes más definidos. La proyección es estimativa y depende de la distancia y el montaje."
                    : "Medí tus componentes y probá los encastres con tu material antes de imprimir el conjunto."}
              </p>
            </div>
          </div>
        </aside>
        <section
          className="shadow-main"
          id="shadow-active-step"
          tabIndex={-1}
          aria-label="Área de trabajo"
        >
          {step === "design" && (
            <>
              <header className="shadow-step-header">
                <div className="shadow-step-heading">
                  <div className="eyebrow">PASO 2 · DISEÑADOR DE PATRONES</div>
                  <h2>Dale forma a tu diseño</h2>
                  <p>
                    Cargá una imagen, probá un ejemplo o dibujá sobre el lienzo.
                  </p>
                </div>
                <div className="shadow-step-actions">
                  <Button variant="secondary" onClick={() => setStep("how")}>
                    Atrás
                  </Button>
                  <Button variant="primary" onClick={() => selectStep("three")}>
                    Siguiente
                  </Button>
                </div>
              </header>
              <div className="shadow-design-source">
                <Button
                  variant="primary"
                  onClick={() => uploadInput.current?.click()}
                >
                  <Upload size={16} />
                  Cargar imagen
                </Button>
                <div className="shadow-example-group">
                  <span>O probá con un ejemplo</span>
                  {(
                    [
                      ["rays", "Rayos"],
                      ["flower", "Flor"],
                      ["stars", "Estrellas"],
                      ["letters", "Texto"],
                    ] as const
                  ).map(([id, label]) => (
                    <Button
                      variant="unstyled"
                      key={id}
                      onClick={() => preset(id)}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
                <FileInput
                  ref={uploadInput}
                  hidden
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  onChange={(e) => {
                    void onPhoto(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
              </div>
              <div className="shadow-design-tools">
                <div
                  className="shadow-tool-row"
                  role="group"
                  aria-label="Herramientas de dibujo"
                >
                  <span>Pincel</span>
                  <Button
                    variant="unstyled"
                    className={!erase ? "active" : ""}
                    aria-pressed={!erase}
                    onClick={() => setErase(false)}
                  >
                    Dibujar
                  </Button>
                  <Button
                    variant="unstyled"
                    className={erase ? "active" : ""}
                    aria-pressed={erase}
                    onClick={() => setErase(true)}
                  >
                    Borrar
                  </Button>
                  <Input
                    type="range"
                    min="4"
                    max="58"
                    value={brush}
                    onChange={(e) => setBrush(Number(e.target.value))}
                    aria-label="Tamaño del pincel"
                  />
                  <small>{brush}px</small>
                  <Button
                    variant="unstyled"
                    onClick={() => preset("rays", true)}
                  >
                    <RotateCcw size={14} />
                    Reiniciar
                  </Button>
                </div>
              </div>
              <div className="shadow-canvas-grid">
                <article className="shadow-canvas-card">
                  <div className="shadow-card-top">
                    <h2>Imagen objetivo</h2>
                    <span>EDITABLE</span>
                  </div>
                  <canvas
                    ref={art}
                    width={IMAGE_SIZE}
                    height={IMAGE_SIZE}
                    className="shadow-draw"
                    aria-label="Dibujá el patrón aquí"
                    onPointerDown={(e) => {
                      e.currentTarget.setPointerCapture(e.pointerId);
                      draw.current = true;
                      last.current = null;
                      stroke(point(e), erase !== e.shiftKey);
                    }}
                    onPointerMove={(e) => {
                      if (draw.current) stroke(point(e), erase !== e.shiftKey);
                    }}
                    onPointerUp={() => {
                      draw.current = false;
                      last.current = null;
                      commit();
                    }}
                    onPointerCancel={() => {
                      draw.current = false;
                      last.current = null;
                      commit();
                    }}
                  />
                  <small>
                    Claro = luz · Oscuro = sombra. Arrastrá para dibujar; Mayús
                    invierte pincel y borrador.
                  </small>
                </article>
                <article className="shadow-canvas-card">
                  <div className="shadow-card-top">
                    <h2>Proyección estimada</h2>
                    <span>EN LA PARED</span>
                  </div>
                  <canvas
                    ref={simCanvas}
                    className="shadow-sim"
                    width={IMAGE_SIZE}
                    height={IMAGE_SIZE}
                    aria-label="Resultado simulado en la pared"
                  />
                  <small>
                    La forma real depende de la lámpara y la distancia.
                  </small>
                </article>
              </div>
              <div className="shadow-section-title">
                <div>
                  <h2>Patrones de corte</h2>
                  <p>
                    Blanco = abertura por donde pasa la luz. Cada panel se
                    descarga en escala real.
                  </p>
                </div>
              </div>
              <div className="shadow-mask-grid">
                {masks.map((mask) => (
                  <article key={mask.face}>
                    <div>
                      <strong>Panel {labels[mask.face].toLowerCase()}</strong>
                      <Button
                        variant="unstyled"
                        aria-label={`Descargar SVG del panel ${labels[mask.face].toLowerCase()}`}
                        onClick={() =>
                          download(
                            maskSVG(mask),
                            `${safeName(name)}-${mask.face}.svg`,
                            "image/svg+xml",
                          )
                        }
                      >
                        <Download size={13} />
                        SVG
                      </Button>
                    </div>
                    <MaskPreview mask={mask} />
                    <small>
                      {(mask.span * 10).toLocaleString("es-AR", {
                        maximumFractionDigits: 2,
                      })}{" "}
                      ×{" "}
                      {(mask.depth * 10).toLocaleString("es-AR", {
                        maximumFractionDigits: 2,
                      })}{" "}
                      mm
                    </small>
                  </article>
                ))}
              </div>
            </>
          )}
          {step === "three" && (
            <>
              <header className="shadow-step-header">
                <div className="shadow-step-heading">
                  <div className="eyebrow">PASO 3 · VISTA 3D</div>
                  <h2>Revisá tu cuadro en 3D</h2>
                  <p>Explorá el modelo y descargá las piezas para imprimir.</p>
                </div>
                <div className="shadow-step-actions">
                  <Button variant="secondary" onClick={() => setStep("design")}>
                    Volver al diseño
                  </Button>
                </div>
              </header>
              <div className="shadow-3d-bar">
                <div>
                  <h2>La caja, desde todos los ángulos</h2>
                  <p>Arrastrá para girar · Rueda para acercar y alejar</p>
                </div>
                <Checkbox
                  label="Ver interior"
                  checked={showInterior}
                  onChange={(e) => setShowInterior(e.target.checked)}
                />
              </div>
              {isModular(fabrication) && (
                <p className="shadow-preview-note">
                  Cabezal circular encastrado al poste, con tope de 6 mm y paso
                  para cables. Conserva la distancia del emisor a la pared. La
                  proyección incluye la sombra de sus dos nervios de 1,2 × 1,6
                  mm: orientalos hacia esquinas opuestas, como en el modelo.
                </p>
              )}
              <div className="shadow-three-stage" aria-busy={previewLoading}>
                {simulation && masks.length === 4 && !fabricationError ? (
                  <ShadowViewer
                    settings={opticalSettings}
                    artwork={target ?? undefined}
                    masks={masks}
                    simulation={simulation}
                    interior={showInterior}
                    fabrication={fabrication}
                  />
                ) : (
                  <span>{fabricationError || "Preparando la vista 3D…"}</span>
                )}
              </div>
              <div className="shadow-model-summary">
                <div>
                  <span>DIMENSIONES DEL DISEÑO</span>
                  <strong>
                    {settings.width} × {settings.height} × {settings.depth} cm
                  </strong>
                </div>
                <div>
                  <span>ARMADO</span>
                  <strong>
                    {modularCount(fabrication)} piezas imprimibles
                  </strong>
                </div>
              </div>
              <div className="shadow-safety">
                <ShieldCheck size={19} aria-hidden="true" />
                <div>
                  <strong>Revisá el montaje real</strong>
                  <p>
                    Las medidas iniciales del portapilas y la altura del emisor
                    son provisionales. Medí tus componentes. No conectes USB a
                    las pilas; comprobá la temperatura del LED y la resistencia,
                    y la retención del anclaje en tu pared.
                  </p>
                </div>
              </div>
              <section
                className="shadow-lighting-panel"
                aria-labelledby="shadow-lighting-title"
              >
                <div className="shadow-panel-head">
                  <h2 id="shadow-lighting-title">Prepará el armado</h2>
                  <span>03</span>
                </div>
                <p className="shadow-lighting-intro">
                  LED de 1 W · Ajustá su ubicación y elegí la alimentación antes
                  de preparar el armado.
                </p>
                <div className="shadow-build-grid">
                  <ModularControls
                    key={designs.selected}
                    settings={opticalSettings}
                    fabrication={fabrication}
                    onChange={(modular) => {
                      setFabrication((f) => ({ ...f, modular }));
                      setMessage("");
                    }}
                    onLightPosition={(lightPercent) => {
                      setSettings((s) => ({ ...s, lightPercent }));
                      setNumberDrafts({});
                      setMessage("");
                    }}
                  />
                  <div className="shadow-base-options">
                    <h3>Base y terminación</h3>
                    <EnclosureControls
                      key={`enclosure-${designs.selected}`}
                      settings={settings}
                      fabrication={fabrication}
                      onChange={(enclosure) => {
                        setFabrication((f) => ({ ...f, enclosure }));
                        setMessage("");
                      }}
                    />
                  </div>
                </div>
                <Disclosure
                  title="Holguras y encastres"
                  subtitle="Separación entre piezas y uniones de armado"
                  className="shadow-settings-disclosure"
                >
                  {fabricationNumber(
                    "clearance",
                    "Holgura de ajuste",
                    0.1,
                    0.8,
                  )}
                  <Checkbox
                    label="Encastres de armado"
                    checked={fabrication.joints}
                    onChange={(e) => {
                      setFabrication((f) => ({
                        ...f,
                        joints: e.target.checked,
                      }));
                      setMessage("");
                    }}
                  />
                </Disclosure>
                {fabricationError && (
                  <p className="shadow-fabrication-error" role="alert">
                    {fabricationError}
                  </p>
                )}
              </section>
              <div className="shadow-3d-footer">
                <div>
                  <h3>Tu cuadro, listo para imprimir</h3>
                  <p>
                    Elegí un STL combinado o las piezas separadas. El LED y la
                    estrella se compran aparte.
                  </p>
                  <Button
                    variant="unstyled"
                    type="button"
                    className="button secondary assembly-open"
                    disabled={
                      previewLoading ||
                      !simulation ||
                      masks.length !== 4 ||
                      !!fabricationError
                    }
                    onClick={() => setAssemblyOpen(true)}
                  >
                    <Box size={17} /> Ver guía de armado
                  </Button>
                </div>
                <div className="shadow-export">
                  <SelectField
                    label="Formato de descarga"
                    value={exportMode}
                    disabled={working}
                    onChange={(e) =>
                      setExportMode(e.target.value as STLExportMode)
                    }
                    aria-describedby="shadow-export-description"
                    options={[
                      {
                        value: "combined",
                        label: `Un STL con las ${modularCount(fabrication)} piezas`,
                      },
                      { value: "separate", label: "Piezas separadas · ZIP" },
                    ]}
                  />
                  <span id="shadow-export-description">
                    {exportMode === "combined"
                      ? `Las ${modularCount(fabrication)} piezas, una al lado de la otra en un solo archivo.`
                      : `${modularCount(fabrication)} archivos STL numerados y una guía para identificar las piezas.`}
                  </span>
                  <Button
                    variant="primary"
                    disabled={
                      previewLoading ||
                      working ||
                      masks.length !== 4 ||
                      !!fabricationError
                    }
                    onClick={() => void exportSTL()}
                  >
                    <Download size={17} />
                    {working
                      ? "Preparando descarga…"
                      : exportMode === "combined"
                        ? `Descargar STL · ${modularCount(fabrication)} piezas`
                        : `Descargar ZIP · ${modularCount(fabrication)} STL`}
                  </Button>
                </div>
              </div>
              <Disclosure
                title="Cómo interpretar el modelo y la proyección"
                subtitle="Orientación, recortes bloqueados y límites de la simulación"
                className="shadow-preview-details"
              >
                {isModular(fabrication) && (
                  <p className="shadow-preview-note">
                    Frente abierto sin marco hacia la persona; cierre y base con
                    anclaje contra la pared. El cabezal se encastra en el poste
                    central hasta el tope. Activá Ver interior para revisar las
                    tapitas y el recorrido de los cables. Medidas de portapilas
                    y altura del emisor provisionales: revisalas antes de
                    exportar. La vista incluye la sombra de las piezas impresas
                    con una fuente puntual.
                  </p>
                )}
                <p className="shadow-preview-note">
                  Recortes bloqueados por las piezas de la lámpara:
                  aproximadamente{" "}
                  {Math.round(maskProjection.blockedApertureFraction * 100)}% de
                  su área. Se omiten los recortes completamente bloqueados; no
                  se trasladan a otra altura.
                  {isModular(fabrication) &&
                    " Las paredes terminan después del cabezal, sin marco ni lengüetas delanteras."}
                </p>
                <p>
                  Izquierda y derecha se nombran mirando la caja de frente,
                  desde la habitación. La estrella y el LED son referencias que
                  no se imprimen.
                </p>
              </Disclosure>
            </>
          )}
          {step === "how" && (
            <>
              <header className="shadow-step-header">
                <div className="shadow-step-heading">
                  <div className="eyebrow">PASO 1 · CÓMO FUNCIONA</div>
                  <h2>De una imagen a un cuadro de luz</h2>
                  <p>
                    Un LED dentro del cuadro proyecta tu diseño sobre la pared a
                    través de los recortes laterales. Prepará el dibujo, revisá
                    la luz y descargá las piezas para imprimir.
                  </p>
                </div>
                <div className="shadow-step-actions">
                  <Button variant="primary" onClick={() => setStep("design")}>
                    Siguiente
                  </Button>
                </div>
              </header>
              <div className="shadow-how-content">
                <ol
                  className="shadow-journey"
                  aria-label="Cómo crear tu cuadro"
                >
                  {(
                    [
                      [
                        Upload,
                        "Elegí una imagen",
                        "Subí tu foto o probá un ejemplo.",
                      ],
                      [
                        PenLine,
                        "Diseñá el patrón",
                        "Dibujá, borrá y ajustá el contraste.",
                      ],
                      [
                        Sun,
                        "Revisá la proyección",
                        "Compará tu dibujo con la sombra estimada.",
                      ],
                      [
                        Box,
                        "Explorá el modelo",
                        "Revisá el interior y prepará el armado.",
                      ],
                      [
                        Download,
                        "Llevalo a imprimir",
                        "Descargá las piezas y seguí la guía.",
                      ],
                    ] as const
                  ).map(([StepIcon, title, text], index) => {
                    return (
                      <li key={title}>
                        <div className="shadow-journey-icon">
                          <StepIcon size={21} aria-hidden="true" />
                          <span>0{index + 1}</span>
                        </div>
                        <h3>{title}</h3>
                        <p>{text}</p>
                      </li>
                    );
                  })}
                </ol>
                <section
                  className="shadow-how-assembly"
                  aria-labelledby="shadow-how-assembly-title"
                >
                  <h3 id="shadow-how-assembly-title">
                    Cómo se monta el cuadro
                  </h3>
                  <ol className="shadow-mount-order">
                    <li>
                      <strong>Base contra la pared</strong>
                      <span>
                        Aloja la electrónica y el anclaje. Con pilas, la tapa se
                        abre desde atrás al descolgar el cuadro.
                      </span>
                    </li>
                    <li>
                      <strong>Paredes con recortes</strong>
                      <span>
                        Bajan por fuera de la base y se alinean con sus guías.
                        El LED de 1 W mira hacia la pared.
                      </span>
                    </li>
                    <li>
                      <strong>Frente abierto sin marco</strong>
                      <span>
                        Mira hacia la habitación. El cabezal del LED se encastra
                        en el poste central, que también lleva los cables.
                      </span>
                    </li>
                  </ol>
                  <p>
                    La base inicial mide 20 mm de alto. El montaje usa 9 piezas
                    con 3 AAA u 8 con USB; el LED, el portapilas y las
                    conexiones se compran por separado. Medí tus componentes
                    antes de imprimir.
                  </p>
                </section>
                <p className="shadow-how-note">
                  <Sun size={18} aria-hidden="true" />
                  La base también proyecta una sombra central. Un dibujo con una
                  zona oscura amplia en el centro ayuda a integrarla en la
                  imagen. La vista es una estimación: comprobá el resultado con
                  un primer montaje.
                </p>
                <details className="shadow-reference">
                  <summary>
                    <span>
                      La geometría detrás de la luz
                      <small>Conocé cómo se calcula la proyección.</small>
                    </span>
                    <ChevronDown size={18} aria-hidden="true" />
                  </summary>
                  <div className="shadow-math">
                    <p>
                      La pared está en <code>z = 0</code>. La lámpara está a{" "}
                      <code>
                        c ={" "}
                        {(
                          (opticalSettings.wallOffset ?? 0) +
                          (opticalSettings.depth *
                            opticalSettings.lightPercent) /
                            100
                        ).toFixed(2)}{" "}
                        cm
                      </code>{" "}
                      de ella. Cada abertura lateral deja pasar un rayo hacia un
                      punto de la pared.
                    </p>
                    <div className="shadow-equation">
                      <span>De abertura a pared</span>
                      <code>
                        escala = c / (c − z)
                        <br />X = lado × escala
                        <br />Y = posición × escala
                      </code>
                    </div>
                    <p>
                      Cuanto más cerca esté una abertura de la luz, más lejos se
                      proyectará el punto. Las aberturas que quedarían a la
                      altura de la lámpara se excluyen porque no iluminan la
                      pared.
                    </p>
                    <p>
                      La simulación supone una fuente puntual. En una pieza real
                      influyen el tamaño del LED, su ubicación, el material y la
                      superficie de la pared. También se calcula el bloqueo de
                      la luz por la base, las tapas y los soportes impresos.
                    </p>
                  </div>
                </details>
              </div>
            </>
          )}
          {error ? (
            <p className="shadow-status error" role="alert">
              {error}
            </p>
          ) : (
            <p className="shadow-status">
              Proyecto local · Tus imágenes permanecen en este navegador.
            </p>
          )}
        </section>
      </div>
      <ToastViewport>
        {previewNotice &&
          !previewNotice.hidden &&
          !(previewNotice.status === "error" && error) && (
            <Toast
              key={`preview-${previewNotice.id}-${previewNotice.status}`}
              title={previewTitles[previewNotice.kind][previewNotice.status]}
              description={
                previewNotice.status === "loading"
                  ? previewNotice.kind === "image"
                    ? "Preparando la imagen para el recorte."
                    : "Actualizando los recortes y la proyección."
                  : previewNotice.status === "done"
                    ? (previewNotice.message ??
                      (previewNotice.kind === "image"
                        ? "Recortá la imagen y aplicala al diseño."
                        : "Tu diseño ya usa el detalle elegido."))
                    : (previewNotice.message ??
                      "Revisá las medidas del cuadro e intentá de nuevo.")
              }
              variant={
                previewNotice.status === "error"
                  ? "error"
                  : previewNotice.status === "done"
                    ? "success"
                    : "info"
              }
              duration={previewNotice.status === "done" ? 4000 : 0}
              progress={
                previewNotice.status === "loading"
                  ? null
                  : previewNotice.status === "done"
                    ? 100
                    : undefined
              }
              onDismiss={() =>
                setPreviewNotice(
                  (notice) => notice && { ...notice, hidden: true },
                )
              }
            />
          )}
        {message && !error && (
          <Toast
            key={message}
            title="Aviso de ProyectAR"
            description={message}
            variant="info"
            onDismiss={() => setMessage("")}
          />
        )}
      </ToastViewport>
      {assemblyOpen && simulation && masks.length === 4 && (
        <AssemblyGuide
          name={name}
          settings={opticalSettings}
          artwork={target ?? undefined}
          masks={masks}
          simulation={simulation}
          fabrication={fabrication}
          onClose={() => setAssemblyOpen(false)}
        />
      )}
      {crop && (
        <Modal
          className="shadow-modal"
          aria-label="Recortar imagen"
          onClose={() => setCrop(null)}
        >
          <ModalHeader
            title="Prepará tu imagen"
            onClose={() => setCrop(null)}
            closeLabel="Cerrar recorte de imagen"
            description="Mové y acercá la imagen. El círculo indica el área que se proyectará."
          />
          <div
            className="shadow-crop-stage"
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              panOrigin.current = {
                x: e.clientX,
                y: e.clientY,
                panX: crop.panX,
                panY: crop.panY,
              };
            }}
            onPointerMove={(e) => {
              const start = panOrigin.current;
              if (start)
                setCrop(
                  (c) =>
                    c && {
                      ...c,
                      panX: start.panX + (e.clientX - start.x) / 160,
                      panY: start.panY + (e.clientY - start.y) / 160,
                    },
                );
            }}
            onPointerUp={() => {
              panOrigin.current = null;
            }}
          >
            <canvas ref={cropCanvas} />
            <div className="shadow-crop-ring" />
          </div>
          <RangeField
            label="Zoom"
            min={1}
            max={3}
            step={0.05}
            value={crop.zoom}
            onChange={(e) => setCrop({ ...crop, zoom: Number(e.target.value) })}
          />
          <RangeField
            label="Umbral"
            min={20}
            max={235}
            value={crop.threshold}
            onChange={(e) =>
              setCrop({ ...crop, threshold: Number(e.target.value) })
            }
          />
          <Checkbox
            label="Invertir claros y oscuros"
            checked={crop.invert}
            onChange={(e) => setCrop({ ...crop, invert: e.target.checked })}
          />
          <ModalFooter className="shadow-modal-actions">
            <Button variant="secondary" onClick={() => setCrop(null)}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                const selectedCrop = crop;
                setCrop(null);
                void updatePreview("design", () => {
                  const applyArtwork = prepareArtwork(
                    rasterizeCrop(
                      selectedCrop.image,
                      selectedCrop.zoom,
                      selectedCrop.panX,
                      selectedCrop.panY,
                      selectedCrop.threshold,
                      selectedCrop.invert,
                    ),
                  );
                  return {
                    apply: () => {
                      applyArtwork();
                      setName(
                        selectedCrop.filename
                          .replace(/\.[^.]+$/, "")
                          .slice(0, 100),
                      );
                    },
                    message: "Imagen aplicada al diseño.",
                  };
                });
              }}
            >
              Aplicar imagen
            </Button>
          </ModalFooter>
        </Modal>
      )}
    </div>
  );
}
