# Caja trasera de litofanías

**Archivos:** `src/features/lithophane/housing-config.ts`, `housing.ts`, `housing-export.ts` y `mesh.worker.ts`.

El kit opcional para Plano y Curvo contiene cuatro sólidos independientes: panel original, caja, marco frontal y tapa posterior. El ZIP agrega `Guia-de-armado.txt`. Los componentes de iluminación no se generan.

## Dimensiones y montaje

- Paredes de 2,4 mm. Espacio detrás del panel inicialmente de 25 mm, editable entre 12 y 80 mm; marco y tapas agregan espesor exterior.
- Holgura total de 0,3 mm, editable entre 0,1 y 0,6 mm. Marco y tapa entran con rebordes de guiado, sin pestillo; comprobar ajuste y retención con una impresión real y fijación removible si hace falta.
- La foto se coloca desde el frente y apoya sobre un asiento interior. El marco desmontable cubre 2 mm de su perímetro y la mantiene entre marco y asiento. No modifica el relieve ni recorta el archivo del panel.
- La tapa posterior permite acceder a la iluminación. Hay un paso inferior para cable de 4 mm, separado del reborde de la tapa y del asiento de la foto. No presupone conector, LED o fuente específicos.

En Plano, las coordenadas son cartesianas. En Curvo se usan arcos concéntricos con el mismo radio que el panel: la profundidad es radial y las tapas acompañan esa curvatura. El generador exige radio positivo, al menos 6 mm interiores después de descontar caja y tapa, y perímetros sin cruzar los laterales. Si no cabe, informa reducir profundidad, aumentar el ancho del arco o elegir Plano.

Semicírculo mantiene el panel independiente. La configuración de caja se conserva al alternar formas, pero no se genera ni descarga mientras el ángulo sea 180°.

## Generación, impresión y persistencia

El worker genera todas las mallas y transfiere sus buffers. El visor usa coordenadas de montaje y la exportación orienta los tres componentes nuevos por separado: caja plana con abertura posterior sobre la cama, marco plano con cara exterior sobre la cama y tapa plana con cara lisa sobre la cama. Las piezas curvas se orientan sobre su borde inferior; revisar soportes para los tramos superiores y el asiento. El panel se exporta de pie con [soporte removible](lamp-print-stand.md) inicialmente activado; debe retirarse antes del montaje. Desactivarlo conserva la orientación anterior del panel.

`settings.housing = { enabled, depth, clearance }` es opcional en el formato v1. Proyectos anteriores sin ese campo conservan su comportamiento. Los errores de medidas o radio bloquean la descarga; el identificador de solicitud evita usar un resultado anterior tras cambiar ajustes.

`tests/lamp-housing.test.ts` verifica sólidos cerrados, normales, orientación de impresión, holguras en los puntos de ajuste, paso del cable, fotos finas, límites y contenido del ZIP. `tests/lamp-editor.test.tsx` comprueba activación, persistencia, descarga, Semicírculo y recuperación de errores. La retención, los soportes de impresión y la iluminación requieren prueba física.
