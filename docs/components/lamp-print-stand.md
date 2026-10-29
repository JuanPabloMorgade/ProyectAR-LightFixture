# Soporte removible de litofanías

**Archivo:** `src/features/lithophane/print-stand.ts`.

La opción **Exportar de pie con soporte removible** está activada inicialmente para Plano, Curvo y Semicírculo. El panel se exporta con el alto sobre Z y la base en Z=0, tanto en la descarga individual como en el archivo 01 del ZIP. Caja, marco y tapa conservan su preparación de impresión independiente. No agrega una quinta pieza al kit.

## Geometría y separación

- Base de 1,2 mm de alto, que sigue el arco poligonal del panel y sobresale 4 mm por delante y detrás de su envolvente máxima.
- Elevación del panel de 3 mm. Una guía bajo su borde queda a 0,2 mm del panel.
- Entre 2 y 8 contactos, de 0,8 mm de ancho nominal a lo largo del arco y con el espesor local de la foto, unen la guía al borde inferior. Su ancho se conserva al cambiar el detalle; no depende de una columna completa de la malla.
- La exportación conjunta es un sólido conectado y cerrado. Se subdividen las caras junto al borde inferior para compartir exactamente los contactos; el relieve y las medidas de la foto se conservan. No se superponen sólidos cerrados ni se cambian las normales al orientar la impresión.

El soporte se corta al ras del borde inferior después de imprimir y antes de colocar el panel en su caja. No se garantiza una separación por flexión: evitar arrancarlo de la foto. Revisar las capas y probar separación y adhesión con el material, altura de capa y laminador utilizados; se puede agregar brim. La validación automática comprueba la geometría, no sustituye una impresión física.

## Vista, worker y proyectos

**Ver soporte de impresión** muestra el soporte en violeta, junto a la foto en sus coordenadas habituales, y oculta temporalmente la caja para inspeccionarlo. Es una preferencia de vista y no cambia el archivo. La casilla de exportación es la que controla si se incluye el soporte.

El worker prepara la malla final orientada y una malla del soporte para el visor; transfiere ambos juegos de buffers. Descargar reutiliza ese resultado. La malla original se mantiene para sombrear el espesor y mostrar el montaje.

`settings.printStand?: boolean` se guarda en el proyecto v1 y se valida al recuperar o importar. Si falta, se interpreta como activado. Con `false`, se exporta el panel original con su orientación anterior. Restablecer parámetros vuelve a activarlo.

`tests/lamp-print-stand.test.ts` comprueba continuidad, cierre, normales, orientación, dimensiones, hueco bajo el panel, contactos, conservación del volumen de la foto y casos de detalle máximo. Los tests del editor y del ZIP comprueban descarga y persistencia.
