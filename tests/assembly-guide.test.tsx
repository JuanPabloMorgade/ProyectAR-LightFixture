// @vitest-environment jsdom
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import AssemblyGuide from "../src/features/shadowbox/assembly-guide";
import ShadowEditor from "../src/features/shadowbox/editor";
import {
  ASSEMBLY_STEPS,
  assemblyPosition,
} from "../src/features/shadowbox/assembly";
import {
  defaultBox,
  masksFromImage,
  IMAGE_SIZE,
} from "../src/features/shadowbox/engine";
import { mockCanvasAndImages } from "./browser-mocks";

const viewer = vi.hoisted(() => vi.fn());
vi.mock("../src/features/shadowbox/assembly-viewer", () => ({
  default: (props: unknown) => {
    viewer(props);
    return <div>Vista de prueba</div>;
  },
}));
vi.mock("../src/features/shadowbox/viewer", () => ({
  default: () => <div>Editor 3D</div>,
}));

beforeEach(() => {
  viewer.mockClear();
  localStorage.clear();
  mockCanvasAndImages();
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.open = true;
    },
  });
  Object.defineProperty(HTMLDialogElement.prototype, "close", {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.open = false;
    },
  });
});
afterEach(() => {
  cleanup();
  Reflect.deleteProperty(HTMLDialogElement.prototype, "showModal");
  Reflect.deleteProperty(HTMLDialogElement.prototype, "close");
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

test("la guía recorre las piezas, la posición real de luz y el resultado sin perder el diseño", () => {
  const settings = {
    ...defaultBox,
    width: 20,
    height: 12,
    depth: 8,
    lightPercent: 75,
  };
  const masks = masksFromImage(
    new Uint8ClampedArray(IMAGE_SIZE * IMAGE_SIZE * 4),
    settings,
  );
  const simulation = new Uint8ClampedArray(IMAGE_SIZE * IMAGE_SIZE * 4);
  const close = vi.fn();
  render(
    <AssemblyGuide
      name="Niño con lentes"
      settings={settings}
      masks={masks}
      simulation={simulation}
      onClose={close}
    />,
  );
  const dialog = screen.getByRole("dialog", { name: "Guía de armado" });
  expect(within(dialog).getByText(/Niño con lentes/)).toBeTruthy();
  expect(document.body.style.overflow).toBe("hidden");
  const closeButton = screen.getByRole("button", {
    name: "Cerrar guía de armado",
  });
  closeButton.focus();
  fireEvent.keyDown(closeButton, { key: "Tab", shiftKey: true });
  expect(document.activeElement).toBe(
    screen.getByRole("button", { name: "Siguiente" }),
  );
  fireEvent.keyDown(document.activeElement!, { key: "Tab" });
  expect(document.activeElement).toBe(closeButton);
  expect(viewer.mock.lastCall![0].masks).toBe(masks);
  expect(viewer.mock.lastCall![0].simulation).toBe(simulation);
  expect(viewer.mock.lastCall![0].settings).toBe(settings);
  const files = [
    "05-tapa-frontal.stl",
    "02-pared-inferior.stl",
    "03-pared-izquierda.stl",
    "04-pared-derecha.stl",
    "01-pared-superior.stl",
  ];
  for (let step = 1; step < ASSEMBLY_STEPS.length; step++) {
    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    expect(
      screen.getByRole("heading", { name: ASSEMBLY_STEPS[step].title }),
    ).toBeTruthy();
    expect(viewer.mock.lastCall![0].step).toBe(step);
    if (step <= 5) expect(screen.getByText(files[step - 1])).toBeTruthy();
    if (step === 6)
      expect(screen.getByText("6 cm · centrada en la caja")).toBeTruthy();
  }
  fireEvent.click(screen.getByRole("button", { name: "Anterior" }));
  expect(viewer.mock.lastCall![0].step).toBe(6);
  fireEvent.click(screen.getByRole("button", { name: "Reiniciar" }));
  expect(viewer.mock.lastCall![0].step).toBe(0);
  fireEvent.click(screen.getByRole("button", { name: /Paso 8:/ }));
  fireEvent.click(screen.getByRole("button", { name: "Finalizar" }));
  expect(close).toHaveBeenCalledOnce();
});

test("el botón abre el proyecto actual, restaura el foco y permite volver a abrir desde el inicio", () => {
  render(<ShadowEditor />);
  fireEvent.change(screen.getByRole("textbox", { name: "Nombre" }), {
    target: { value: "Mi retrato" },
  });
  fireEvent.change(screen.getByRole("spinbutton", { name: /Ancho/ }), {
    target: { value: "21" },
  });
  fireEvent.change(screen.getByRole("combobox", { name: "Cantidad de LEDs" }), {
    target: { value: "3" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Vista 3D" }));
  const trigger = screen.getByRole("button", { name: "Ver guía de armado" });
  trigger.focus();
  fireEvent.click(trigger);
  expect(screen.getByText(/Mi retrato · 21/)).toBeTruthy();
  expect(viewer.mock.lastCall![0].settings.width).toBe(21);
  expect(viewer.mock.lastCall![0].fabrication.ledCount).toBe(3);
  expect(viewer.mock.lastCall![0].masks).toHaveLength(4);
  const previousMasks = viewer.mock.lastCall![0].masks;
  fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
  fireEvent(
    screen.getByRole("dialog"),
    new Event("cancel", { cancelable: true }),
  );
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(document.body.style.overflow).toBe("");
  expect(document.activeElement).toBe(trigger);
  expect(localStorage.length).toBe(0);
  // Reopening after editing must use the updated project, not a cached scene.
  fireEvent.change(screen.getByRole("textbox", { name: "Nombre" }), {
    target: { value: "Otro diseño" },
  });
  fireEvent.change(screen.getByRole("spinbutton", { name: /Ancho/ }), {
    target: { value: "24" },
  });
  fireEvent.click(trigger);
  expect(viewer.mock.lastCall![0].step).toBe(0);
  expect(screen.getByText(/Otro diseño · 24/)).toBeTruthy();
  expect(viewer.mock.lastCall![0].settings.width).toBe(24);
  expect(viewer.mock.lastCall![0].masks).not.toBe(previousMasks);
  fireEvent.click(
    screen.getByRole("button", { name: "Cerrar guía de armado" }),
  );
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(localStorage.length).toBe(0);
});

test("las posiciones de armado siguen las medidas y dejan el lado abierto hacia z=0", () => {
  const settings = { ...defaultBox, width: 20, height: 12, depth: 8 };
  expect(assemblyPosition("front", settings, false)).toEqual([0, 0, 8]);
  expect(assemblyPosition("top", settings, false)).toEqual([0, 6, 4]);
  expect(assemblyPosition("bottom", settings, false)).toEqual([0, -6, 4]);
  expect(assemblyPosition("left", settings, false)).toEqual([-10, 0, 4]);
  expect(assemblyPosition("right", settings, false)).toEqual([10, 0, 4]);
  expect(assemblyPosition("front", settings, true)[2]).toBeGreaterThan(8);
  expect(assemblyPosition("left", settings, true)[0]).toBeLessThan(-10);
});
