# LampEditor

**Archivo:** `src/features/lithophane/editor.tsx`. **Ruta:** `/lamparas`.

Editor cliente de litofanías: carga JPG/PNG/WebP, ofrece Plano, Curvo y Esferas navideñas, ajusta medidas y espesores en mm, contraste, inversión y detalle. Conserva los paneles de 180° de proyectos anteriores. Las imágenes se procesan en el navegador y se reducen a un máximo de 1600 px por lado.

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
