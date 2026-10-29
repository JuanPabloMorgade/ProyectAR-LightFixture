import { expect, test } from "vitest";
import { crc32 } from "node:zlib";
import { buildSTLExport } from "../src/features/shadowbox/stl-export";
import {
  defaultFabrication,
  fabricationParts,
} from "../src/features/shadowbox/fabrication";
import { defaultCob } from "../src/features/shadowbox/cob";
import {
  defaultBox,
  IMAGE_SIZE,
  masksFromImage,
  PRINT_PARTS,
  printParts,
} from "../src/features/shadowbox/engine";

function readZip(buffer: ArrayBuffer) {
  const view = new DataView(buffer),
    bytes = new Uint8Array(buffer);
  const end = buffer.byteLength - 22;
  expect(view.getUint32(end, true)).toBe(0x06054b50);
  const count = view.getUint16(end + 10, true);
  let directory = view.getUint32(end + 16, true);
  const files: { name: string; data: Uint8Array }[] = [];
  for (let i = 0; i < count; i++) {
    expect(view.getUint32(directory, true)).toBe(0x02014b50);
    expect(view.getUint16(directory + 10, true)).toBe(0);
    const length = view.getUint32(directory + 24, true);
    const nameLength = view.getUint16(directory + 28, true);
    const local = view.getUint32(directory + 42, true);
    const nameBytes = bytes.slice(directory + 46, directory + 46 + nameLength);
    expect(view.getUint32(local, true)).toBe(0x04034b50);
    expect(view.getUint16(local + 6, true) & 0x800).toBe(0x800);
    expect(view.getUint16(local + 8, true)).toBe(0);
    expect(view.getUint32(local + 22, true)).toBe(length);
    expect(bytes.slice(local + 30, local + 30 + nameLength)).toEqual(nameBytes);
    const start = local + 30 + nameLength + view.getUint16(local + 28, true);
    const data = bytes.slice(start, start + length);
    expect(crc32(data)).toBe(view.getUint32(local + 14, true));
    expect(crc32(data)).toBe(view.getUint32(directory + 16, true));
    files.push({ name: new TextDecoder().decode(nameBytes), data });
    directory +=
      46 +
      nameLength +
      view.getUint16(directory + 30, true) +
      view.getUint16(directory + 32, true);
  }
  expect(directory).toBe(end);
  return files;
}

test("el ZIP COB incluye solo piezas imprimibles y guía de cortes, orientación y paralelo 5 V", () => {
  const settings = {
    ...defaultBox,
    width: 7.7,
    height: 12.7,
    depth: 5.85,
    thickness: 3,
    detail: 96,
  };
  const fabrication = {
    ...defaultFabrication,
    illumination: "cob" as const,
    cob: { ...defaultCob },
  };
  const masks = masksFromImage(
    new Uint8ClampedArray(IMAGE_SIZE * IMAGE_SIZE * 4),
    settings,
  );
  const files = readZip(
    buildSTLExport({
      settings,
      fabrication,
      masks,
      mode: "separate",
      name: "COB",
    }).buffer,
  );
  expect(files).toHaveLength(6);
  const lid = readSTL(files.find((f) => f.name.includes("05-tapa"))!.data);
  expect(lid.max[0]).toBeCloseTo(80);
  expect(lid.max[1]).toBeCloseTo(130);
  expect(lid.max[2]).toBeCloseTo(3);
  const guide = new TextDecoder().decode(files[5].data);
  for (const text of [
    "Total: 60 mm",
    "Tramo 1: 30 mm",
    "Tramo 2: 30 mm",
    "67.75",
    "117.75",
    "paralelo",
    "+ con +",
    "− con −",
    "interruptor en el positivo",
    "5 V",
    "no declara W/m",
    "no polaridad",
    "56.40",
    "49.73",
    "no valida ópticamente",
  ])
    expect(guide).toContain(text);
  expect(guide).not.toContain("alojamiento(s) cilíndrico(s)");
  const combined = buildSTLExport({
    settings,
    fabrication,
    masks,
    mode: "combined",
    name: "COB",
  });
  expect(combined.triangles).toBe(
    files.slice(0, 5).reduce((sum, f) => sum + readSTL(f.data).triangles, 0),
  );
});

function readSTL(data: Uint8Array) {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const triangles = view.getUint32(80, true);
  expect(data.byteLength).toBe(84 + triangles * 50);
  const min = [Infinity, Infinity, Infinity],
    max = [-Infinity, -Infinity, -Infinity];
  const points: number[][] = [];
  for (let t = 0; t < triangles; t++)
    for (let vertex = 0; vertex < 3; vertex++) {
      const point = [0, 1, 2].map((axis) =>
        view.getFloat32(84 + t * 50 + 12 + vertex * 12 + axis * 4, true),
      );
      point.forEach((value, axis) => {
        expect(Number.isFinite(value)).toBe(true);
        min[axis] = Math.min(min[axis], value);
        max[axis] = Math.max(max[axis], value);
      });
      points.push(point);
    }
  return { triangles, min, max, points };
}

test("el ZIP contiene cinco STL nombrados, con geometría local a escala y una guía", () => {
  const settings = {
    ...defaultBox,
    width: 18,
    height: 12,
    thickness: 2.4,
    detail: 96,
  };
  const image = new Uint8ClampedArray(IMAGE_SIZE * IMAGE_SIZE * 4);
  for (let y = 0; y < IMAGE_SIZE; y++)
    for (let x = 0; x < IMAGE_SIZE; x++) {
      const i = (y * IMAGE_SIZE + x) * 4;
      image[i] =
        image[i + 1] =
        image[i + 2] =
          x > y && x < IMAGE_SIZE * 0.8 ? 255 : 0;
      image[i + 3] = 255;
    }
  const masks = masksFromImage(image, settings);
  // Export order and names must not depend on the caller's array order.
  const reversed = [...masks].reverse();
  const separate = buildSTLExport({
    settings,
    masks: reversed,
    mode: "separate",
    name: "Mi_cuadro",
  });
  const files = readZip(separate.buffer);
  expect(separate.filename).toBe("Mi_cuadro-piezas-separadas.zip");
  expect(separate.mime).toBe("application/zip");
  expect(files.map((file) => file.name)).toEqual([
    ...PRINT_PARTS.map((part) => `Mi_cuadro-${part.filename}.stl`),
    "Guia-de-armado.txt",
  ]);
  const parts = printParts(masks, settings);
  let totalTriangles = 0;
  for (let i = 0; i < 5; i++) {
    const stl = readSTL(files[i].data);
    expect(stl.min).toEqual([0, 0, 0]);
    expect(stl.max[0]).toBeCloseTo(i === 2 || i === 3 ? 120 : 180, 4);
    expect(stl.max[1]).toBeCloseTo(i === 4 ? 120 : 60, 4);
    expect(stl.max[2]).toBeCloseTo(2.4, 4);
    // Each STL preserves the exact triangles of its own named panel.
    const part = parts[i];
    expect(stl.points).toEqual(
      Array.from(part.indices, (index) =>
        Array.from(part.positions.slice(index * 3, index * 3 + 3)),
      ),
    );
    totalTriangles += stl.triangles;
  }
  expect(separate.triangles).toBe(totalTriangles);
  const guide = new TextDecoder().decode(files[5].data);
  expect(guide).toContain("desde la habitación");
  expect(guide).toContain("lado abierto mira hacia la pared");
  expect(guide).toContain("18 x 12 x 6 cm. Espesor: 2.4 mm");
  const combined = buildSTLExport({
    settings,
    masks,
    mode: "combined",
    name: "Mi_cuadro",
  });
  const single = readSTL(new Uint8Array(combined.buffer));
  expect(combined.filename).toBe("Mi_cuadro-5-piezas.stl");
  expect(combined.mime).toBe("model/stl");
  expect(single.triangles).toBe(totalTriangles);
  expect(single.max[0]).toBeCloseTo(180 + 180 + 120 + 120 + 180 + 4 * 12, 4);
});

test("el ZIP del prototipo conserva las cinco piezas e incluye soportes LED y su guía", () => {
  const settings = { ...defaultBox, detail: 96 };
  const fabrication = { ...defaultFabrication, ledCount: 12 as const };
  const masks = masksFromImage(
    new Uint8ClampedArray(IMAGE_SIZE * IMAGE_SIZE * 4),
    settings,
  );
  const output = buildSTLExport({
    settings,
    masks,
    fabrication,
    mode: "separate",
    name: "LEDs",
  });
  const files = readZip(output.buffer);
  expect(files).toHaveLength(6);
  const parts = fabricationParts(masks, settings, fabrication);
  let triangles = 0;
  parts.forEach((part, i) => {
    expect(files[i].name).toBe(`LEDs-${part.filename}.stl`);
    const stl = readSTL(files[i].data);
    expect(stl.min).toEqual([0, 0, 0]);
    expect(stl.max[0]).toBeCloseTo(152);
    expect(stl.points).toEqual(
      Array.from(part.indices, (n) =>
        Array.from(part.positions.slice(n * 3, n * 3 + 3)),
      ),
    );
    if (part.id === "front") expect(stl.max[2]).toBeCloseTo(5.8);
    else expect(stl.max[1]).toBeCloseTo(61);
    triangles += stl.triangles;
  });
  const guide = new TextDecoder().decode(files[5].data);
  expect(guide).toContain("12 alojamiento(s)");
  expect(guide).toContain("reborde 5.2 mm, altura 5 mm");
  expect(guide).toContain("Holgura diametral: 0.25 mm");
  expect(guide).toContain("Diámetro del asiento: 5.65 mm");
  expect(guide).toContain("51 mm");
  expect(guide).toContain("lengüetas");
  expect(guide).toContain("fuente puntual central");
  const combined = buildSTLExport({
    settings,
    masks,
    fabrication,
    mode: "combined",
    name: "LEDs",
  });
  const single = readSTL(new Uint8Array(combined.buffer));
  expect(single.triangles).toBe(triangles);
  expect(single.max[0]).toBeCloseTo(5 * 152 + 4 * 12);
});
