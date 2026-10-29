"use client";
import { projectionSettings } from "./projection-settings";
import { fitWallLight } from "./light-position";
import {
  fixtureShadow,
  reachableMasks,
  occludeSimulation,
} from "./projection-occlusion";
import { useEffect, useMemo, useRef, useState } from "react";
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
  Trash2,
  ChevronDown,
} from "lucide-react";
import {
  IMAGE_SIZE,
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
  Input,
  TextField,
  NumberField,
  Select,
  SelectField,
  RangeField,
  Checkbox,
  FileInput,
  FormField,
  Modal,
  ModalHeader,
  ModalFooter,
  Toast,
  ToastViewport,
} from "@/components/ui";
import type { STLExportMode, STLExportResult } from "./stl-export";
import "./shadowbox.css";

type Project = {
  version: 2;
  name: string;
  settings: BoxSettings;
  image: string;
  fabrication?: Fabrication;
};
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
const prefix = "proyectar:shadow:v2:",
  legacyPrefix = "shadowbox.design.";
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
function scanProjects() {
  const result: { id: string; label: string; old: boolean }[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i) || "";
    if (key.startsWith(prefix))
      result.push({ id: key, label: key.slice(prefix.length), old: false });
    else if (key.startsWith(legacyPrefix) && !key.endsWith(".meta"))
      result.push({
        id: key,
        label:
          key.slice(legacyPrefix.length).replace(/\.json$/i, "") +
          " · versión anterior",
        old: true,
      });
  }
  return result.sort((a, b) => a.label.localeCompare(b.label));
}
function checkProject(data: unknown): Project {
  const p = data as Project;
  if (
    !p ||
    p.version !== 2 ||
    typeof p.name !== "string" ||
    p.name.length > 100 ||
    typeof p.image !== "string" ||
    p.image.length > 5_000_000 ||
    !/^data:image\/png;base64,/.test(p.image)
  )
    throw new Error("El archivo no es un proyecto válido de ProyectAR.");
  validateBox(p.settings);
  if (p.fabrication !== undefined) {
    // Projects from the first prototype start at the new six-LED minimum.
    if ([1, 2, 3].includes(p.fabrication.ledCount))
      p.fabrication = { ...p.fabrication, ledCount: 6 };
    validateFabrication(p.fabrication);
  }
  return p;
}
function readOld(raw: string, name: string): Project {
  const old = JSON.parse(raw) as {
    sliders?: Record<string, number>;
    targetImage?: string;
  };
  if (
    !old.sliders ||
    typeof old.targetImage !== "string" ||
    !old.targetImage.startsWith("data:image/png")
  )
    throw new Error("El diseño anterior no tiene un formato válido.");
  const val = (key: string, fallback: number) => {
    const n = Number(old.sliders![key]);
    return Number.isFinite(n) ? n : fallback;
  };
  const settings: BoxSettings = {
    width: val("s-W", 15),
    height: val("s-H", 15),
    depth: val("s-d", 6),
    radius: val("d-R", 55),
    lightPercent: val("s-lightz", defaultEditorBox.lightPercent),
    thickness: 2,
    margin: val("d-margin", 3),
    detail: 160,
  };
  validateBox(settings);
  return {
    version: 2,
    name: name.replace(/\.json$/i, ""),
    settings,
    image: old.targetImage,
  };
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
    [stored, setStored] = useState<ReturnType<typeof scanProjects>>([]),
    [selected, setSelected] = useState(""),
    [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [working, setWorking] = useState(false),
    [exportMode, setExportMode] = useState<STLExportMode>("combined"),
    [assemblyOpen, setAssemblyOpen] = useState(false),
    [showInterior, setShowInterior] = useState(false);
  const steps = [
    { id: "how" as const, number: 1, label: "Cómo funciona", Icon: Sun },
    {
      id: "design" as const,
      number: 2,
      label: "Diseñador de patrones",
      Icon: PenLine,
    },
    { id: "three" as const, number: 3, label: "Vista 3D", Icon: Box },
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
  function setArtwork(source: HTMLCanvasElement | HTMLImageElement) {
    if (!artModel.current) {
      artModel.current = document.createElement("canvas");
      artModel.current.width = artModel.current.height = IMAGE_SIZE;
    }
    const ctx = artModel.current.getContext("2d", {
      willReadFrequently: true,
    })!;
    ctx.clearRect(0, 0, IMAGE_SIZE, IMAGE_SIZE);
    ctx.drawImage(source, 0, 0, IMAGE_SIZE, IMAGE_SIZE);
    if (art.current)
      art.current.getContext("2d")!.drawImage(artModel.current, 0, 0);
    commit();
  }
  useEffect(() => {
    setArtwork(presetArt("rays"));
    try {
      setStored(scanProjects());
    } catch {
      setMessage("El navegador no permite ver los proyectos guardados.");
    }
    return () => {
      exportJob.current?.terminate();
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
  function preset(value: Preset) {
    setArtwork(presetArt(value));
    setMessage("Patrón actualizado.");
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
  function selectStep(next: typeof step) {
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
  }
  async function loadImage(src: string) {
    const image = new Image();
    image.src = src;
    await image.decode();
    setArtwork(image);
  }
  async function loadProject(project: Project) {
    validateBox(project.settings);
    const nextFabrication = currentFabrication(project.fabrication);
    const adjusted = fitWallLight(project.settings, nextFabrication);
    setSettings(adjusted);
    setNumberDrafts({});
    setFabrication(nextFabrication);
    setShowInterior(false);
    setFabricationDrafts({});
    setName(project.name);
    await loadImage(project.image);
    setMessage(
      `Proyecto «${project.name}» abierto.${project.fabrication?.illumination !== "modular" ? " La iluminación anterior se actualizó a LED de 1 W; revisá el montaje." : ""}${adjusted.lightPercent !== project.settings.lightPercent ? ` Posición del LED ajustada de ${project.settings.lightPercent}% a ${adjusted.lightPercent}% para que entre el cabezal.` : ""}`,
    );
    setStep("design");
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
      localStorage.setItem(prefix + p.name, JSON.stringify(p));
      setStored(scanProjects());
      setSelected(prefix + p.name);
      setMessage("Diseño guardado en este navegador.");
      setError("");
    } catch {
      setError("No se pudo guardar. Descargá una copia del proyecto.");
    }
  }
  function openSelected() {
    try {
      const item = stored.find((p) => p.id === selected);
      if (!item) throw new Error("Elegí un proyecto.");
      const raw = localStorage.getItem(item.id);
      if (!raw) throw new Error("No se encontró el proyecto.");
      const project = item.old
        ? readOld(raw, item.label.replace(" · versión anterior", ""))
        : checkProject(JSON.parse(raw));
      void loadProject(project).catch(() =>
        setError("No se pudo abrir la imagen del proyecto."),
      );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No se pudo abrir el proyecto.",
      );
    }
  }
  function removeSelected() {
    const item = stored.find((p) => p.id === selected);
    if (!item || !confirm(`¿Eliminar «${item.label}» de este navegador?`))
      return;
    localStorage.removeItem(item.id);
    if (item.old) localStorage.removeItem(item.id + ".meta");
    setStored(scanProjects());
    setSelected("");
    setMessage("Proyecto eliminado.");
  }
  async function onPhoto(file?: File) {
    if (!file) return;
    try {
      const image = await imageFromFile(file);
      setCrop({
        image,
        filename: file.name,
        zoom: 1,
        panX: 0,
        panY: 0,
        threshold: 128,
        invert: false,
      });
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo abrir la imagen.");
    }
  }
  async function exportSTL() {
    if (masks.length !== 4 || exportJob.current || fabricationError) return;
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
        <div className="shadow-header-actions">
          <Button
            variant="secondary"
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
          <Button variant="primary" onClick={save}>
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
                if (file.size > 5_000_000)
                  throw new Error("El archivo supera los 5 MB.");
                const raw = await file.text();
                const data = JSON.parse(raw);
                const project =
                  data.version === 1
                    ? readOld(raw, file.name)
                    : checkProject(data);
                await loadProject(project);
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
      </div>
      <nav className="shadow-stepper" aria-label="Recorrido del editor">
        <ol>
          {steps.map(({ id, number, label, Icon }, index) => (
            <li key={id}>
              <Button
                variant="unstyled"
                ref={(button) => {
                  stepButtons.current[index] = button;
                }}
                className={step === id ? "selected" : ""}
                aria-current={step === id ? "step" : undefined}
                onClick={() => selectStep(id)}
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
                <span>{label}</span>
              </Button>
            </li>
          ))}
        </ol>
      </nav>
      <div className="shadow-layout">
        <aside className="shadow-sidebar">
          <div className="shadow-panel-head">
            <h2>Tu diseño</h2>
            <span>01</span>
          </div>
          <TextField
            label="Nombre"
            value={name}
            maxLength={100}
            onChange={(e) => setName(e.target.value)}
          />
          <FormField
            label="Diseños guardados"
            id="shadow-saved-design"
            fieldClassName="shadow-saved"
          >
            {(controlProps) => (
              <div>
                <Select
                  {...controlProps}
                  value={selected}
                  onChange={(e) => setSelected(e.target.value)}
                >
                  <option value="">Elegir diseño…</option>
                  {stored.map((item) => (
                    <option value={item.id} key={item.id}>
                      {item.label}
                    </option>
                  ))}
                </Select>
                <Button
                  variant="unstyled"
                  onClick={openSelected}
                  disabled={!selected}
                  aria-label="Abrir diseño guardado"
                >
                  <FolderOpen size={16} />
                </Button>
                <Button
                  variant="unstyled"
                  onClick={removeSelected}
                  disabled={!selected}
                  aria-label="Eliminar diseño guardado"
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            )}
          </FormField>
          <div className="shadow-divider" />
          <div className="shadow-panel-head">
            <h2>Geometría</h2>
            <span>02</span>
          </div>
          <div className="shadow-two">
            {number("width", "Ancho", 6, 80, 0.01, "cm")}
            {number("height", "Alto", 6, 100, 0.01, "cm")}
            {number("depth", "Profundidad", 3, 50, 0.01, "cm")}
            {number("radius", "Radio de proyección", 15, 150, 1, "cm")}
            {number("lightPercent", "Posición de luz", 10, 95, 1, "%")}
            {number("margin", "Margen de corte", 0, 10, 1, "mm")}
            {number("thickness", "Espesor", 0.6, 12, 0.2, "mm")}
          </div>
          <SelectField
            label="Detalle"
            value={settings.detail}
            onChange={(e) => change("detail", Number(e.target.value))}
            options={[
              { value: 96, label: "Borrador" },
              { value: 160, label: "Equilibrado" },
              { value: 224, label: "Alto" },
            ]}
          />
          <p className="shadow-help">
            Todas las medidas de exportación se convierten a milímetros.
          </p>
          <p className="shadow-help">
            Las partes sin unión al marco se eliminan tanto en la proyección
            estimada como en los archivos exportados.
          </p>
        </aside>
        <section className="shadow-main">
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
                    Arrastrá para dibujar · Mayús invierte pincel y borrador
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
              <div className="shadow-design-tools">
                <div className="shadow-tool-row">
                  <span>Pincel</span>
                  <Button
                    variant="unstyled"
                    className={!erase ? "active" : ""}
                    onClick={() => setErase(false)}
                  >
                    Dibujar
                  </Button>
                  <Button
                    variant="unstyled"
                    className={erase ? "active" : ""}
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
                    onClick={() => {
                      setArtwork(presetArt("rays"));
                      setMessage("Patrón restablecido.");
                    }}
                  >
                    <RotateCcw size={14} />
                    Reiniciar
                  </Button>
                </div>
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
                      {mask.span * 10} × {mask.depth * 10} mm
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
                  Marco frontal abierto hacia la persona; cierre y base con
                  anclaje contra la pared. El tubo queda visible por delante.
                  Activá Ver interior para revisar las tapitas y el recorrido de
                  los cables. Medidas de portapilas y altura del emisor
                  provisionales: revisalas antes de exportar. La vista incluye
                  la sombra de las piezas impresas con una fuente puntual.
                </p>
              )}
              <p className="shadow-preview-note">
                Recortes bloqueados por las piezas de la lámpara:
                aproximadamente{" "}
                {Math.round(maskProjection.blockedApertureFraction * 100)}% de
                su área. Se omiten los recortes completamente bloqueados; no se
                trasladan a otra altura.
                {isModular(fabrication) &&
                  " Las paredes y el marco terminan después del cabezal, conservando el espacio de montaje."}
              </p>
              <div className="shadow-three-stage">
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
              <section
                className="shadow-lighting-panel"
                aria-labelledby="shadow-lighting-title"
              >
                <div className="shadow-panel-head">
                  <h2 id="shadow-lighting-title">Luz y armado</h2>
                  <span>03</span>
                </div>
                <p className="shadow-lighting-intro">
                  LED de 1 W · Ajustá su ubicación y elegí la alimentación antes
                  de preparar el armado.
                </p>
                <ModularControls
                  key={selected}
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
                {fabricationNumber("clearance", "Holgura de ajuste", 0.1, 0.8)}
                <EnclosureControls
                  key={`enclosure-${selected}`}
                  settings={settings}
                  fabrication={fabrication}
                  onChange={(enclosure) => {
                    setFabrication((f) => ({ ...f, enclosure }));
                    setMessage("");
                  }}
                />
                <Checkbox
                  label="Encastres de armado"
                  checked={fabrication.joints}
                  onChange={(e) => {
                    setFabrication((f) => ({ ...f, joints: e.target.checked }));
                    setMessage("");
                  }}
                />
                {fabricationError && (
                  <p className="shadow-fabrication-error" role="alert">
                    {fabricationError}
                  </p>
                )}
              </section>
              <div className="shadow-3d-footer">
                <div>
                  <strong>
                    {settings.width} × {settings.height} × {settings.depth} cm
                  </strong>
                  <span>
                    {`Armado modular: ${modularCount(fabrication)} piezas. La estrella y el LED son referencias que no se imprimen.`}
                  </span>
                  <span>
                    Izquierda y derecha mirando la caja de frente, desde la
                    habitación.
                  </span>
                  <Button
                    variant="unstyled"
                    type="button"
                    className="button secondary assembly-open"
                    disabled={
                      !simulation || masks.length !== 4 || !!fabricationError
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
                      working || masks.length !== 4 || !!fabricationError
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
                  <li>
                    <div className="shadow-journey-icon">
                      <Upload size={21} aria-hidden="true" />
                      <span>01</span>
                    </div>
                    <h3>Elegí tu imagen</h3>
                    <p>
                      Cargá una imagen o probá un ejemplo. Las zonas oscuras
                      forman la sombra; las claras dejan pasar la luz. Los
                      dibujos con buen contraste son más fáciles de preparar.
                    </p>
                  </li>
                  <li>
                    <div className="shadow-journey-icon">
                      <PenLine size={21} aria-hidden="true" />
                      <span>02</span>
                    </div>
                    <h3>Hacé tuyo el diseño</h3>
                    <p>
                      Dibujá, borrá y definí las medidas del cuadro. En Vista 3D
                      ajustá la posición del LED y revisá la proyección y el
                      interior antes de exportar.
                    </p>
                  </li>
                  <li>
                    <div className="shadow-journey-icon">
                      <Box size={21} aria-hidden="true" />
                      <span>03</span>
                    </div>
                    <h3>Llevalo a la impresión</h3>
                    <p>
                      Elegí USB o 3 pilas AAA y descargá las piezas en STL o
                      ZIP. La guía muestra cómo montar las paredes, el tubo, el
                      cabezal y las tapas de tu diseño.
                    </p>
                  </li>
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
                      <strong>Marco frontal abierto</strong>
                      <span>
                        Mira hacia la habitación y sostiene el cabezal del LED.
                        El tubo central lleva los cables.
                      </span>
                    </li>
                  </ol>
                  <p>
                    La base inicial mide 20 mm de alto. El montaje usa 10 piezas
                    con 3 AAA o 9 con USB; el LED, el portapilas y las
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
                setArtwork(
                  rasterizeCrop(
                    crop.image,
                    crop.zoom,
                    crop.panX,
                    crop.panY,
                    crop.threshold,
                    crop.invert,
                  ),
                );
                setName(crop.filename.replace(/\.[^.]+$/, "").slice(0, 100));
                setCrop(null);
                setMessage("Imagen aplicada al diseño.");
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
