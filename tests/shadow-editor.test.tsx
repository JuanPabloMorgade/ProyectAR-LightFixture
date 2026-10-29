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

test("guarda embellecedor con diseño y anclaje, manteniendo acceso a pilas y tubo", async () => {
  render(<ShadowEditor />);
  fireEvent.click(screen.getByRole("button", { name: "Vista 3D" }));
  expect(
    screen.getByRole("combobox", { name: "Diseño de la tapa trasera" }),
  ).toBeTruthy();
  fireEvent.change(
    screen.getByRole("combobox", { name: "Diseño de la tapa trasera" }),
    { target: { value: "design" } },
  );
  fireEvent.change(
    screen.getByRole("spinbutton", { name: "Altura del relieve trasero" }),
    { target: { value: "0.8" } },
  );
  fireEvent.blur(
    screen.getByRole("spinbutton", { name: "Altura del relieve trasero" }),
  );
  fireEvent.change(
    screen.getByRole("spinbutton", { name: "Entrada de cabeza del tornillo" }),
    { target: { value: "10" } },
  );
  fireEvent.blur(
    screen.getByRole("spinbutton", { name: "Entrada de cabeza del tornillo" }),
  );
  fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
  const saved = JSON.parse(
    localStorage.getItem("proyectar:shadow:v2:Mi cuadro de sombra")!,
  );
  expect(saved.fabrication.enclosure).toMatchObject({
    layout: "wall",
    front: "design",
    relief: 0.8,
    hangerEntry: 10,
  });
  fireEvent.change(
    screen.getByRole("combobox", { name: "Diseño de la tapa trasera" }),
    { target: { value: "plain" } },
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Abrir diseño guardado" }),
  );
  await screen.findByRole("button", { name: "Cargar imagen" });
  fireEvent.click(screen.getByRole("button", { name: "Vista 3D" }));
  expect(
    (
      screen.getByRole("combobox", {
        name: "Diseño de la tapa trasera",
      }) as HTMLSelectElement
    ).value,
  ).toBe("design");
  expect(
    (
      screen.getByRole("spinbutton", {
        name: "Altura del relieve trasero",
      }) as HTMLInputElement
    ).value,
  ).toBe("0.8");
}, 10000);

test("entrar en 3D corrige el 85% antiguo sin exigir el botón de montaje", () => {
  render(<ShadowEditor />);
  fireEvent.change(
    screen.getByRole("spinbutton", { name: "Posición de luz" }),
    { target: { value: "85" } },
  );
  fireEvent.click(screen.getByRole("button", { name: "Vista 3D" }));
  expect(
    (
      screen.getByRole("spinbutton", {
        name: "Posición de luz",
      }) as HTMLInputElement
    ).value,
  ).toBe("83");
  expect(screen.queryByRole("alert")).toBeNull();
  expect(
    screen.queryByRole("button", { name: /Ajustar posición de luz/ }),
  ).toBeNull();
  expect(
    (
      screen.getByRole("button", {
        name: "Descargar STL · 10 piezas",
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(false);
  expect(screen.getByRole("status").textContent).toContain("85% a 83%");
  fireEvent.change(
    screen.getByRole("spinbutton", { name: "Posición de luz" }),
    { target: { value: "85" } },
  );
  fireEvent.click(screen.getByRole("button", { name: /patrones/ }));
  fireEvent.click(screen.getByRole("button", { name: "Vista 3D" }));
  expect(
    (
      screen.getByRole("spinbutton", {
        name: "Posición de luz",
      }) as HTMLInputElement
    ).value,
  ).toBe("83");
  expect(screen.queryByRole("alert")).toBeNull();
});

test("modular permite corregir ajustes manuales, cambia alimentación y restaura medidas", async () => {
  render(<ShadowEditor />);
  fireEvent.click(screen.getByRole("button", { name: "Vista 3D" }));
  expect(screen.getByText("10 piezas para imprimir")).toBeTruthy();
  fireEvent.change(
    screen.getByRole("spinbutton", { name: "Posición de luz" }),
    { target: { value: "85" } },
  );
  expect(
    (
      screen.getByRole("button", {
        name: "Descargar STL · 10 piezas",
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(true);
  fireEvent.click(
    screen.getByRole("button", { name: /Ajustar posición de luz/ }),
  );
  expect(screen.queryByRole("alert")).toBeNull();
  expect(
    (
      screen.getByRole("button", {
        name: "Descargar STL · 10 piezas",
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(false);
  fireEvent.change(
    screen.getByRole("spinbutton", { name: "Largo del portapilas" }),
    { target: { value: "57" } },
  );
  fireEvent.blur(
    screen.getByRole("spinbutton", { name: "Largo del portapilas" }),
  );
  fireEvent.change(
    screen.getByRole("combobox", { name: "Alimentación del modelo" }),
    { target: { value: "usb" } },
  );
  expect(
    screen.queryByRole("spinbutton", { name: "Largo del portapilas" }),
  ).toBeNull();
  expect(
    screen.getByRole("button", { name: "Descargar STL · 9 piezas" }),
  ).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
  const saved = JSON.parse(
    localStorage.getItem("proyectar:shadow:v2:Mi cuadro de sombra")!,
  );
  expect(saved.fabrication.modular).toMatchObject({
    power: "usb",
    holderLength: 57,
    starDiameter: 20,
    starThickness: 1.2,
  });
  expect(saved.settings.lightPercent).toBeLessThan(85);
  expect(
    screen.queryByRole("combobox", { name: "Cantidad de LEDs" }),
  ).toBeNull();
  fireEvent.click(
    screen.getByRole("button", { name: "Abrir diseño guardado" }),
  );
  await screen.findByRole("button", { name: "Cargar imagen" });
  fireEvent.click(screen.getByRole("button", { name: "Vista 3D" }));
  expect(
    screen.queryByRole("combobox", { name: /Tipo de iluminaci/ }),
  ).toBeNull();
  fireEvent.change(
    screen.getByRole("combobox", { name: "Alimentación del modelo" }),
    { target: { value: "aaa" } },
  );
  expect(
    (
      screen.getByRole("spinbutton", {
        name: "Largo del portapilas",
      }) as HTMLInputElement
    ).value,
  ).toBe("57");
  fireEvent.change(screen.getByRole("spinbutton", { name: "Ancho" }), {
    target: { value: "6" },
  });
  expect(screen.getByRole("alert").textContent).toContain("portapilas");
  expect(
    (
      screen.getByRole("button", {
        name: "Descargar STL · 10 piezas",
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(true);
});

vi.mock("../src/features/shadowbox/viewer", () => ({
  default: () => <div aria-label="Caja 3D de prueba" />,
}));

beforeEach(() => {
  localStorage.clear();
  mockCanvasAndImages();
});

afterEach(() => {
  cleanup();
  Reflect.deleteProperty(HTMLElement.prototype, "setPointerCapture");
  Reflect.deleteProperty(HTMLDialogElement.prototype, "showModal");
  Reflect.deleteProperty(HTMLDialogElement.prototype, "close");
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

test("guarda el proyecto con las medidas editadas y muestra cuatro paneles", async () => {
  render(<ShadowEditor />);
  fireEvent.click(
    screen.getByRole("button", { name: "Diseñador de patrones" }),
  );
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

test("las medidas se pueden borrar y reescribir sin insertar cero y se guardan como números", () => {
  render(<ShadowEditor />);
  for (const [label, key, value] of [
    ["Ancho", "width", "12"],
    ["Alto", "height", "24"],
    ["Profundidad", "depth", "8.5"],
    ["Radio de proyección", "radius", "54"],
    ["Posición de luz", "lightPercent", "75"],
    ["Margen de corte", "margin", "0"],
    ["Espesor", "thickness", "0.8"],
  ] as const) {
    const input = screen.getByRole("spinbutton", {
      name: new RegExp(label),
    }) as HTMLInputElement;
    const previous = input.value;
    fireEvent.change(input, { target: { value: "" } });
    expect(input.value).toBe("");
    fireEvent.blur(input);
    expect(input.value).toBe(previous);

    fireEvent.change(input, { target: { value: "" } });
    fireEvent.change(input, { target: { value } });
    expect(input.value).toBe(value);
    fireEvent.blur(input);
    expect(input.value).toBe(value);
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
    const saved = JSON.parse(
      localStorage.getItem("proyectar:shadow:v2:Mi cuadro de sombra")!,
    );
    expect(saved.settings[key]).toBe(Number(value));
  }

  const width = screen.getByRole("spinbutton", {
    name: /Ancho/,
  }) as HTMLInputElement;
  fireEvent.change(width, { target: { value: "012" } });
  fireEvent.blur(width);
  expect(width.value).toBe("12");

  fireEvent.change(width, { target: { value: "" } });
  fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
  const saved = JSON.parse(
    localStorage.getItem("proyectar:shadow:v2:Mi cuadro de sombra")!,
  );
  expect(saved.settings.width).toBe(12);
});

test("el recorrido empieza en cómo funciona y permite navegar con teclado sin perder el diseño", async () => {
  const { container } = render(<ShadowEditor />);
  const steps = screen.getAllByRole("button", {
    name: /Cómo funciona|Diseñador de patrones|Vista 3D/,
  });
  expect(steps.map((step) => step.textContent)).toEqual([
    expect.stringContaining("Cómo funciona"),
    expect.stringContaining("Diseñador de patrones"),
    expect.stringContaining("Vista 3D"),
  ]);
  expect(steps[0].getAttribute("aria-current")).toBe("step");

  steps[0].focus();
  fireEvent.keyDown(steps[0], { key: "ArrowRight" });
  expect(document.activeElement).toBe(steps[1]);
  expect(steps[1].getAttribute("aria-current")).toBe("step");
  expect(screen.getByRole("button", { name: "Cargar imagen" })).toBeTruthy();

  fireEvent.keyDown(steps[1], { key: "End" });
  expect(document.activeElement).toBe(steps[2]);
  expect(screen.getByRole("button", { name: "Volver al diseño" })).toBeTruthy();
  expect(screen.queryByRole("checkbox", { name: "Mostrar rayos" })).toBeNull();
  expect(screen.getByRole("checkbox", { name: "Ver interior" })).toBeTruthy();
  fireEvent.keyDown(steps[2], { key: "Home" });
  expect(document.activeElement).toBe(steps[0]);
  fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
  expect(screen.getByRole("button", { name: "Cargar imagen" })).toBeTruthy();

  const upload = container.querySelector(
    'input[type="file"][accept^="image/png"]',
  ) as HTMLInputElement;
  expect(upload).toBeTruthy();
  const source = screen.getByRole("button", { name: "Cargar imagen" });
  const examples = screen.getByText("O probá con un ejemplo");
  expect(
    source.compareDocumentPosition(examples) & Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
  for (const name of ["Rayos", "Flor", "Estrellas", "Texto"])
    expect(screen.getByRole("button", { name })).toBeTruthy();

  fireEvent.change(screen.getByRole("textbox", { name: "Nombre" }), {
    target: { value: "Diseño persistente" },
  });
  fireEvent.change(screen.getByRole("spinbutton", { name: /Ancho/ }), {
    target: { value: "22" },
  });
  const drawImage = vi.spyOn(
    HTMLCanvasElement.prototype.getContext("2d")!,
    "drawImage",
  );
  fireEvent.click(screen.getByRole("button", { name: "Atrás" }));
  fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
  fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
  fireEvent.click(screen.getByRole("button", { name: "Volver al diseño" }));
  expect(
    (screen.getByRole("textbox", { name: "Nombre" }) as HTMLInputElement).value,
  ).toBe("Diseño persistente");
  expect(
    (screen.getByRole("spinbutton", { name: /Ancho/ }) as HTMLInputElement)
      .value,
  ).toBe("22");
  expect(drawImage).toHaveBeenCalled();
});

test("importar un proyecto válido abre el diseñador y el inválido mantiene el paso actual", async () => {
  const { container } = render(<ShadowEditor />);
  fireEvent.change(screen.getByRole("spinbutton", { name: /Ancho/ }), {
    target: { value: "" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Vista 3D" }));
  const input = container.querySelector(
    'input[type="file"][accept^=".json"]',
  ) as HTMLInputElement;
  const valid = {
    version: 2,
    name: "Recuperado",
    image: "data:image/png;base64,AA==",
    settings: {
      width: 20,
      height: 14,
      depth: 8,
      radius: 50,
      lightPercent: 50,
      margin: 2,
      thickness: 2,
      detail: 160,
    },
  };
  const file = new File([JSON.stringify(valid)], "proyecto.json", {
    type: "application/json",
  });
  Object.defineProperty(file, "text", {
    value: async () => JSON.stringify(valid),
  });
  fireEvent.change(input, { target: { files: [file] } });
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Cargar imagen" })).toBeTruthy(),
  );
  expect(
    (screen.getByRole("textbox", { name: "Nombre" }) as HTMLInputElement).value,
  ).toBe("Recuperado");
  expect(
    (screen.getByRole("spinbutton", { name: /Ancho/ }) as HTMLInputElement)
      .value,
  ).toBe("20");

  const invalid = new File(["{}"], "invalido.json", {
    type: "application/json",
  });
  Object.defineProperty(invalid, "text", { value: async () => "{}" });
  fireEvent.change(input, { target: { files: [invalid] } });
  await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());
  expect(screen.getByRole("button", { name: "Cargar imagen" })).toBeTruthy();
  expect(
    (screen.getByRole("textbox", { name: "Nombre" }) as HTMLInputElement).value,
  ).toBe("Recuperado");
});

test("los ejemplos, el dibujo y el recorte confirmado o cancelado conservan el arte al cambiar de paso", async () => {
  Object.defineProperty(HTMLElement.prototype, "setPointerCapture", {
    configurable: true,
    value: vi.fn(),
  });
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
  vi.stubGlobal(
    "URL",
    Object.assign(class extends URL {}, {
      createObjectURL: vi.fn(() => "blob:foto"),
      revokeObjectURL: vi.fn(),
    }),
  );
  const { container } = render(<ShadowEditor />);
  fireEvent.click(
    screen.getByRole("button", { name: "Diseñador de patrones" }),
  );
  const draw = vi.spyOn(
    HTMLCanvasElement.prototype.getContext("2d")!,
    "drawImage",
  );
  for (const example of ["Rayos", "Flor", "Estrellas", "Texto"]) {
    fireEvent.click(screen.getByRole("button", { name: example }));
    fireEvent.click(screen.getByRole("button", { name: "Atrás" }));
    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    fireEvent.click(screen.getByRole("button", { name: "Volver al diseño" }));
  }
  const canvas = screen.getByLabelText("Dibujá el patrón aquí");
  fireEvent.pointerDown(canvas, { clientX: 10, clientY: 10 });
  fireEvent.pointerUp(canvas, { clientX: 20, clientY: 20 });
  expect(draw).toHaveBeenCalled();

  const imageInput = container.querySelector(
    'input[type="file"][accept^="image/png"]',
  ) as HTMLInputElement;
  const photo = new File(["image"], "luna.png", { type: "image/png" });
  fireEvent.change(imageInput, { target: { files: [photo] } });
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Aplicar imagen" })).toBeTruthy(),
  );
  fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
  expect(screen.queryByRole("button", { name: "Aplicar imagen" })).toBeNull();

  fireEvent.change(imageInput, { target: { files: [photo] } });
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Aplicar imagen" })).toBeTruthy(),
  );
  fireEvent.click(screen.getByRole("button", { name: "Aplicar imagen" }));
  expect(
    (screen.getByRole("textbox", { name: "Nombre" }) as HTMLInputElement).value,
  ).toBe("luna");
  fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
  fireEvent.click(screen.getByRole("button", { name: "Volver al diseño" }));
  expect(draw).toHaveBeenCalled();
});

test("abrir un proyecto guardado desde otro paso vuelve al diseñador restaurado", async () => {
  render(<ShadowEditor />);
  fireEvent.click(
    screen.getByRole("button", { name: "Diseñador de patrones" }),
  );
  fireEvent.change(screen.getByRole("textbox", { name: "Nombre" }), {
    target: { value: "Guardado local" },
  });
  fireEvent.change(screen.getByRole("spinbutton", { name: /Ancho/ }), {
    target: { value: "23" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
  fireEvent.click(screen.getByRole("button", { name: "Cómo funciona" }));
  fireEvent.change(
    screen.getByRole("combobox", { name: "Diseños guardados" }),
    {
      target: { value: "proyectar:shadow:v2:Guardado local" },
    },
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Abrir diseño guardado" }),
  );
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Cargar imagen" })).toBeTruthy(),
  );
  expect(
    (screen.getByRole("textbox", { name: "Nombre" }) as HTMLInputElement).value,
  ).toBe("Guardado local");
  expect(
    (screen.getByRole("spinbutton", { name: /Ancho/ }) as HTMLInputElement)
      .value,
  ).toBe("23");
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

test("guarda medidas de estrella y electrónica con campos numéricos editables", async () => {
  render(<ShadowEditor />);
  fireEvent.click(screen.getByRole("button", { name: "Vista 3D" }));
  const star = screen.getByRole("spinbutton", {
    name: "Diámetro de la estrella",
  }) as HTMLInputElement;
  fireEvent.change(star, { target: { value: "" } });
  expect(star.value).toBe("");
  fireEvent.blur(star);
  expect(star.value).toBe("20");
  fireEvent.change(star, { target: { value: "22" } });
  fireEvent.blur(star);
  fireEvent.change(
    screen.getByRole("spinbutton", { name: "Holgura de ajuste" }),
    { target: { value: "0.35" } },
  );
  fireEvent.change(
    screen.getByRole("spinbutton", {
      name: "Profundidad de la base",
    }),
    { target: { value: "30" } },
  );
  fireEvent.blur(
    screen.getByRole("spinbutton", {
      name: "Profundidad de la base",
    }),
  );
  fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
  const saved = JSON.parse(
    localStorage.getItem("proyectar:shadow:v2:Mi cuadro de sombra")!,
  );
  expect(saved.fabrication).toMatchObject({
    illumination: "modular",
    clearance: 0.35,
    modular: { starDiameter: 22 },
    enclosure: { depth: 30 },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Abrir diseño guardado" }),
  );
  await screen.findByRole("button", { name: "Cargar imagen" });
  fireEvent.click(screen.getByRole("button", { name: "Vista 3D" }));
  expect(
    (
      screen.getByRole("spinbutton", {
        name: "Diámetro de la estrella",
      }) as HTMLInputElement
    ).value,
  ).toBe("22");
  expect(
    (
      screen.getByRole("spinbutton", {
        name: "Profundidad de la base",
      }) as HTMLInputElement
    ).value,
  ).toBe("30");
  fireEvent.change(
    screen.getByRole("spinbutton", { name: "Posición de luz" }),
    { target: { value: "95" } },
  );
  expect(screen.getByRole("alert").textContent).toContain("No hay espacio");
  expect(
    (
      screen.getByRole("button", {
        name: "Descargar STL · 10 piezas",
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(true);
});

test.each([undefined, "individual", "cob"])(
  "migra iluminación anterior %s a 1 W e informa el cambio",
  async (illumination) => {
    const { container } = render(<ShadowEditor />);
    fireEvent.click(screen.getByRole("button", { name: "Vista 3D" }));
    const project = {
      version: 2,
      name: "Prototipo LED",
      image: "data:image/png;base64,AA==",
      settings: {
        width: 15,
        height: 15,
        depth: 6,
        radius: 55,
        lightPercent: 85,
        margin: 3,
        thickness: 2,
        detail: 160,
      },
      fabrication: {
        illumination,
        ledCount: 9,
        ledDiameter: 5,
        flangeDiameter: 5.2,
        ledHeight: 6,
        clearance: 0.35,
        joints: true,
      },
    };
    const input = container.querySelector(
      'input[type="file"][accept^=".json"]',
    ) as HTMLInputElement;
    const upload = (data: unknown) => {
      const json = JSON.stringify(data);
      const file = new File([json], "led.json", { type: "application/json" });
      Object.defineProperty(file, "text", { value: async () => json });
      fireEvent.change(input, { target: { files: [file] } });
    };
    upload(project);
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Cargar imagen" }),
      ).toBeTruthy(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Vista 3D" }));
    expect(
      screen.queryByRole("combobox", { name: /Tipo de iluminaci/ }),
    ).toBeNull();
    expect(
      screen.queryByRole("combobox", { name: "Cantidad de LEDs" }),
    ).toBeNull();
    expect(screen.getByRole("status").textContent).toContain(
      "se actualizó a LED de 1 W",
    );
    expect(
      (
        screen.getByRole("spinbutton", {
          name: "Posición de luz",
        }) as HTMLInputElement
      ).value,
    ).toBe("83");
    expect(screen.queryByRole("alert")).toBeNull();
    expect(
      screen.queryByRole("button", { name: /Ajustar posición de luz/ }),
    ).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
    const saved = JSON.parse(
      localStorage.getItem("proyectar:shadow:v2:Prototipo LED")!,
    );
    expect(saved.fabrication).toMatchObject({
      illumination: "modular",
      clearance: 0.35,
      enclosure: { layout: "wall" },
    });
    expect(saved.settings).toMatchObject({ width: 15, height: 15, depth: 6 });
    upload({
      ...project,
      fabrication: { ...project.fabrication, ledCount: 4 },
    });
    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toContain(
        "medidas del LED",
      ),
    );
    expect(
      screen.queryByRole("combobox", { name: /Tipo de iluminaci/ }),
    ).toBeNull();
    expect(
      (screen.getByRole("textbox", { name: "Nombre" }) as HTMLInputElement)
        .value,
    ).toBe("Prototipo LED");
    upload({
      ...project,
      fabrication: { ...project.fabrication, ledCount: 3 },
    });
    await screen.findByRole("button", { name: "Cargar imagen" });
    fireEvent.click(screen.getByRole("button", { name: "Vista 3D" }));
    expect(
      screen.queryByRole("combobox", { name: /Tipo de iluminaci/ }),
    ).toBeNull();
    expect(
      screen.queryByRole("combobox", { name: "Cantidad de LEDs" }),
    ).toBeNull();
  },
);

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
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    downloads.push(this.download);
  });
  render(<ShadowEditor />);
  fireEvent.click(screen.getByRole("button", { name: "Vista 3D" }));
  fireEvent.click(screen.getByRole("button", { name: "Vista 3D" }));
  const format = screen.getByRole("combobox", { name: "Formato de descarga" });
  expect((format as HTMLSelectElement).value).toBe("combined");
  fireEvent.change(format, { target: { value: "separate" } });
  fireEvent.click(
    screen.getByRole("button", { name: "Descargar ZIP · 10 STL" }),
  );
  expect(active!.postMessage).toHaveBeenCalledWith(
    expect.objectContaining({
      mode: "separate",
      name: "Mi_cuadro_de_sombra",
      fabrication: expect.objectContaining({
        illumination: "modular",
        enclosure: expect.objectContaining({ depth: 20, layout: "wall" }),
        modular: expect.objectContaining({ starDiameter: 20 }),
      }),
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
  expect(screen.getByRole("status").textContent).toContain("10 STL separados");
  expect(active!.terminate).toHaveBeenCalled();
  expect((format as HTMLSelectElement).disabled).toBe(false);
  // A failed export must release the controls and permit a retry.
  fireEvent.change(format, { target: { value: "combined" } });
  fireEvent.click(
    screen.getByRole("button", { name: "Descargar STL · 10 piezas" }),
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
