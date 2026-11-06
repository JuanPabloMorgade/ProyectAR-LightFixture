import { createMesh } from "./mesh";
import { createSphereCap } from "./sphere-cap";
import { createHousingParts } from "./housing";
import { createPrintStand, hasPrintStand } from "./print-stand";
self.onmessage = (event) => {
  const { id, pixels, width, height, settings, imageId, currentMeshKey } =
    event.data;
  try {
    const { housing: _, ...photoSettings } = settings;
    const meshKey = JSON.stringify([imageId, width, height, photoSettings]);
    // Only reuse buffers the client has actually accepted. Stale worker results
    // cannot cause a newer request to reuse a photo the client never received.
    const meshUnchanged = imageId !== undefined && meshKey === currentMeshKey;
    const mesh = meshUnchanged
      ? null
      : createMesh(pixels, width, height, settings);
    const housingParts = createHousingParts(settings);
    const sphereCap =
      !meshUnchanged && settings.shape === "sphere"
        ? createSphereCap(settings)
        : null;
    const prepared =
      mesh && hasPrintStand(settings) ? createPrintStand(mesh, settings) : null;
    self.postMessage(
      {
        id,
        meshKey,
        meshUnchanged,
        ...mesh,
        housingParts,
        sphereCap,
        printPanel: prepared?.printMesh,
        printSupport: prepared?.support,
      },
      {
        transfer: [
          ...(mesh ? [mesh.positions.buffer, mesh.indices.buffer] : []),
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
