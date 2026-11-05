// @vitest-environment jsdom
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import Home from "../src/app/page";
import { Shell } from "../src/components/shell";

const currentPath = vi.hoisted(() => ({ value: "/" }));
vi.mock("next/navigation", () => ({ usePathname: () => currentPath.value }));

let desktopMedia: EventTarget & { matches: boolean };
beforeEach(() => {
  currentPath.value = "/";
  desktopMedia = Object.assign(new EventTarget(), { matches: false });
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => desktopMedia),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

test("el botón anuncia el estado y controla la navegación existente", () => {
  render(
    <Shell>
      <p>Contenido</p>
    </Shell>,
  );
  const button = screen.getByRole("button", {
    name: "Abrir menú de navegación",
  });
  const nav = screen.getByRole("navigation", { name: "Navegación principal" });
  expect(button.getAttribute("aria-expanded")).toBe("false");
  expect(button.getAttribute("aria-controls")).toBe(nav.id);

  fireEvent.click(button);
  expect(
    screen.getByRole("button", { name: "Cerrar menú de navegación" }),
  ).toBe(button);
  expect(button.getAttribute("aria-expanded")).toBe("true");
  expect(nav.classList.contains("is-open")).toBe(true);
  expect(
    within(nav)
      .getAllByRole("link")
      .map((link) => link.getAttribute("href")),
  ).toEqual(["/", "/cuadros", "/lamparas"]);

  fireEvent.click(button);
  expect(button.getAttribute("aria-expanded")).toBe("false");
  expect(nav.classList.contains("is-open")).toBe(false);
});

test.each(["Estudio", "Cuadros de sombra", "Lámparas con fotos"])(
  "seleccionar %s cierra el menú incluso si el destino ya está activo",
  (label) => {
    render(
      <Shell>
        <p>Contenido</p>
      </Shell>,
    );
    const button = screen.getByRole("button", {
      name: "Abrir menú de navegación",
    });
    const nav = screen.getByRole("navigation", {
      name: "Navegación principal",
    });
    // Prevent jsdom navigation while allowing the link's React handler to run.
    nav.addEventListener("click", (event) => event.preventDefault());
    fireEvent.click(button);
    fireEvent.click(within(nav).getByRole("link", { name: label }));
    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(button);
  },
);

test("Escape cierra desde un enlace y devuelve el foco al botón", () => {
  render(
    <Shell>
      <p>Contenido</p>
    </Shell>,
  );
  const button = screen.getByRole("button", {
    name: "Abrir menú de navegación",
  });
  fireEvent.click(button);
  const link = within(
    screen.getByRole("navigation", { name: "Navegación principal" }),
  ).getByRole("link", { name: "Estudio" });
  link.focus();
  fireEvent.keyDown(link, { key: "Escape" });
  expect(button.getAttribute("aria-expanded")).toBe("false");
  expect(document.activeElement).toBe(button);
});

test("un cambio de ruta o pasar a escritorio restablece el menú cerrado", () => {
  const { rerender } = render(
    <Shell>
      <p>Contenido</p>
    </Shell>,
  );
  const button = screen.getByRole("button", {
    name: "Abrir menú de navegación",
  });
  fireEvent.click(button);
  currentPath.value = "/lamparas";
  rerender(
    <Shell>
      <p>Otro contenido</p>
    </Shell>,
  );
  expect(button.getAttribute("aria-expanded")).toBe("false");

  fireEvent.click(button);
  act(() => {
    desktopMedia.matches = true;
    desktopMedia.dispatchEvent(new Event("change"));
  });
  expect(button.getAttribute("aria-expanded")).toBe("false");
});

test("la portada ofrece acceso a los dos editores y explica el flujo", () => {
  currentPath.value = "/";
  render(<Home />);

  const main = screen.getByRole("main");
  expect(
    within(main)
      .getByRole("link", { name: /Cuadros de sombra/ })
      .getAttribute("href"),
  ).toBe("/cuadros");
  expect(
    within(main)
      .getByRole("link", { name: /Lámparas con fotos/ })
      .getAttribute("href"),
  ).toBe("/lamparas");
  expect(
    within(main).getByRole("heading", {
      name: /Una imagen.*Otra forma de iluminar/,
    }),
  ).toBeTruthy();
  expect(within(main).getByText(/No se suben a un servidor/)).toBeTruthy();
});

test("la navegación indica la ruta activa sin marcar las demás", () => {
  currentPath.value = "/lamparas";
  render(
    <Shell>
      <p>Contenido</p>
    </Shell>,
  );

  const logo = within(screen.getByRole("banner")).getByRole("img", {
    name: "ProyectAR",
  });
  expect(decodeURIComponent(logo.getAttribute("src") ?? "")).toContain(
    "/assets/Logo-ProyectAR.png",
  );
  const footerLogo = within(screen.getByRole("contentinfo")).getByRole("img", {
    name: "ProyectAR",
  });
  expect(decodeURIComponent(footerLogo.getAttribute("src") ?? "")).toContain(
    "/assets/Logo-ProyectAR.png",
  );
  const nav = screen.getByRole("navigation", { name: "Navegación principal" });
  expect(
    within(nav)
      .getByRole("link", { name: "Lámparas con fotos" })
      .getAttribute("aria-current"),
  ).toBe("page");
  expect(
    within(nav)
      .getByRole("link", { name: "Estudio" })
      .hasAttribute("aria-current"),
  ).toBe(false);
  expect(
    within(nav)
      .getByRole("link", { name: "Cuadros de sombra" })
      .hasAttribute("aria-current"),
  ).toBe(false);
  expect(within(screen.getByRole("main")).getByText("Contenido")).toBeTruthy();
});
