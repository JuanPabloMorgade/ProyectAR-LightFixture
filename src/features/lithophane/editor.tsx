"use client";
import { useEffect, useRef, useState } from "react";
import {
  Upload,
  Download,
  Save,
  Sun,
  ImagePlus,
  FolderOpen,
  FileDown,
} from "lucide-react";
import {
  defaults,
  binarySTL,
  PANEL_ULTRA_RESOLUTION,
  type Settings,
} from "./mesh";
import Viewer from "./viewer";
import { PreviewViewport } from "./preview-viewport";
import { StudioStep, VariantPicker } from "./studio-controls";
import { PhotoGuide } from "./photo-guide";
import { DesignSettings } from "./design-settings";
import { TextureCustomizer } from "./texture-customizer";
import {
  textureOptions,
  type FrameTextureOptions,
} from "./frame-texture-config";
import { PrintingGuide } from "./printing-guide";
import "./studio.css";
import {
  defaultHousing,
  hasHousing,
  type HousingSettings,
} from "./housing-config";
import { type HousingPart } from "./housing";
import { housingZIP } from "./housing-export";
import { hasPrintStand } from "./print-stand";
import { SPHERE_ULTRA_RESOLUTION } from "./sphere";
import { sphereZIP } from "./sphere-export";
import {
  Button,
  SavedDesigns,
  TextField,
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
  return `${kind} ${kind === "Imagen" ? "cargada" : "cargado"} correctamente. Podés ajustar “Detalle” en “Ajustes avanzados” para mejorar la definición de tu litofanía.`;
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
  const [textureDraft, setTextureDraft] = useState<FrameTextureOptions | null>(
    null,
  );
  const [settings, setSettings] = useState<Settings>(defaults),
    [name, setName] = useState("Mi primera litofanía"),
    [photo, setPhoto] = useState(""),
    [example, setExample] = useState(true),
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
  const meshKey = useRef<string | undefined>(undefined);
  const pixelRevision = useRef<{ pixels: ImageData | null; id: number }>({
    pixels: null,
    id: 0,
  });
  const generationKey = JSON.stringify({
    ...settings,
    housing: settings.housing
      ? {
          ...settings.housing,
          ...textureOptions(settings.housing),
          ...textureDraft,
        }
      : undefined,
  });
  async function applyPhoto(src: string, isExample = false) {
    const id = ++photoRequest.current;
    const result = await readPhoto(src);
    if (id !== photoRequest.current) return;
    setPhoto(result.photo);
    setExample(isExample);
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
      if (!data.meshUnchanged) {
        setMesh({ positions: data.positions, indices: data.indices });
        setSphereCap(data.sphereCap ?? null);
        setPrintPanel(data.printPanel ?? null);
        setPrintSupport(data.printSupport ?? null);
        meshKey.current = data.meshKey;
      }
      setHousingParts(data.housingParts ?? []);
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
      await applyPhoto(sample(), true);
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
    if (pixelRevision.current.pixels !== pixels)
      pixelRevision.current = { pixels, id: pixelRevision.current.id + 1 };
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
          settings: JSON.parse(generationKey),
          imageId: pixelRevision.current.id,
          currentMeshKey: meshKey.current,
        }),
      textureDraft ? 350 : 180,
    );
    return () => clearTimeout(timer);
  }, [pixels, generationKey]);
  function previewTexture(next: FrameTextureOptions) {
    if (JSON.stringify(next) === JSON.stringify(textureDraft)) return;
    request.current++;
    setBusy(true);
    setTextureDraft(next);
  }
  function cancelTexture() {
    if (
      JSON.stringify(textureDraft) !==
      JSON.stringify(textureOptions(settings.housing))
    ) {
      request.current++;
      setBusy(true);
    }
    setTextureDraft(null);
  }
  function applyTexture() {
    if (!textureDraft || busy || error) return;
    setSettings((s) => ({
      ...s,
      housing: { ...(s.housing ?? defaultHousing), ...textureDraft },
    }));
    setTextureDraft(null);
    setNotice("");
  }
  const change = <K extends Exclude<keyof Settings, "housing" | "shape">>(
    key: K,
    value: Settings[K],
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
        setSettings({
          ...p.settings,
          resolution:
            p.settings.shape === "sphere"
              ? Math.min(p.settings.resolution, SPHERE_ULTRA_RESOLUTION)
              : p.settings.resolution,
        });
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
  const ready =
    !!mesh &&
    !textureDraft &&
    !busy &&
    !error &&
    (!boxEnabled || housingParts.length === 3) &&
    (!standEnabled || !!printPanel);
  function changeVariant(value: string) {
    setBusy(true);
    setNotice("");
    setSettings((s) => ({
      ...s,
      shape: value === "sphere" ? "sphere" : "panel",
      resolution:
        s.resolution > 384
          ? value === "sphere"
            ? s.shape === "sphere"
              ? s.resolution
              : SPHERE_ULTRA_RESOLUTION
            : PANEL_ULTRA_RESOLUTION
          : s.resolution,
      angle: value === "sphere" ? s.angle : Number(value),
    }));
  }
  return (
    <div className="lamp-studio">
      <section className="editor-heading">
        <div>
          <div className="eyebrow">ESTUDIO / LITOFANÍAS</div>
          <h1>Un recuerdo que ilumina.</h1>
          <p>Convertí tu foto en una litofanía lista para imprimir.</p>
        </div>
        <a className="button secondary lamp-preview-link" href="#lamp-preview">
          Ver mi modelo 3D <Download size={16} />
        </a>
      </section>
      <section className="lamp-project-bar" aria-label="Proyecto y archivos">
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
                setSettings({
                  ...p.settings,
                  resolution:
                    p.settings.shape === "sphere"
                      ? Math.min(p.settings.resolution, SPHERE_ULTRA_RESOLUTION)
                      : p.settings.resolution,
                });
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
        <aside className="controls" aria-labelledby="lamp-create-title">
          <div className="lamp-panel-heading">
            <h2 id="lamp-create-title">Crear y personalizar</h2>
            <span>3 pasos</span>
          </div>
          <StudioStep number="01" title="Elegí tu litofanía">
            <VariantPicker
              value={sphere ? "sphere" : String(settings.angle)}
              onChange={changeVariant}
            />
          </StudioStep>
          <StudioStep number="02" title="Subí tu fotografía">
            {example && (
              <p className="lamp-example-label">
                Estás viendo una imagen de ejemplo. Probá con la tuya.
              </p>
            )}
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
                <Upload size={16} />{" "}
                {example ? "Subir mi fotografía" : "Cambiar imagen"}
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
            <PhotoGuide
              settings={settings}
              image={pixels}
              example={example}
              onFitChange={(value) => change("spherePhotoFit", value)}
              onStretchChange={(value) => change("spherePhotoStretch", value)}
            />
          </StudioStep>
          <StudioStep number="03" title="Personalizá tu diseño">
            <DesignSettings
              settings={settings}
              change={change}
              updateHousing={updateHousing}
              onCustomizeTexture={() =>
                setTextureDraft(textureOptions(settings.housing))
              }
              reset={() => {
                setSettings(defaults);
                setBusy(true);
                setNotice("Parámetros restablecidos.");
              }}
            />
          </StudioStep>
        </aside>
        <div className="lamp-output" id="lamp-preview" tabIndex={-1}>
          <section className="preview-panel">
            <PreviewViewport
              controls={
                <>
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
                </>
              }
            >
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
                    {boxEnabled
                      ? "Generando panel y caja…"
                      : "Generando relieve…"}
                  </span>
                )}
                {error && mesh && (
                  <span className="calculating">
                    Vista anterior · Corregí los parámetros para actualizar.
                  </span>
                )}
              </div>
            </PreviewViewport>
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
            </div>
            <div className="export-bar">
              <div>
                <h3>Tu diseño, listo para imprimir</h3>
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
                  Vista de luz orientativa. El resultado depende del material,
                  la impresión y la iluminación.
                </span>
              )}
            </div>
          </section>
          <PrintingGuide
            settings={settings}
            triangles={
              mesh
                ? (standEnabled && printPanel ? printPanel : mesh).indices
                    .length / 3
                : null
            }
          />
        </div>
      </div>
      {textureDraft && (
        <TextureCustomizer
          options={textureDraft}
          onChange={previewTexture}
          onCancel={cancelTexture}
          onApply={applyTexture}
          busy={busy || !mesh || housingParts.length !== 3}
          error={error}
          preview={
            mesh ? (
              <Viewer
                {...mesh}
                housingParts={housingParts}
                lit={lit}
                onError={setErrorToast}
              />
            ) : (
              <div className="loading">Preparando tu marco…</div>
            )
          }
        />
      )}
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
    </div>
  );
}
