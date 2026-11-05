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
    screen.getByRole("button", { name: "Aplicar diseño guardado" }),
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
        name: "Descargar STL · 9 piezas",
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
  expect(screen.getByText("9 piezas para imprimir")).toBeTruthy();
  fireEvent.change(
    screen.getByRole("spinbutton", { name: "Posición de luz" }),
    { target: { value: "85" } },
  );
  expect(
    (
      screen.getByRole("button", {
        name: "Descargar STL · 9 piezas",
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
        name: "Descargar STL · 9 piezas",
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
    screen.getByRole("button", { name: "Descargar STL · 8 piezas" }),
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
    screen.getByRole("button", { name: "Aplicar diseño guardado" }),
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
        name: "Descargar STL · 9 piezas",
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(true);
});

vi.mock("../src/features/shadowbox/viewer", () => ({
  default: () => <div aria-label="Caja 3D de prueba" />,
}));

function detailFrames() {
  let id = 0;
  const callbacks = new Map<number, FrameRequestCallback>();
  vi.stubGlobal(
    "requestAnimationFrame",
    vi.fn((callback: FrameRequestCallback) => {
      callbacks.set(++id, callback);
      return id;
    }),
  );
  const cancel = vi.fn((frame: number) => callbacks.delete(frame));
  vi.stubGlobal("cancelAnimationFrame", cancel);
  return {
    callbacks,
    cancel,
    next: async () => {
      await act(async () => {
        const frame = [...callbacks.values()];
        callbacks.clear();
        frame.forEach((callback) => callback(0));
      });
    },
  };
}

function storeDesign(name: string, width = 15) {
  const id = `proyectar:shadow:v2:${name}`;
  localStorage.setItem(
    id,
    JSON.stringify({
      version: 2,
      name,
      image: "data:image/png;base64,AA==",
      settings: {
        width,
        height: 15,
        depth: 6,
        lightPercent: 50,
        radius: 55,
        thickness: 2,
        margin: 3,
        detail: 160,
      },
    }),
  );
  return id;
}

test("los ejemplos muestran carga y solo se aplica el último diseño seleccionado", async () => {
  const frames = detailFrames();
  render(<ShadowEditor />);
  fireEvent.click(
    screen.getByRole("button", { name: "Diseñador de patrones" }),
  );
  const context = HTMLCanvasElement.prototype.getContext("2d")!;
  vi.mocked(context.fillText).mockClear();
  vi.mocked(context.ellipse).mockClear();
  fireEvent.click(screen.getByRole("button", { name: "Flor" }));
  fireEvent.click(screen.getByRole("button", { name: "Texto" }));
  expect(
    screen.getByRole("progressbar", { name: "Cargando diseño…" }),
  ).toBeTruthy();
  expect(
    (screen.getByRole("button", { name: "Guardar" }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);
  expect(frames.callbacks.size).toBe(1);
  await frames.next();
  expect(screen.getByText("Cargando diseño…")).toBeTruthy();
  await frames.next();
  await screen.findByText("Diseño actualizado");
  expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe(
    "100",
  );
  expect(context.fillText).toHaveBeenCalledWith("LUZ", 0, -8);
  expect(context.ellipse).not.toHaveBeenCalled();
  expect(
    (screen.getByRole("button", { name: "Guardar" }) as HTMLButtonElement)
      .disabled,
  ).toBe(false);
});

test("abrir diseños guardados espera la imagen y descarta una carga anterior que termina tarde", async () => {
  const frames = detailFrames();
  const first = storeDesign("Primero", 20),
    second = storeDesign("Segundo", 22);
  const decoded: Array<() => void> = [];
  vi.stubGlobal(
    "Image",
    class {
      src = "";
      decode() {
        return new Promise<void>((resolve) => decoded.push(resolve));
      }
    },
  );
  render(<ShadowEditor />);
  const saved = screen.getByRole("combobox", { name: "Diseños guardados" });
  const name = screen.getByRole("textbox", {
    name: "Nombre",
  }) as HTMLInputElement;
  fireEvent.change(saved, { target: { value: first } });
  fireEvent.click(
    screen.getByRole("button", { name: "Aplicar diseño guardado" }),
  );
  expect(screen.getByText("Cargando diseño…")).toBeTruthy();
  await frames.next();
  await frames.next();
  expect(name.value).toBe("Mi cuadro de sombra");
  expect(decoded).toHaveLength(1);
  fireEvent.change(saved, { target: { value: second } });
  fireEvent.click(
    screen.getByRole("button", { name: "Aplicar diseño guardado" }),
  );
  await frames.next();
  await frames.next();
  expect(decoded).toHaveLength(2);
  await act(async () => decoded[1]());
  await screen.findByText("Diseño actualizado");
  expect(name.value).toBe("Segundo");
  expect(
    (screen.getByRole("spinbutton", { name: "Ancho" }) as HTMLInputElement)
      .value,
  ).toBe("22");
  await act(async () => decoded[0]());
  expect(name.value).toBe("Segundo");
  expect(screen.queryByText("Cargando diseño…")).toBeNull();
});

test("una imagen guardada inválida termina la carga con error y conserva el diseño actual", async () => {
  const frames = detailFrames();
  const id = storeDesign("Imagen rota", 25);
  vi.stubGlobal(
    "Image",
    class {
      src = "";
      async decode() {
        throw new Error("No se pudo decodificar la imagen");
      }
    },
  );
  render(<ShadowEditor />);
  fireEvent.change(
    screen.getByRole("combobox", { name: "Diseños guardados" }),
    { target: { value: id } },
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Aplicar diseño guardado" }),
  );
  expect(screen.getByText("Cargando diseño…")).toBeTruthy();
  await frames.next();
  await frames.next();
  expect((await screen.findByRole("alert")).textContent).toContain(
    "No se pudo decodificar",
  );
  expect(screen.queryByRole("progressbar")).toBeNull();
  expect(screen.queryByText("Diseño actualizado")).toBeNull();
  expect(
    (screen.getByRole("textbox", { name: "Nombre" }) as HTMLInputElement).value,
  ).toBe("Mi cuadro de sombra");
  expect(
    (screen.getByRole("spinbutton", { name: "Ancho" }) as HTMLInputElement)
      .value,
  ).toBe("15");
  expect(
    (screen.getByRole("button", { name: "Guardar" }) as HTMLButtonElement)
      .disabled,
  ).toBe(false);
});

test("Muy alto carga con un toast, bloquea descargas hasta terminar y guarda el detalle elegido", async () => {
  const frames = detailFrames();
  render(<ShadowEditor />);
  fireEvent.click(screen.getByText("Ajustes avanzados").closest("summary")!);
  const detail = screen.getByRole("combobox", { name: "Detalle" });
  expect(
    Array.from((detail as HTMLSelectElement).options, (option) => [
      option.text,
      option.value,
    ]),
  ).toEqual([
    ["Bajo", "160"],
    ["Medio", "224"],
    ["Alto", "336"],
    ["Muy alto", "504"],
  ]);
  fireEvent.click(screen.getByRole("button", { name: "Vista 3D" }));
  fireEvent.change(detail, { target: { value: "504" } });
  expect(screen.getByText("Cargando detalles…")).toBeTruthy();
  expect(screen.getByRole("progressbar").hasAttribute("aria-valuenow")).toBe(
    false,
  );
  expect(
    (screen.getByRole("button", { name: "Guardar" }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);
  expect(
    (
      screen.getByRole("button", {
        name: "Descargar STL · 9 piezas",
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(true);
  await frames.next();
  expect(screen.getByText("Cargando detalles…")).toBeTruthy();
  await frames.next();
  await screen.findByText("Detalles actualizados");
  expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe(
    "100",
  );
  expect(
    (
      screen.getByRole("button", {
        name: "Descargar STL · 9 piezas",
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(false);
  fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
  expect(
    JSON.parse(localStorage.getItem("proyectar:shadow:v2:Mi cuadro de sombra")!)
      .settings.detail,
  ).toBe(504);
}, 15000);

test("un cambio rápido de detalle aplica solo la última selección y cancela los cuadros pendientes al desmontar", async () => {
  const frames = detailFrames();
  const { unmount } = render(<ShadowEditor />);
  fireEvent.click(screen.getByText("Ajustes avanzados").closest("summary")!);
  const detail = screen.getByRole("combobox", { name: "Detalle" });
  fireEvent.change(detail, { target: { value: "336" } });
  fireEvent.change(detail, { target: { value: "224" } });
  expect(frames.callbacks.size).toBe(1);
  await frames.next();
  await frames.next();
  await screen.findByText("Detalles actualizados");
  fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
  expect(
    JSON.parse(localStorage.getItem("proyectar:shadow:v2:Mi cuadro de sombra")!)
      .settings.detail,
  ).toBe(224);
  fireEvent.change(detail, { target: { value: "336" } });
  expect(frames.callbacks.size).toBe(1);
  unmount();
  expect(frames.callbacks.size).toBe(0);
});

test("cerrar el toast de carga no cancela el cambio ni vuelve a abrir el aviso al terminar", async () => {
  const frames = detailFrames();
  render(<ShadowEditor />);
  fireEvent.click(screen.getByText("Ajustes avanzados").closest("summary")!);
  fireEvent.change(screen.getByRole("combobox", { name: "Detalle" }), {
    target: { value: "224" },
  });
  fireEvent.click(
    screen.getByRole("button", {
      name: "Cerrar notificación: Cargando detalles…",
    }),
  );
  expect(screen.queryByRole("progressbar")).toBeNull();
  await frames.next();
  await frames.next();
  expect(screen.queryByText("Detalles actualizados")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
  expect(
    JSON.parse(localStorage.getItem("proyectar:shadow:v2:Mi cuadro de sombra")!)
      .settings.detail,
  ).toBe(224);
});

test("importar otro proyecto cancela el cambio de detalle pendiente", async () => {
  const frames = detailFrames();
  const { container } = render(<ShadowEditor />);
  fireEvent.click(screen.getByText("Ajustes avanzados").closest("summary")!);
  fireEvent.change(screen.getByRole("combobox", { name: "Detalle" }), {
    target: { value: "336" },
  });
  const project = {
    version: 2,
    name: "Otro detalle",
    image: "data:image/png;base64,AA==",
    settings: {
      width: 15,
      height: 15,
      depth: 6,
      lightPercent: 50,
      radius: 55,
      thickness: 2,
      margin: 3,
      detail: 96,
    },
  };
  const file = new File([JSON.stringify(project)], "detalle.json", {
    type: "application/json",
  });
  Object.defineProperty(file, "text", {
    value: async () => JSON.stringify(project),
  });
  fireEvent.change(
    container.querySelector('input[type="file"][accept^=".json"]')!,
    { target: { files: [file] } },
  );
  expect(screen.getByText("Cargando diseño…")).toBeTruthy();
  await frames.next();
  await frames.next();
  await screen.findByRole("button", { name: "Cargar imagen" });
  expect(frames.callbacks.size).toBe(0);
  expect(screen.queryByText("Cargando detalles…")).toBeNull();
  expect(
    (screen.getByRole("combobox", { name: "Detalle" }) as HTMLSelectElement)
      .value,
  ).toBe("160");
});

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
  expect(
    screen.getAllByRole("button", { name: /^Descargar SVG del panel/ }),
  ).toHaveLength(4);

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

test("los ajustes técnicos comienzan plegados y conservan valores al cerrar y guardar", () => {
  const { container } = render(<ShadowEditor />);
  const projectBar = screen.getByRole("region", {
    name: "Proyecto y archivos",
  });
  const steps = screen.getByRole("navigation", {
    name: "Recorrido del editor",
  });
  expect(
    projectBar.compareDocumentPosition(steps) &
      Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
  const advanced = screen.getByText("Ajustes avanzados").closest("details")!;
  expect(advanced.open).toBe(false);
  fireEvent.click(screen.getByRole("button", { name: "Vista 3D" }));
  const lighting = screen.getByRole("region", { name: "Prepará el armado" });
  const download = screen.getByRole("button", {
    name: "Descargar STL · 9 piezas",
  });
  const preview = container.querySelector(".shadow-three-stage")!;
  expect(
    preview.compareDocumentPosition(lighting) &
      Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
  expect(
    lighting.compareDocumentPosition(download) &
      Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
  for (const details of container.querySelectorAll<HTMLDetailsElement>(
    ".shadow-settings-disclosure",
  ))
    expect(details.open).toBe(false);
  const starSummary = screen.getByText("Estrella y LED");
  fireEvent.click(starSummary);
  const star = screen.getByRole("spinbutton", {
    name: "Espesor de la estrella",
  }) as HTMLInputElement;
  fireEvent.change(star, { target: { value: "1.5" } });
  fireEvent.blur(star);
  fireEvent.click(starSummary);
  expect(starSummary.closest("details")!.open).toBe(false);
  fireEvent.click(screen.getByText("Holguras y encastres"));
  fireEvent.change(
    screen.getByRole("spinbutton", { name: "Holgura de ajuste" }),
    { target: { value: "0.4" } },
  );
  fireEvent.click(screen.getByText("Holguras y encastres"));
  fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
  const saved = JSON.parse(
    localStorage.getItem("proyectar:shadow:v2:Mi cuadro de sombra")!,
  );
  expect(saved.fabrication.modular.starThickness).toBe(1.5);
  expect(saved.fabrication.clearance).toBe(0.4);
  fireEvent.click(starSummary);
  expect(star.value).toBe("1.5");
  expect(
    screen.getByText(/No conectes USB a las pilas;/).closest("details"),
  ).toBeNull();
  const technical = screen
    .getByText("Cómo interpretar el modelo y la proyección")
    .closest("details")!;
  expect(technical.open).toBe(false);
  expect(
    download.compareDocumentPosition(technical) &
      Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
});

test("la barra de dibujo expresa la herramienta activa y conserva herramientas al cambiar de paso", () => {
  const { container } = render(<ShadowEditor />);
  fireEvent.click(
    screen.getByRole("button", { name: "Diseñador de patrones" }),
  );
  const tools = screen.getByRole("group", { name: "Herramientas de dibujo" });
  const canvas = screen.getByLabelText("Dibujá el patrón aquí");
  expect(
    tools.compareDocumentPosition(canvas) & Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Borrar" }));
  fireEvent.change(screen.getByRole("slider", { name: "Tamaño del pincel" }), {
    target: { value: "32" },
  });
  expect(
    screen.getByRole("button", { name: "Borrar" }).getAttribute("aria-pressed"),
  ).toBe("true");
  fireEvent.click(screen.getByRole("button", { name: "Vista 3D" }));
  fireEvent.click(screen.getByRole("button", { name: "Volver al diseño" }));
  expect(
    screen.getByRole("button", { name: "Borrar" }).getAttribute("aria-pressed"),
  ).toBe("true");
  expect(
    (
      screen.getByRole("slider", {
        name: "Tamaño del pincel",
      }) as HTMLInputElement
    ).value,
  ).toBe("32");
  expect(container.querySelectorAll(".shadow-mask-grid article")).toHaveLength(
    4,
  );
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
    await screen.findByText("Diseño actualizado");
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
  await screen.findByText("Diseño actualizado");
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
    screen.getByRole("button", { name: "Aplicar diseño guardado" }),
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
    screen.getByRole("button", { name: "Aplicar diseño guardado" }),
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
        name: "Descargar STL · 9 piezas",
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
    screen.getByRole("button", { name: "Descargar ZIP · 9 STL" }),
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
  expect(screen.getByRole("status").textContent).toContain("9 STL separados");
  expect(active!.terminate).toHaveBeenCalled();
  expect((format as HTMLSelectElement).disabled).toBe(false);
  // A failed export must release the controls and permit a retry.
  fireEvent.change(format, { target: { value: "combined" } });
  fireEvent.click(
    screen.getByRole("button", { name: "Descargar STL · 9 piezas" }),
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
