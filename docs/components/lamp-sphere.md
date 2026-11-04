# Esfera navideña y tapa

**Archivos:** `sphere.ts`, `sphere-cap.ts` y `sphere-export.ts` en `src/features/lithophane`.

## Cuerpo y fotografía

`settings.shape: "sphere"` usa `width` como diámetro exterior máximo del cuerpo, entre 30 y 250 mm. La esfera es hueca, con base cerrada y apoyo plano de Ø6 mm. La foto forma el relieve exterior: oscuros más gruesos y altos, claros más bajos. La superficie interior no depende de la foto ni de su inversión. El espesor máximo se reserva hacia adentro para respetar el diámetro elegido.

La imagen envuelve los 360° de la franja central, normalmente entre ±50° de latitud. Los polos quedan lisos, con una transición de 4°; la franja se reduce en esferas pequeñas para dejar libre el cuello. Los extremos de la imagen se unen atrás. Se recomienda una panorámica de aproximadamente 3,6:1, normalmente 1500 × 417 px; el editor adapta el alto recomendado al tamaño. Una foto de otra proporción puede deformarse.

El cuello integrado mide 7 mm de alto, tiene pared de 2 mm, hombro liso inclinado, reborde exterior de 1 mm y entrada achaflanada de 0,5 mm. `sphereOpeningDiameter` es el paso libre mínimo: Ø22 mm inicialmente, ajustable de 8 a 30 mm. El cuerpo debe superar la abertura en al menos 8 mm. `sphereLedDiameter` solo se conserva para leer proyectos antiguos y no altera la geometría actual.

## Tapa tubular

La tapa desmontable abraza el reborde con un faldón abierto y holgura radial nominal de 0,3 mm. Tiene un paso central de 5 mm y una ranura lateral de 4 mm que continúa por todo el tubo, para colocar el cable sin enhebrar la guirnalda.

El tubo guía tiene pared de 1,2 mm y extremo achaflanado. Su longitud objetivo es 36 mm. Con abertura de Ø22 mm y el cuerpo habitual, el diámetro exterior del tubo es 10,7 mm; el cálculo conserva un paso de al menos 5 mm y reduce el tubo lo necesario para evitar las paredes y el fondo en esferas pequeñas. La guía exportada informa sus medidas calculadas.

Ver tapa separada eleva la pieza en la vista para inspeccionar el tubo; el STL conserva la posición de impresión. Las proporciones se basan en la referencia visual del proyecto y requieren comprobar el encastre con una impresión real.

## Detalle y archivos

Ultra usa 512 puntos de resolución: 1024 muestras alrededor y filas calculadas para equilibrar el paso vertical con el del ecuador. En Ø80 mm aproxima 0,25 mm en ambos sentidos. Los niveles anteriores conservan sus grillas. La vista y el STL usan la misma malla, con índices preasignados para reducir el consumo temporal de memoria.

El ZIP contiene `01-esfera.stl`, `02-tapa.stl` —con el nombre del proyecto como prefijo— y `Guia-de-armado.txt`. La esfera se orienta con su base en Z=0; la tapa apoya su cara exterior plana, con tubo y faldón hacia arriba. No usa soporte removible de panel ni caja trasera. Brim y soportes de la esfera se preparan en el laminador.

La guía indica introducir los LED antes de cerrar, acomodar el cable sin forzarlo, usar una guirnalda LED de baja potencia y baja temperatura compatible con adornos, comprobar su temperatura y evitar lámparas incandescentes. La sujeción debe ser independiente: la tapa no es un enganche de suspensión y el cable eléctrico no soporta el peso.

`lamp-sphere.test.ts` comprueba relieve, espesores, polos, abertura, diámetro, Ultra y ZIP. `lamp-sphere-cap.test.ts` verifica el tubo, la ranura, el encastre y la orientación, también en las esferas más pequeñas. Ver [pruebas y revisión manual](../testing.md).
