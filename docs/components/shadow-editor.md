# ShadowEditor

**Archivo:** `src/features/shadowbox/editor.tsx`. **Ruta:** `/cuadros`.

Es el editor cliente de cuadros de sombra. No recibe props. Ofrece presets, pincel, borrador, carga y recorte de imágenes, ajustes geométricos, simulación de proyección, cuatro patrones SVG y un STL de cinco piezas. Sus pestañas son diseñador, vista 3D y explicación de la geometría.

## Estado y dependencias

- Guarda ajustes de `BoxSettings`, nombre, imagen objetivo, pestaña, herramientas de dibujo, recorte, proyectos disponibles, mensajes y progreso de exportación en estado React.
- Usa refs para los canvas, entradas de archivo, trazos del puntero y el worker de exportación.
- `artwork.ts` genera presets, carga imágenes y aplica el recorte; `engine.ts` valida medidas, produce máscaras, simula la proyección, genera SVG y construye la malla.
- [ShadowViewer](shadow-viewer.md) renderiza la vista 3D; `src/features/lithophane/mesh.ts` serializa la malla como STL binario.

## Efectos y persistencia

- Al montarse crea el patrón inicial y lee los diseños de `localStorage`. Reconoce proyectos actuales con prefijo `proyectar:shadow:v2:` y diseños anteriores con `shadowbox.design.`; convierte estos últimos al abrirlos.
- Actualiza los canvas al cambiar el dibujo, la simulación, la pestaña o el recorte.
- Guarda proyectos en el navegador; importa y exporta JSON. Valida el proyecto y sus medidas antes de abrirlo.
- Para exportar el STL crea `export.worker.ts`, que calcula la malla fuera del hilo principal. Termina el worker al completar, fallar o desmontar el editor.
