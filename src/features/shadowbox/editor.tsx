"use client";
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
  Check,
  Trash2,
} from "lucide-react";
import {
  IMAGE_SIZE,
  FACES,
  defaultBox,
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
} from "@/components/ui";
import type { STLExportMode, STLExportResult } from "./stl-export";
import "./shadowbox.css";

type Project = {
  version: 2;
  name: string;
  settings: BoxSettings;
  image: string;
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
    lightPercent: val("s-lightz", 85),
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
  const [settings, setSettings] = useState<BoxSettings>(defaultBox),
    [name, setName] = useState("Mi cuadro de sombra"),
    [target, setTarget] = useState<Uint8ClampedArray | null>(null),
    [tab, setTab] = useState<"design" | "three" | "math">("design"),
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
    [showRays, setShowRays] = useState(false);
  const masks = useMemo(() => {
    if (!target) return [];
    try {
      return masksFromImage(target, settings);
    } catch {
      return [];
    }
  }, [target, settings]);
  const simulation = useMemo(
    () => (masks.length === 4 ? simulatedImage(masks, settings) : null),
    [masks, settings],
  );
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
    if (tab === "design" && art.current && artModel.current)
      art.current.getContext("2d")!.drawImage(artModel.current, 0, 0);
  }, [tab]);
  useEffect(() => {
    if (!simulation || !simCanvas.current) return;
    const c = simCanvas.current;
    c.width = c.height = IMAGE_SIZE;
    c.getContext("2d")!.putImageData(
      new ImageData(new Uint8ClampedArray(simulation), IMAGE_SIZE, IMAGE_SIZE),
      0,
      0,
    );
  }, [simulation, tab]);
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
  async function loadImage(src: string) {
    const image = new Image();
    image.src = src;
    await image.decode();
    setArtwork(image);
  }
  async function loadProject(project: Project) {
    validateBox(project.settings);
    setSettings(project.settings);
    setName(project.name);
    await loadImage(project.image);
    setMessage(`Proyecto «${project.name}» abierto.`);
    setTab("design");
  }
  function currentProject(): Project {
    return {
      version: 2,
      name: name.trim() || "Mi cuadro",
      settings,
      image: artModel.current!.toDataURL("image/png"),
    };
  }
  function save() {
    try {
      validateBox(settings);
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
    if (masks.length !== 4 || exportJob.current) return;
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
          ? "ZIP generado: 5 STL separados y una guía de armado."
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
      settings,
      masks,
      mode: exportMode,
      name: safeName(name),
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
      value={settings[key]}
      onChange={(e) => change(key, Number(e.target.value))}
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
      <div
        className="shadow-tabs"
        role="tablist"
        aria-label="Secciones del editor"
      >
        {(
          [
            ["design", "Diseñador de patrones", PenLine],
            ["three", "Vista 3D", Box],
            ["math", "Cómo funciona", Sun],
          ] as const
        ).map(([id, label, Icon]) => (
          <Button
            variant="unstyled"
            key={id}
            role="tab"
            aria-selected={tab === id}
            className={tab === id ? "selected" : ""}
            onClick={() => setTab(id)}
          >
            <Icon size={16} />
            {label}
          </Button>
        ))}
      </div>
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
            {number("width", "Ancho", 6, 80, 1, "cm")}
            {number("height", "Alto", 6, 100, 1, "cm")}
            {number("depth", "Profundidad", 3, 50, 0.5, "cm")}
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
          {tab === "design" && (
            <>
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
                  <span>Empezá con un patrón</span>
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
                  <Button
                    variant="unstyled"
                    onClick={() => uploadInput.current?.click()}
                  >
                    <Upload size={14} />
                    Cargar imagen
                  </Button>
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
          {tab === "three" && (
            <>
              <div className="shadow-3d-bar">
                <div>
                  <h2>La caja, desde todos los ángulos</h2>
                  <p>Arrastrá para girar · Rueda para acercar y alejar</p>
                </div>
                <Checkbox
                  label="Mostrar rayos"
                  checked={showRays}
                  onChange={(e) => setShowRays(e.target.checked)}
                />
              </div>
              <div className="shadow-three-stage">
                {simulation && masks.length === 4 ? (
                  <ShadowViewer
                    settings={settings}
                    masks={masks}
                    simulation={simulation}
                    rays={showRays}
                  />
                ) : (
                  <span>Preparando la vista 3D…</span>
                )}
              </div>
              <div className="shadow-3d-footer">
                <div>
                  <strong>
                    {settings.width} × {settings.height} × {settings.depth} cm
                  </strong>
                  <span>
                    Cuatro paredes y una tapa frontal lisa, a escala real.
                  </span>
                  <span>
                    Izquierda y derecha mirando la caja de frente, desde la
                    habitación.
                  </span>
                  <Button
                    variant="unstyled"
                    type="button"
                    className="button secondary assembly-open"
                    disabled={!simulation || masks.length !== 4}
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
                      { value: "combined", label: "Un STL con las 5 piezas" },
                      { value: "separate", label: "Piezas separadas · ZIP" },
                    ]}
                  />
                  <span id="shadow-export-description">
                    {exportMode === "combined"
                      ? "Las cinco piezas, una al lado de la otra en un solo archivo."
                      : "Cinco archivos STL numerados y una guía para identificar las piezas."}
                  </span>
                  <Button
                    variant="primary"
                    disabled={working || masks.length !== 4}
                    onClick={() => void exportSTL()}
                  >
                    <Download size={17} />
                    {working
                      ? "Preparando descarga…"
                      : exportMode === "combined"
                        ? "Descargar STL · 5 piezas"
                        : "Descargar ZIP · 5 STL"}
                  </Button>
                </div>
              </div>
            </>
          )}
          {tab === "math" && (
            <div className="shadow-math">
              <div className="eyebrow">REFERENCIA DE PROYECCIÓN</div>
              <h2>La geometría detrás de la luz</h2>
              <p>
                La pared está en <code>z = 0</code>. La lámpara está a{" "}
                <code>
                  c ={" "}
                  {((settings.depth * settings.lightPercent) / 100).toFixed(2)}{" "}
                  cm
                </code>{" "}
                de ella. Cada abertura lateral deja pasar un rayo hacia un punto
                de la pared.
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
                proyectará el punto. Las aberturas que quedarían a la altura de
                la lámpara se excluyen porque no iluminan la pared.
              </p>
              <p>
                La simulación supone una fuente puntual. En una pieza real
                influyen el tamaño del LED, su ubicación, el material y la
                superficie de la pared.
              </p>
            </div>
          )}
          {error ? (
            <p className="shadow-status error" role="alert">
              {error}
            </p>
          ) : message ? (
            <p className="shadow-status" role="status">
              <Check size={16} />
              {message}
            </p>
          ) : (
            <p className="shadow-status">
              Proyecto local · Tus imágenes permanecen en este navegador.
            </p>
          )}
        </section>
      </div>
      {assemblyOpen && simulation && masks.length === 4 && (
        <AssemblyGuide
          name={name}
          settings={settings}
          masks={masks}
          simulation={simulation}
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
