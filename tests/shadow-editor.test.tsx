// @vitest-environment jsdom
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import {
  cleanup,
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import ShadowEditor from "../src/features/shadowbox/editor";
import { mockCanvasAndImages } from "./browser-mocks";

vi.mock("../src/features/shadowbox/viewer", () => ({
  default: () => <div aria-label="Caja 3D de prueba" />,
}));

beforeEach(() => {
  localStorage.clear();
  mockCanvasAndImages();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

test("guarda el proyecto con las medidas editadas y muestra cuatro paneles", async () => {
  render(<ShadowEditor />);
  expect(await screen.findByText("Panel superior")).toBeTruthy();
  expect(screen.getAllByRole("button", { name: "SVG" })).toHaveLength(4);

  fireEvent.change(screen.getByRole("spinbutton", { name: /Ancho/ }), {
    target: { value: "20" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

  const saved = JSON.parse(
    localStorage.getItem("proyectar:shadow:v2:Mi cuadro de sombra")!,
  );
  expect(saved.version).toBe(2);
  expect(saved.settings.width).toBe(20);
  expect(saved.image).toMatch(/^data:image\/png;base64,/);
  expect(screen.getByRole("status").textContent).toContain("Diseño guardado");
});

test("rechaza un proyecto JSON inválido", async () => {
  const { container } = render(<ShadowEditor />);
  const file = new File(["{}"], "invalido.json", { type: "application/json" });
  Object.defineProperty(file, "text", { value: async () => "{}" });
  const input = container.querySelector(
    'input[type="file"][accept^=".json"]',
  ) as HTMLInputElement;
  fireEvent.change(input, { target: { files: [file] } });

  await waitFor(() =>
    expect(screen.getByRole("alert").textContent).toContain(
      "no es un proyecto válido",
    ),
  );
  expect(localStorage.length).toBe(0);
});

test("permite elegir piezas separadas y descarga el ZIP devuelto por el worker", async () => {
  let active: ExportWorker;
  class ExportWorker {
    onmessage: ((event: MessageEvent) => void) | null = null;
    onerror: (() => void) | null = null;
    postMessage = vi.fn();
    terminate = vi.fn();
    constructor() {
      active = this;
    }
  }
  vi.stubGlobal("Worker", ExportWorker);
  const createURL = vi.fn((_blob: Blob) => "blob:stl-export");
  vi.stubGlobal(
    "URL",
    Object.assign(class extends URL {}, {
      createObjectURL: createURL,
      revokeObjectURL: vi.fn(),
    }),
  );
  const downloads: string[] = [];
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(
    function (this: HTMLAnchorElement) {
      downloads.push(this.download);
    },
  );
  render(<ShadowEditor />);
  fireEvent.click(screen.getByRole("tab", { name: "Vista 3D" }));
  const format = screen.getByRole("combobox", { name: "Formato de descarga" });
  expect((format as HTMLSelectElement).value).toBe("combined");
  fireEvent.change(format, { target: { value: "separate" } });
  fireEvent.click(
    screen.getByRole("button", { name: "Descargar ZIP · 5 STL" }),
  );
  expect(active!.postMessage).toHaveBeenCalledWith(
    expect.objectContaining({
      mode: "separate",
      name: "Mi_cuadro_de_sombra",
    }),
  );
  expect((format as HTMLSelectElement).disabled).toBe(true);
  expect(
    (
      screen.getByRole("button", {
        name: "Preparando descarga…",
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(true);
  act(() =>
    active!.onmessage?.({
      data: {
        buffer: new ArrayBuffer(22),
        filename: "Mi_cuadro_de_sombra-piezas-separadas.zip",
        mime: "application/zip",
        triangles: 60,
      },
    } as MessageEvent),
  );
  expect(downloads).toEqual(["Mi_cuadro_de_sombra-piezas-separadas.zip"]);
  expect((createURL.mock.calls[0][0] as Blob).type).toBe("application/zip");
  expect(screen.getByRole("status").textContent).toContain("5 STL separados");
  expect(active!.terminate).toHaveBeenCalled();
  expect((format as HTMLSelectElement).disabled).toBe(false);
  // A failed export must release the controls and permit a retry.
  fireEvent.change(format, { target: { value: "combined" } });
  fireEvent.click(
    screen.getByRole("button", { name: "Descargar STL · 5 piezas" }),
  );
  expect(active!.postMessage).toHaveBeenCalledWith(
    expect.objectContaining({ mode: "combined" }),
  );
  act(() =>
    active!.onmessage?.({
      data: { error: "No se pudo generar el STL." },
    } as MessageEvent),
  );
  expect(screen.getByRole("alert").textContent).toContain("No se pudo generar");
  expect((format as HTMLSelectElement).disabled).toBe(false);
  expect(downloads).toHaveLength(1);
});
