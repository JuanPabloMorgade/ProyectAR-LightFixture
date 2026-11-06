// @vitest-environment jsdom
import { afterEach, expect, test, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import type { PerspectiveCamera, Scene } from "three";
import Viewer from "../src/features/lithophane/viewer";
import { createMesh, defaults } from "../src/features/lithophane/mesh";
import { Box3, Vector3 } from "three";
import {
  createSphereCap,
  SPHERE_CAP_TUBE_LENGTH,
} from "../src/features/lithophane/sphere-cap";

const captured = vi.hoisted(() => ({
  frames: [] as { camera: PerspectiveCamera; scene: Scene }[],
}));
// Keep real geometry and OrbitControls; only the unavailable WebGL surface is mocked.
vi.mock("three", async (importOriginal) => {
  const three = await importOriginal<typeof import("three")>();
  return {
    ...three,
    WebGLRenderer: class {
      domElement = document.createElement("canvas");
      setPixelRatio() {}
      setClearColor() {}
      setSize() {}
      setAnimationLoop(callback: (() => void) | null) {
        callback?.();
      }
      render(scene: Scene, camera: PerspectiveCamera) {
        captured.frames.push({ scene, camera });
      }
      dispose() {}
    },
  };
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  captured.frames = [];
});

test("portrait fullscreen fits the horizontal axis and resizing preserves the camera angle and distance", () => {
  let resize = () => {};
  vi.stubGlobal(
    "ResizeObserver",
    class {
      constructor(callback: () => void) {
        resize = callback;
      }
      observe() {
        resize();
      }
      disconnect() {}
    },
  );
  let width = 390,
    height = 700;
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
    () => ({ width, height }) as DOMRect,
  );
  const mesh = createMesh(new Uint8ClampedArray([255, 255, 255, 255]), 1, 1, {
    ...defaults,
    resolution: 40,
  });
  render(<Viewer {...mesh} lit />);
  const camera = captured.frames.at(-1)!.camera;
  const position = camera.position.clone();
  expect(camera.zoom).toBeCloseTo(390 / 700);
  width = 900;
  height = 600;
  resize();
  expect(camera.zoom).toBe(1);
  expect(camera.aspect).toBe(1.5);
  expect(camera.position.distanceTo(position)).toBe(0);
});

test("changing the opening replaces the sphere geometry while preserving the inspected angle and zoom", () => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
  const s = { ...defaults, shape: "sphere" as const, resolution: 40 };
  const mesh = createMesh(new Uint8ClampedArray([255, 255, 255, 255]), 1, 1, s);
  const cap = createSphereCap(s);
  const { rerender } = render(<Viewer {...mesh} sphereCap={cap} lit />);
  const first = captured.frames.at(-1)!;
  // Inspect the cap from above and zoom in before editing its bore.
  first.camera.position.set(20, 180, 50);
  const firstBounds = new Box3().setFromObject(first.scene);
  const firstCenter = firstBounds.getCenter(new Vector3());
  const firstSize = firstBounds.getSize(new Vector3());
  const inspected = first.camera.position
    .clone()
    .sub(firstCenter)
    .divideScalar(Math.max(firstSize.x, firstSize.y, firstSize.z));
  const updated = createMesh(
    new Uint8ClampedArray([255, 255, 255, 255]),
    1,
    1,
    { ...s, sphereOpeningDiameter: 30 },
  );
  const updatedCap = createSphereCap({ ...s, sphereOpeningDiameter: 30 });
  rerender(<Viewer {...updated} sphereCap={updatedCap} lit />);
  const second = captured.frames.at(-1)!;
  expect(second.camera).not.toBe(first.camera);
  const bounds = new Box3().setFromObject(second.scene);
  const center = bounds.getCenter(new Vector3());
  const size = bounds.getSize(new Vector3());
  const actual = second.camera.position
    .clone()
    .sub(center)
    .divideScalar(Math.max(size.x, size.y, size.z));
  expect(actual.distanceTo(inspected)).toBeLessThan(0.00001);
  // The new scene actually receives the regenerated cap, not the old mesh.
  const model = second.scene.children.find((child) => child.type === "Group")!;
  expect(model.children.length).toBe(2);
  const sphere = model.children[0] as import("three").Mesh;
  expect(sphere.geometry.getAttribute("position").array).toBe(
    updated.positions,
  );
  expect(mesh.positions).not.toEqual(updated.positions);
  const capMesh = model.children[1] as import("three").Mesh;
  expect(capMesh.geometry.getAttribute("position").array).toBe(
    updatedCap.positions,
  );
  expect(capMesh.position.y).toBe(0);
  rerender(<Viewer {...updated} sphereCap={updatedCap} lit interior />);
  const separated = captured.frames
    .at(-1)!
    .scene.children.find((child) => child.type === "Group")!;
  expect(separated.children.length).toBe(2);
  expect(separated.children[1].position.y).toBe(SPHERE_CAP_TUBE_LENGTH + 7);
});
