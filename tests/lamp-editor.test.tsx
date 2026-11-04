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
import LampEditor from "../src/features/lithophane/editor";
import { defaults } from "../src/features/lithophane/mesh";
import {
  LAMP_PROJECT_PREFIX,
  LAMP_LAST_KEY,
  LAMP_LEGACY_KEY,
} from "../src/features/lithophane/projects";
import { mockCanvasAndImages } from "./browser-mocks";
import { createHousingParts } from "../src/features/lithophane/housing";
import { createSphereCap } from "../src/features/lithophane/sphere-cap";
import { createMesh, type Settings } from "../src/features/lithophane/mesh";
import {
  createPrintStand,
  hasPrintStand,
} from "../src/features/lithophane/print-stand";

vi.mock("../src/features/lithophane/viewer", () => ({
  default: ({
    printSupport,
    housingParts,
    positions,
    sphereCap,
  }: {
    printSupport?: unknown;
    housingParts?: unknown[];
    positions: Float32Array;
    sphereCap?: unknown;
  }) => {
    // Measure the narrowest neck bore below the chamfered entrance.
    const topY = positions.at(-2)!;
    let radius = Infinity;
    for (let i = positions.length / 2; i < positions.length; i += 3)
      if (positions[i + 1] >= topY - 6.9)
        radius = Math.min(radius, Math.hypot(positions[i], positions[i + 2]));
    return (
      <div
        aria-label="Modelo 3D de prueba"
        data-support={!!printSupport}
        data-housing={housingParts?.length ?? 0}
        data-cap={!!sphereCap}
        data-opening={(radius * 2).toFixed(1)}
      />
    );
  },
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
            sphereCap:
              data.settings.shape === "sphere"
                ? createSphereCap(data.settings)
                : null,
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

async function openSavedDesign(id = localStorage.getItem(LAMP_LAST_KEY)!) {
  const open = () =>
    screen.getByRole("button", { name: "Abrir diseño guardado" });
  await waitFor(() =>
    expect(
      screen
        .getByRole("button", { name: /^Guardar$/ })
        .hasAttribute("disabled"),
    ).toBe(false),
  );
  fireEvent.change(
    screen.getByRole("combobox", { name: "Diseños guardados" }),
    { target: { value: id } },
  );
  fireEvent.click(open());
  await screen.findByText(/Diseño cargado correctamente/);
  await waitFor(
    () =>
      expect(
        screen
          .getByRole("button", { name: /^Guardar$/ })
          .hasAttribute("disabled"),
      ).toBe(false),
    { timeout: 10000 },
  );
}

test.each([0, 1, 2])(
  "con %s diseños guardados empieza con el ejemplo y solo aplica al pulsar la carpeta",
  async (count) => {
    for (let i = 1; i <= count; i++) {
      const project = {
        version: 1,
        name: `Guardado ${i}`,
        photo: "data:image/png;base64,AA==",
        settings: { ...defaults, shape: "sphere", width: 80, resolution: 40 },
      };
      localStorage.setItem(
        LAMP_PROJECT_PREFIX + project.name,
        JSON.stringify(project),
      );
      localStorage.setItem(LAMP_LAST_KEY, LAMP_PROJECT_PREFIX + project.name);
    }
    render(<LampEditor />);
    const save = () => screen.getByRole("button", { name: /^Guardar$/ });
    await waitFor(() => expect(save().hasAttribute("disabled")).toBe(false));
    const select = screen.getByRole("combobox", {
      name: "Diseños guardados",
    }) as HTMLSelectElement;
    const name = screen.getByRole("textbox", {
      name: "Nombre del proyecto",
    }) as HTMLInputElement;
    const variant = screen.getByRole("combobox", {
      name: "Variante de litofanía",
    }) as HTMLSelectElement;
    const folder = screen.getByRole("button", {
      name: "Abrir diseño guardado",
    });
    expect(select.value).toBe("");
    expect(select.options.length).toBe(count + 1);
    expect(folder.hasAttribute("disabled")).toBe(true);
    expect(name.value).toBe("Mi primera litofanía");
    expect(variant.value).toBe("0");
    expect(
      (screen.getByRole("combobox", { name: "Detalle" }) as HTMLSelectElement)
        .value,
    ).toBe("160");
    expect(screen.queryByText(/Diseño cargado correctamente/)).toBeNull();
    if (!count) return;
    const id = LAMP_PROJECT_PREFIX + "Guardado 1";
    const raw = localStorage.getItem(id);
    fireEvent.change(select, { target: { value: id } });
    expect(folder.hasAttribute("disabled")).toBe(false);
    expect(name.value).toBe("Mi primera litofanía");
    expect(variant.value).toBe("0");
    fireEvent.click(folder);
    await screen.findByText(/Diseño cargado correctamente/);
    await waitFor(() => expect(save().hasAttribute("disabled")).toBe(false));
    expect(name.value).toBe("Guardado 1");
    expect(variant.value).toBe("sphere");
    expect(
      (
        screen.getByRole("spinbutton", {
          name: "Diámetro de la esfera",
        }) as HTMLInputElement
      ).value,
    ).toBe("80");
    expect(localStorage.getItem(id)).toBe(raw);
  },
);

test("guarda varios diseños, abre el elegido y elimina solo tras confirmar", async () => {
  const first = render(<LampEditor />);
  const save = () => screen.getByRole("button", { name: /^Guardar$/ });
  const name = () =>
    screen.getByRole("textbox", { name: "Nombre del proyecto" });
  const selected = () =>
    screen.getByRole("combobox", {
      name: "Diseños guardados",
    }) as HTMLSelectElement;
  await waitFor(() => expect(save().hasAttribute("disabled")).toBe(false));
  expect(
    screen
      .getByRole("button", { name: "Abrir diseño guardado" })
      .hasAttribute("disabled"),
  ).toBe(true);
  fireEvent.change(name(), { target: { value: "Primero" } });
  fireEvent.click(save());
  fireEvent.change(name(), { target: { value: "Segundo" } });
  fireEvent.change(screen.getByRole("spinbutton", { name: "Ancho / arco" }), {
    target: { value: "90" },
  });
  await waitFor(() => expect(save().hasAttribute("disabled")).toBe(false));
  fireEvent.click(save());
  expect(selected().options.length).toBe(3);
  expect(selected().value).toBe(LAMP_PROJECT_PREFIX + "Segundo");
  fireEvent.change(selected(), {
    target: { value: LAMP_PROJECT_PREFIX + "Primero" },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Abrir diseño guardado" }),
  );
  await waitFor(() =>
    expect((name() as HTMLInputElement).value).toBe("Primero"),
  );
  expect(screen.getByRole("status").textContent).toContain(
    "Diseño cargado correctamente.",
  );
  expect(screen.getByRole("status").textContent).toContain("Detalle");
  await waitFor(() => expect(save().hasAttribute("disabled")).toBe(false));
  expect(
    (
      screen.getByRole("spinbutton", {
        name: "Ancho / arco",
      }) as HTMLInputElement
    ).value,
  ).toBe("120");
  fireEvent.click(save());
  expect(selected().options.length).toBe(3); // saving the same name updates it
  first.unmount();
  render(<LampEditor />);
  await openSavedDesign();
  await waitFor(() => expect(save().hasAttribute("disabled")).toBe(false));
  expect(screen.getByRole("status").textContent).toContain(
    "Diseño cargado correctamente.",
  );
  expect((name() as HTMLInputElement).value).toBe("Primero");
  const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
  const remove = () =>
    screen.getByRole("button", { name: "Eliminar diseño guardado" });
  fireEvent.click(remove());
  expect(localStorage.getItem(LAMP_PROJECT_PREFIX + "Primero")).not.toBeNull();
  confirm.mockReturnValue(true);
  fireEvent.click(remove());
  expect(localStorage.getItem(LAMP_PROJECT_PREFIX + "Primero")).toBeNull();
  expect(localStorage.getItem(LAMP_PROJECT_PREFIX + "Segundo")).not.toBeNull();
  expect(localStorage.getItem(LAMP_LAST_KEY)).toBeNull();
  expect(selected().value).toBe("");
  expect(selected().options.length).toBe(2);
});

test("recupera el guardado anterior y lo conserva al guardar con otro nombre", async () => {
  const legacy = {
    version: 1,
    name: "Anterior",
    settings: defaults,
    photo: "data:image/png;base64,AA==",
  };
  localStorage.setItem(LAMP_LEGACY_KEY, JSON.stringify(legacy));
  render(<LampEditor />);
  await openSavedDesign(LAMP_LEGACY_KEY);
  const save = () => screen.getByRole("button", { name: /^Guardar$/ });
  await waitFor(() => expect(save().hasAttribute("disabled")).toBe(false));
  expect(
    (
      screen.getByRole("textbox", {
        name: "Nombre del proyecto",
      }) as HTMLInputElement
    ).value,
  ).toBe("Anterior");
  fireEvent.change(
    screen.getByRole("textbox", { name: "Nombre del proyecto" }),
    { target: { value: "Copia" } },
  );
  fireEvent.click(save());
  expect(localStorage.getItem(LAMP_LEGACY_KEY)).toBe(JSON.stringify(legacy));
  expect(localStorage.getItem(LAMP_PROJECT_PREFIX + "Copia")).not.toBeNull();
  fireEvent.change(
    screen.getByRole("combobox", { name: "Diseños guardados" }),
    { target: { value: LAMP_LEGACY_KEY } },
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Abrir diseño guardado" }),
  );
  await waitFor(() =>
    expect(
      (
        screen.getByRole("textbox", {
          name: "Nombre del proyecto",
        }) as HTMLInputElement
      ).value,
    ).toBe("Anterior"),
  );
  await waitFor(() => expect(save().hasAttribute("disabled")).toBe(false));
  fireEvent.click(save());
  expect(localStorage.getItem(LAMP_PROJECT_PREFIX + "Anterior")).not.toBeNull();
  expect(localStorage.getItem(LAMP_LEGACY_KEY)).toBeNull();
});

test("un fallo de almacenamiento no reemplaza el guardado anterior", async () => {
  const raw = JSON.stringify({
    version: 1,
    name: "Anterior",
    settings: defaults,
    photo: "data:image/png;base64,AA==",
  });
  localStorage.setItem(LAMP_LEGACY_KEY, raw);
  render(<LampEditor />);
  await openSavedDesign(LAMP_LEGACY_KEY);
  const save = () => screen.getByRole("button", { name: /^Guardar$/ });
  await waitFor(() => expect(save().hasAttribute("disabled")).toBe(false));
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new DOMException("quota", "QuotaExceededError");
  });
  fireEvent.click(save());
  expect(localStorage.getItem(LAMP_LEGACY_KEY)).toBe(raw);
  expect(screen.getByText(/No se pudo guardar en este navegador/)).toBeTruthy();
});

test("la caja opcional se guarda, restaura y descarga como kit; la esfera conserva su propia geometría", async () => {
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
        .getByRole("button", { name: /^Guardar$/ })
        .hasAttribute("disabled"),
    ).toBe(false),
  );
  fireEvent.change(
    screen.getByRole("combobox", { name: "Variante de litofanía" }),
    { target: { value: "0" } },
  );
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
  fireEvent.click(screen.getByRole("button", { name: /^Guardar$/ }));
  expect(
    JSON.parse(
      localStorage.getItem(localStorage.getItem("proyectar:lamp:last")!)!,
    ).settings.housing,
  ).toEqual({ enabled: true, depth: 30, clearance: 0.3 });
  first.unmount();
  render(<LampEditor />);
  await openSavedDesign();
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
  fireEvent.change(
    screen.getByRole("combobox", { name: "Variante de litofanía" }),
    { target: { value: "sphere" } },
  );
  await waitFor(() =>
    expect(
      screen
        .getByRole("button", { name: "Descargar esfera + tapa · 2 STL" })
        .hasAttribute("disabled"),
    ).toBe(false),
  );
  const toggle = screen.queryByRole("checkbox", {
    name: "Generar caja trasera",
  });
  expect(toggle).toBeNull();
  fireEvent.change(
    screen.getByRole("combobox", { name: "Variante de litofanía" }),
    { target: { value: "120" } },
  );
  await waitFor(() => expect(kit().hasAttribute("disabled")).toBe(false));
});

test("una caja que invade el radio curvo bloquea la descarga y permite corregirla", async () => {
  render(<LampEditor />);
  await waitFor(() =>
    expect(
      screen
        .getByRole("button", { name: /^Guardar$/ })
        .hasAttribute("disabled"),
    ).toBe(false),
  );
  fireEvent.change(
    screen.getByRole("combobox", { name: "Variante de litofanía" }),
    { target: { value: "120" } },
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
        .getByRole("button", { name: /^Guardar$/ })
        .hasAttribute("disabled"),
    ).toBe(false),
  );
  const variants = screen.getByRole("combobox", {
    name: "Variante de litofanía",
  }) as HTMLSelectElement;
  expect(variants.value).toBe("0");
  expect(Array.from(variants.options).map((option) => option.text)).toEqual([
    "Plano",
    "Curvo",
    "Esferas navideñas",
  ]);

  fireEvent.change(
    screen.getByRole("combobox", { name: "Variante de litofanía" }),
    { target: { value: "0" } },
  );
  await waitFor(() =>
    expect(
      screen
        .getByRole("button", { name: /^Guardar$/ })
        .hasAttribute("disabled"),
    ).toBe(false),
  );
  fireEvent.click(screen.getByRole("button", { name: /^Guardar$/ }));

  const saved = JSON.parse(
    localStorage.getItem(localStorage.getItem("proyectar:lamp:last")!)!,
  );
  expect(saved.version).toBe(1);
  expect(saved.settings.angle).toBe(0);
  expect(saved.photo).toMatch(/^data:image\/png;base64,/);
  expect(screen.getByText("Diseño guardado en este navegador.")).toBeTruthy();
});

test("la esfera guarda su diámetro y variante, restaura y descarga un STL propio", async () => {
  const NativeURL = URL;
  vi.stubGlobal(
    "URL",
    class extends NativeURL {
      static createObjectURL = vi.fn(() => "blob:sphere");
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
  const save = () => screen.getByRole("button", { name: /^Guardar$/ });
  await waitFor(() => expect(save().hasAttribute("disabled")).toBe(false));
  fireEvent.change(
    screen.getByRole("combobox", { name: "Variante de litofanía" }),
    { target: { value: "sphere" } },
  );
  fireEvent.change(
    screen.getByRole("spinbutton", { name: "Diámetro de la esfera" }),
    { target: { value: "80" } },
  );
  await waitFor(() => expect(save().hasAttribute("disabled")).toBe(false));
  expect(screen.queryByRole("spinbutton", { name: "Alto" })).toBeNull();
  expect(screen.getByLabelText("Modelo 3D de prueba").dataset.cap).toBe("true");
  expect(
    screen.queryByRole("checkbox", {
      name: "Exportar de pie con soporte removible",
    }),
  ).toBeNull();
  fireEvent.change(
    screen.getByRole("spinbutton", { name: "Abertura para los LED" }),
    { target: { value: "24" } },
  );
  await waitFor(() => expect(save().hasAttribute("disabled")).toBe(false));
  expect(screen.getByLabelText("Modelo 3D de prueba").dataset.opening).toBe(
    "24.0",
  );
  fireEvent.change(screen.getByRole("slider", { name: "Contraste" }), {
    target: { value: "1.3" },
  });
  await waitFor(() => expect(save().hasAttribute("disabled")).toBe(false));
  expect(screen.getByLabelText("Modelo 3D de prueba").dataset.opening).toBe(
    "24.0",
  );
  fireEvent.change(screen.getByRole("spinbutton", { name: "Espesor máx." }), {
    target: { value: "0.7" },
  });
  await screen.findByRole("alert");
  expect(screen.getByLabelText("Modelo 3D de prueba").dataset.opening).toBe(
    "24.0",
  );
  expect(screen.getByText(/Vista anterior/)).toBeTruthy();
  fireEvent.change(screen.getByRole("spinbutton", { name: "Espesor máx." }), {
    target: { value: "3.2" },
  });
  await waitFor(() => expect(save().hasAttribute("disabled")).toBe(false));
  fireEvent.click(
    screen.getByRole("button", { name: "Descargar esfera + tapa · 2 STL" }),
  );
  expect(filename).toMatch(/-esfera-navidena.zip$/);
  fireEvent.click(save());
  const stored = JSON.parse(
    localStorage.getItem(localStorage.getItem("proyectar:lamp:last")!)!,
  );
  expect(stored.settings.shape).toBe("sphere");
  expect(stored.settings.width).toBe(80);
  expect(stored.settings.sphereOpeningDiameter).toBe(24);
  expect(screen.getByText(/el color frío no garantiza/)).toBeTruthy();
  expect(
    screen.getByText(/1500 × 417 px/, { selector: ".field-hint" }),
  ).toBeTruthy();
  first.unmount();
  render(<LampEditor />);
  await openSavedDesign();
  await waitFor(() => expect(save().hasAttribute("disabled")).toBe(false));
  expect(
    (
      screen.getByRole("combobox", {
        name: "Variante de litofanía",
      }) as HTMLSelectElement
    ).value,
  ).toBe("sphere");
  expect(
    (
      screen.getByRole("spinbutton", {
        name: "Diámetro de la esfera",
      }) as HTMLInputElement
    ).value,
  ).toBe("80");
});

test("un error muestra toast persistente; cerrarlo no permite descargar y corregirlo actualiza el modelo", async () => {
  render(<LampEditor />);
  const save = () => screen.getByRole("button", { name: /^Guardar$/ });
  await waitFor(() => expect(save().hasAttribute("disabled")).toBe(false));
  fireEvent.change(
    screen.getByRole("combobox", { name: "Variante de litofanía" }),
    { target: { value: "sphere" } },
  );
  await waitFor(() => expect(save().hasAttribute("disabled")).toBe(false));
  const opening = screen.getByRole("spinbutton", {
    name: "Abertura para los LED",
  });
  const diameter = screen.getByRole("spinbutton", {
    name: "Diámetro de la esfera",
  });
  const download = () =>
    screen.getByRole("button", { name: "Descargar esfera + tapa · 2 STL" });
  fireEvent.change(opening, { target: { value: "30" } });
  fireEvent.change(diameter, { target: { value: "30" } });
  const toast = await screen.findByRole("alert");
  expect(toast.closest(".ui-toast-error")).not.toBeNull();
  expect(toast.textContent).toContain("al menos 38 mm");
  expect(download().hasAttribute("disabled")).toBe(true);
  fireEvent.click(
    screen.getByRole("button", {
      name: "Cerrar notificación: No se pudo completar la acción",
    }),
  );
  expect(screen.queryByRole("alert")).toBeNull();
  expect(download().hasAttribute("disabled")).toBe(true);
  fireEvent.change(diameter, { target: { value: "80" } });
  await waitFor(() => expect(download().hasAttribute("disabled")).toBe(false));
  expect(screen.getByLabelText("Modelo 3D de prueba").dataset.opening).toBe(
    "30.0",
  );
  expect(screen.queryByText(/Vista anterior/)).toBeNull();
  fireEvent.change(opening, { target: { value: "31" } });
  expect((await screen.findByRole("alert")).textContent).toContain(
    "entre 8 y 30 mm",
  );
  fireEvent.change(opening, { target: { value: "20" } });
  await waitFor(() => expect(download().hasAttribute("disabled")).toBe(false));
  expect(screen.queryByRole("alert")).toBeNull();
});

test("cargar imágenes consecutivas muestra el aviso de Detalle y reinicia sus seis segundos", async () => {
  const NativeURL = URL;
  vi.stubGlobal(
    "URL",
    class extends NativeURL {
      static createObjectURL = vi.fn(() => "blob:photo");
      static revokeObjectURL = vi.fn();
    },
  );
  const { container, unmount } = render(<LampEditor />);
  await waitFor(() =>
    expect(
      screen
        .getByRole("button", { name: /^Guardar$/ })
        .hasAttribute("disabled"),
    ).toBe(false),
  );
  const input = container.querySelector(
    'input[type="file"][accept^="image/png"]',
  ) as HTMLInputElement;
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
  try {
    const upload = async () => {
      await act(async () => {
        fireEvent.change(input, {
          target: {
            files: [new File(["image"], "foto.png", { type: "image/png" })],
          },
        });
      });
    };
    await upload();
    expect(screen.getByRole("status").textContent).toContain(
      "Imagen cargada correctamente",
    );
    expect(screen.getByRole("status").textContent).toContain("Detalle");
    expect(
      screen.getByRole("status").closest(".ui-toast-success"),
    ).not.toBeNull();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    await upload();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5999);
    });
    expect(screen.getByRole("status").textContent).toContain(
      "Imagen cargada correctamente",
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(screen.queryByText(/Imagen cargada correctamente/)).toBeNull();
  } finally {
    unmount();
    vi.useRealTimers();
  }
});

test("importar un diseño muestra el aviso de Detalle y una importación fallida no anuncia éxito", async () => {
  const { container } = render(<LampEditor />);
  await waitFor(() =>
    expect(
      screen
        .getByRole("button", { name: /^Guardar$/ })
        .hasAttribute("disabled"),
    ).toBe(false),
  );
  const input = container.querySelector(
    'input[type="file"][accept^=".json"]',
  ) as HTMLInputElement;
  const file = new File(["json"], "diseno.json", { type: "application/json" });
  Object.defineProperty(file, "text", {
    value: async () =>
      JSON.stringify({
        version: 1,
        name: "Importado",
        settings: defaults,
        photo: "data:image/png;base64,AA==",
      }),
  });
  fireEvent.change(input, { target: { files: [file] } });
  expect(await screen.findByText(/Diseño cargado correctamente/)).toBeTruthy();
  expect(screen.getByRole("status").textContent).toContain("Detalle");
  await waitFor(() =>
    expect(
      screen
        .getByRole("button", { name: /^Guardar$/ })
        .hasAttribute("disabled"),
    ).toBe(false),
  );
  const bad = new File(["{}"], "invalido.json", { type: "application/json" });
  Object.defineProperty(bad, "text", { value: async () => "{}" });
  fireEvent.change(input, { target: { files: [bad] } });
  await screen.findByRole("alert");
  expect(screen.queryByText(/cargado correctamente/)).toBeNull();
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

test.each([512, 640])(
  "Ultra se guarda a 512 y recupera esferas anteriores de %s puntos",
  async (savedResolution) => {
    const resolution = 512;
    const first = render(<LampEditor />);
    const save = () => screen.getByRole("button", { name: /^Guardar$/ });
    await waitFor(() => expect(save().hasAttribute("disabled")).toBe(false));
    expect(
      screen.queryByRole("option", { name: "Ultra · 512 puntos" }),
    ).toBeNull();
    fireEvent.change(
      screen.getByRole("combobox", { name: "Variante de litofanía" }),
      { target: { value: "sphere" } },
    );
    fireEvent.change(
      screen.getByRole("spinbutton", { name: "Diámetro de la esfera" }),
      { target: { value: "80" } },
    );
    fireEvent.change(screen.getByRole("combobox", { name: "Detalle" }), {
      target: { value: String(resolution) },
    });
    await waitFor(() => expect(save().hasAttribute("disabled")).toBe(false), {
      timeout: 10000,
    });
    expect(screen.getByText(/Ultra genera un STL pesado/)).toBeTruthy();
    expect(
      screen.getByRole("option", { name: "Ultra · 512 puntos" }),
    ).toBeTruthy();
    fireEvent.click(save());
    expect(
      JSON.parse(
        localStorage.getItem(localStorage.getItem("proyectar:lamp:last")!)!,
      ).settings.resolution,
    ).toBe(resolution);
    const savedKey = localStorage.getItem(LAMP_LAST_KEY)!;
    const savedProject = JSON.parse(localStorage.getItem(savedKey)!);
    savedProject.settings.resolution = savedResolution;
    localStorage.setItem(savedKey, JSON.stringify(savedProject));
    first.unmount();
    render(<LampEditor />);
    await openSavedDesign();
    await waitFor(() => expect(save().hasAttribute("disabled")).toBe(false), {
      timeout: 10000,
    });
    expect(
      (screen.getByRole("combobox", { name: "Detalle" }) as HTMLSelectElement)
        .value,
    ).toBe(String(resolution));
    fireEvent.change(
      screen.getByRole("combobox", { name: "Variante de litofanía" }),
      { target: { value: "0" } },
    );
    await waitFor(() => expect(save().hasAttribute("disabled")).toBe(false));
    expect(
      (screen.getByRole("combobox", { name: "Detalle" }) as HTMLSelectElement)
        .value,
    ).toBe("448");
    expect(
      screen.queryByRole("option", { name: "Ultra · 512 puntos" }),
    ).toBeNull();
    expect(
      screen.queryByRole("option", { name: "Ultra · 512 puntos" }),
    ).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
    fireEvent.change(
      screen.getByRole("combobox", { name: "Variante de litofanía" }),
      { target: { value: "sphere" } },
    );
    await waitFor(() => expect(save().hasAttribute("disabled")).toBe(false), {
      timeout: 10000,
    });
    expect(
      (screen.getByRole("combobox", { name: "Detalle" }) as HTMLSelectElement)
        .value,
    ).toBe("512");
  },
  15000,
);

test.each(["0", "120"])(
  "Ultra 448 se guarda y abre en el panel de %s grados",
  async (variant) => {
    const first = render(<LampEditor />);
    const save = () => screen.getByRole("button", { name: /^Guardar$/ });
    await waitFor(() => expect(save().hasAttribute("disabled")).toBe(false));
    fireEvent.change(
      screen.getByRole("combobox", { name: "Variante de litofanía" }),
      { target: { value: variant } },
    );
    expect(
      screen.getByRole("option", { name: "Ultra · 448 puntos" }),
    ).toBeTruthy();
    fireEvent.change(screen.getByRole("combobox", { name: "Detalle" }), {
      target: { value: "448" },
    });
    await waitFor(() => expect(save().hasAttribute("disabled")).toBe(false));
    fireEvent.click(save());
    expect(
      JSON.parse(localStorage.getItem(localStorage.getItem(LAMP_LAST_KEY)!)!)
        .settings.resolution,
    ).toBe(448);
    first.unmount();
    render(<LampEditor />);
    await openSavedDesign();
    expect(
      (screen.getByRole("combobox", { name: "Detalle" }) as HTMLSelectElement)
        .value,
    ).toBe("448");
    expect(
      (
        screen.getByRole("combobox", {
          name: "Variante de litofanía",
        }) as HTMLSelectElement
      ).value,
    ).toBe(variant);
    expect(
      screen.queryByRole("option", { name: "Ultra · 512 puntos" }),
    ).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
  },
);

test("Muy alto guarda y recupera la resolución de 384 puntos", async () => {
  const first = render(<LampEditor />);
  const save = () => screen.getByRole("button", { name: /^Guardar$/ });
  await waitFor(() => expect(save().hasAttribute("disabled")).toBe(false));
  fireEvent.change(screen.getByRole("combobox", { name: "Detalle" }), {
    target: { value: "384" },
  });
  await waitFor(() => expect(save().hasAttribute("disabled")).toBe(false));
  fireEvent.click(save());
  expect(
    JSON.parse(
      localStorage.getItem(localStorage.getItem("proyectar:lamp:last")!)!,
    ).settings.resolution,
  ).toBe(384);
  first.unmount();
  render(<LampEditor />);
  await openSavedDesign();
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
  const save = () => screen.getByRole("button", { name: /^Guardar$/ });
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
    JSON.parse(
      localStorage.getItem(localStorage.getItem("proyectar:lamp:last")!)!,
    ).settings.printStand,
  ).toBe(false);
  first.unmount();
  render(<LampEditor />);
  await openSavedDesign();
  await waitFor(() => expect(save().hasAttribute("disabled")).toBe(false));
  expect(stand().checked).toBe(false);
  expect(viewer().dataset.support).toBe("false");
});
