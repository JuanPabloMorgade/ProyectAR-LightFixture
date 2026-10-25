# ShadowEditor

**Archivo:** `src/features/shadowbox/editor.tsx`. **Ruta:** `/cuadros`.

Es el editor cliente de cuadros de sombra. No recibe props. Ofrece presets, pincel, borrador, carga y recorte de imágenes, ajustes geométricos, simulación de proyección, cuatro patrones SVG y exportación de las cinco piezas en un STL o como STL independientes dentro de un ZIP. Sus pestañas son diseñador, vista 3D y explicación de la geometría. Desde la vista 3D también abre la guía de armado del diseño actual.

## Estado y dependencias

- Guarda ajustes de `BoxSettings`, nombre, imagen objetivo, pestaña, herramientas de dibujo, recorte, proyectos disponibles, mensajes, formato y progreso de exportación y apertura de la guía en estado React. El formato de descarga y el paso de armado no se guardan en el JSON del proyecto.
- Usa refs para los canvas, entradas de archivo, trazos del puntero y el worker de exportación.
- `artwork.ts` genera presets, carga imágenes y aplica el recorte; `engine.ts` valida medidas, produce máscaras, simula la proyección, genera SVG y construye la malla.
- [ShadowViewer](shadow-viewer.md) renderiza la vista 3D; `src/features/lithophane/mesh.ts` serializa la malla como STL binario.

## Efectos y persistencia

- Al montarse crea el patrón inicial y lee los diseños de `localStorage`. Reconoce proyectos actuales con prefijo `proyectar:shadow:v2:` y diseños anteriores con `shadowbox.design.`; convierte estos últimos al abrirlos.
- Actualiza los canvas al cambiar el dibujo, la simulación, la pestaña o el recorte.
- Guarda proyectos en el navegador; importa y exporta JSON. Valida el proyecto y sus medidas antes de abrirlo.
- Para exportar el STL crea `export.worker.ts`, que calcula la malla fuera del hilo principal. Termina el worker al completar, fallar o desmontar el editor.
- En la pestaña 3D permite elegir un STL con las cinco piezas o un ZIP con cinco STL independientes y `Guia-de-armado.txt`. El ZIP usa archivos numerados: `01-pared-superior`, `02-pared-inferior`, `03-pared-izquierda`, `04-pared-derecha` y `05-tapa-frontal`, con el nombre del proyecto como prefijo. Izquierda y derecha se identifican mirando la cara lisa desde la habitación.
- `printParts` genera cada pieza acostada en el origen y en milímetros; `printMesh` combina esas mismas piezas separadas por 12 mm. `stl-export.ts` serializa ambos formatos dentro del worker y `zip.ts` empaqueta los archivos localmente, sin compresión ni dependencias adicionales. Durante la exportación el selector y el botón quedan deshabilitados.

## Guía de armado

El botón `Ver guía de armado`, bajo las medidas de la pestaña 3D, abre [AssemblyGuide](assembly-guide.md) en un diálogo modal nativo. Recibe el nombre, medidas, máscaras y simulación del proyecto actual; no modifica ni guarda el diseño. Sus ocho pasos permiten identificar las piezas, presentar la tapa y las cuatro paredes, ubicar la luz y ver la orientación final contra la pared.

`assembly-viewer.tsx` obtiene las mismas mallas de `printParts` que usan los STL, las convierte de milímetros a centímetros y las orienta según cada cara. Anima la posición de las piezas, destaca la actual, permite girar y centrar la cámara, y muestra la simulación actual en el último paso. Respeta movimiento reducido y libera geometrías, materiales, texturas, controles, observador y renderizador al cerrar. `assembly.ts` define la secuencia y las posiciones. La guía describe orientación y presentación de piezas; los archivos actuales no incluyen encastres ni soporte de luz.

El diálogo retiene el foco, se cierra con Escape o con sus botones, restaura el foco al disparador y bloquea el scroll de fondo. Si WebGL falla conserva las instrucciones de los pasos.

## Calidad de los recortes

- Los valores persistidos de detalle (96, 160 y 224) se mantienen compatibles. Equilibrado duplica el muestreo y Alto lo cuadruplica en cada eje. En una caja de 15 × 15 × 6 cm, Alto usa 896 × 358 celdas por panel, aproximadamente 0,17 mm por celda. La imagen objetivo conserva su resolución de 512 × 512.
- La resolución en profundidad acompaña las proporciones del panel, con un límite de 1024 filas. El marco conserva su ancho físico al refinar la grilla.
- `printableMask` elimina material sin conexión al marco y une contactos diagonales con una celda de material para evitar aristas compartidas por cuatro caras. La proyección, los patrones, SVG y STL usan estos mismos recortes. Esto no garantiza un ancho mínimo imprimible: depende de las medidas y de la impresora.
- El STL triangula los contornos y extruye sus bordes; no genera dos caras por cada celda interior. Las aristas de la triangulación se subdividen donde corresponde para que las tapas coincidan con las paredes sin uniones en T.
- La simulación sigue siendo una aproximación de luz puntual sin modelar la oclusión por espesor ni el tamaño real de la fuente de luz.
