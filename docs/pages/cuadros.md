# Cuadros de sombra (`/cuadros`)

**Archivo:** `src/app/cuadros/page.tsx`.

La ruta monta el [ShadowEditor](../components/shadow-editor.md) dentro de [Shell](../components/shell.md). El editor permite dibujar o cargar una imagen, ajustar la caja y la luz, ver la proyección estimada, inspeccionar la caja en 3D y descargar patrones SVG y un STL de cinco piezas.

La página no mantiene estado ni procesa imágenes: esas tareas pertenecen a `src/features/shadowbox/`. Usa el layout raíz de `src/app/layout.tsx`; los estilos específicos del editor se importan desde `shadowbox.css` en el propio editor.
