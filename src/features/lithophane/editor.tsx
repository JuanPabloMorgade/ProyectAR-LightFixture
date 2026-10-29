"use client";
import { useEffect, useRef, useState } from "react";
import {
  Upload,
  Download,
  Save,
  RotateCcw,
  Sun,
  ImagePlus,
  FolderOpen,
  SlidersHorizontal,
  ArrowDownToLine,
} from "lucide-react";
import { defaults, validateSettings, binarySTL, type Settings } from "./mesh";
import Viewer from "./viewer";
import {
  Button,
  TextField,
  NumberField,
  SelectField,
  RangeField,
  Checkbox,
  FileInput,
  SegmentedControl,
  Toast,
  ToastViewport,
  type ToastVariant,
} from "@/components/ui";
type Mesh = { positions: Float32Array; indices: Uint32Array };
type Project = { version: 1; name: string; photo: string; settings: Settings };
const storageKey = "proyectar:lamp:v1";
function download(data: BlobPart, name: string, type: string) {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function sample() {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 420;
  const x = c.getContext("2d")!;
  const g = x.createLinearGradient(0, 0, 0, 420);
  g.addColorStop(0, "#34343a");
  g.addColorStop(1, "#e2d7c4");
  x.fillStyle = g;
  x.fillRect(0, 0, 512, 420);
  x.fillStyle = "#fff5d5";
  x.beginPath();
  x.arc(350, 120, 54, 0, Math.PI * 2);
  x.fill();
  for (const [offset, color] of [
    [0, "#67696c"],
    [95, "#333a40"],
    [180, "#131b21"],
  ] as const) {
    x.fillStyle = color;
    x.beginPath();
    x.moveTo(0, 320 + offset);
    x.lineTo(0, 230 + offset);
    x.lineTo(100, 130 + offset);
    x.lineTo(190, 250 + offset);
    x.lineTo(300, 170 + offset);
    x.lineTo(512, 300 + offset);
    x.lineTo(512, 420);
    x.lineTo(0, 420);
    x.fill();
  }
  return c.toDataURL("image/jpeg", 0.9);
}
async function readPhoto(src: string) {
  const img = new Image();
  img.src = src;
  await img.decode();
  const c = document.createElement("canvas");
  const ratio = Math.min(1, 800 / Math.max(img.width, img.height));
  c.width = Math.max(1, Math.round(img.width * ratio));
  c.height = Math.max(1, Math.round(img.height * ratio));
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(img, 0, 0, c.width, c.height);
  return {
    photo: c.toDataURL("image/jpeg", 0.9),
    pixels: ctx.getImageData(0, 0, c.width, c.height),
  };
}
function validateProject(p: Project) {
  if (
    p?.version !== 1 ||
    typeof p.name !== "string" ||
    p.name.length > 100 ||
    typeof p.photo !== "string" ||
    !/^data:image\/(png|jpeg|webp);base64,/.test(p.photo)
  )
    throw new Error("Este archivo no es un proyecto de lámpara de ProyectAR.");
  validateSettings(p.settings);
}
export default function LampEditor() {
  const [settings, setSettings] = useState<Settings>(defaults),
    [name, setName] = useState("Mi primera litofanía"),
    [photo, setPhoto] = useState(""),
    [pixels, setPixels] = useState<ImageData | null>(null),
    [mesh, setMesh] = useState<Mesh | null>(null),
    [busy, setBusy] = useState(true),
    [notice, updateNotice] = useState(""),
    [error, setError] = useState(""),
    [lit, setLit] = useState(true);
  const [noticeVariant, setNoticeVariant] = useState<ToastVariant>("success");
  function setNotice(text: string, variant: ToastVariant = "success") {
    updateNotice(text);
    setNoticeVariant(variant);
  }
  const worker = useRef<Worker | null>(null),
    request = useRef(0),
    photoRequest = useRef(0),
    fileInput = useRef<HTMLInputElement>(null),
    projectInput = useRef<HTMLInputElement>(null);
  async function applyPhoto(src: string) {
    const id = ++photoRequest.current;
    const result = await readPhoto(src);
    if (id !== photoRequest.current) return;
    setPhoto(result.photo);
    setPixels(result.pixels);
    setBusy(true);
    setError("");
  }
  useEffect(() => {
    const w = new Worker(new URL("./mesh.worker.ts", import.meta.url));
    worker.current = w;
    w.onmessage = ({ data }) => {
      if (data.id !== request.current) return;
      setBusy(false);
      if (data.error) {
        setError(data.error);
        return;
      }
      setMesh({ positions: data.positions, indices: data.indices });
    };
    w.onerror = () => {
      setBusy(false);
      setError("No se pudo iniciar el generador 3D. Recargá la página.");
    };
    async function init() {
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          const p = JSON.parse(stored) as Project;
          validateProject(p);
          setSettings(p.settings);
          setName(p.name);
          await applyPhoto(p.photo);
          setNotice("Proyecto guardado recuperado.");
          return;
        }
      } catch {
        setNotice("No se pudo recuperar el guardado anterior.", "warning");
      }
      await applyPhoto(sample());
    }
    void init().catch(() => {
      setError("No se pudo cargar la imagen.");
      setBusy(false);
    });
    return () => {
      photoRequest.current++;
      w.terminate();
      worker.current = null;
    };
  }, []);
  useEffect(() => {
    if (!pixels || !worker.current) return;
    const id = ++request.current;
    setBusy(true);
    setError("");
    const timer = setTimeout(
      () =>
        worker.current?.postMessage({
          id,
          pixels: pixels.data,
          width: pixels.width,
          height: pixels.height,
          settings,
        }),
      180,
    );
    return () => clearTimeout(timer);
  }, [pixels, settings]);
  const change = (key: keyof Settings, value: number | boolean) => {
    setBusy(true);
    setSettings((s) => ({ ...s, [key]: value }));
    setNotice("");
  };
  const project = (): Project => ({ version: 1, name, photo, settings });
  async function upload(file?: File) {
    if (!file) return;
    setError("");
    try {
      if (file.size > 15 * 1024 * 1024)
        throw new Error("Elegí una imagen de hasta 15 MB.");
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
        throw new Error("Usá una imagen JPG, PNG o WebP.");
      const url = URL.createObjectURL(file);
      try {
        await applyPhoto(url);
      } finally {
        URL.revokeObjectURL(url);
      }
      setName(file.name.replace(/\.[^.]+$/, "").slice(0, 100));
      setNotice(
        "Imagen cargada. Ajustá la altura para conservar sus proporciones.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo abrir la imagen.");
    }
  }
  const ready = !!mesh && !busy && !error;
  return (
    <>
      <section className="editor-heading">
        <div>
          <div className="eyebrow">ESTUDIO / LÁMPARAS CON FOTOS</div>
          <h1>Un recuerdo que ilumina.</h1>
          <p>Convertí tu foto en una litofanía lista para imprimir.</p>
        </div>
        <Button
          variant="secondary"
          disabled={!photo || busy || !!error}
          onClick={() => {
            try {
              validateSettings(settings);
              localStorage.setItem(storageKey, JSON.stringify(project()));
              setNotice("Proyecto guardado en este navegador.");
            } catch {
              setNotice(
                "No se pudo guardar en este navegador. Usá Exportar proyecto para descargar una copia.",
                "warning",
              );
            }
          }}
        >
          <Save size={16} />
          Guardar proyecto
        </Button>
      </section>
      <div className="lamp-workspace">
        <aside className="controls">
          <div className="panel-title">
            <SlidersHorizontal size={17} />
            <h2>Tu diseño</h2>
            <span>01</span>
          </div>
          <TextField
            label="Nombre del proyecto"
            value={name}
            maxLength={100}
            onChange={(e) => setName(e.target.value)}
          />
          <p className="ui-label">Fotografía</p>
          <Button
            variant="unstyled"
            className="upload-area"
            onClick={() => fileInput.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              void upload(e.dataTransfer.files[0]);
            }}
          >
            {photo ? (
              <img src={photo} alt="Fotografía del proyecto" />
            ) : (
              <ImagePlus />
            )}
            <span>
              <Upload size={16} /> Cambiar imagen
              <small>JPG, PNG o WebP · hasta 15 MB</small>
            </span>
          </Button>
          <FileInput
            ref={fileInput}

            accept="image/png,image/jpeg,image/webp"
            hidden
            onChange={(e) => {
              void upload(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <div className="control-section">
            <p className="ui-label">Forma del panel</p>
            <SegmentedControl
              label="Forma del panel"
              value={settings.angle}
              onValueChange={(angle) => change("angle", angle)}
              options={[
                { value: 0, label: "Plano" },
                { value: 120, label: "Curvo" },
                { value: 180, label: "Semicírculo" },
              ]}
            />
          </div>
          <div className="two-fields">
            {(["width", "height"] as const).map((key) => (
              <NumberField
                key={key}
                label={key === "width" ? "Ancho / arco" : "Alto"}
                unit="mm"
                min={30}
                max={250}
                value={settings[key]}
                onChange={(e) => change(key, Number(e.target.value))}
              />
            ))}
          </div>
          <p className="field-hint">La foto se adapta a estas medidas.</p>
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
          <RangeField
            label="Contraste"
            valueLabel={`${settings.contrast.toFixed(1)}×`}
            min={0.5}
            max={2}
            step={0.1}
            value={settings.contrast}
            onChange={(e) => change("contrast", Number(e.target.value))}
          />
          <SelectField
            label="Detalle"
            value={settings.resolution}
            onChange={(e) => change("resolution", Number(e.target.value))}
            options={[
              { value: 80, label: "Borrador · 80 puntos" },
              { value: 160, label: "Equilibrado · 160 puntos" },
              { value: 256, label: "Alto · 256 puntos" },
            ]}
          />
          <Checkbox
            label="Invertir claros y oscuros"
            checked={settings.invert}
            onChange={(e) => change("invert", e.target.checked)}
          />
          <Button
            variant="unstyled"
            className="text-button"
            onClick={() => {
              setSettings(defaults);
              setBusy(true);
              setNotice("Parámetros restablecidos.");
            }}
          >
            <RotateCcw size={14} />
            Restablecer parámetros
          </Button>
        </aside>
        <section className="preview-panel">
          <div className="preview-toolbar">
            <span className="preview-title">
              <span /> VISTA PREVIA 3D
            </span>
            <Button
              variant="unstyled"
              className={lit ? "light-toggle on" : "light-toggle"}
              onClick={() => setLit(!lit)}
              aria-pressed={lit}
            >
              <Sun size={16} />
              {lit ? "Luz encendida" : "Material"}
            </Button>
          </div>
          <div className={"preview-stage " + (lit ? "illuminated" : "")}>
            {mesh ? (
              <Viewer {...mesh} lit={lit} />
            ) : (
              <div className="loading">Preparando tu diseño…</div>
            )}
            <span className="stage-caption">
              Arrastrá para girar · Rueda para acercar
            </span>
            {busy && <span className="calculating">Generando relieve…</span>}
          </div>
          <div className="preview-meta">
            <div>
              <span>DIMENSIONES DEL DISEÑO</span>
              <strong>
                {settings.width} × {settings.height} mm
              </strong>
            </div>
            <div>
              <span>ESPESOR</span>
              <strong>
                {settings.min} – {settings.max} mm
              </strong>
            </div>
            <div>
              <span>MALLA</span>
              <strong>
                {mesh ? (mesh.indices.length / 3).toLocaleString("es-AR") : "—"}{" "}
                triángulos
              </strong>
            </div>
          </div>
          <div className="export-bar">
            <div>
              <h3>Tu próxima impresión empieza acá.</h3>
              <p>Panel cerrado en milímetros · STL binario</p>
            </div>
            <Button
              variant="primary"
              disabled={!ready}
              onClick={() => {
                try {
                  download(
                    binarySTL(mesh!.positions, mesh!.indices),
                    `${name.replace(/[^a-zA-Z0-9áéíóúñ_-]/g, "_") || "litofania"}.stl`,
                    "model/stl",
                  );
                  setNotice(
                    "STL generado. Abrilo en tu slicer para preparar la impresión.",
                  );
                } catch {
                  setError(
                    "No se pudo exportar el STL. Probá con menos detalle.",
                  );
                }
              }}
            >
              <Download size={18} />
              Descargar STL
            </Button>
          </div>
          <div className="status" aria-live="polite">
            {error ? (
              <span className="error">{error}</span>
            ) : (
              <span>
                Vista de luz orientativa. El resultado depende del material, la
                impresión y la iluminación.
              </span>
            )}
          </div>
          <div className="project-tools">
            <Button
              variant="unstyled"
              className="text-button"
              disabled={!photo || busy || !!error}
              onClick={() =>
                download(
                  JSON.stringify(project()),
                  "proyectar-lampara.json",
                  "application/json",
                )
              }
            >
              <ArrowDownToLine size={15} />
              Exportar proyecto
            </Button>
            <Button
              variant="unstyled"
              className="text-button"
              onClick={() => projectInput.current?.click()}
            >
              <FolderOpen size={15} />
              Abrir proyecto
            </Button>
            <FileInput
              ref={projectInput}

              accept=".json,application/json"
              hidden
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                try {
                  if (file.size > 4 * 1024 * 1024)
                    throw new Error("El archivo supera los 4 MB.");
                  const p = JSON.parse(await file.text()) as Project;
                  validateProject(p);
                  await applyPhoto(p.photo);
                  setSettings(p.settings);
                  setName(p.name);
                  setNotice("Proyecto abierto.");
                } catch (err) {
                  setError(
                    err instanceof Error
                      ? err.message
                      : "No se pudo abrir el proyecto.",
                  );
                }
              }}
            />
          </div>
          <div className="print-note">
            <strong>Para tu primera prueba</strong>
            <p>
              Usá un material translúcido y una luz LED. Esta versión genera el
              panel de la lámpara; la base y los encastres se diseñan por
              separado. Probá una pieza pequeña para calibrar el contraste.
            </p>
          </div>
        </section>
      </div>
      <ToastViewport>
        {notice && !error && (
          <Toast
            key={notice}
            title={noticeVariant === "warning" ? "Revisá este aviso" : "Listo"}
            description={notice}
            variant={noticeVariant}
            onDismiss={() => setNotice("")}
          />
        )}
      </ToastViewport>
    </>
  );
}
