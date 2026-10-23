import { mkdir, copyFile } from "node:fs/promises";
await mkdir("public/shadowbox/vendor", { recursive: true });
await copyFile(
  "node_modules/three-legacy/build/three.min.js",
  "public/shadowbox/vendor/three.min.js",
);
await copyFile(
  "node_modules/imagetracerjs/imagetracer_v1.2.6.js",
  "public/shadowbox/vendor/imagetracer.js",
);
