import { buildSTLExport, type STLExportRequest } from "./stl-export";
self.onmessage = ({ data }: { data: STLExportRequest }) => {
  try {
    const result = buildSTLExport(data);
    self.postMessage(result, { transfer: [result.buffer] });
  } catch (error) {
    self.postMessage({
      error:
        error instanceof Error ? error.message : "No se pudo generar el STL.",
    });
  }
};
