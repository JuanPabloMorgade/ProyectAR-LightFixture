// @vitest-environment jsdom
import { afterEach, expect, test, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import Home from "../src/app/page";
import { Shell } from "../src/components/shell";

const currentPath = vi.hoisted(() => ({ value: "/" }));
vi.mock("next/navigation", () => ({ usePathname: () => currentPath.value }));

afterEach(cleanup);

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

  const logo = screen.getByRole("img", { name: "ProyectAR" });
  expect(decodeURIComponent(logo.getAttribute("src") ?? "")).toContain(
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
