# Cuadros de sombra (`/cuadros`)

**Archivo:** `src/app/cuadros/page.tsx`.

La ruta monta el [ShadowEditor](../components/shadow-editor.md) dentro de [Shell](../components/shell.md). El editor permite dibujar o cargar una imagen, ajustar la caja y la luz, ver la proyección estimada, inspeccionar la caja en 3D y descargar patrones SVG. En la pestaña 3D permite elegir entre un STL de cinco piezas o un ZIP con cada pieza en su propio STL, numerada y nombrada.

En esa misma pestaña, debajo de las medidas, `Ver guía de armado` abre la [guía 3D](../components/assembly-guide.md) en un modal. Utiliza el diseño abierto para mostrar la disposición de las cinco piezas, la luz y la proyección final en ocho pasos.

La página no mantiene estado ni procesa imágenes: esas tareas pertenecen a `src/features/shadowbox/`. Usa el layout raíz de `src/app/layout.tsx`; los estilos específicos del editor se importan desde `shadowbox.css` en el propio editor.
