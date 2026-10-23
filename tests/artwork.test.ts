// @vitest-environment jsdom
import { afterEach, expect, test, vi } from "vitest";
import { imageFromFile } from "../src/features/shadowbox/artwork";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

test("rechaza imágenes no admitidas y archivos demasiado grandes", async () => {
  await expect(
    imageFromFile(new File(["x"], "foto.txt", { type: "text/plain" })),
  ).rejects.toThrow(/JPG, PNG, WebP o SVG/);
  const large = new File(["x"], "foto.png", { type: "image/png" });
  Object.defineProperty(large, "size", { value: 16 * 1024 * 1024 });
  await expect(imageFromFile(large)).rejects.toThrow(/15 MB/);
});

test("elimina elementos y atributos activos de un SVG cargado", async () => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script><image href="https://example.com/a.png"/><rect onload="alert(1)" fill="url(https://example.com/a.svg)"/><circle fill="red"/></svg>`;
  const file = new File([svg], "dibujo.svg", { type: "image/svg+xml" });
  Object.defineProperty(file, "text", { value: async () => svg });
  let sanitized: Blob | undefined;
  vi.stubGlobal(
    "Image",
    class {
      src = "";
      decode = async () => {};
    },
  );
  vi.stubGlobal("URL", {
    ...URL,
    createObjectURL: (blob: Blob) => {
      sanitized = blob;
      return "blob:test";
    },
    revokeObjectURL: vi.fn(),
  });

  await imageFromFile(file);
  expect(sanitized).toBeDefined();
  const content = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(sanitized!);
  });
  expect(content).toContain("<circle");
  expect(content).not.toMatch(/<script|<image|onload=|href=|url\(/i);
});
