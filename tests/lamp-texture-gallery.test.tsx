// @vitest-environment jsdom
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { useState } from "react";
import { TextureCustomizer } from "../src/features/lithophane/texture-customizer";
import {
  defaultTextureOptions,
  frameTextures,
} from "../src/features/lithophane/frame-texture-config";

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
});
afterEach(cleanup);

test("filtering preserves the draft, selected label, corners-first order and reset", () => {
  const apply = vi.fn(),
    cancel = vi.fn();
  function Harness() {
    const [options, setOptions] = useState(defaultTextureOptions);
    return (
      <TextureCustomizer
        options={options}
        onChange={setOptions}
        onApply={() => apply(options)}
        onCancel={cancel}
        preview={<div>Modelo</div>}
        busy={false}
        error=""
      />
    );
  }
  const { container } = render(<Harness />);
  const cards = () =>
    [
      ...container.querySelectorAll(".texture-card input"),
    ] as HTMLInputElement[];
  expect(cards()).toHaveLength(frameTextures.length);
  expect(container.querySelector("legend")?.textContent).toBe(
    "Esquinas del marco",
  );
  fireEvent.click(screen.getByRole("radio", { name: "Hexagonal" }));
  fireEvent.click(screen.getByRole("button", { name: "Orgánicas" }));
  expect(screen.queryByRole("radio", { name: "Hexagonal" })).toBeNull();
  expect(screen.getByRole("status").textContent).toContain("Hexagonal");
  fireEvent.click(screen.getByRole("button", { name: "Minimalistas" }));
  expect(cards().map((x) => x.value)).toEqual([
    "none",
    "lines",
    "waves",
    "dots",
  ]);
  fireEvent.click(screen.getByRole("button", { name: "Todas" }));
  expect(
    (screen.getByRole("radio", { name: "Hexagonal" }) as HTMLInputElement)
      .checked,
  ).toBe(true);
  fireEvent.click(screen.getByRole("radio", { name: "Redondeadas" }));
  fireEvent.click(screen.getByRole("button", { name: "Aplicar textura" }));
  expect(apply).toHaveBeenCalledWith({
    ...defaultTextureOptions,
    frameTexture: "hexagonal",
    frameCornerRounding: 50,
  });
  fireEvent.click(screen.getByRole("button", { name: "Restablecer" }));
  expect(
    within(screen.getByRole("dialog")).getByRole("status").textContent,
  ).toContain("Sin textura");
  fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
  expect(cancel).toHaveBeenCalledOnce();
});
