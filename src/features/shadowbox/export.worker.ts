import { printMesh, type BoxSettings, type WallMask } from "./engine";
import { binarySTL } from "../lithophane/mesh";
self.onmessage = ({
  data,
}: {
  data: { settings: BoxSettings; masks: WallMask[] };
}) => {
  try {
    const mesh = printMesh(data.masks, data.settings);
    const buffer = binarySTL(mesh.positions, mesh.indices);
    self.postMessage(
      { buffer, triangles: mesh.indices.length / 3 },
      { transfer: [buffer] },
    );
  } catch (error) {
    self.postMessage({
      error:
        error instanceof Error ? error.message : "No se pudo generar el STL.",
    });
  }
};
