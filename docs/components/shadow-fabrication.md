# Fabricación del prototipo de Cuadros de sombra

## Armado actual: base contra la pared

La estructura actual sigue la referencia de STL y la aclaración visual del usuario: **base de pared con anclaje y pilas → tapita de pilas → tapa electrónica con agujero central → tubo y LED → cuatro paneles de sombra → embellecedor hacia la persona**. Reemplaza la disposición anterior que ponía la electrónica detrás del frente.

El editor usa únicamente LED de 1 W con 3 AAA o USB. `enclosure.layout = "wall"` identifica este armado. Los proyectos anteriores, incluidos los de COB, se adaptan a 1 W al abrirse, conservando imagen y medidas e informando el cambio; requieren revisar sus componentes físicos. Los generadores históricos siguen disponibles para leer y comprobar datos anteriores, pero no se ofrecen como alternativas nuevas en la interfaz. Las menciones a COB siguientes documentan esa compatibilidad de la API.

| Pieza | LED de 1 W | COB |
| --- | --- | --- |
| Paredes superior/inferior/izquierda/derecha | 01–04 | 01–04 |
| Embellecedor frontal | 05 | 05, con rebajes COB por detrás |
| Base de pared con anclaje | 06 | 06 |
| Tapa electrónica con paso central | 07 | 07 |
| Tubo hueco Ø10 mm | 08 | — |
| Cabezal orientado hacia la pared | 09 | — |
| Tapita del portapilas | 10, sólo 3 AAA | — |

Son **10 piezas para 1 W con 3 AAA**, **9 para 1 W USB** y **7 para COB**. STL combinado, ZIP, visor y guía comparten `fabricationParts`. La guía actual recorre doce etapas y diferencia tapa electrónica de tapita de pilas. La electrónica queda dentro de la base posterior, no en el embellecedor.

### Base, tapas y anclaje

`wallmount.ts` genera una base de **20 mm por defecto**, fondo de 2 mm y un solo perímetro elevado de 2 mm. Se elimina la segunda pared exterior que formaba un canal. El fondo sobresale como reborde de apoyo. Dos nervios verticales de 1,2 mm por lado guían las paredes, que bajan por fuera de la base hasta Z=2 mm más media holgura. Sus ranuras interiores reciben los nervios y tienen entrada 0,4 mm más ancha por lado. El rebaje conserva al menos 0,6 mm de cara exterior y termina antes de los recortes. Sin encastres se omiten nervios y ranuras, conservando el tramo inferior cerrado. Los cuatro STL de paredes tienen las ranuras hacia arriba; al montar se invierte el espesor de inferior y derecha conservando las normales. El anclaje mantiene su refuerzo de 6 mm, entrada de 8 mm y cuello de 4 mm configurables.

El portapilas comercial de 3 AAA usa una envolvente inicial **55 × 38 × 14 mm provisional**, editable. Se introduce por una abertura de la **cara posterior**, sin desmontar paredes ni separador. La tapa 10 queda al ras de Z=0, con placa de 1,2 mm y reborde hasta Z=2,8 mm. Un asiento posterior y una muesca permiten presentar y retirar la tapa. El ajuste es guiado, sin pestillo: comprobar retención y usar fijación removible si hace falta. La validación reserva altura para reborde, portapilas, holgura y separador de 2 mm; con el portapilas inicial caben en 20 mm. Los proyectos guardados conservan su altura configurada; el valor inicial nuevo es 20 mm.

El alojamiento del tubo en la base y el paso de la tapa son **circulares**: Ø10 mm más la holgura diametral (Ø10,25 mm inicialmente). El collar exterior de la base también es redondo; su fondo permanece ciego y conserva la entrada lateral de cables. COB usa un paso circular de Ø4 mm más holgura. `round-opening.ts` remapea localmente una rejilla conformada a perfiles circulares, con muestreo angular y transición de 2 mm hacia la geometría fija. `meshAxes` evita láminas diminutas al agregar muestras curvas sin desplazar los límites de las piezas. La tapa con relieve usa la misma abertura circular y mantiene una malla cerrada. El ajuste del tubo debe probarse con la impresión real.

El tubo circular de Ø10 mm comienza en la base y lleva un canal configurable, inicialmente Ø4 mm. Es un pasacables y ya no soporta mecánicamente el cabezal. El cabezal 09 es un puente plano sujeto a la cara posterior del marco mediante dos tetones de 2,8 × 4 mm y rebajes ciegos de 1 mm. Los rebajes incorporan la holgura y quedan entre las lengüetas de las paredes, retirados de su espesor para evitar interferencias. El cabezal entero está detrás del emisor y no corta el cono de luz. Reemplaza la horquilla anterior que generaba una franja vertical. Presentar y calibrar los encastres; pueden requerir fijación removible. La estrella nominal es Ø20 × 1,2 mm y la altura del emisor sobre ella es **5 mm provisional**. Medir los componentes y acomodar los cables finos antes de imprimir. Los componentes electrónicos visibles no se exportan como plástico.

### Terminaciones de la base posterior

`rear-finish.ts` genera las terminaciones en la geometría compartida por el visor y los STL: entrada circular del anclaje con cuello de extremo redondeado, esquinas exteriores de la base y perímetro electrónico con radio de 2 mm y esquinas inferiores del refuerzo del anclaje redondeadas. El asiento y la tapa posterior de pilas conservan sus dimensiones rectangulares para que sus holguras coincidan. El collar del tubo incorpora una entrada achaflanada de 0,3 mm; el diámetro de trabajo por debajo permanece igual.

Las pruebas verifican entradas de anclaje de 6 y 12 mm, cuellos de 2 y 6 mm, pasos circulares y mallas cerradas. La forma redondeada no certifica la carga del anclaje ni sustituye la calibración de los encastres impresos.

### Frente abierto y tapa trasera lisa o con diseño

El embellecedor 05 es un marco abierto, con banda de espesor + 6 mm (8 mm inicialmente) para 1 W y una banda más ancha para COB. `wall-front.ts` incorpora los dos rebajes del cabezal y la abertura frontal. El cierre continuo queda atrás, en la tapa electrónica 07, junto a la pared.

La clave guardada `enclosure.front` se conserva por compatibilidad, pero ahora controla **el diseño de la tapa trasera**: `plain` o `design`. `wall-rear.ts` genera relieve real de la imagen actual, inicialmente de **0,6 mm**, hacia la persona. La tapa mantiene su agujero central y faldón de ajuste hacia la base. Se unen contactos diagonales para conservar una malla cerrada. El visor remarca las aristas del relieve; el STL no guarda colores.

El proyecto sigue guardando una sola imagen PNG. El editor pasa su buffer RGBA como `artwork` a los visores y al worker de exportación; no hay subida al servidor. Si falta la imagen para una tapa trasera con diseño, el generador rechaza la petición.

### Proyección con la separación real de la base

`projectionSettings` deriva `wallOffset` de la altura de la tapa, incluyendo el relieve. La corrección `panelExtension = (altura de caja − arranque de panel) / 10` es cero para tapa lisa y negativa para relieve. Para 1 W se conserva `frontTrim`: el extremo delantero deja holgura para el cabezal. Subir el arranque acorta el tramo trasero conservando las posiciones del LED y del marco. Las máscaras se regeneran con ese origen; no se traslada el dibujo. La normalización revierte ambas correcciones si recibe parámetros derivados y los valores guardados mantienen sus unidades originales.

Para COB, la fuente puntual se sitúa a la altura física estimada de la cara de la tira, detrás del marco. El porcentaje mostrado es derivado y no se edita mientras se usa COB. Los rebajes y sus marcas quedan sobre el perímetro, separados de la abertura por al menos 1,2 mm. El automático coloca dos tramos sobre lados opuestos del marco; en manual se conservan las posiciones al cambiar cantidad y se rechaza invadir el hueco. La simulación no modela una fuente extendida.

El ejemplo inicial de 150 × 150 mm, profundidad máxima de 60 mm sobre base de **20 mm** y pared de 2 mm sitúa el LED al 50% a **Z=50 mm**. El tramo óptico va de **Z=20 a Z=61,45 mm**, con 41,45 mm de largo; con relieve de 0,6 mm comienza en Z=20,6 y mide 40,85 mm. El tramo inferior cerrado de las paredes se extiende hasta Z=2,125 mm con holgura de 0,25 mm. El tubo mide **40 mm** y el máximo exterior es **63,45 mm**. Son cotas del prototipo propio.

### Posición válida al abrir o entrar en 3D

`light-position.ts` calcula límites según profundidad máxima, espesor y altura del emisor/estrella. Al abrir/importar proyectos y al entrar en Vista 3D se limita una posición incompatible al valor válido más cercano, informando el cambio. El caso inicial de 85% pasa a **83%**, no a 50%. Las posiciones ya válidas y COB se conservan; las ediciones manuales dentro de 3D siguen mostrando errores si se excede el rango. Si ninguna posición cabe o falla otra medida, se mantiene el error correspondiente. El ajuste solo cambia el proyecto en memoria; guardar continúa siendo explícito.

### Bloqueo del patrón por la propia lámpara

`projection-occlusion.ts` proyecta los triángulos reales de base, tapas, tubo, cabezal y tramos inferiores cerrados de las paredes sobre la pared desde la fuente puntual. Recorta contra los planos de pared/emisor y el área visible, y rasteriza la sombra a 512 × 512. Respeta aberturas y descarta piezas detrás del emisor.

El editor muestra el porcentaje estimado de **área de recortes**, ponderado por superficie, que queda en sombra; no es porcentaje de pared total ni consumo de luz. Solo se omite un recorte si el centro y cuatro puntos cercanos a las esquinas quedan bloqueados. La vista superpone la sombra del conjunto impreso y la exportación aplica el mismo filtro. Los recortes no se trasladan a otra altura, porque cambiaría su proyección. No se modelan cables, contactos ni piezas compradas; COB sigue aproximado por una fuente puntual. La prueba física continúa siendo necesaria.

El motor sigue calculando los recortes desde el arranque óptico elevado. La sombra adicional de los tramos inferiores cerrados se obtiene con `wallSleeveMesh`, incluyendo las ranuras interiores y la altura real de apoyo. Así se representa el material que rodea la base sin trasladar el patrón de sombra.

### Validación

Las paredes con ranuras usan `layered-panel.ts`: triangula los contornos de cada capa y sus cambios de altura, conservando los recortes y rebajes exactos. Las uniones rectas se subdividen en los vértices compartidos para evitar aristas abiertas. No se reduce el detalle de la máscara. Una placa plana mantiene 12 triángulos aunque su rejilla tenga miles de celdas.

`preview-model.ts` reutiliza las piezas y sus coordenadas montadas entre el visor y la guía. La caché está asociada a las máscaras inmutables del editor y limitada a dos variantes por dibujo; medidas, fabricación e imagen de relieve invalidan el resultado. La exportación sigue generando sus propias piezas. `assemblyMesh` calcula una sola vez la distribución de la base por pieza, en lugar de recalcularla por vértice. Las pruebas de capas comprueban volumen ocupado, ranuras, agujeros y cierre; las de caché comprueban la invalidación al editar.

Las pruebas comprueban sólidos cerrados y conectados con normales coherentes; geometría de anclaje y pasos; holgura de tapas; posición de base, paneles, tubo y LED; ida/vuelta de rayos con separación; relieve simple y diagonal con agujero; parámetros inválidos; guardado/restauración y STL/ZIP. La vista normal muestra el embellecedor; **Ver interior** permite inspeccionar la base y el soporte. El ajuste mecánico, la carga del anclaje, la sombra y la temperatura todavía requieren un prototipo físico. Ver [referencia y hardware](../references/sombra-modular/README.md).

## Notas de COB y compatibilidad de versiones anteriores

Las cotas de referencia siguientes documentan también la API histórica sin `enclosure.layout = "wall"`. Sus dimensiones exteriores, coordenadas COB y posición de fuente no sustituyen el cálculo de la base posterior descrito arriba.

## Tira LED COB

El panel **Luz y armado** está dentro de **Vista 3D**, debajo del modelo y antes de la guía. Los campos de material, los tramos manuales y el resumen de cortes disponen del ancho del área principal.

La API histórica admite COB blanca de 5 V; el editor actual ofrece solo LED de 1 W. `cob.ts` valida ancho, intervalo de corte, espesor real configurable, holgura total y profundidad. Los valores iniciales son 8 mm, 30 mm, **1 mm provisional**, 0,3 mm y 0,4 mm. Hay que medir el espesor real antes de imprimir.

La zona útil conservadora es ancho/alto entre planos medios menos espesor de pared, holgura de encastre (si está activo) y dos márgenes de `max(2 mm, margen de corte)`. Evita las bandas perimetrales completas de encastre. La tapa con encastres mide ancho+espesor × alto+espesor; el exterior ensamblado alcanza profundidad+espesor/2.

Para el exterior **80 × 130 × 60 mm**, paredes de 3 mm y encastres, los controles existentes corresponden a **7,7 × 12,7 × 5,85 cm**. Con margen de 3 mm y holgura de encastre de 0,25 mm, la zona útil es **67,75 × 117,75 mm**. El automático propone dos cortes verticales de 30 mm, centros X=±6,15 / Y=0 mm: **60 mm en total**. No impone cuatro cortes de 60 mm.

El automático orienta según el espacio disponible y limita el grupo al centro: aproximadamente 40 mm longitudinales y 26 mm transversales con los valores iniciales. Si el intervalo de corte o ancho requiere más espacio para un solo tramo, adapta esa zona mínima. Cantidad y orientación dependen del espacio; nunca llena automáticamente una tapa grande con fuentes separadas. En manual se editan hasta 24 tramos, X/Y, largo y orientación 0°/90°. Al cambiar la cantidad manual se centra la huella emisora del conjunto, conservando largos y separaciones relativas. **Centrar tramos** permite volver al eje óptico después de moverlos individualmente; las ediciones directas de X/Y no recentran automáticamente los demás. X/Y siguen la vista frontal; X se ve invertido al mirar la cara interior. Los largos deben ser múltiplos enteros del intervalo. Un error de ajuste, corte o solapamiento bloquea vista y exportación, sin corregir ni recortar la disposición manual.

Los rebajes son ciegos, únicamente en la cara interior, y dejan al menos 1,2 mm de espesor residual. La profundidad no puede superar el espesor de tira para mantener accesibles superficie y contactos. Cada alojamiento reserva 3 mm libres en ambos extremos para soldadura y cables. Una raya de 2 × 0,8 mm, grabada hasta 0,2 mm fuera del lecho adhesivo, identifica el extremo A sin asignarle polaridad. La validación incluye marcas, bordes y separación mínima entre alojamientos.

La placa portaluces del STL contiene los rebajes y sus marcas, además del paso de cables; los componentes electrónicos no se imprimen. `cob-visuals.ts` muestra la electrónica por separado: tira clara, contactos cobre y contorno celeste. En el visor la tapa exterior es opaca; Ver interior deja ver la tira y los alojamientos. En la guía la tira aparece al instalar la luz, antes del cierre exterior.

El simulador y sus rayos conservan la fuente puntual X=Y=0, Z=profundidad×posición de luz. No cambia imagen, escala, radio ni posición óptica. Se muestra además la superficie COB estimada: profundidad−espesor/2+profundidad de rebaje−espesor de tira. En la referencia las distancias a la pared son **49,725 y 56,4 mm**. La vista no valida ópticamente una fuente extendida: requieren prueba física la penumbra, las sombras múltiples y la diferencia axial.

El proyecto v2 conserva `fabrication.illumination` y `fabrication.cob`, además de `fabrication.enclosure`. Los proyectos anteriores se actualizan en el editor; los ajustes COB y de 1 W se guardan por separado. La guía 3D y el ZIP comparten `cobGuide`: cortes, coordenadas, orientación, paralelo (+ con +, − con −), interruptor en positivo y 5 V. Se usan las marcas reales de la tira; no se supone polaridad universal, consumo ni autonomía.

Las pruebas cubren la referencia, otras medidas, cajas sin espacio, profundidad insegura, solapamientos, cortes inválidos, guardado/restauración, guía y STL/ZIP. Comprueban mallas cerradas y conectadas, orientación, volumen positivo, ausencia de triángulos degenerados y piso ciego mediante rayos. Se conservan las pruebas de LED individuales.

## Compatibilidad con geometría anterior

Las descripciones y pruebas siguientes documentan la API histórica sin `enclosure`, que conserva cinco piezas y admite LEDs individuales para leer y verificar datos anteriores. Estos controles ya no se ofrecen en el editor.

**Archivo:** `src/features/shadowbox/fabrication.ts`.

El prototipo anterior permitía elegir 6, 9, 10 o 12 LEDs, el diámetro del cuerpo, el diámetro máximo del reborde, la altura total y la holgura. Los valores iniciales corresponden a la medición del usuario: cuerpo de 5 mm, reborde de 5,2 mm y altura de 5 mm. La holgura inicial es 0,25 mm y es total, no por lado. Se debe calibrar mediante una impresión de prueba.

## Soporte y conexiones

La tapa frontal incluye 6, 9, 10 o 12 soportes cilíndricos huecos. El reborde del LED descansa en un asiento de 0,8 mm como máximo; la cabeza queda expuesta hacia la pared de proyección. Los conductos para ambas patas atraviesan la tapa y continúan dentro de los cilindros. No se genera caja electrónica ni circuito.

Un LED queda centrado, dos quedan simétricos y tres quedan en línea con uno central. Los soportes tienen paredes de 1,5 mm y están separados entre sí por 1 mm. La altura se calcula para situar la punta nominal del LED en la posición de luz configurada. Si no quedan al menos 1,5 mm de soporte por encima de la cara interior de la tapa, se bloquea la exportación: hay que bajar la posición de luz o aumentar la profundidad.

El diámetro del asiento es el diámetro máximo del reborde más la holgura. Es un alojamiento de prueba, sin retén ni clip: si el LED queda suelto necesita un punto de adhesivo. La medida del LED no determina por sí sola la posición exacta de su emisor interno; la proyección física requiere una prueba.

## Encastres

Los encastres son opcionales y vienen activos. Las paredes alternan cinco tramos de dientes en las esquinas; tres lengüetas de cada pared entran en las ranuras abiertas del perímetro de la tapa. La holgura separa las superficies de contacto. Son guías de montaje, sin traba mecánica: facilitan alinear las piezas antes de fijarlas.

Se necesita un espesor mínimo de 1,2 mm. `fabricationMasks` conserva un nervio de material de 1,2 mm detrás de los dientes y elimina islas sueltas. El editor aplica esas mismas máscaras al SVG, la simulación y la exportación: el refuerzo puede cerrar recortes próximos al borde. El SVG representa las aberturas ópticas; los dientes y las ranuras de montaje están en los STL.

Las dimensiones configuradas siguen definiendo los planos medios de las paredes. Con encastres, el tamaño exterior es ancho + espesor por alto + espesor; las lengüetas frontales llegan hasta profundidad + espesor/2. No se escala el patrón ni se modifican las unidades.

## Exportación y vista

Se mantienen cinco piezas: cuatro paredes y una tapa con los soportes integrados. La tapa se imprime con su cara exterior en la cama y los cilindros hacia arriba. El STL combinado conserva 12 mm entre piezas; el ZIP incluye los cinco STL numerados y `Guia-de-armado.txt` con medidas y orientación.

`fabricationParts` es la fuente de geometría para STL, visor y guía. `assemblyMesh` convierte las mismas mallas de impresión de mm a cm y orienta la tapa hacia el interior, corrigiendo su winding. `ledLayout` define los centros y comprueba el espacio disponible. Los marcadores de LED son indicativos, no una representación del encapsulado medido.

La simulación y los rayos siguen usando **una fuente puntual central**. Los alojamientos de varios LEDs no implican una simulación de varias fuentes: varios LEDs simultáneos pueden producir sombras desplazadas o superpuestas.

## Compatibilidad y verificación

La configuración se guarda como campo opcional `fabrication` del proyecto v2. La API conserva los valores históricos de 6 LEDs y la lectura de configuraciones de 1, 2 o 3 LEDs. El editor actual adapta esos proyectos al montaje de pared de 1 W mediante `currentFabrication`, conservando imagen y medidas e informando el cambio. Los consumidores de exportación que omiten `fabrication` mantienen las cinco piezas planas anteriores.

Las pruebas comprueban sólidos cerrados, orientación de caras, volumen positivo, ausencia de triángulos degenerados, conectividad del material, muestras de encastres sin interpenetración, posiciones de luz, refuerzo idempotente, guardado/importación, parámetros inválidos y contenido STL/ZIP. No sustituyen la calibración física de la impresora ni una prueba de iluminación.
