export type SavedDesign = { id: string; label: string; legacy?: boolean };

type StorageOptions<P extends { name: string }> = {
  prefix: string;
  parse: (raw: string) => P;
  lastKey?: string;
  restoreLegacy?: boolean;
  legacy?: {
    matches: (id: string) => boolean;
    label: (id: string, raw: string) => string;
    parse: (raw: string, item: SavedDesign) => P;
    extraKeys?: (id: string) => string[];
    replaceOnSave?: (raw: string, project: P) => boolean;
  };
};

/** Each adapter owns a namespace and its format. Storage is accessed only when
 * an operation runs, so constructing an adapter is safe during server rendering.
 */
export function createProjectStorage<P extends { name: string }>(
  options: StorageOptions<P>,
  getStorage: () => Storage = () => window.localStorage,
) {
  function list(): SavedDesign[] {
    const storage = getStorage();
    const result: SavedDesign[] = [];
    for (let i = 0; i < storage.length; i++) {
      const id = storage.key(i) ?? "";
      if (id.startsWith(options.prefix)) {
        result.push({ id, label: id.slice(options.prefix.length) });
      } else if (options.legacy?.matches(id)) {
        try {
          result.push({
            id,
            label: options.legacy.label(id, storage.getItem(id)!),
            legacy: true,
          });
        } catch {
          /* An unreadable old entry must not hide the other designs. */
        }
      }
    }
    return result.sort((a, b) => a.label.localeCompare(b.label));
  }
  function find(id: string) {
    const item = list().find((item) => item.id === id);
    if (!item) throw new Error("No se encontró el diseño guardado.");
    return item;
  }
  function read(id: string): P {
    const item = find(id);
    const raw = getStorage().getItem(id);
    if (!raw) throw new Error("No se encontró el diseño guardado.");
    return item.legacy ? options.legacy!.parse(raw, item) : options.parse(raw);
  }
  function remember(id: string) {
    if (options.lastKey) getStorage().setItem(options.lastKey, id);
  }
  function save(project: P, previousId = "") {
    const storage = getStorage();
    const raw = JSON.stringify(project);
    const valid = options.parse(raw);
    const id = options.prefix + valid.name;
    const obsolete =
      options.legacy?.matches(previousId) &&
      options.legacy.replaceOnSave?.(storage.getItem(previousId) ?? "", valid);
    storage.setItem(id, JSON.stringify(valid));
    remember(id);
    // Never remove an old copy until its replacement has been stored.
    if (obsolete) {
      storage.removeItem(previousId);
      for (const key of options.legacy?.extraKeys?.(previousId) ?? [])
        storage.removeItem(key);
    }
    return id;
  }
  function remove(id: string) {
    const item = find(id);
    const storage = getStorage();
    storage.removeItem(id);
    if (item.legacy)
      for (const key of options.legacy?.extraKeys?.(id) ?? [])
        storage.removeItem(key);
    if (options.lastKey && storage.getItem(options.lastKey) === id)
      storage.removeItem(options.lastKey);
  }
  function restore() {
    if (!options.lastKey) return null;
    const items = list();
    const last = getStorage().getItem(options.lastKey);
    const item =
      items.find((item) => item.id === last) ??
      (options.restoreLegacy ? items.find((item) => item.legacy) : undefined);
    return item ? { id: item.id, project: read(item.id) } : null;
  }
  return { list, read, save, remove, remember, restore };
}

export type ProjectStorage<P extends { name: string }> = ReturnType<
  typeof createProjectStorage<P>
>;
