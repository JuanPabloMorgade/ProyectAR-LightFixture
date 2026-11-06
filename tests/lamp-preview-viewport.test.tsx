// @vitest-environment jsdom
import { afterEach, expect, test, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { PreviewViewport } from "../src/features/lithophane/preview-viewport";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  Reflect.deleteProperty(HTMLElement.prototype, "requestFullscreen");
  Reflect.deleteProperty(document, "fullscreenElement");
  Reflect.deleteProperty(document, "exitFullscreen");
});

test("native fullscreen keeps the same viewer and reacts to browser Escape", async () => {
  let fullscreen: Element | null = null;
  Object.defineProperty(document, "fullscreenElement", {
    configurable: true,
    get: () => fullscreen,
  });
  const request = vi.fn(async function (this: HTMLElement) {
    fullscreen = this;
    document.dispatchEvent(new Event("fullscreenchange"));
  });
  Object.defineProperty(HTMLElement.prototype, "requestFullscreen", {
    configurable: true,
    value: request,
  });
  const exit = vi.fn(async () => {
    fullscreen = null;
    document.dispatchEvent(new Event("fullscreenchange"));
  });
  Object.defineProperty(document, "exitFullscreen", {
    configurable: true,
    value: exit,
  });
  render(
    <PreviewViewport controls={<button>Luz</button>}>
      <div className="preview-stage">
        <canvas data-testid="viewer" />
      </div>
    </PreviewViewport>,
  );
  const canvas = screen.getByTestId("viewer");
  fireEvent.click(
    screen.getByRole("button", { name: "Ver en pantalla completa" }),
  );
  await screen.findByRole("button", { name: "Salir de pantalla completa" });
  expect(request).toHaveBeenCalledOnce();
  expect(screen.getByTestId("viewer")).toBe(canvas);
  fireEvent.click(
    screen.getByRole("button", { name: "Salir de pantalla completa" }),
  );
  await screen.findByRole("button", { name: "Ver en pantalla completa" });
  expect(exit).toHaveBeenCalledOnce();
  fireEvent.click(
    screen.getByRole("button", { name: "Ver en pantalla completa" }),
  );
  await screen.findByRole("button", { name: "Salir de pantalla completa" });
  act(() => {
    fullscreen = null;
    document.dispatchEvent(new Event("fullscreenchange"));
  });
  expect(
    screen.getByRole("button", { name: "Ver en pantalla completa" }),
  ).toBeTruthy();
  expect(screen.getByTestId("viewer")).toBe(canvas);
});

test("denied fullscreen expands in-window, traps focus, exits with Escape and restores page", async () => {
  Object.defineProperty(HTMLElement.prototype, "requestFullscreen", {
    configurable: true,
    value: vi.fn().mockRejectedValue(new Error("Denied")),
  });
  render(
    <>
      <button>Otra acción</button>
      <PreviewViewport controls={<button>Luz</button>}>
        <div className="preview-stage">
          <canvas data-testid="viewer" />
        </div>
      </PreviewViewport>
    </>,
  );
  const other = screen.getByRole("button", { name: "Otra acción" });
  const canvas = screen.getByTestId("viewer");
  fireEvent.click(
    screen.getByRole("button", { name: "Ver en pantalla completa" }),
  );
  const dialog = await screen.findByRole("dialog", { name: "Vista previa 3D" });
  expect(document.body.style.overflow).toBe("hidden");
  expect(other.inert).toBe(true);
  const close = screen.getByRole("button", {
    name: "Salir de pantalla completa",
  });
  expect(document.activeElement).toBe(close);
  fireEvent.keyDown(close, { key: "Tab" });
  expect(document.activeElement).toBe(
    screen.getByRole("button", { name: "Luz" }),
  );
  fireEvent.keyDown(dialog, { key: "Escape" });
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(document.body.style.overflow).toBe("");
  expect(other.inert).toBeFalsy();
  expect(document.activeElement).toBe(
    screen.getByRole("button", { name: "Ver en pantalla completa" }),
  );
  expect(screen.getByTestId("viewer")).toBe(canvas);
});
