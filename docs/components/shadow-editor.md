# ShadowEditor

**Archivo:** `src/features/shadowbox/editor.tsx`. **Ruta:** `/cuadros`.

Es el editor cliente de cuadros de sombra. No recibe props. Ofrece presets, pincel, borrador, carga y recorte de imágenes, ajustes geométricos, simulación de proyección, cuatro patrones SVG y exportación de nueve piezas (1 W USB) o diez (1 W con 3 AAA) en un STL o como STL independientes dentro de un ZIP. Organiza el trabajo en tres pasos libres y numerados: Cómo funciona, Diseñador de patrones y Vista 3D. Desde la Vista 3D también abre la guía de armado del diseño actual.

Una entrada nueva comienza en Cómo funciona. Este paso explica cargar una imagen o probar un ejemplo, ajustar el diseño y revisar el modelo para descargarlo; conserva además la referencia técnica de la geometría. Su botón Siguiente va al Diseñador de patrones. El diseñador muestra Atrás y Siguiente arriba a la derecha, mientras que Vista 3D muestra sólo Volver al diseño. Ninguna navegación exige haber cargado una imagen o completado un ajuste.

Cómo funciona explica además el significado de zonas claras/oscuras, el montaje con base contra la pared, paredes guiadas y marco abierto, la dirección del LED de 1 W, acceso posterior a pilas y tubo pasacables. Indica 20 mm de altura inicial de base, 9 piezas para 3 AAA u 8 para USB y componentes comprados por separado. Advierte de la sombra central de la base y distingue la estimación del resultado físico. El bloque de montaje se apila en móvil.

El selector de pasos usa botones nativos y señala el paso actual con `aria-current="step"`. Tab, Enter y Espacio conservan su interacción nativa; ArrowLeft, ArrowRight, Home y End seleccionan y enfocan el paso correspondiente. En el diseñador, Cargar imagen es la primera acción de origen y abre la misma entrada de archivos validada; debajo, O probá con un ejemplo agrupa Rayos, Flor, Estrellas y Texto como alternativas secundarias.

Los tres pasos comparten una cabecera con título, orientación y navegación sobre la misma superficie violeta de la card. Cómo funciona presenta cinco acciones breves (imagen, patrón, proyección, 3D y descarga), resume el montaje y conserva la explicación de proyección en un desplegable nativo, cerrado inicialmente y accesible con teclado.

## Organización del estudio

Una barra horizontal de **Proyecto** (nombre, guardados y acciones), como la de lámparas, precede al selector de pasos. El panel lateral agrupa **Medidas principales** y **Ajustes avanzados** (detalle y notas de exportación). Conserva todas las unidades y límites, agrega ayudas sobre radio y posición de luz y muestra una recomendación breve según el paso. En pantallas de hasta 1000 px se apila sobre el área de trabajo. Un clic o toque en el selector de pasos lleva al contenido activo en esas pantallas; el teclado conserva el foco y las flechas del recorrido. El encabezado ofrece también un enlace directo al trabajo.

En el diseñador, la carga y los ejemplos preceden a la barra de dibujo. Dibujar/Borrar anuncian su estado con `aria-pressed`; el grosor sigue siendo editable y las herramientas se conservan al cambiar de paso. Imagen y proyección se comparan en paralelo en escritorio y se apilan en móvil. Los cuatro SVG tienen nombres accesibles por panel; sus medidas visibles se formatean con hasta dos decimales, sin modificar el archivo a escala real.

Vista 3D muestra primero visor e inspección interior, dimensiones y cantidad de piezas. Siguen las comprobaciones visibles de montaje, la alimentación y medidas principales de LED/base. `modular-controls.tsx` pliega Estrella y LED, Portapilas y Conexión; `enclosure-controls.tsx` pliega geometría de base y anclaje. Holguras y encastres forman otro desplegable. Cerrar estos bloques no desmonta sus controles ni cambia valores. La descarga y la guía de armado preceden al bloque de interpretación técnica de la proyección. Los errores de fabricación siguen visibles y bloquean exportaciones inválidas.

`Disclosure` y `FieldHelp`, en `src/components/ui/studio.tsx` y `studio.css`, son compartidos con Litofanías. Reutilizan `details/summary` nativos y el modal accesible existente. El rediseño no modifica motores de imagen, proyección, geometría, guías 3D ni formatos de proyecto o exportación.

## Estado y dependencias

- Guarda ajustes de `BoxSettings`, montaje de 1 W con caja electrónica independiente, estado de inspección interior, nombre, imagen objetivo, paso actual, herramientas de dibujo, recorte, proyectos disponibles, mensajes, formato y progreso de exportación y apertura de la guía en estado React. El formato de descarga y el paso de armado no se guardan en el JSON del proyecto.
- Usa refs para los canvas, entradas de archivo, trazos del puntero y el worker de exportación.
- Los mensajes de operaciones se presentan con `Toast` y `ToastViewport`, sin desplazar el diseño; se cierran solos o manualmente. Los errores y las validaciones permanecen junto a los controles correspondientes.
- Cambiar Detalle muestra **Cargando detalles…** con barra indeterminada. El aviso se pinta antes del recálculo; al terminar, cambia a **Detalles actualizados** y barra completa. Guardar y exportar se deshabilitan durante el cambio. Las selecciones rápidas conservan la última; abrir otro proyecto o desmontar cancela los cambios pendientes. Cerrar el aviso no cancela el cálculo.
- Elegir un ejemplo, reiniciar el patrón, aplicar una imagen o abrir/importar un proyecto usa la misma carga: **Cargando diseño…** hasta completar la preparación y el recálculo, luego **Diseño actualizado** con barra completa. La lectura de una foto muestra **Cargando imagen…** antes del recorte. Las cargas comparten una versión de trabajo: una selección posterior descarta resultados anteriores. Las imágenes guardadas se decodifican antes de cambiar nombre, medidas o arte; un error conserva el diseño actual. Los errores de lectura permanecen junto al editor, sin un aviso de éxito. Guardar y exportar se bloquean durante cualquiera de estas cargas.
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
- En Vista 3D permite descargar un STL combinado o un ZIP con las piezas independientes y `Guia-de-armado.txt`: ocho para USB y nueve para 3 AAA. Paredes 01–04, base 05, tapa electrónica 06, tubo 07, cabezal 08 y tapita de pilas 09 si corresponde. El prefijo es el nombre del proyecto.
- `fabricationParts` comparte todas las mallas entre visor y STL. `fabricationMesh` las separa por 12 mm. `stl-export.ts` y `zip.ts` trabajan dentro del worker. Durante la exportación los controles de descarga quedan deshabilitados.
- `editor-defaults.ts` fija LED de 1 W, agrega `enclosure` y adapta proyectos anteriores (COB o LEDs individuales) informando el cambio. Se retiraron `cob-controls.tsx` y sus estilos sin uso; los generadores y validadores históricos conservan referencias en compatibilidad y pruebas. No hay selector de iluminación. Los nuevos proyectos empiezan en 1 W y luz al 50%. Al abrir/importar un proyecto o entrar en Vista 3D, `fitWallLight` ajusta una posición incompatible al valor válido más cercano e informa el cambio (85% → 83% con las medidas iniciales). Conserva posiciones válidas, imagen y dimensiones. Las demás incompatibilidades y las ediciones manuales inválidas dentro de 3D mantienen errores explícitos.
- La base con anclaje y pilas va contra la pared. El frente queda abierto sin marco; el cierre queda en la tapa trasera de electrónica, lisa o con el mismo arte en relieve real. Ver interior es sólo una inspección. La separación de la base se incluye en las máscaras y la simulación mediante `projectionSettings`. Ver [fabricación](shadow-fabrication.md).

## Guía de armado

El botón `Ver guía de armado`, bajo las medidas de Vista 3D, abre [AssemblyGuide](assembly-guide.md) en un diálogo modal nativo. Recibe el nombre, medidas, máscaras y simulación del proyecto actual; no modifica ni guarda el diseño. Sus once pasos recorren la base, pilas, tapa electrónica, tubo, paredes, cabezal y colgado final. Recibe también el buffer RGBA `artwork` para el relieve, igual que el worker de exportación.

`assembly-viewer.tsx` obtiene las mismas mallas de `fabricationParts` que usan los STL, las convierte con `assemblyMesh` de milímetros a centímetros y las orienta según cada cara. Anima la posición de las piezas, destaca la actual y muestra la simulación actual al terminar. Respeta movimiento reducido y libera sus recursos al cerrar. `assembly.ts` define la secuencia y las posiciones. La guía incluye los soportes LED y los encastres cuando están configurados; la proyección sigue estimada desde una única fuente central.

El diálogo retiene el foco, se cierra con Escape o con sus botones, restaura el foco al disparador y bloquea el scroll de fondo. Si WebGL falla conserva las instrucciones de los pasos.

## Calidad de los recortes

- El selector ofrece **Bajo (160)**, antes Equilibrado; **Medio (224)**, antes Alto; **Alto (336)**, antes Muy alto; y el nuevo **Muy alto (504)**. Los tres niveles renombrados conservan su grilla. Las columnas del lado mayor son 320, 896, 1344 y 2016 respectivamente. Muy alto refina Alto un 50% por eje, redondeando las filas a enteros en cada paso. La imagen objetivo conserva sus 512 × 512 píxeles; se refinan los recortes.
- Borrador (96) se retiró del selector. La geometría histórica sigue legible, pero al abrir un proyecto en el editor se convierte a Bajo (160). Los demás valores guardados conservan su resolución bajo sus nombres nuevos.
- La resolución en profundidad acompaña las proporciones del panel: hasta 1024 filas en Medio, 1536 en Alto y 2304 en Muy alto. El marco conserva su ancho físico al refinar la grilla, con redondeo a celdas completas.
- `printableMask` elimina material sin conexión al marco y une contactos diagonales con una celda de material para evitar aristas compartidas por cuatro caras. La proyección, los patrones, SVG y STL usan estos mismos recortes. Esto no garantiza un ancho mínimo imprimible: depende de las medidas y de la impresora.
- El STL triangula los contornos y extruye sus bordes; no genera dos caras por cada celda interior. Las aristas de la triangulación se subdividen donde corresponde para que las tapas coincidan con las paredes sin uniones en T.
- La simulación sigue siendo una aproximación de luz puntual. Incluye la sombra de las piezas impresas de la base y soporte, y muestra el porcentaje estimado del área de recortes bloqueada. Se omiten los recortes totalmente ocultos; no se trasladan. No modela el tamaño real del emisor, los cables o los componentes comprados. En 1 W se acorta el tramo delantero hasta dejar holgura para el cabezal.

La biblioteca de diseños utiliza `SavedDesigns`, `useSavedDesigns` y la capa común de almacenamiento. `projects.ts` conserva la validación v2, conversión de `shadowbox.design.*` y limpieza del archivo `.meta` al borrar. Las claves de cuadros y su selección siguen independientes de lámparas. Ver [persistencia compartida](saved-designs.md).
