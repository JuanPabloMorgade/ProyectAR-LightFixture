// @vitest-environment jsdom
import { afterEach, expect, test, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { Toast, ToastViewport } from "../src/components/ui";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

test("anuncia información y errores con prioridad adecuada, sin mover el foco", () => {
  render(
    <ToastViewport>
      <Toast
        title="Guardado"
        description="Tu proyecto sigue en este navegador."
        variant="success"
        onDismiss={vi.fn()}
      />
      <Toast title="No se pudo abrir" variant="error" onDismiss={vi.fn()} />
    </ToastViewport>,
  );
  expect(screen.getByRole("region", { name: "Notificaciones" })).toBeTruthy();
  expect(screen.getByRole("status").textContent).toContain("Guardado");
  expect(screen.getByRole("alert").textContent).toContain("No se pudo abrir");
  expect(document.activeElement).toBe(document.body);
});

test("pausa el tiempo con puntero o foco y reanuda solo cuando ambos salen", () => {
  vi.useFakeTimers();
  const dismiss = vi.fn();
  const { container } = render(
    <Toast title="Guardado" duration={6000} onDismiss={dismiss} />,
  );
  const toast = container.firstElementChild!;
  act(() => vi.advanceTimersByTime(2000));
  fireEvent.pointerEnter(toast);
  const close = screen.getByRole("button", { name: /Cerrar notificación/ });
  act(() => close.focus());
  fireEvent.pointerLeave(toast);
  act(() => vi.advanceTimersByTime(10000));
  expect(dismiss).not.toHaveBeenCalled();
  act(() => close.blur());
  act(() => vi.advanceTimersByTime(3999));
  expect(dismiss).not.toHaveBeenCalled();
  act(() => vi.advanceTimersByTime(1));
  expect(dismiss).toHaveBeenCalledOnce();
});

test.each(["error", "warning"] as const)(
  "%s permanece visible hasta el cierre manual",
  (variant) => {
    vi.useFakeTimers();
    const dismiss = vi.fn();
    render(
      <Toast title="Revisá el archivo" variant={variant} onDismiss={dismiss} />,
    );
    act(() => vi.advanceTimersByTime(60000));
    expect(dismiss).not.toHaveBeenCalled();
    fireEvent.click(
      screen.getByRole("button", { name: /Cerrar notificación/ }),
    );
    expect(dismiss).toHaveBeenCalledOnce();
  },
);

test("la acción es independiente del cierre y el desmontaje cancela el temporizador", () => {
  vi.useFakeTimers();
  const action = vi.fn(),
    dismiss = vi.fn();
  const { unmount } = render(
    <Toast
      title="Archivo listo"
      onDismiss={dismiss}
      action={{ label: "Ver diseño", onClick: action }}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Ver diseño" }));
  expect(action).toHaveBeenCalledOnce();
  expect(dismiss).not.toHaveBeenCalled();
  unmount();
  act(() => vi.advanceTimersByTime(10000));
  expect(dismiss).not.toHaveBeenCalled();
});

test("un nuevo aviso reinicia el tiempo y usa el callback actualizado sin prolongarse por renders", () => {
  vi.useFakeTimers();
  const old = vi.fn(),
    next = vi.fn();
  const { rerender } = render(
    <Toast key="uno" title="Guardado" onDismiss={old} />,
  );
  act(() => vi.advanceTimersByTime(5000));
  rerender(<Toast key="dos" title="Exportado" onDismiss={old} />);
  act(() => vi.advanceTimersByTime(5000));
  expect(old).not.toHaveBeenCalled();
  rerender(<Toast key="dos" title="Exportado" onDismiss={next} />);
  act(() => vi.advanceTimersByTime(1000));
  expect(next).toHaveBeenCalledOnce();
  expect(old).not.toHaveBeenCalled();
});
