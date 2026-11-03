"use client";
import { useCallback, useState } from "react";
import type { ProjectStorage, SavedDesign } from "@/lib/project-storage";

/** Reusable library state and operations. Each call has its own selection;
 * project validation, legacy formats and namespaces belong to its adapter.
 * Errors propagate to the section's existing notification system.
 */
export function useSavedDesigns<P extends { name: string }>(
  store: ProjectStorage<P>,
) {
  const [items, setItems] = useState<SavedDesign[]>([]);
  const [selected, select] = useState("");
  const refresh = useCallback(() => {
    const next = store.list();
    setItems(next);
    return next;
  }, [store]);
  const restore = useCallback(() => {
    refresh();
    const saved = store.restore();
    if (saved) select(saved.id);
    return saved?.project ?? null;
  }, [store, refresh]);
  const save = useCallback(
    (project: P) => {
      const id = store.save(project, selected);
      refresh();
      select(id);
    },
    [store, selected, refresh],
  );
  const openSelected = useCallback(
    async (apply: (project: P) => void | Promise<void>) => {
      const id = selected;
      const project = store.read(id);
      await apply(project);
      store.remember(id);
    },
    [store, selected],
  );
  const removeSelected = useCallback(() => {
    const item = items.find((item) => item.id === selected);
    if (
      !item ||
      !window.confirm(`¿Eliminar «${item.label}» de este navegador?`)
    )
      return false;
    store.remove(item.id);
    refresh();
    select("");
    return true;
  }, [store, items, selected, refresh]);
  return {
    items,
    selected,
    select,
    refresh,
    restore,
    save,
    openSelected,
    removeSelected,
  };
}
