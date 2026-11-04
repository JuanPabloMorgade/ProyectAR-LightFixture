import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    // Geometry and jsdom editors both construct large meshes. Bound contention
    // so exhaustive collision checks remain reliable on ordinary workstations.
    maxWorkers: 2,
    environment: "node",
    include: ["tests/**/*.test.{js,mjs,ts,tsx}"],
  },
});
