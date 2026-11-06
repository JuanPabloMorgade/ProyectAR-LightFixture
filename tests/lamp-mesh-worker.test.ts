import { expect, test, vi } from "vitest";
import { defaults } from "../src/features/lithophane/mesh";

test("worker only reuses accepted image geometry and invalidates it for new photos/settings", async () => {
  const messages: Record<string, unknown>[] = [];
  const worker = {
    onmessage: null as
      null | ((event: { data: Record<string, unknown> }) => void),
    postMessage: vi.fn((data: Record<string, unknown>) => messages.push(data)),
  };
  vi.stubGlobal("self", worker);
  try {
    await import("../src/features/lithophane/mesh.worker");
    const data = {
      id: 1,
      pixels: new Uint8ClampedArray([255, 255, 255, 255]),
      width: 1,
      height: 1,
      imageId: 1,
      settings: { ...defaults, resolution: 40, printStand: false },
    };
    worker.onmessage!({ data });
    const key = messages.at(-1)!.meshKey;
    expect(messages.at(-1)!.meshUnchanged).toBe(false);
    worker.onmessage!({
      data: {
        ...data,
        id: 2,
        currentMeshKey: key,
        settings: {
          ...data.settings,
          housing: {
            enabled: true,
            depth: 12,
            clearance: 0.3,
            frameTexture: "none",
          },
        },
      },
    });
    expect(messages.at(-1)!.meshUnchanged).toBe(true);
    expect(messages.at(-1)!.positions).toBeUndefined();
    expect((messages.at(-1)!.housingParts as unknown[]).length).toBe(3);
    worker.onmessage!({ data: { ...data, id: 3, currentMeshKey: "stale" } });
    expect(messages.at(-1)!.meshUnchanged).toBe(false);
    worker.onmessage!({
      data: { ...data, id: 4, imageId: 2, currentMeshKey: key },
    });
    expect(messages.at(-1)!.meshUnchanged).toBe(false);
    worker.onmessage!({
      data: {
        ...data,
        id: 5,
        currentMeshKey: key,
        settings: { ...data.settings, width: 100 },
      },
    });
    expect(messages.at(-1)!.meshUnchanged).toBe(false);
  } finally {
    vi.unstubAllGlobals();
  }
});
