import { createMesh } from "./mesh";
self.onmessage = (event) => {
  const { id, pixels, width, height, settings } = event.data;
  try {
    const mesh = createMesh(pixels, width, height, settings);
    self.postMessage(
      { id, ...mesh },
      { transfer: [mesh.positions.buffer, mesh.indices.buffer] },
    );
  } catch (error) {
    self.postMessage({
      id,
      error:
        error instanceof Error ? error.message : "No se pudo crear la malla.",
    });
  }
};
