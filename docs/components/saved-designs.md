# Diseños guardados compartidos

Los editores de cuadros y lámparas usan tres piezas reutilizables:

- `src/components/ui/saved-designs.tsx`: selector y botones accesibles. No conoce formatos ni almacenamiento.
- `src/hooks/use-saved-designs.ts`: listado, selección local a cada instancia, guardar, abrir y eliminar con confirmación. Propaga errores al sistema de avisos de la sección.
- `src/lib/project-storage.ts`: operaciones de `localStorage`, orden por nombre, validación mediante el adaptador, aislamiento por claves, recuperación opcional y limpieza de versiones anteriores.

Cada sección declara su adaptador en `features/<sección>/projects.ts`. Cuadros conserva `proyectar:shadow:v2:*` y su lector anterior; lámparas conserva `proyectar:lamp:v1:*`, el guardado único anterior y `proyectar:lamp:last`. No se altera el formato JSON exportado. Ambos editores comienzan con su ejemplo y una selección vacía: llaman a `refresh()`, sin restaurar un proyecto. Solo seleccionar y pulsar la carpeta aplica un guardado, independientemente de cuántos haya. La recuperación automática sigue siendo una capacidad opcional de la capa compartida para otras secciones que la necesiten.

## Agregar otra sección

Crear un adaptador estable fuera del componente, con un prefijo exclusivo y un lector que valide el formato. El lector se usa tanto al abrir como antes de guardar. El proyecto debe tener `name`; la sección decide cómo normalizarlo.

```ts
const noteStorage = createProjectStorage<{ name: string; text: string }>({
  prefix: "proyectar:notes:v1:",
  parse(raw) {
    const note = JSON.parse(raw);
    if (typeof note?.name !== "string" || typeof note.text !== "string")
      throw new Error("Nota inválida.");
    return note;
  },
});
```

En el componente, `useSavedDesigns(noteStorage)` devuelve `items`, `selected` y `select` para conectar a `SavedDesigns`. Inicializar con `refresh()` o `restore()` dentro del efecto de montaje y manejar sus errores. Las operaciones son:

- `save(project)`: valida y guarda por nombre; actualiza la lista y la selección. El mismo nombre reemplaza su entrada.
- `openSelected(apply)`: lee y valida, espera a que la sección aplique su proyecto y luego recuerda la apertura si el adaptador define `lastKey`. Las imágenes y los cálculos siguen perteneciendo a la sección.
- `removeSelected()`: pide confirmación, elimina la entrada y sus metadatos configurados, actualiza la lista y limpia la selección. Devuelve `false` al cancelar.
- `restore()`: refresca el listado y devuelve el proyecto recordado, si corresponde. La selección se mantiene por instancia; no hay un estado global compartido entre editores.

Las operaciones se ejecutan después del montaje o en eventos: construir el adaptador no accede al navegador. No se sustituyen claves de otros adaptadores. La configuración `legacy` reconoce claves y formatos anteriores; solo retira un guardado migrado después de escribir su reemplazo correctamente. Si se necesita otro proveedor en pruebas, la fábrica acepta un getter de `Storage`.
