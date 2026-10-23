import { IMAGE_SIZE } from "./engine";
export type Preset = "rays" | "flower" | "stars" | "letters";
export function presetArt(type: Preset): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = IMAGE_SIZE;
  const c = canvas.getContext("2d")!;
  c.fillStyle = "#10191b";
  c.fillRect(0, 0, IMAGE_SIZE, IMAGE_SIZE);
  c.translate(IMAGE_SIZE / 2, IMAGE_SIZE / 2);
  c.fillStyle = "#fff";
  c.strokeStyle = "#fff";
  if (type === "rays") {
    for (let i = 0; i < 16; i++) {
      c.save();
      c.rotate((i * Math.PI) / 8);
      c.beginPath();
      c.moveTo(-9, -58);
      c.lineTo(9, -58);
      c.lineTo(19, -202);
      c.lineTo(-19, -202);
      c.closePath();
      c.fill();
      c.restore();
    }
    c.beginPath();
    c.arc(0, 0, 32, 0, Math.PI * 2);
    c.fill();
  }
  if (type === "flower") {
    for (let i = 0; i < 12; i++) {
      c.save();
      c.rotate((i * Math.PI) / 6);
      c.beginPath();
      c.ellipse(0, -101, 29, 82, 0, 0, Math.PI * 2);
      c.fill();
      c.restore();
    }
    c.beginPath();
    c.arc(0, 0, 45, 0, Math.PI * 2);
    c.fill();
  }
  if (type === "stars") {
    c.lineWidth = 5;
    c.beginPath();
    c.arc(0, 0, 158, 0, Math.PI * 2);
    c.stroke();
    for (let i = 0; i < 10; i++) {
      const angle = (i * Math.PI) / 5;
      const px = Math.cos(angle) * 158,
        py = Math.sin(angle) * 158;
      c.beginPath();
      for (let p = 0; p < 10; p++) {
        const a = -Math.PI / 2 + (p * Math.PI) / 5,
          r = p % 2 ? 12 : 25,
          x = px + Math.cos(a) * r,
          y = py + Math.sin(a) * r;
        if (p === 0) c.moveTo(x, y);
        else c.lineTo(x, y);
      }
      c.closePath();
      c.fill();
    }
  }
  if (type === "letters") {
    c.lineWidth = 8;
    c.beginPath();
    c.arc(0, 0, 174, 0, Math.PI * 2);
    c.stroke();
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.font = "bold 75px Arial";
    c.fillText("LUZ", 0, -8);
    c.font = "25px Arial";
    c.fillText("PROYECTAR", 0, 67);
  }
  return canvas;
}

export async function imageFromFile(file: File): Promise<HTMLImageElement> {
  if (file.size > 15 * 1024 * 1024)
    throw new Error("Elegí un archivo de hasta 15 MB.");
  if (
    !["image/png", "image/jpeg", "image/webp", "image/svg+xml"].includes(
      file.type,
    )
  )
    throw new Error("Usá JPG, PNG, WebP o SVG.");
  let data: Blob = file;
  if (file.type === "image/svg+xml") {
    const doc = new DOMParser().parseFromString(
      await file.text(),
      "image/svg+xml",
    );
    if (doc.querySelector("parsererror"))
      throw new Error("El SVG no se pudo leer.");
    doc
      .querySelectorAll(
        "script,foreignObject,iframe,object,embed,image,use,style",
      )
      .forEach((node) => node.remove());
    doc.querySelectorAll("*").forEach((node) =>
      Array.from(node.attributes).forEach((attr) => {
        if (
          attr.name.toLowerCase().startsWith("on") ||
          /^(href|xlink:href)$/i.test(attr.name) ||
          /url\s*\(/i.test(attr.value)
        )
          node.removeAttribute(attr.name);
      }),
    );
    data = new Blob([new XMLSerializer().serializeToString(doc)], {
      type: "image/svg+xml",
    });
  }
  const url = URL.createObjectURL(data);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    return image;
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

export function rasterizeCrop(
  image: HTMLImageElement,
  zoom: number,
  panX: number,
  panY: number,
  threshold: number,
  invert: boolean,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = IMAGE_SIZE;
  const c = canvas.getContext("2d", { willReadFrequently: true })!;
  c.fillStyle = "#fff";
  c.fillRect(0, 0, IMAGE_SIZE, IMAGE_SIZE);
  const base =
    (IMAGE_SIZE / Math.min(image.naturalWidth, image.naturalHeight)) * zoom;
  const w = image.naturalWidth * base,
    h = image.naturalHeight * base;
  c.drawImage(
    image,
    (IMAGE_SIZE - w) / 2 + (panX * IMAGE_SIZE) / 3,
    (IMAGE_SIZE - h) / 2 + (panY * IMAGE_SIZE) / 3,
    w,
    h,
  );
  const data = c.getImageData(0, 0, IMAGE_SIZE, IMAGE_SIZE);
  for (let y = 0; y < IMAGE_SIZE; y++)
    for (let x = 0; x < IMAGE_SIZE; x++) {
      const i = (y * IMAGE_SIZE + x) * 4;
      const inside =
        Math.hypot(x - IMAGE_SIZE / 2, y - IMAGE_SIZE / 2) < IMAGE_SIZE * 0.48;
      const l =
        data.data[i] * 0.2126 +
        data.data[i + 1] * 0.7152 +
        data.data[i + 2] * 0.0722;
      const white = inside && (invert ? l < threshold : l >= threshold);
      data.data[i] = data.data[i + 1] = data.data[i + 2] = white ? 255 : 0;
      data.data[i + 3] = 255;
    }
  c.putImageData(data, 0, 0);
  return canvas;
}
