# ShadowEditor

**Archivo:** `src/features/shadowbox/editor.tsx`. **Ruta:** `/cuadros`.

Es el editor cliente de cuadros de sombra. No recibe props. Ofrece presets, pincel, borrador, carga y recorte de imágenes, ajustes geométricos, simulación de proyección, cuatro patrones SVG y exportación de nueve piezas (1 W USB) o diez (1 W con 3 AAA) en un STL o como STL independientes dentro de un ZIP. Organiza el trabajo en tres pasos libres y numerados: Cómo funciona, Diseñador de patrones y Vista 3D. Desde la Vista 3D también abre la guía de armado del diseño actual.

Una entrada nueva comienza en Cómo funciona. Este paso explica cargar una imagen o probar un ejemplo, ajustar el diseño y revisar el modelo para descargarlo; conserva además la referencia técnica de la geometría. Su botón Siguiente va al Diseñador de patrones. El diseñador muestra Atrás y Siguiente arriba a la derecha, mientras que Vista 3D muestra sólo Volver al diseño. Ninguna navegación exige haber cargado una imagen o completado un ajuste.

Cómo funciona explica además el significado de zonas claras/oscuras, el montaje con base contra la pared, paredes guiadas y marco abierto, la dirección del LED de 1 W, acceso posterior a pilas y tubo pasacables. Indica 20 mm de altura inicial de base, 10 piezas para 3 AAA o 9 para USB y componentes comprados por separado. Advierte de la sombra central de la base y distingue la estimación del resultado físico. El bloque de montaje se apila en móvil.

El selector de pasos usa botones nativos y señala el paso actual con `aria-current="step"`. Tab, Enter y Espacio conservan su interacción nativa; ArrowLeft, ArrowRight, Home y End seleccionan y enfocan el paso correspondiente. En el diseñador, Cargar imagen es la primera acción de origen y abre la misma entrada de archivos validada; debajo, O probá con un ejemplo agrupa Rayos, Flor, Estrellas y Texto como alternativas secundarias.

Los tres pasos comparten una cabecera con título, orientación y navegación sobre la misma superficie violeta de la card. Cómo funciona presenta el recorrido en tres bloques y conserva la explicación de proyección en un desplegable nativo, cerrado inicialmente y accesible con teclado.

## Estado y dependencias

- Guarda ajustes de `BoxSettings`, montaje de 1 W con caja electrónica independiente, estado de inspección interior, nombre, imagen objetivo, paso actual, herramientas de dibujo, recorte, proyectos disponibles, mensajes, formato y progreso de exportación y apertura de la guía en estado React. El formato de descarga y el paso de armado no se guardan en el JSON del proyecto.
- Usa refs para los canvas, entradas de archivo, trazos del puntero y el worker de exportación.
- Los mensajes de operaciones se presentan con `Toast` y `ToastViewport`, sin desplazar el diseño; se cierran solos o manualmente. Los errores y las validaciones permanecen junto a los controles correspondientes.
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
- En Vista 3D permite descargar un STL combinado o un ZIP con las piezas independientes y `Guia-de-armado.txt`: nueve para USB y diez para 3 AAA. Paredes 01–04, embellecedor 05, base 06, tapa electrónica 07, tubo 08, cabezal 09 y tapita de pilas 10 si corresponde. El prefijo es el nombre del proyecto.
- `fabricationParts` comparte todas las mallas entre visor y STL. `fabricationMesh` las separa por 12 mm. `stl-export.ts` y `zip.ts` trabajan dentro del worker. Durante la exportación los controles de descarga quedan deshabilitados.
- `editor-defaults.ts` fija LED de 1 W, agrega `enclosure` y adapta proyectos anteriores (COB o LEDs individuales) informando el cambio. Se retiraron `cob-controls.tsx` y sus estilos sin uso; los generadores y validadores históricos conservan referencias en compatibilidad y pruebas. No hay selector de iluminación. Los nuevos proyectos empiezan en 1 W y luz al 50%. Al abrir/importar un proyecto o entrar en Vista 3D, `fitWallLight` ajusta una posición incompatible al valor válido más cercano e informa el cambio (85% → 83% con las medidas iniciales). Conserva posiciones válidas, imagen y dimensiones. Las demás incompatibilidades y las ediciones manuales inválidas dentro de 3D mantienen errores explícitos.
- La base con anclaje y pilas va contra la pared. El frente es un marco abierto; el cierre queda en la tapa trasera de electrónica, lisa o con el mismo arte en relieve real. Ver interior es sólo una inspección. La separación de la base se incluye en las máscaras y la simulación mediante `projectionSettings`. Ver [fabricación](shadow-fabrication.md).

## Guía de armado

El botón `Ver guía de armado`, bajo las medidas de Vista 3D, abre [AssemblyGuide](assembly-guide.md) en un diálogo modal nativo. Recibe el nombre, medidas, máscaras y simulación del proyecto actual; no modifica ni guarda el diseño. Sus doce pasos recorren la base, pilas, tapa electrónica, tubo, paredes, cabezal, embellecedor y colgado final. Recibe también el buffer RGBA `artwork` para el relieve, igual que el worker de exportación.

`assembly-viewer.tsx` obtiene las mismas mallas de `fabricationParts` que usan los STL, las convierte con `assemblyMesh` de milímetros a centímetros y las orienta según cada cara. Anima la posición de las piezas, destaca la actual y muestra la simulación actual al terminar. Respeta movimiento reducido y libera sus recursos al cerrar. `assembly.ts` define la secuencia y las posiciones. La guía incluye los soportes LED y los encastres cuando están configurados; la proyección sigue estimada desde una única fuente central.

El diálogo retiene el foco, se cierra con Escape o con sus botones, restaura el foco al disparador y bloquea el scroll de fondo. Si WebGL falla conserva las instrucciones de los pasos.

## Calidad de los recortes

- Los valores persistidos de detalle (96, 160 y 224) se mantienen compatibles. Equilibrado duplica el muestreo y Alto lo cuadruplica en cada eje: 320 o 896 columnas para el lado de mayor tamaño. Las filas siguen la profundidad óptica derivada, que puede ser menor que la profundidad máxima configurada. La imagen objetivo conserva su resolución de 512 × 512.
- La resolución en profundidad acompaña las proporciones del panel, con un límite de 1024 filas. El marco conserva su ancho físico al refinar la grilla.
- `printableMask` elimina material sin conexión al marco y une contactos diagonales con una celda de material para evitar aristas compartidas por cuatro caras. La proyección, los patrones, SVG y STL usan estos mismos recortes. Esto no garantiza un ancho mínimo imprimible: depende de las medidas y de la impresora.
- El STL triangula los contornos y extruye sus bordes; no genera dos caras por cada celda interior. Las aristas de la triangulación se subdividen donde corresponde para que las tapas coincidan con las paredes sin uniones en T.
- La simulación sigue siendo una aproximación de luz puntual. Incluye la sombra de las piezas impresas de la base y soporte, y muestra el porcentaje estimado del área de recortes bloqueada. Se omiten los recortes totalmente ocultos; no se trasladan. No modela el tamaño real del emisor, los cables o los componentes comprados. En 1 W se acorta el tramo delantero hasta dejar holgura para el cabezal.
