import { createMesh } from "./mesh";
import { createSphereCap } from "./sphere-cap";
import { createHousingParts } from "./housing";
import { createPrintStand, hasPrintStand } from "./print-stand";
self.onmessage = (event) => {
  const { id, pixels, width, height, settings } = event.data;
  try {
    const mesh = createMesh(pixels, width, height, settings);
    const housingParts = createHousingParts(settings);
    const sphereCap =
      settings.shape === "sphere" ? createSphereCap(settings) : null;
    const prepared = hasPrintStand(settings)
      ? createPrintStand(mesh, settings)
      : null;
    self.postMessage(
      {
        id,
        ...mesh,
        housingParts,
        sphereCap,
        printPanel: prepared?.printMesh,
        printSupport: prepared?.support,
      },
      {
        transfer: [
          mesh.positions.buffer,
          mesh.indices.buffer,
          ...(sphereCap
            ? [sphereCap.positions.buffer, sphereCap.indices.buffer]
            : []),
          ...(prepared
            ? [
                prepared.printMesh.positions.buffer,
                prepared.printMesh.indices.buffer,
                prepared.support.positions.buffer,
                prepared.support.indices.buffer,
              ]
            : []),
          ...housingParts.flatMap((p) => [
            p.positions.buffer,
            p.indices.buffer,
          ]),
        ],
      },
    );
  } catch (error) {
    self.postMessage({
      id,
      error:
        error instanceof Error ? error.message : "No se pudo crear la malla.",
    });
  }
};
