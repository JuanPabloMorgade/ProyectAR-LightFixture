// @vitest-environment jsdom
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import LampEditor from "../src/features/lithophane/editor";
import { mockCanvasAndImages } from "./browser-mocks";

vi.mock("../src/features/lithophane/viewer", () => ({
  default: () => <div aria-label="Modelo 3D de prueba" />,
}));

class MockWorker {
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: (() => void) | null = null;
  postMessage(data: { id: number }) {
    queueMicrotask(() =>
      this.onmessage?.({
        data: {
          id: data.id,
          positions: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
          indices: new Uint32Array([0, 1, 2]),
        },
      } as MessageEvent),
    );
  }
  terminate() {}
}

beforeEach(() => {
  localStorage.clear();
  mockCanvasAndImages();
  vi.stubGlobal("Worker", MockWorker);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

test("cambia la forma del panel y guarda los ajustes actuales", async () => {
  render(<LampEditor />);
  await waitFor(() =>
    expect(
      screen
        .getByRole("button", { name: /Guardar proyecto/ })
        .hasAttribute("disabled"),
    ).toBe(false),
  );

  fireEvent.click(screen.getByRole("button", { name: "Plano" }));
  await waitFor(() =>
    expect(
      screen
        .getByRole("button", { name: /Guardar proyecto/ })
        .hasAttribute("disabled"),
    ).toBe(false),
  );
  fireEvent.click(screen.getByRole("button", { name: /Guardar proyecto/ }));

  const saved = JSON.parse(localStorage.getItem("proyectar:lamp:v1")!);
  expect(saved.version).toBe(1);
  expect(saved.settings.angle).toBe(0);
  expect(saved.photo).toMatch(/^data:image\/png;base64,/);
  expect(screen.getByText("Proyecto guardado en este navegador.")).toBeTruthy();
});

test("rechaza una imagen de formato no admitido", async () => {
  const { container } = render(<LampEditor />);
  const input = container.querySelector(
    'input[type="file"][accept^="image/png"]',
  ) as HTMLInputElement;
  fireEvent.change(input, {
    target: {
      files: [new File(["texto"], "foto.txt", { type: "text/plain" })],
    },
  });

  expect(
    await screen.findByText("Usá una imagen JPG, PNG o WebP."),
  ).toBeTruthy();
  expect(localStorage.getItem("proyectar:lamp:v1")).toBeNull();
});
