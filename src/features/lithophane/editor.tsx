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
  FileDown,
} from "lucide-react";
import {
  defaults,
  binarySTL,
  PANEL_ULTRA_RESOLUTION,
  type Settings,
} from "./mesh";
import Viewer from "./viewer";
import {
  defaultHousing,
  hasHousing,
  type HousingSettings,
} from "./housing-config";
import { type HousingPart } from "./housing";
import { housingZIP } from "./housing-export";
import { hasPrintStand } from "./print-stand";
import {
  DEFAULT_OPENING_DIAMETER,
  SPHERE_ULTRA_RESOLUTION,
  sphereGrid,
} from "./sphere";
import {
  sphereImageGuidance,
  sphereImageSize,
  SPHERE_LED_GUIDANCE,
  sphereZIP,
} from "./sphere-export";
import {
  Button,
  SavedDesigns,
  TextField,
  NumberField,
  SelectField,
  RangeField,
  Checkbox,
  FileInput,
  Toast,
  ToastViewport,
  type ToastVariant,
} from "@/components/ui";
import { type Project, validateProject, lampProjectStorage } from "./projects";
import { useSavedDesigns } from "@/hooks/use-saved-designs";
type Mesh = { positions: Float32Array; indices: Uint32Array };
function loadedNotice(kind: "Imagen" | "Diseño") {
  return `${kind} ${kind === "Imagen" ? "cargada" : "cargado"} correctamente. Podés ajustar “Detalle” a tu gusto para mejorar la definición de tu litofanía.`;
}
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
  const ratio = Math.min(1, 1600 / Math.max(img.width, img.height));
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
export default function LampEditor() {
  const designs = useSavedDesigns(lampProjectStorage);
  const [settings, setSettings] = useState<Settings>(defaults),
    [name, setName] = useState("Mi primera litofanía"),
    [photo, setPhoto] = useState(""),
    [pixels, setPixels] = useState<ImageData | null>(null),
    [mesh, setMesh] = useState<Mesh | null>(null),
    [sphereCap, setSphereCap] = useState<Mesh | null>(null),
    [printPanel, setPrintPanel] = useState<Mesh | null>(null),
    [printSupport, setPrintSupport] = useState<Mesh | null>(null),
    [printPreview, setPrintPreview] = useState(false),
    [housingParts, setHousingParts] = useState<HousingPart[]>([]),
    [interior, setInterior] = useState(false),
    [busy, setBusy] = useState(true),
    [notice, updateNotice] = useState(""),
    [error, setError] = useState(""),
    [lit, setLit] = useState(true);
  const [noticeVariant, setNoticeVariant] = useState<ToastVariant>("success");
  const [noticeId, setNoticeId] = useState(0);
  const [errorToast, setErrorToast] = useState("");
  useEffect(() => {
    setErrorToast(error);
  }, [error]);
  function setNotice(text: string, variant: ToastVariant = "success") {
    setNoticeId((id) => id + 1);
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
      setSphereCap(data.sphereCap ?? null);
      setHousingParts(data.housingParts ?? []);
      setPrintPanel(data.printPanel ?? null);
      setPrintSupport(data.printSupport ?? null);
    };
    w.onerror = () => {
      setBusy(false);
      setError("No se pudo iniciar el generador 3D. Recargá la página.");
    };
    async function init() {
      try {
        designs.refresh();
      } catch {
        setNotice(
          "El navegador no permite ver los diseños guardados.",
          "warning",
        );
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
  const change = (
    key: Exclude<keyof Settings, "housing" | "shape">,
    value: number | boolean,
  ) => {
    setBusy(true);
    setSettings((s) => ({ ...s, [key]: value }));
    setNotice("");
  };
  const updateHousing = (patch: Partial<HousingSettings>) => {
    setBusy(true);
    setNotice("");
    setSettings((s) => ({
      ...s,
      housing: { ...(s.housing ?? defaultHousing), ...patch },
    }));
  };
  const project = (): Project => ({
    version: 1,
    name: name.trim() || "Mi l\u00e1mpara",
    photo,
    settings,
  });
  function saveProject() {
    try {
      const p = project();
      validateProject(p);
      designs.save(p);
      setName(p.name);
      setNotice("Diseño guardado en este navegador.");
    } catch {
      setNotice(
        "No se pudo guardar en este navegador. Usá Exportar proyecto para descargar una copia.",
        "warning",
      );
    }
  }
  async function openSelected() {
    try {
      await designs.openSelected(async (p) => {
        await applyPhoto(p.photo);
        setSettings(p.settings);
        setName(p.name);
        setNotice(loadedNotice("Diseño"));
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo abrir el diseño.");
    }
  }
  function removeSelected() {
    try {
      if (designs.removeSelected()) setNotice("Proyecto eliminado.");
    } catch {
      setNotice("No se pudo eliminar el diseño en este navegador.", "warning");
    }
  }
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
      setNotice(loadedNotice("Imagen"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo abrir la imagen.");
    }
  }
  const boxEnabled = hasHousing(settings);
  const sphere = settings.shape === "sphere";
  const standEnabled = hasPrintStand(settings);
  const showStand = standEnabled && printPreview;
  const housing = settings.housing ?? defaultHousing;
  const ready =
    !!mesh &&
    !busy &&
    !error &&
    (!boxEnabled || housingParts.length === 3) &&
    (!standEnabled || !!printPanel);
  return (
    <>
      <section className="editor-heading">
        <div>
          <div className="eyebrow">ESTUDIO / LÁMPARAS CON FOTOS</div>
          <h1>Un recuerdo que ilumina.</h1>
          <p>Convertí tu foto en una litofanía lista para imprimir.</p>
        </div>
        <div className="lamp-header-actions">
          <Button
            variant="secondary"
            disabled={!photo || busy || !!error}
            onClick={() =>
              download(
                JSON.stringify(project()),
                "proyectar-lampara.json",
                "application/json",
              )
            }
          >
            <FileDown size={16} />
            Exportar proyecto
          </Button>
          <Button
            variant="secondary"
            onClick={() => projectInput.current?.click()}
          >
            <FolderOpen size={16} />
            Importar
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
                designs.select("");
                setNotice(loadedNotice("Diseño"));
              } catch (err) {
                setError(
                  err instanceof Error
                    ? err.message
                    : "No se pudo abrir el proyecto.",
                );
              }
            }}
          />

          <Button
            variant="primary"
            disabled={!photo || busy || !!error}
            onClick={saveProject}
          >
            <Save size={16} /> Guardar
          </Button>
        </div>
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
          <SavedDesigns
            items={designs.items}
            selected={designs.selected}
            onSelect={designs.select}
            onOpen={() => void openSelected()}
            onRemove={removeSelected}
            busy={busy}
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
            <SelectField
              label="Variante de litofanía"
              value={sphere ? "sphere" : String(settings.angle)}
              onChange={(e) => {
                const value = e.target.value;
                setBusy(true);
                setNotice("");
                setSettings((s) => ({
                  ...s,
                  shape: value === "sphere" ? "sphere" : "panel",
                  resolution:
                    s.resolution > 384
                      ? value === "sphere"
                        ? SPHERE_ULTRA_RESOLUTION
                        : PANEL_ULTRA_RESOLUTION
                      : s.resolution,
                  angle: value === "sphere" ? s.angle : Number(value),
                }));
              }}
              options={[
                { value: "0", label: "Plano" },
                { value: "120", label: "Curvo" },
                { value: "sphere", label: "Esferas navideñas" },
                ...(!sphere && settings.angle !== 0 && settings.angle !== 120
                  ? [
                      {
                        value: String(settings.angle),
                        label: `Panel de ${settings.angle}° (proyecto anterior)`,
                      },
                    ]
                  : []),
              ]}
            />
          </div>
          <div className={sphere ? undefined : "two-fields"}>
            {(sphere
              ? (["width"] as const)
              : (["width", "height"] as const)
            ).map((key) => (
              <NumberField
                key={key}
                label={
                  sphere
                    ? "Diámetro de la esfera"
                    : key === "width"
                      ? "Ancho / arco"
                      : "Alto"
                }
                unit="mm"
                min={30}
                max={250}
                value={settings[key]}
                onChange={(e) => change(key, Number(e.target.value))}
              />
            ))}
          </div>
          <p className="field-hint">
            {sphere
              ? `Imagen ideal: panorámica horizontal de ${sphereImageSize(settings)}. Relieve exterior e interior liso. El diámetro es el máximo exterior del cuerpo. La foto ocupa la franja central y deja los polos lisos. Los extremos se unen atrás.`
              : "La foto se adapta a estas medidas."}
          </p>
          {sphere && (
            <NumberField
              label="Abertura para los LED"
              unit="mm"
              min={8}
              max={30}
              step={0.1}
              value={settings.sphereOpeningDiameter ?? DEFAULT_OPENING_DIAMETER}
              onChange={(e) =>
                change("sphereOpeningDiameter", Number(e.target.value))
              }
              description="Diámetro interior libre del cuello. Inicial: 22 mm. Medí la parte más ancha del LED y sus cables y dejá holgura. La boca tiene reborde exterior y entrada suavizada."
            />
          )}
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
              { value: 384, label: "Muy alto · 384 puntos" },
              {
                value: sphere
                  ? SPHERE_ULTRA_RESOLUTION
                  : PANEL_ULTRA_RESOLUTION,
                label: sphere ? "Ultra · 640 puntos" : "Ultra · 448 puntos",
              },
            ]}
          />
          {sphere && (
            <p className="field-hint">
              Separación aproximada de la malla:{" "}
              {sphereGrid(settings).horizontalStep.toFixed(2)} mm alrededor y{" "}
              {sphereGrid(settings).verticalStep.toFixed(2)} mm en altura.
              {settings.resolution > 384
                ? " Ultra genera un STL pesado y tarda más en calcular. No agrega detalle que no exista en la foto ni sustituye una impresión fina."
                : " Para imprimir esferas de Ø80 mm o más, Ultra ofrece una malla más fina en ambos sentidos."}
            </p>
          )}
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
            {standEnabled && (
              <Checkbox
                label="Ver soporte de impresión"
                checked={printPreview}
                onChange={(e) => setPrintPreview(e.target.checked)}
              />
            )}
            {boxEnabled && !showStand && (
              <Checkbox
                label="Ver interior de la caja"
                checked={interior}
                onChange={(e) => setInterior(e.target.checked)}
              />
            )}
            {sphere && (
              <Checkbox
                label="Ver tapa separada"
                checked={interior}
                onChange={(e) => setInterior(e.target.checked)}
              />
            )}
          </div>
          <div className={"preview-stage " + (lit ? "illuminated" : "")}>
            {mesh ? (
              <Viewer
                {...mesh}
                lit={lit}
                sphereCap={sphereCap ?? undefined}
                onError={setErrorToast}
                housingParts={
                  boxEnabled && !showStand ? housingParts : undefined
                }
                printSupport={
                  showStand ? (printSupport ?? undefined) : undefined
                }
                interior={interior}
              />
            ) : (
              <div className="loading">Preparando tu diseño…</div>
            )}
            <span className="stage-caption">
              {showStand
                ? "Soporte removible en violeta · Retiralo después de imprimir"
                : "Arrastrá para girar · Rueda para acercar"}
            </span>
            {busy && (
              <span className="calculating">
                {boxEnabled ? "Generando panel y caja…" : "Generando relieve…"}
              </span>
            )}
            {error && mesh && (
              <span className="calculating">
                Vista anterior · Corregí los parámetros para actualizar.
              </span>
            )}
          </div>
          <div className="preview-meta">
            <div>
              <span>DIMENSIONES DEL DISEÑO</span>
              <strong>
                {sphere
                  ? `Ø${settings.width} mm`
                  : `${settings.width} × ${settings.height} mm`}
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
                {mesh
                  ? (
                      (standEnabled && printPanel ? printPanel : mesh).indices
                        .length / 3
                    ).toLocaleString("es-AR")
                  : "—"}{" "}
                triángulos
              </strong>
            </div>
          </div>
          <div className="lamp-print-options">
            <section
              className="lamp-housing-controls"
              aria-labelledby="lamp-print-heading"
            >
              <h3 id="lamp-print-heading">Preparación de impresión</h3>
              {sphere ? (
                <>
                  <p className="field-hint">
                    Dos piezas: esfera con base cerrada, hombro liso y cuello
                    con reborde, más una tapa desmontable con tubo guía interior
                    de hasta 36 mm y ranura lateral de 4 mm para el cable. En
                    esferas pequeñas el tubo se acorta para dejar libre el
                    fondo. Apoya sobre una pequeña base plana. Prepará brim y
                    soportes en el laminador.
                  </p>
                  <p className="field-hint">
                    La abertura superior queda libre para pasar varios LED de la
                    guirnalda. Ajustá su diámetro según el conjunto de LED y
                    cables, sin forzarlos ni pellizcarlos.
                  </p>
                  <p className="field-hint">
                    Usá una sujeción independiente y probá su retención en el
                    cuello antes de colgar. La tapa no es un enganche de
                    suspensión; nunca cuelgues la esfera del cable eléctrico.
                  </p>
                </>
              ) : (
                <>
                  <Checkbox
                    label="Exportar de pie con soporte removible"
                    checked={standEnabled}
                    onChange={(e) => change("printStand", e.target.checked)}
                  />
                  <p className="field-hint">
                    Base baja con contactos finos, incluida en el STL del panel.
                    Agrega 3 mm al alto de impresión. Sirve para los paneles.
                  </p>
                  {standEnabled && (
                    <p className="field-hint">
                      Al terminar, cortá los contactos al ras del borde inferior
                      y retiralos antes de montar la foto. Probá la separación
                      con tu material y altura de capa; evitá arrancar el
                      soporte.
                    </p>
                  )}
                </>
              )}
            </section>
            <section
              className="lamp-housing-controls"
              aria-labelledby="lamp-housing-heading"
            >
              <h3 id="lamp-housing-heading">
                {sphere ? "LED de la guirnalda" : "Caja para iluminación"}
              </h3>
              {!sphere && (
                <Checkbox
                  label="Generar caja trasera"
                  checked={boxEnabled}
                  disabled={sphere || settings.angle === 180}
                  onChange={(e) => updateHousing({ enabled: e.target.checked })}
                />
              )}
              {sphere ? (
                <p className="field-hint">{SPHERE_LED_GUIDANCE}</p>
              ) : settings.angle === 180 ? (
                <p className="field-hint">
                  La caja está disponible para Plano y Curvo. Semicírculo
                  conserva el panel independiente.
                </p>
              ) : boxEnabled ? (
                <>
                  <div className="two-fields">
                    <NumberField
                      label="Espacio para la luz"
                      unit="mm"
                      min={12}
                      max={80}
                      step={1}
                      value={housing.depth}
                      onChange={(e) =>
                        updateHousing({ depth: Number(e.target.value) })
                      }
                    />
                    <NumberField
                      label="Holgura de encastre"
                      unit="mm"
                      min={0.1}
                      max={0.6}
                      step={0.05}
                      value={housing.clearance}
                      onChange={(e) =>
                        updateHousing({ clearance: Number(e.target.value) })
                      }
                    />
                  </div>
                  <p className="field-hint">
                    Cuatro piezas: foto, caja, marco y tapa desmontable. Paredes
                    de 2,4 mm y salida circular trasera para cable de Ø4 mm. El
                    marco cubre 2 mm del borde de la foto.
                  </p>
                  <p className="field-hint">
                    En Curvo, la profundidad sigue el radio del panel. La caja
                    debe dejar espacio para tu iluminación; tapas y marco
                    agregan espesor exterior. No incluye LED ni fuente.
                  </p>
                </>
              ) : (
                <p className="field-hint">
                  Sumá una caja del mismo perfil que la foto, con marco de
                  sujeción y tapa trasera para acceder a la luz.
                </p>
              )}
            </section>
          </div>
          <div className="export-bar">
            <div>
              <h3>Tu próxima impresión empieza acá.</h3>
              <p>
                {sphere
                  ? "Esfera con tapa desmontable · ZIP con 2 STL y guía"
                  : boxEnabled
                    ? `Panel${standEnabled ? " con soporte" : ""}, caja, marco y tapa · ZIP con 4 STL y guía`
                    : standEnabled
                      ? "Panel de pie con soporte removible · STL binario"
                      : "Panel cerrado en milímetros · STL binario"}
              </p>
            </div>
            <Button
              variant="primary"
              disabled={!ready}
              onClick={() => {
                try {
                  const filename =
                    name.replace(/[^a-zA-Z0-9áéíóúñ_-]/g, "_") || "litofania";
                  const photoMesh = standEnabled ? printPanel! : mesh!;
                  if (sphere)
                    download(
                      sphereZIP(mesh!, settings, filename),
                      `${filename}-esfera-navidena.zip`,
                      "application/zip",
                    );
                  else if (boxEnabled)
                    download(
                      housingZIP(
                        mesh!,
                        housingParts,
                        settings,
                        filename,
                        photoMesh,
                      ),
                      `${filename}-kit-litofania.zip`,
                      "application/zip",
                    );
                  else
                    download(
                      binarySTL(photoMesh.positions, photoMesh.indices),
                      `${filename}.stl`,
                      "model/stl",
                    );
                  setNotice(
                    sphere
                      ? "Kit generado: esfera, tapa y guía en el ZIP."
                      : boxEnabled
                        ? "Kit generado: 4 STL y guía de armado en el ZIP."
                        : "STL generado. Abrilo en tu slicer para preparar la impresión.",
                  );
                } catch {
                  setError(
                    "No se pudo exportar el STL. Probá con menos detalle.",
                  );
                }
              }}
            >
              <Download size={18} />
              {sphere
                ? "Descargar esfera + tapa · 2 STL"
                : boxEnabled
                  ? "Descargar kit · 4 STL"
                  : "Descargar STL"}
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
          <div className="print-note">
            <strong>
              {sphere
                ? "Imagen recomendada para la esfera"
                : "Para tu primera prueba"}
            </strong>
            <p>
              {sphere ? (
                sphereImageGuidance(settings)
              ) : (
                <>
                  Usá un material translúcido para la foto y una luz LED.{" "}
                  {sphere
                    ? "Prepará soportes en el laminador y probá una pieza pequeña antes de imprimir la esfera completa."
                    : boxEnabled
                      ? "Imprimí la caja y sus tapas en material opaco. Los cierres son guiados, sin pestillo: probá la holgura y una fijación removible. En Curvo, revisá los soportes en el laminador."
                      : "Podés generar una caja trasera para Plano y Curvo antes de descargar."}{" "}
                  Probá una pieza pequeña para calibrar el contraste. La vista
                  iluminada aproxima el relieve; no representa la distribución
                  de la luz instalada.
                </>
              )}
            </p>
          </div>
        </section>
      </div>
      <ToastViewport>
        {errorToast ? (
          <Toast
            key={`error-${errorToast}`}
            title="No se pudo completar la acción"
            description={errorToast}
            variant="error"
            duration={0}
            onDismiss={() => setErrorToast("")}
          />
        ) : (
          notice &&
          !error && (
            <Toast
              key={noticeId}
              title={
                noticeVariant === "warning" ? "Revisá este aviso" : "Listo"
              }
              description={notice}
              variant={noticeVariant}
              onDismiss={() => setNotice("")}
            />
          )
        )}
      </ToastViewport>
    </>
  );
}
