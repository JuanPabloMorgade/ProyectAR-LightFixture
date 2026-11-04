# LampEditor

**Archivo:** `src/features/lithophane/editor.tsx`. **Ruta:** `/lamparas`.

Editor cliente de litofanías: carga JPG/PNG/WebP, ofrece Plano, Curvo y Esferas navideñas, ajusta medidas y espesores en mm, contraste, inversión y detalle. Conserva los paneles de 180° de proyectos anteriores. Las imágenes se procesan en el navegador y se reducen a un máximo de 1600 px por lado.

## Organización del estudio

El panel izquierdo sigue tres pasos: **Elegí tu litofanía**, **Subí tu fotografía** y **Personalizá tu diseño**. `studio-controls.tsx` aporta tarjetas de variante con radios nativos, secciones desplegables y ayudas que reutilizan el modal accesible compartido. `design-settings.tsx` mantiene las medidas, abertura y opciones de caja/soporte a mano; espesores, contraste, inversión, detalle y holgura quedan en Ajustes avanzados. Plegar una sección no desmonta controles ni altera valores.

`photo-guide.tsx` ubica la recomendación junto al cargador y ofrece diagramas locales en un modal. Identifica la imagen de ejemplo. `photo-advice.ts` analiza la foto cargada usando la proporción real de la franja esférica y una tolerancia de orientación UX configurable del 12 %, sin bloquear la creación. En paneles describe la adaptación completa al ancho/arco y alto, sin inventar límites numéricos ni prometer recortes automáticos.

Para esferas, **Cómo aplicar la foto** permite elegir entre **Panorámica · cubrir 360°** (comportamiento anterior) y **Conservar proporción · foto centrada**. El segundo coloca la imagen completa en un sector frontal y deja liso el resto; las recomendaciones y diagramas se adaptan al modo. `settings.spherePhotoFit` persiste en el proyecto y se conserva al alternar variantes. Los proyectos anteriores sin esta propiedad mantienen su aspecto panorámico.

En foto centrada aparece **Estiramiento horizontal**: de 0 % (proporción original) a +75 %, con ajustes de 1 %. Permite ensanchar suavemente la foto manteniendo su altura y encuadre completo, hasta completar la vuelta. El valor se guarda en `settings.spherePhotoStretch`, se conserva al cambiar de variante y se aplica tanto a la vista como al STL.

El panel derecho conserva `Viewer`, controles de luz y componentes separados. Sigue con dimensiones, espesores y descarga; `printing-guide.tsx` agrupa impresión, montaje y detalles técnicos, incluida la cantidad de triángulos. Las advertencias críticas de LED y sujeción de esferas permanecen visibles fuera de los desplegables.

`studio.css` aplica los estilos únicamente al estudio y sus ayudas. Dos columnas en escritorio, una hasta 850 px y enlace directo a la vista 3D en el encabezado. No usa elementos sticky. La barra compacta de proyectos reúne nombre, guardados y acciones.

## Inicio y diseños guardados

Al montarse crea el worker, lista los diseños y carga siempre el ejemplo con los parámetros predeterminados. El selector comienza vacío, incluso si hay un único guardado o un registro del último proyecto. Seleccionar una opción no aplica el diseño: hay que pulsar la carpeta.

La cabecera contiene Exportar proyecto, Importar y Guardar. Guardar agrega un diseño por nombre o actualiza el existente; eliminar pide confirmación. `SavedDesigns`, `useSavedDesigns` y `project-storage.ts` comparten interfaz y operaciones con Cuadros de Sombra. El adaptador `projects.ts` conserva el formato JSON v1, sus validaciones y claves independientes. Ver [persistencia compartida](saved-designs.md).

Los diseños se guardan en `proyectar:lamp:v1:<nombre>`. `proyectar:lamp:last` es un metadato y no aplica proyectos al iniciar. El antiguo guardado único `proyectar:lamp:v1` sigue disponible; se retira solo después de guardar correctamente su reemplazo con el mismo nombre. Guardar con otro nombre conserva ambos.

## Variantes y exportación

- **Plano y Curvo:** panel independiente o [kit opcional de iluminación](lamp-housing.md) con panel, caja trasera, marco y tapa: cuatro STL y guía. La caja comienza desactivada, con profundidad de 25 mm y holgura total de 0,3 mm; admite 12–80 mm y 0,1–0,6 mm respectivamente.
- **Panel de 180° anterior:** conserva su forma y exporta el panel independiente. Los ajustes de caja se conservan al alternar variantes.
- **Esferas navideñas:** [cuerpo hueco con relieve exterior y tapa tubular](lamp-sphere.md). Exporta dos STL y guía; no usa caja trasera ni soporte removible.

Los paneles tienen [soporte removible](lamp-print-stand.md) activado inicialmente. Agrega 3 mm de altura y contactos que se cortan después de imprimir. Ver soporte de impresión lo muestra en violeta y oculta la caja durante la inspección. `settings.printStand` ausente equivale a activado; `false` conserva la exportación sin soporte.

## Detalle

| Nivel | Plano / Curvo | Esferas |
| --- | --- | --- |
| Borrador | 80 | 80 |
| Equilibrado, inicial | 160 | 160 |
| Alto | 256 | 256 |
| Muy alto | 384 | 384 |
| Ultra | 448 | 512 |

En paneles, la resolución se aplica al lado mayor y el otro conserva su proporción. Ultra equivale a 3,5 veces 128 muestras en el lado mayor. En esferas, Ultra usa 1024 muestras alrededor y equilibra el paso vertical; en Ø80 mm aproxima 0,25 mm en ambos sentidos. El editor muestra la separación según el diámetro actual y advierte del mayor tamaño y tiempo de cálculo.

Al cambiar de variante con Ultra seleccionado, adapta 448/512 al tipo de pieza. Los proyectos anteriores de esferas de 640 puntos se abren con Ultra 512. Los demás niveles se conservan. El nivel elegido se guarda en JSON v1 y la vista y el STL utilizan la misma malla.

## Cálculo, avisos y errores

`mesh.worker.ts` genera la malla y las piezas opcionales, y transfiere sus buffers. `mesh.ts` valida ajustes, genera paneles y serializa STL; `sphere.ts` genera esferas. Los índices de las esferas se preasignan en un `Uint32Array` para reducir memoria temporal. Los identificadores de solicitudes evitan aplicar resultados anteriores de fotos o mallas.

Cargar una foto muestra «Imagen cargada correctamente»; abrir o importar un diseño muestra «Diseño cargado correctamente». Ambos toast sugieren ajustar Detalle para mejorar la definición. Cada aviso tiene una identidad nueva para reiniciar sus seis segundos en cargas consecutivas. El ejemplo inicial no muestra este aviso.

Los fallos de almacenamiento muestran advertencias persistentes. Los errores de cálculo, carga o exportación muestran un toast de error y bloquean la descarga cuando corresponda. Cerrar el aviso no elimina el error. Al fallar un recálculo se conserva la última vista válida con el rótulo Vista anterior. Un fallo exclusivo de WebGL informa el problema, pero permite exportar una malla válida.

Ver [LampViewer](lamp-viewer.md) y [pruebas y revisión manual](../testing.md).
