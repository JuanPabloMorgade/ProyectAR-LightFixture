// @vitest-environment jsdom
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import {
  cleanup,
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
