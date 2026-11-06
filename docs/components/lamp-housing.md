# Caja trasera de litofanías

**Archivos:** en `src/features/lithophane/`, `housing-config.ts`, `housing.ts`, `housing-export.ts`, `mesh.worker.ts`, `frame-texture-config.ts`, `frame-texture-profiles.ts`, `frame-texture.ts`, `texture-thumbnail.tsx`, `texture-customizer.tsx` y `texture-customizer.css`.

El kit opcional para Plano y Curvo contiene cuatro sólidos independientes: panel original, caja, marco frontal y tapa posterior. El ZIP agrega `Guia-de-armado.txt`. Los componentes de iluminación no se generan.

## Dimensiones y montaje

- Paredes de 2,4 mm. Espacio detrás del panel inicialmente de 25 mm, editable entre 12 y 80 mm; marco y tapas agregan espesor exterior.
- Holgura total de 0,3 mm, editable entre 0,1 y 0,6 mm. Marco y tapa entran con rebordes de guiado, sin pestillo; comprobar ajuste y retención con una impresión real y fijación removible si hace falta.
- La foto se coloca desde el frente y apoya sobre un asiento interior. El marco desmontable cubre 2 mm de su perímetro y la mantiene entre marco y asiento. No modifica el relieve ni recorta el archivo del panel.
- La tapa posterior permite acceder a la iluminación. Hay un paso inferior para cable de 4 mm, separado del reborde de la tapa y del asiento de la foto. No presupone conector, LED o fuente específicos.

En Plano, las coordenadas son cartesianas. En Curvo se usan arcos concéntricos con el mismo radio que el panel: la profundidad es radial y las tapas acompañan esa curvatura. El generador exige radio positivo, al menos 6 mm interiores después de descontar caja y tapa, y perímetros sin cruzar los laterales. Si no cabe, informa reducir profundidad, aumentar el ancho del arco o elegir Plano.

Semicírculo mantiene el panel independiente. La configuración de caja se conserva al alternar formas, pero no se genera ni descarga mientras el ángulo sea 180°.

## Generación, impresión y persistencia

El worker genera todas las mallas y transfiere sus buffers. El visor usa coordenadas de montaje y la exportación orienta los tres componentes nuevos por separado: caja plana con abertura posterior sobre la cama, marco plano con cara exterior sobre la cama y tapa plana con cara exterior sobre la cama. Las piezas curvas se orientan sobre su borde inferior; revisar soportes para los tramos superiores y el asiento. El panel se exporta de pie con [soporte removible](lamp-print-stand.md) inicialmente activado; debe retirarse antes del montaje. Desactivarlo conserva la orientación anterior del panel.

`settings.housing` es opcional en el formato v1. Conserva `enabled`, `depth`, `clearance` y los campos opcionales de textura. Proyectos anteriores sin esos campos conservan su comportamiento. Los errores de medidas o radio bloquean la descarga; el identificador de solicitud evita usar un resultado anterior tras cambiar ajustes.

## Textura del marco

Con la caja activada, **Textura del marco** muestra una miniatura, el acabado y el resumen de la configuración aplicada. **Personalizar textura** abre `TextureCustomizer`, que reutiliza `Modal`, `Disclosure`, `RangeField` y el mismo `Viewer` 3D. Esquinas del marco permanece primero. La galería ofrece 12 acabados y filtros Todas, Geométricas, Orgánicas y Minimalistas (una textura puede pertenecer a varias categorías). Filtrar no cambia el borrador: el acabado seleccionado sigue indicado aunque su tarjeta quede oculta. El encabezado y las acciones permanecen visibles con scroll interno; la galería usa cuatro columnas en escritorio y dos en pantallas menores. Sus miniaturas se muestrean desde el mismo perfil matemático que genera el relieve.

`frame-texture-config.ts` separa identificadores, nombres, descripciones, categorías, límites compartidos, presets, dimensión de referencia y función de generación del patrón. `frame-texture-profiles.ts` contiene los campos de altura deterministas, sin dependencias nuevas. `texture-thumbnail.tsx` dibuja SVG livianos; `texture-customizer.tsx` y su CSS implementan el resumen y el modal. La geometría sigue en `frame-texture.ts` y `housing.ts`.

La selección se guarda en `housing.frameTexture` (ver catálogo inferior); su ausencia equivale a Sin textura. Los nuevos campos opcionales son `frameTextureArea` (`front`, `sides`, `all`), `frameTextureDepth` (0,15–0,6 mm) y `frameTextureScale` (0,75–2×). Sus valores anteriores implícitos son todo el exterior, 0,6 mm y 1×: los proyectos existentes conservan sus ajustes y perfiles. Se corrige una intersección posible en la marca grabada de la tapa: su fondo y paredes ahora acompañan el relieve exterior, en lugar de mover solo la cara superior. Suave, Medio y Fuerte corresponden a 0,2, 0,4 y 0,6 mm; otros valores muestran Personalizado. La escala modifica el tamaño del motivo y sus detalles, sin modificar márgenes ni encastres. El control muestra la dimensión física correspondiente al patrón; en campos orgánicos es una referencia, no una separación uniforme.

**Esquinas del marco** permite elegir Rectas o Redondeadas y ajustar `housing.frameCornerRounding`, un porcentaje entero de 0 a 100. Su ausencia y 0 % conservan exactamente la geometría anterior. Redondeadas comienza en 50 %; 100 % equivale a un radio de perfil de 2,4 mm, limitado por la pared de la caja. Funciona también con Sin textura y se aplica a los cuatro vértices exteriores de caja, marco y tapa. El perfil interior, las guías, la foto y el cable no cambian.

`frame-corners.ts` proyecta los parches de las esquinas sobre arcos en las coordenadas del panel, antes de curvarlo, para que coincidan las tres piezas. Agrega muestras críticas de arco sin reducir la separación habitual de las muestras del agujero del cable. Los porcentajes pequeños usan menos segmentos para evitar triángulos microscópicos. La vista y el ZIP comparten las mallas redondeadas y la guía incluye porcentaje y radio. El valor participa del mismo borrador: Aplicar confirma, Cancelar/Escape descartan y Restablecer vuelve a 0 % junto con los ajustes de textura. La selección se guarda en los proyectos.

Frente afecta solo la cara frontal del marco; Laterales afecta las cuatro caras exteriores y los cantos externos del marco y la tapa; Todo el exterior agrega el frente y el dorso de la tapa. Al volver a Sin textura se recupera la geometría lisa original (con el redondeo elegido, si corresponde). Al desactivar la caja o elegir Esfera, la selección se conserva pero no se aplica.

El editor mantiene un borrador de textura separado de `settings`: la vista 3D y el worker reciben valores temporales, mientras el proyecto sigue confirmado. Aplicar confirma sin regenerar la misma malla; Cancelar, Escape, el cierre y el backdrop restauran la configuración confirmada. Restablecer solo modifica el borrador de textura. Los cambios rápidos se agrupan durante 350 ms y una respuesta anterior nunca habilita una descarga nueva. El worker reutiliza foto, tapa de esfera y soporte solo si el cliente confirma haber recibido esa misma geometría mediante `currentMeshKey`; al cambiar la imagen o sus parámetros vuelve a generarlos.

`frame-texture.ts` aplica los perfiles del catálogo como relieve cóncavo de hasta 0,6 mm en todo el exterior: frente, cuatro laterales de la caja, cantos exteriores del marco y tapa, y dorso de la tapa. Subdivide las caras de la malla rectilínea cada 0,5 mm antes de redondear el paso del cable y curvar la caja, sin crear una grilla volumétrica densa. Los bordes quedan lisos durante 0,8 mm y la transición ocupa otros 0,6 mm. Se conservan la foto, las superficies interiores, el asiento, los rebordes de guiado, el paso del cable y el tamaño exterior. La pared frontal conserva al menos 1,5 mm incluso donde coincide la marca grabada del dorso.

Las mismas mallas alimentan el visor y los tres STL de la caja dentro del ZIP. La guía de armado incluye la textura y las recomendaciones: boquilla de 0,4 mm, capas de 0,12 a 0,2 mm, revisar puentes en las ranuras del marco y tapa planos, y paredes y soportes en Curvo. La imprimibilidad y el acabado final requieren una prueba física con el material y la impresora elegidos.

`tests/lamp-frame-texture.test.ts` comprueba las once texturas con relieve en Plano y Curvo, sólidos cerrados en las tres piezas, relieve en los cuatro laterales, conservación de la foto, encastres, orientación, correspondencia binaria de los tres STL y compatibilidad de proyectos anteriores.

`tests/lamp-housing.test.ts` verifica sólidos cerrados, normales, orientación de impresión, holguras en los puntos de ajuste, paso del cable, fotos finas, límites y contenido del ZIP. `tests/lamp-editor.test.tsx` comprueba activación, persistencia, descarga, Semicírculo y recuperación de errores. La retención, los soportes de impresión y la iluminación requieren prueba física.

## Catálogo ampliado y parametrización

| Identificador | Acabado | Perfil geométrico y referencia a escala 1× |
| --- | --- | --- |
| `none` | Sin textura | Sin desplazamiento |
| `lines` | Líneas | Surcos diagonales, período 5 mm |
| `waves` | Ondas | Surcos sinusoidales, período base 5 mm |
| `dots` | Puntos | Cavidades circulares, grilla de 5 mm |
| `hexagonal` | Hexagonal | Panal regular, 8 mm entre caras |
| `low-poly` | Low Poly | Interpolación planar en triángulos de una grilla de 7 mm |
| `topographic` | Topográfica | Isolíneas de un campo sinusoidal continuo, escala base 16 mm |
| `diamond` | Diamante | Dos familias de diagonales cruzadas, separación 5 mm |
| `voronoi` | Voronoi | Distancia a bisectrices de sitios con semilla fija, separación media 8 mm |
| `wood` | Madera | Vetas con ondulaciones largas de varias frecuencias, separación base 4,8 mm |
| `concentric` | Concéntrica | Anillos circulares desde el origen de la cara, separación 5 mm |
| `hammered` | Martillada | Depresiones cosenoidales con posiciones, radios y profundidades variables; separación media 5,5 mm |

Todos los perfiles devuelven valores entre 0 y 1; la profundidad los multiplica antes de aplicar la máscara protectora. Low Poly, Voronoi y Martillada usan hashes enteros con semillas fijas. Voronoi y Martillada comparten una caché acotada a 512 vecindarios (25 sitios por vecindario); su expulsión no altera el resultado. No hay aleatoriedad por sesión ni parámetros nuevos obligatorios en el formato v1. Se mantienen el worker, el debounce, la reutilización del panel fotográfico y la liberación de recursos del visor.

Los patrones se evalúan en coordenadas físicas del panel antes de curvarlo. Las caras frontal y posterior usan `(u, y)`; los laterales usan su coordenada longitudinal y profundidad. No hay reinicios por triángulo ni por fragmento de la grilla. **No se promete continuidad envolvente entre caras ortogonales:** se mantiene una franja lisa de 0,8 mm y una transición de 0,6 mm en cada unión. Esta decisión conserva los encastres y permite redondear esquinas sin forzar uniones del patrón. La marca grabada exterior se desplaza junto con la tapa; el espesor mínimo combinado sigue siendo mayor a 1,5 mm.

Los patrones originales conservan el paso de 0,5 mm. Los nuevos usan 0,35 mm multiplicado por la escala, con tope de 0,5 mm (0,2625 mm a escala mínima), tanto en visor como STL. Esto da al menos cinco muestras a lo ancho nominal de los surcos más finos nuevos. Las facetas matemáticas de Low Poly se aproximan en esa grilla compartida; sus límites diagonales pueden tener una transición de hasta una celda. Los anillos son circulares, sin ajuste automático a proporciones. La geometría no requiere shaders, mapas normales ni imágenes remotas.

Para los surcos nuevos de panal y Voronoi se usa un ancho nominal de 1,8 mm (1,35 mm a escala mínima); las huellas martilladas tienen diámetros de 3 a 4,6 mm antes de escalar. Son límites geométricos, no una garantía de reproducción con cualquier boquilla. El modal y la guía piden revisar primeras capas y puentes: Low Poly y los motivos grandes pueden dejar zonas deprimidas más extensas que las ranuras originales. La prueba física sigue pendiente.

## Verificación del catálogo

- `lamp-texture-catalog.test.ts`: perfiles acotados, continuidad, reproducibilidad, expulsión de caché, escala, intensidades, compatibilidad exacta de perfiles originales y serialización de proyectos.
- `lamp-texture-gallery.test.tsx`: filtros, selección oculta conservada, orden de las esquinas, aplicar, cancelar y restablecer.
- `lamp-texture-matrix.test.ts`: ocho texturas nuevas, piezas cuadradas y rectangulares, zonas, radios, profundidad y escala extremas, cuerpos cerrados/conectados, triángulos no degenerados, orientación y puntos funcionales. Incluye regresión de la marca de la tapa.
- El test anterior puede escribir las 24 piezas STL de los casos de relieve máximo si se define `PROYECTAR_TEXTURE_QA_DIR` con una carpeta de salida. Sin esa variable no escribe archivos.
- `lamp-frame-texture.test.ts`: las once texturas en plano y curvo, foto intacta y coincidencia binaria entre las piezas mostradas y los STL del ZIP orientados para imprimir.

Los tests de malla comprueban aristas compartidas, orientación, volumen positivo y conectividad; no constituyen una demostración exhaustiva de ausencia de autointersecciones para toda combinación de parámetros.

Comprobación en OrcaMCP/OrcaSlicer 2.5.0.13-dev (2026-11-06): se abrieron las 24 piezas STL de los ocho acabados nuevos, a escala 0,75×, profundidad 0,6 mm y redondeo 100 %, en marcos de 40 × 40 y 80 × 40 mm. Todas reportaron una malla cerrada y una sola componente, sin advertencias de malla. Con el muestreo final más fino, el laminador advirtió regiones suspendidas en `voronoi-lid.stl`; el modal y la guía ahora indican usar soportes automáticos para esa tapa. Las tres placas completaron el laminado con `slice_result_valid: true` y `gcode_check.ok: true`, boquilla 0,4 mm y capas de 0,2 mm. Esto valida esos casos en el laminador; no implica una prueba física ni el barrido completo del espacio de configuraciones. Orca puede reparar STL silenciosamente al importar; las comprobaciones automatizadas se ejecutaron sobre las mallas originales antes de importarlas.

Tras activar soportes automáticos solo para la tapa Voronoi, el laminado final de las tres placas terminó sin advertencias y con comprobación de G-code correcta. No se envió ningún trabajo a una impresora.

Validación de la ampliación: 103 casos únicos aprobados entre catálogo (17), galería (1), matriz (17), exportación/texturas (23), opciones (5), esquinas (5), worker (1), editor (24) y caja (10). `npm run build` y `git diff --check` aprobados. Revisión visual en escritorio y móvil de 390 px, filtros con teclado, foco visible y restaurado al cancelar, selección al reabrir y ausencia de desbordes. La consola no mostró errores de esta funcionalidad; conserva una advertencia previa del tamaño del logo.
