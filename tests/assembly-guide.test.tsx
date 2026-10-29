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
import { defaultFabrication } from "../src/features/shadowbox/fabrication";
import { defaultCob } from "../src/features/shadowbox/cob";
import { defaultModular } from "../src/features/shadowbox/modular";
import { currentFabrication } from "../src/features/shadowbox/editor-defaults";
import { projectionSettings } from "../src/features/shadowbox/projection-settings";

test("la guía nueva monta base, tapitas, tubo y embellecedor en doce pasos", () => {
  render(
    <AssemblyGuide
      name="Pared"
      settings={projectionSettings(
        { ...defaultBox, lightPercent: 50 },
        currentFabrication(),
      )}
      masks={[]}
      simulation={new Uint8ClampedArray(IMAGE_SIZE * IMAGE_SIZE * 4)}
      fabrication={currentFabrication()}
      onClose={() => {}}
    />,
  );
  expect(
    screen.getByRole("button", { name: "Paso 1: Reconocé las 10 piezas" }),
  ).toBeTruthy();
  fireEvent.click(
    screen.getByRole("button", {
      name: "Paso 2: Presentá la base contra la pared",
    }),
  );
  expect(screen.getByText("06-base-pared.stl")).toBeTruthy();
  fireEvent.click(
    screen.getByRole("button", {
      name: "Paso 3: Instalá las conexiones y cerrá las pilas",
    }),
  );
  expect(screen.getByText("10-tapa-pilas.stl")).toBeTruthy();
  const instructions = screen.getByRole("region", {
    name: "Instrucciones del paso",
  });
  const body = instructions.parentElement!;
  instructions.focus();
  expect(document.activeElement).toBe(instructions);
  instructions.scrollTop = 250;
  body.scrollTop = 300;
  fireEvent.click(
    screen.getByRole("button", { name: "Paso 4: Colocá la tapa electrónica" }),
  );
  expect(screen.getByText("07-tapa-electronica.stl")).toBeTruthy();
  expect(instructions.scrollTop).toBe(0);
  expect(body.scrollTop).toBe(0);
  fireEvent.click(
    screen.getByRole("button", { name: "Paso 5: Instalá el tubo hueco" }),
  );
  expect(screen.getByText("08-tubo-hueco.stl")).toBeTruthy();
  fireEvent.click(
    screen.getByRole("button", {
      name: "Paso 11: Colocá el embellecedor frontal",
    }),
  );
  expect(screen.getByText("05-embellecedor.stl")).toBeTruthy();
  fireEvent.click(
    screen.getByRole("button", {
      name: "Paso 12: Colgá la base y revisá la sombra",
    }),
  );
  expect(screen.getByRole("button", { name: "Finalizar" })).toBeTruthy();
});

test("guía modular identifica piezas, alimentación y el cabezal sin instrucciones de LEDs múltiples", () => {
  render(
    <AssemblyGuide
      name="Modular"
      settings={{ ...defaultBox, lightPercent: 50 }}
      masks={[]}
      simulation={new Uint8ClampedArray(IMAGE_SIZE * IMAGE_SIZE * 4)}
      fabrication={{
        ...defaultFabrication,
        illumination: "modular",
        modular: defaultModular,
      }}
      onClose={() => {}}
    />,
  );
  expect(
    screen.getByRole("button", { name: "Paso 1: Reconocé las 8 piezas" }),
  ).toBeTruthy();
  fireEvent.click(
    screen.getByRole("button", {
      name: "Paso 7: Montá el poste, el cabezal y la luz",
    }),
  );
  expect(screen.getByText(/Alimentación: 3 pilas AAA alcalinas/)).toBeTruthy();
  expect(screen.getByText(/06-poste-hueco.stl/)).toBeTruthy();
  expect(screen.getByText(/No conectes USB a las pilas/)).toBeTruthy();
  expect(screen.queryByText(/Colocá 6 LED/)).toBeNull();
});

test("la guía COB detalla cortes, extremos, conexión y limitación óptica", () => {
  render(
    <AssemblyGuide
      name="COB"
      settings={defaultBox}
      masks={masksFromImage(
        new Uint8ClampedArray(IMAGE_SIZE * IMAGE_SIZE * 4),
        defaultBox,
      )}
      simulation={new Uint8ClampedArray(IMAGE_SIZE * IMAGE_SIZE * 4)}
      fabrication={{
        ...defaultFabrication,
        illumination: "cob",
        cob: defaultCob,
      }}
      onClose={() => {}}
    />,
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Paso 7: Ubicá la luz en el interior" }),
  );
  expect(screen.getByText(/Total: 60 mm/)).toBeTruthy();
  expect(screen.getByText(/Tramo 1: 30 mm/)).toBeTruthy();
  expect(screen.getByText(/interruptor en el positivo/).textContent).toContain(
    "− con −",
  );
  expect(screen.getByText(/no valida ópticamente/)).toBeTruthy();
  expect(screen.queryByText(/cm · centrada en la caja/)).toBeNull();
  fireEvent.click(
    screen.getByRole("button", { name: "Paso 2: Empezá por la tapa frontal" }),
  );
  expect(
    screen.getByText(/Identificá la pieza 05 con rebajes COB/),
  ).toBeTruthy();
});

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
  fireEvent.click(screen.getByRole("button", { name: "Vista 3D" }));
  fireEvent.change(screen.getByRole("textbox", { name: "Nombre" }), {
    target: { value: "Mi retrato" },
  });
  fireEvent.change(screen.getByRole("spinbutton", { name: "Ancho" }), {
    target: { value: "21" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Vista 3D" }));
  const trigger = screen.getByRole("button", { name: "Ver guía de armado" });
  trigger.focus();
  fireEvent.click(trigger);
  expect(screen.getByText(/Mi retrato · 21/)).toBeTruthy();
  expect(viewer.mock.lastCall![0].settings.width).toBe(21);
  expect(viewer.mock.lastCall![0].fabrication.illumination).toBe("modular");
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
  fireEvent.change(screen.getByRole("spinbutton", { name: "Ancho" }), {
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
