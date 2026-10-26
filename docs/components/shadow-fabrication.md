# Fabricación del prototipo de Cuadros de sombra

**Archivo:** `src/features/shadowbox/fabrication.ts`.

El panel **Luz y armado** permite elegir 1, 2 o 3 LEDs, el diámetro del cuerpo, el diámetro máximo del reborde, la altura total y la holgura. Los valores iniciales corresponden a la medición del usuario: cuerpo de 5 mm, reborde de 5,2 mm y altura de 5 mm. La holgura inicial es 0,25 mm y es total, no por lado. Se debe calibrar mediante una impresión de prueba.

## Soporte y conexiones

La tapa frontal incluye uno, dos o tres soportes cilíndricos huecos. El reborde del LED descansa en un asiento de 0,8 mm como máximo; la cabeza queda expuesta hacia la pared de proyección. Los conductos para ambas patas atraviesan la tapa y continúan dentro de los cilindros. No se genera caja electrónica ni circuito.

Un LED queda centrado, dos quedan simétricos y tres quedan en línea con uno central. Los soportes tienen paredes de 1,5 mm y están separados entre sí por 1 mm. La altura se calcula para situar la punta nominal del LED en la posición de luz configurada. Si no quedan al menos 1,5 mm de soporte por encima de la cara interior de la tapa, se bloquea la exportación: hay que bajar la posición de luz o aumentar la profundidad.

El diámetro del asiento es el diámetro máximo del reborde más la holgura. Es un alojamiento de prueba, sin retén ni clip: si el LED queda suelto necesita un punto de adhesivo. La medida del LED no determina por sí sola la posición exacta de su emisor interno; la proyección física requiere una prueba.

## Encastres

Los encastres son opcionales y vienen activos. Las paredes alternan cinco tramos de dientes en las esquinas; tres lengüetas de cada pared entran en las ranuras abiertas del perímetro de la tapa. La holgura separa las superficies de contacto. Son guías de montaje, sin traba mecánica: facilitan alinear las piezas antes de fijarlas.

Se necesita un espesor mínimo de 1,2 mm. `fabricationMasks` conserva un nervio de material de 1,2 mm detrás de los dientes y elimina islas sueltas. El editor aplica esas mismas máscaras al SVG, la simulación y la exportación: el refuerzo puede cerrar recortes próximos al borde. El SVG representa las aberturas ópticas; los dientes y las ranuras de montaje están en los STL.

Las dimensiones configuradas siguen definiendo los planos medios de las paredes. Con encastres, el tamaño exterior es ancho + espesor por alto + espesor; las lengüetas frontales llegan hasta profundidad + espesor/2. No se escala el patrón ni se modifican las unidades.

## Exportación y vista

Se mantienen cinco piezas: cuatro paredes y una tapa con los soportes integrados. La tapa se imprime con su cara exterior en la cama y los cilindros hacia arriba. El STL combinado conserva 12 mm entre piezas; el ZIP incluye los cinco STL numerados y `Guia-de-armado.txt` con medidas y orientación.

`fabricationParts` es la fuente de geometría para STL, visor y guía. `assemblyMesh` convierte las mismas mallas de impresión de mm a cm y orienta la tapa hacia el interior, corrigiendo su winding. `ledLayout` define los centros y comprueba el espacio disponible. Los marcadores de LED son indicativos, no una representación del encapsulado medido.

La simulación y los rayos siguen usando **una fuente puntual central**. Los alojamientos de dos o tres LEDs no implican una simulación de varias fuentes: varios LEDs simultáneos pueden producir sombras desplazadas o superpuestas.

## Compatibilidad y verificación

La configuración se guarda como campo opcional `fabrication` del proyecto v2. Al abrir un proyecto anterior sin ese campo, el editor muestra los valores iniciales. Los consumidores de exportación que omiten `fabrication` mantienen las cinco piezas planas anteriores.

Las pruebas comprueban sólidos cerrados, orientación de caras, volumen positivo, ausencia de triángulos degenerados, conectividad del material, muestras de encastres sin interpenetración, posiciones de luz, refuerzo idempotente, guardado/importación, parámetros inválidos y contenido STL/ZIP. No sustituyen la calibración física de la impresora ni una prueba de iluminación.
