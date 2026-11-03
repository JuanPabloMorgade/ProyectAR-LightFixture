// @vitest-environment jsdom
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import { createProjectStorage } from "../src/lib/project-storage";
import { useSavedDesigns } from "../src/hooks/use-saved-designs";

type Project = { name: string; value: number };
const parse = (raw: string): Project => {
  const p = JSON.parse(raw) as Project;
  if (typeof p.name !== "string" || !Number.isFinite(p.value))
    throw new Error("Formato inválido");
  return p;
};
const first = createProjectStorage({
  prefix: "first:",
  parse,
  lastKey: "first-last",
});
const second = createProjectStorage({ prefix: "second:", parse });
beforeEach(() => localStorage.clear());
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

test("two sections share the hook but keep projects and selections independent", async () => {
  const a = renderHook(() => useSavedDesigns(first));
  const b = renderHook(() => useSavedDesigns(second));
  act(() => {
    a.result.current.save({ name: "Z", value: 1 });
    a.result.current.save({ name: "A", value: 2 });
  });
  act(() => b.result.current.save({ name: "A", value: 3 }));
  expect(a.result.current.items.map((p) => p.label)).toEqual(["A", "Z"]);
  expect(b.result.current.items.map((p) => p.label)).toEqual(["A"]);
  expect(a.result.current.selected).toBe("first:A");
  expect(b.result.current.selected).toBe("second:A");
  act(() => a.result.current.save({ name: "A", value: 4 }));
  expect(a.result.current.items).toHaveLength(2);
  const apply = vi.fn();
  await act(() => a.result.current.openSelected(apply));
  expect(apply).toHaveBeenCalledWith({ name: "A", value: 4 });
  expect(second.read("second:A").value).toBe(3);
  expect(() => first.remove("second:A")).toThrow();
  expect(() => first.read("second:A")).toThrow();
  const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
  act(() => expect(a.result.current.removeSelected()).toBe(false));
  expect(first.list()).toHaveLength(2);
  confirm.mockReturnValue(true);
  act(() => expect(a.result.current.removeSelected()).toBe(true));
  expect(a.result.current.selected).toBe("");
  expect(first.list().map((p) => p.label)).toEqual(["Z"]);
  expect(second.list()).toHaveLength(1);
  expect(localStorage.getItem("first-last")).toBeNull();
});

test("separate hook instances never share selection state, even for the same adapter", () => {
  const a = renderHook(() => useSavedDesigns(first));
  const b = renderHook(() => useSavedDesigns(first));
  act(() => a.result.current.save({ name: "A", value: 1 }));
  act(() => b.result.current.refresh());
  expect(b.result.current.items).toHaveLength(1);
  expect(b.result.current.selected).toBe("");
  act(() =>
    expect(b.result.current.restore()).toEqual({ name: "A", value: 1 }),
  );
  expect(b.result.current.selected).toBe("first:A");
  act(() => b.result.current.select(""));
  expect(a.result.current.selected).toBe("first:A");
});

test("a failed load or corrupt project does not change the last successfully opened design", async () => {
  first.save({ name: "A", value: 1 });
  const hook = renderHook(() => useSavedDesigns(first));
  act(() => {
    hook.result.current.refresh();
    hook.result.current.select("first:B");
  });
  localStorage.setItem("first:B", '{"name":"B","value":"invalid"}');
  const apply = vi.fn();
  await expect(hook.result.current.openSelected(apply)).rejects.toThrow(
    "Formato inválido",
  );
  expect(apply).not.toHaveBeenCalled();
  localStorage.setItem("first:B", JSON.stringify({ name: "B", value: 2 }));
  await expect(
    hook.result.current.openSelected(async () => {
      throw new Error("image failed");
    }),
  ).rejects.toThrow("image failed");
  expect(localStorage.getItem("first-last")).toBe("first:A");
});

test("legacy replacement waits for a successful write and legacy deletion cleans up its metadata", () => {
  const store = createProjectStorage({
    prefix: "current:",
    parse,
    lastKey: "last",
    restoreLegacy: true,
    legacy: {
      matches: (id) => id === "old",
      label: () => "Anterior",
      parse,
      extraKeys: (id) => [id + ".meta"],
      replaceOnSave: () => true,
    },
  });
  localStorage.setItem("old", JSON.stringify({ name: "Anterior", value: 1 }));
  localStorage.setItem("old.meta", "metadata");
  const hook = renderHook(() => useSavedDesigns(store));
  act(() => expect(hook.result.current.restore()?.name).toBe("Anterior"));
  const failing = vi
    .spyOn(Storage.prototype, "setItem")
    .mockImplementation(() => {
      throw new DOMException("quota", "QuotaExceededError");
    });
  expect(() =>
    hook.result.current.save({ name: "Anterior", value: 2 }),
  ).toThrow();
  expect(localStorage.getItem("old")).not.toBeNull();
  expect(hook.result.current.selected).toBe("old");
  failing.mockRestore();
  act(() => hook.result.current.save({ name: "Anterior", value: 2 }));
  expect(localStorage.getItem("old")).toBeNull();
  expect(localStorage.getItem("old.meta")).toBeNull();
  expect(store.read("current:Anterior").value).toBe(2);
  localStorage.setItem("old", JSON.stringify({ name: "Otra", value: 3 }));
  localStorage.setItem("old.meta", "metadata");
  act(() => {
    hook.result.current.refresh();
    hook.result.current.select("old");
  });
  vi.spyOn(window, "confirm").mockReturnValue(true);
  act(() => hook.result.current.removeSelected());
  expect(localStorage.getItem("old.meta")).toBeNull();
  expect(store.list()).toHaveLength(1);
});

test("adapters are safe to construct without browser storage and propagate storage access failures", () => {
  const access = vi.fn((): Storage => {
    throw new Error("Storage denied");
  });
  const store = createProjectStorage({ prefix: "private:", parse }, access);
  expect(access).not.toHaveBeenCalled();
  expect(() => store.list()).toThrow("Storage denied");
});
