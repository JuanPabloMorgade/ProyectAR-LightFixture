# ShadowEditor

**Archivo:** `src/features/shadowbox/editor.tsx`. **Ruta:** `/cuadros`.

Es el editor cliente de cuadros de sombra. No recibe props. Ofrece presets, pincel, borrador, carga y recorte de imágenes, ajustes geométricos, simulación de proyección, cuatro patrones SVG y exportación de las cinco piezas en un STL o como STL independientes dentro de un ZIP. Organiza el trabajo en tres pasos libres y numerados: Cómo funciona, Diseñador de patrones y Vista 3D. Desde la Vista 3D también abre la guía de armado del diseño actual.

Una entrada nueva comienza en Cómo funciona. Este paso explica cargar una imagen o probar un ejemplo, ajustar el diseño y revisar el modelo para descargarlo; conserva además la referencia técnica de la geometría. Su botón Siguiente va al Diseñador de patrones. El diseñador muestra Atrás y Siguiente arriba a la derecha, mientras que Vista 3D muestra sólo Volver al diseño. Ninguna navegación exige haber cargado una imagen o completado un ajuste.

El selector de pasos usa botones nativos y señala el paso actual con `aria-current="step"`. Tab, Enter y Espacio conservan su interacción nativa; ArrowLeft, ArrowRight, Home y End seleccionan y enfocan el paso correspondiente. En el diseñador, Cargar imagen es la primera acción de origen y abre la misma entrada de archivos validada; debajo, O probá con un ejemplo agrupa Rayos, Flor, Estrellas y Texto como alternativas secundarias.

Los tres pasos comparten una cabecera con título, orientación y navegación sobre la misma superficie violeta de la card. Cómo funciona presenta el recorrido en tres bloques y conserva la explicación de proyección en un desplegable nativo, cerrado inicialmente y accesible con teclado.

## Estado y dependencias

- Guarda ajustes de `BoxSettings`, nombre, imagen objetivo, paso actual, herramientas de dibujo, recorte, proyectos disponibles, mensajes, formato y progreso de exportación y apertura de la guía en estado React. El formato de descarga y el paso de armado no se guardan en el JSON del proyecto.
- Usa refs para los canvas, entradas de archivo, trazos del puntero y el worker de exportación.
- Los campos numéricos mantienen el texto temporal de edición separado de las medidas. Borrarlos no introduce un cero ni altera el diseño; al salir vacíos recuperan la última medida, y los ceros a la izquierda se normalizan. Abrir o importar un proyecto descarta ese texto temporal.
- Los campos, botones y modales usan [componentes UI compartidos](ui.md). `NumberField` contiene valor y unidad; `SelectField` y `TextField` generan etiquetas asociadas. El modal de recorte comparte el cierre, foco y bloqueo de scroll con la guía de armado.
- `artwork.ts` genera presets, carga imágenes y aplica el recorte; `engine.ts` valida medidas, produce máscaras, simula la proyección, genera SVG y construye la malla.
- [ShadowViewer](shadow-viewer.md) renderiza la vista 3D; `src/features/lithophane/mesh.ts` serializa la malla como STL binario.

## Efectos y persistencia

- Al montarse crea el patrón inicial y lee los diseños de `localStorage`. Reconoce proyectos actuales con prefijo `proyectar:shadow:v2:` y diseños anteriores con `shadowbox.design.`; convierte estos últimos al abrirlos.
- Al montarse, el paso inicial es Cómo funciona. Actualiza los canvas al cambiar el dibujo, la simulación, el paso o el recorte. `artModel` mantiene la copia durable del arte y se repinta en el canvas visible al volver al Diseñador de patrones, por lo que navegar no borra trazos ni imágenes.
- Guarda proyectos en el navegador; importa y exporta JSON. Valida el proyecto y sus medidas antes de abrirlo. Tras recuperar y decodificar un proyecto válido entra al Diseñador de patrones con su nombre, imagen y ajustes; los errores de apertura no cambian el paso ni reemplazan el proyecto actual.
- Elegir una imagen sólo abre el recorte. Aplicar imagen actualiza `artModel` y el diseño; Cancelar únicamente descarta el estado temporal del recorte, por lo que conserva el arte y los ajustes anteriores.
- Para exportar el STL crea `export.worker.ts`, que calcula la malla fuera del hilo principal. Termina el worker al completar, fallar o desmontar el editor.
- En Vista 3D permite elegir un STL con las cinco piezas o un ZIP con cinco STL independientes y `Guia-de-armado.txt`. El ZIP usa archivos numerados: `01-pared-superior`, `02-pared-inferior`, `03-pared-izquierda`, `04-pared-derecha` y `05-tapa-frontal`, con el nombre del proyecto como prefijo. Izquierda y derecha se identifican mirando la cara lisa desde la habitación.
- `fabricationParts` genera las cinco piezas en milímetros, con soportes LED integrados en la tapa y encastres opcionales; `fabricationMesh` las combina separadas por 12 mm. `stl-export.ts` serializa ambos formatos dentro del worker y `zip.ts` empaqueta los archivos localmente. Durante la exportación los controles quedan deshabilitados. Ver [fabricación del prototipo](shadow-fabrication.md) para medidas, holguras y límites.

## Guía de armado

El botón `Ver guía de armado`, bajo las medidas de Vista 3D, abre [AssemblyGuide](assembly-guide.md) en un diálogo modal nativo. Recibe el nombre, medidas, máscaras y simulación del proyecto actual; no modifica ni guarda el diseño. Sus ocho pasos permiten identificar las piezas, presentar la tapa y las cuatro paredes, ubicar la luz y ver la orientación final contra la pared.

`assembly-viewer.tsx` obtiene las mismas mallas de `fabricationParts` que usan los STL, las convierte con `assemblyMesh` de milímetros a centímetros y las orienta según cada cara. Anima la posición de las piezas, destaca la actual y muestra la simulación actual al terminar. Respeta movimiento reducido y libera sus recursos al cerrar. `assembly.ts` define la secuencia y las posiciones. La guía incluye los soportes LED y los encastres cuando están configurados; la proyección sigue estimada desde una única fuente central.

El diálogo retiene el foco, se cierra con Escape o con sus botones, restaura el foco al disparador y bloquea el scroll de fondo. Si WebGL falla conserva las instrucciones de los pasos.

## Calidad de los recortes

- Los valores persistidos de detalle (96, 160 y 224) se mantienen compatibles. Equilibrado duplica el muestreo y Alto lo cuadruplica en cada eje. En una caja de 15 × 15 × 6 cm, Alto usa 896 × 358 celdas por panel, aproximadamente 0,17 mm por celda. La imagen objetivo conserva su resolución de 512 × 512.
- La resolución en profundidad acompaña las proporciones del panel, con un límite de 1024 filas. El marco conserva su ancho físico al refinar la grilla.
- `printableMask` elimina material sin conexión al marco y une contactos diagonales con una celda de material para evitar aristas compartidas por cuatro caras. La proyección, los patrones, SVG y STL usan estos mismos recortes. Esto no garantiza un ancho mínimo imprimible: depende de las medidas y de la impresora.
- El STL triangula los contornos y extruye sus bordes; no genera dos caras por cada celda interior. Las aristas de la triangulación se subdividen donde corresponde para que las tapas coincidan con las paredes sin uniones en T.
- La simulación sigue siendo una aproximación de luz puntual sin modelar la oclusión por espesor ni el tamaño real de la fuente de luz.
