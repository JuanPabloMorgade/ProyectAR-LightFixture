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
import { createHousingParts } from "../src/features/lithophane/housing";
import { createMesh, type Settings } from "../src/features/lithophane/mesh";
import {
  createPrintStand,
  hasPrintStand,
} from "../src/features/lithophane/print-stand";

vi.mock("../src/features/lithophane/viewer", () => ({
  default: ({
    printSupport,
    housingParts,
  }: {
    printSupport?: unknown;
    housingParts?: unknown[];
  }) => (
    <div
      aria-label="Modelo 3D de prueba"
      data-support={!!printSupport}
      data-housing={housingParts?.length ?? 0}
    />
  ),
}));

class MockWorker {
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: (() => void) | null = null;
  postMessage(data: { id: number; settings: Settings }) {
    queueMicrotask(() => {
      try {
        const housingParts = createHousingParts(data.settings);
        const mesh = createMesh(
          new Uint8ClampedArray([255, 255, 255, 255]),
          1,
          1,
          data.settings,
        );
        const prepared = hasPrintStand(data.settings)
          ? createPrintStand(mesh, data.settings)
          : null;
        this.onmessage?.({
          data: {
            id: data.id,
            housingParts,
            ...mesh,
            printPanel: prepared?.printMesh,
            printSupport: prepared?.support,
          },
        } as MessageEvent);
      } catch (error) {
        this.onmessage?.({
          data: { id: data.id, error: (error as Error).message },
        } as MessageEvent);
      }
    });
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

test("la caja opcional se guarda, restaura y descarga como kit; semicírculo conserva solo el panel", async () => {
  const NativeURL = URL;
  const makeURL = vi.fn((_blob: Blob) => "blob:kit");
  vi.stubGlobal(
    "URL",
    class extends NativeURL {
      static createObjectURL = makeURL;
      static revokeObjectURL = vi.fn();
    },
  );
  let filename = "";
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    filename = this.download;
  });
  const first = render(<LampEditor />);
  await waitFor(() =>
    expect(
      screen
        .getByRole("button", { name: /Guardar proyecto/ })
        .hasAttribute("disabled"),
    ).toBe(false),
  );
  fireEvent.click(screen.getByRole("button", { name: "Plano" }));
  fireEvent.click(
    screen.getByRole("checkbox", { name: "Generar caja trasera" }),
  );
  fireEvent.change(
    screen.getByRole("spinbutton", { name: "Espacio para la luz" }),
    { target: { value: "30" } },
  );
  const kit = () =>
    screen.getByRole("button", { name: "Descargar kit · 4 STL" });
  await waitFor(() => expect(kit().hasAttribute("disabled")).toBe(false));
  fireEvent.click(kit());
  expect(filename).toMatch(/-kit-litofania.zip$/);
  expect(makeURL.mock.calls[0][0]).toBeInstanceOf(Blob);
  fireEvent.click(screen.getByRole("button", { name: /Guardar proyecto/ }));
  expect(
    JSON.parse(localStorage.getItem("proyectar:lamp:v1")!).settings.housing,
  ).toEqual({ enabled: true, depth: 30, clearance: 0.3 });
  first.unmount();
  render(<LampEditor />);
  await waitFor(() =>
    expect(
      (
        screen.getByRole("checkbox", {
          name: "Generar caja trasera",
        }) as HTMLInputElement
      ).checked,
    ).toBe(true),
  );
  await waitFor(() => expect(kit().hasAttribute("disabled")).toBe(false));
  expect(
    (
      screen.getByRole("spinbutton", {
        name: "Espacio para la luz",
      }) as HTMLInputElement
    ).value,
  ).toBe("30");
  fireEvent.click(screen.getByRole("button", { name: "Semicírculo" }));
  await waitFor(() =>
    expect(
      screen
        .getByRole("button", { name: "Descargar STL" })
        .hasAttribute("disabled"),
    ).toBe(false),
  );
  const toggle = screen.getByRole("checkbox", {
    name: "Generar caja trasera",
  }) as HTMLInputElement;
  expect(toggle.disabled).toBe(true);
  expect(toggle.checked).toBe(false);
  fireEvent.click(screen.getByRole("button", { name: "Curvo" }));
  await waitFor(() => expect(kit().hasAttribute("disabled")).toBe(false));
});

test("una caja que invade el radio curvo bloquea la descarga y permite corregirla", async () => {
  render(<LampEditor />);
  await waitFor(() =>
    expect(
      screen
        .getByRole("button", { name: /Guardar proyecto/ })
        .hasAttribute("disabled"),
    ).toBe(false),
  );
  fireEvent.click(
    screen.getByRole("checkbox", { name: "Generar caja trasera" }),
  );
  fireEvent.change(
    screen.getByRole("spinbutton", { name: "Espacio para la luz" }),
    { target: { value: "80" } },
  );
  expect((await screen.findByRole("alert")).textContent).toContain("curvatura");
  expect(
    screen
      .getByRole("button", { name: "Descargar kit · 4 STL" })
      .hasAttribute("disabled"),
  ).toBe(true);
  fireEvent.change(
    screen.getByRole("spinbutton", { name: "Espacio para la luz" }),
    { target: { value: "25" } },
  );
  await waitFor(() =>
    expect(
      screen
        .getByRole("button", { name: "Descargar kit · 4 STL" })
        .hasAttribute("disabled"),
    ).toBe(false),
  );
  expect(screen.queryByRole("alert")).toBeNull();
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

test("Muy alto guarda y recupera la resolución de 384 puntos", async () => {
  const first = render(<LampEditor />);
  const save = () => screen.getByRole("button", { name: /Guardar proyecto/ });
  await waitFor(() => expect(save().hasAttribute("disabled")).toBe(false));
  fireEvent.change(screen.getByRole("combobox", { name: "Detalle" }), {
    target: { value: "384" },
  });
  await waitFor(() => expect(save().hasAttribute("disabled")).toBe(false));
  fireEvent.click(save());
  expect(
    JSON.parse(localStorage.getItem("proyectar:lamp:v1")!).settings.resolution,
  ).toBe(384);
  first.unmount();
  render(<LampEditor />);
  await waitFor(() =>
    expect(
      (screen.getByRole("combobox", { name: "Detalle" }) as HTMLSelectElement)
        .value,
    ).toBe("384"),
  );
  await waitFor(() => expect(save().hasAttribute("disabled")).toBe(false));
  expect(screen.queryByRole("alert")).toBeNull();
});

test("el soporte se puede inspeccionar sin la caja, desactivar y recuperar desactivado", async () => {
  const first = render(<LampEditor />);
  const save = () => screen.getByRole("button", { name: /Guardar proyecto/ });
  const stand = () =>
    screen.getByRole("checkbox", {
      name: "Exportar de pie con soporte removible",
    }) as HTMLInputElement;
  const viewer = () => screen.getByLabelText("Modelo 3D de prueba");
  await waitFor(() => expect(save().hasAttribute("disabled")).toBe(false));
  expect(stand().checked).toBe(true);
  fireEvent.click(
    screen.getByRole("checkbox", { name: "Ver soporte de impresión" }),
  );
  expect(viewer().dataset.support).toBe("true");
  fireEvent.click(
    screen.getByRole("checkbox", { name: "Generar caja trasera" }),
  );
  await waitFor(() => expect(save().hasAttribute("disabled")).toBe(false));
  expect(viewer().dataset.housing).toBe("0");
  fireEvent.click(
    screen.getByRole("checkbox", { name: "Ver soporte de impresión" }),
  );
  expect(viewer().dataset.housing).toBe("3");
  expect(viewer().dataset.support).toBe("false");
  fireEvent.click(stand());
  expect(
    screen.queryByRole("checkbox", { name: "Ver soporte de impresión" }),
  ).toBeNull();
  await waitFor(() => expect(save().hasAttribute("disabled")).toBe(false));
  fireEvent.click(save());
  expect(
    JSON.parse(localStorage.getItem("proyectar:lamp:v1")!).settings.printStand,
  ).toBe(false);
  first.unmount();
  render(<LampEditor />);
  await waitFor(() => expect(save().hasAttribute("disabled")).toBe(false));
  expect(stand().checked).toBe(false);
  expect(viewer().dataset.support).toBe("false");
});
