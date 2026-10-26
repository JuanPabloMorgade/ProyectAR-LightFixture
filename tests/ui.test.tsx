// @vitest-environment jsdom
import { afterEach, expect, test, vi } from "vitest";
import { createRef, useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import {
  Button,
  Checkbox,
  FileInput,
  Modal,
  ModalHeader,
  NumberField,
  RangeField,
  SelectField,
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TextAreaField,
  TextField,
} from "../src/components/ui";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

test("los campos vinculan etiquetas, ayudas y errores y conservan props y refs nativas", () => {
  const ref = createRef<HTMLInputElement>();
  const onChange = vi.fn();
  render(
    <>
      <TextField
        label="Nombre"
        ref={ref}
        description="Elegí un nombre"
        error="Es obligatorio"
        required
        onChange={onChange}
        aria-describedby="extra"
      />
      <span id="extra">Hasta 100 caracteres</span>
      <TextField label="Otro nombre" disabled />
      <SelectField
        label="Detalle"
        defaultValue="high"
        options={[
          { value: "low", label: "Borrador" },
          { value: "high", label: "Alto" },
        ]}
      />
      <TextAreaField label="Notas" rows={4} />
    </>,
  );
  const input = screen.getByRole("textbox", {
    name: "Nombre",
  }) as HTMLInputElement;
  expect(ref.current).toBe(input);
  expect(input.required).toBe(true);
  expect(input.getAttribute("aria-invalid")).toBe("true");
  const descriptions = input
    .getAttribute("aria-describedby")!
    .split(" ")
    .map((id) => document.getElementById(id)?.textContent);
  expect(descriptions).toEqual([
    "Elegí un nombre",
    "Es obligatorio",
    "Hasta 100 caracteres",
  ]);
  fireEvent.change(input, { target: { value: "Mi cuadro" } });
  expect(onChange).toHaveBeenCalledOnce();
  expect(
    (screen.getByRole("textbox", { name: "Otro nombre" }) as HTMLInputElement)
      .disabled,
  ).toBe(true);
  expect(screen.getByRole("textbox", { name: "Otro nombre" }).id).not.toBe(
    input.id,
  );
  expect(
    (screen.getByRole("combobox", { name: "Detalle" }) as HTMLSelectElement)
      .value,
  ).toBe("high");
  expect(
    (screen.getByRole("textbox", { name: "Notas" }) as HTMLTextAreaElement)
      .rows,
  ).toBe(4);
});

test("números, rango, checkbox y archivo mantienen los eventos y valores nativos", () => {
  const fileRef = createRef<HTMLInputElement>();
  const onFile = vi.fn();
  function Controls() {
    const [number, setNumber] = useState("1.2");
    const [checked, setChecked] = useState(false);
    return (
      <>
        <NumberField
          label="Espesor"
          unit="mm"
          min={0.6}
          max={5}
          step={0.1}
          value={number}
          onChange={(event) => setNumber(event.target.value)}
        />
        <RangeField label="Zoom" min={1} max={3} step={0.05} defaultValue={1} />
        <Checkbox
          label="Invertir"
          checked={checked}
          onChange={(event) => setChecked(event.target.checked)}
        />
        <FileInput ref={fileRef} accept="image/png" onChange={onFile} />
      </>
    );
  }
  render(<Controls />);
  const input = screen.getByRole("spinbutton", {
    name: "Espesor",
  }) as HTMLInputElement;
  expect(input.step).toBe("0.1");
  expect(input.min).toBe("0.6");
  fireEvent.change(input, { target: { value: "" } });
  expect(input.value).toBe("");
  fireEvent.change(input, { target: { value: "2.4" } });
  expect(input.value).toBe("2.4");
  fireEvent.click(screen.getByRole("checkbox", { name: "Invertir" }));
  expect((screen.getByRole("checkbox") as HTMLInputElement).checked).toBe(true);
  fireEvent.change(screen.getByRole("slider", { name: "Zoom" }), {
    target: { value: "1.5" },
  });
  expect((screen.getByRole("slider") as HTMLInputElement).value).toBe("1.5");
  expect(fileRef.current?.hidden).toBe(true);
  const file = new File(["image"], "foto.png", { type: "image/png" });
  fireEvent.change(fileRef.current!, { target: { files: [file] } });
  expect(onFile).toHaveBeenCalledOnce();
});

test("Button evita envíos accidentales y bloquea acciones durante carga", () => {
  const submit = vi.fn((event: React.FormEvent) => event.preventDefault());
  const click = vi.fn();
  render(
    <form onSubmit={submit}>
      <Button onClick={click}>Guardar</Button>
      <Button loading onClick={click}>
        Exportar
      </Button>
      <Button type="submit">Enviar</Button>
    </form>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
  expect(click).toHaveBeenCalledOnce();
  expect(submit).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Exportar" }));
  expect(click).toHaveBeenCalledOnce();
  expect(
    screen.getByRole("button", { name: "Exportar" }).getAttribute("aria-busy"),
  ).toBe("true");
  fireEvent.click(screen.getByRole("button", { name: "Enviar" }));
  expect(submit).toHaveBeenCalledOnce();
});

test("Modal incluye inputs en el ciclo de foco y restaura scroll y foco al cerrar", () => {
  const prototype = HTMLDialogElement.prototype;
  const originalShow = Object.getOwnPropertyDescriptor(prototype, "showModal");
  const originalClose = Object.getOwnPropertyDescriptor(prototype, "close");
  Object.defineProperty(prototype, "showModal", {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.open = true;
    },
  });
  Object.defineProperty(prototype, "close", {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.open = false;
    },
  });
  const oldOverflow = document.body.style.overflow;
  try {
    document.body.style.overflow = "clip";
    const close = vi.fn();
    const trigger = document.createElement("button");
    document.body.append(trigger);
    trigger.focus();
    const { rerender, unmount } = render(
      <Modal aria-label="Editar" onClose={close}>
        <ModalHeader title="Editar" onClose={close} />
        <TextField label="Nombre" />
        <SelectField
          label="Estado"
          options={[{ value: "draft", label: "Borrador" }]}
        />
      </Modal>,
    );
    expect(document.body.style.overflow).toBe("hidden");
    const first = screen.getByRole("button", { name: "Cerrar modal" });
    const last = screen.getByRole("combobox");
    first.focus();
    fireEvent.keyDown(first, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(last);
    fireEvent.keyDown(last, { key: "Tab" });
    expect(document.activeElement).toBe(first);
    fireEvent(
      screen.getByRole("dialog"),
      new Event("cancel", { cancelable: true }),
    );
    expect(close).toHaveBeenCalledOnce();
    rerender(<Modal open={false} aria-label="Editar" onClose={close} />);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.body.style.overflow).toBe("clip");
    expect(document.activeElement).toBe(trigger);
    unmount();
    trigger.remove();
  } finally {
    cleanup();
    document.body.style.overflow = oldOverflow;
    if (originalShow)
      Object.defineProperty(prototype, "showModal", originalShow);
    else Reflect.deleteProperty(prototype, "showModal");
    if (originalClose) Object.defineProperty(prototype, "close", originalClose);
    else Reflect.deleteProperty(prototype, "close");
  }
});

test("Table conserva caption y encabezados semánticos dentro de una región accesible", () => {
  render(
    <Table label="Piezas del cuadro">
      <TableCaption>Archivos para imprimir</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Pieza</TableHead>
          <TableHead>Estado</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableHead scope="row">Tapa frontal</TableHead>
          <TableCell>Lista</TableCell>
        </TableRow>
      </TableBody>
    </Table>,
  );
  expect(
    screen.getByRole("table", { name: "Archivos para imprimir" }),
  ).toBeTruthy();
  expect(screen.getAllByRole("columnheader")).toHaveLength(2);
  expect(
    screen
      .getByRole("rowheader", { name: "Tapa frontal" })
      .getAttribute("scope"),
  ).toBe("row");
  expect(
    screen.getByRole("region", { name: "Piezas del cuadro" }).tabIndex,
  ).toBe(0);
});
