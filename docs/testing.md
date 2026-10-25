# Pruebas y revisión manual

## Comandos

Con Node.js 24.22.1 y las dependencias instaladas:

```sh
npm test
npm run typecheck
npm run build
```

`npm run test:watch` ejecuta Vitest durante la edición. Para revisar una función concreta:

```sh
npx vitest run tests/shadowbox.test.mjs tests/stl-export.test.ts
npx vitest run tests/assembly-guide.test.tsx tests/shadow-editor.test.tsx
```

## Cobertura automática

| Archivo                         | Comportamiento verificado                                                                                                                                                                                                      |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `tests/shadowbox.test.mjs`      | Proyección de ida y vuelta, marcos, mejora de fidelidad en Alto frente a la grilla anterior, tratamiento común de partes sueltas, cierre y volumen de mallas y límite de triángulos del caso de prueba.                        |
| `tests/stl-export.test.ts`      | Directorio y entradas del ZIP, CRC mediante `node:zlib`, nombres y orden de las cinco piezas, guía de texto, STL binarios, medidas y posición local con una caja rectangular y equivalencia de triángulos entre exportaciones. |
| `tests/shadow-editor.test.tsx`  | Guardado con medidas editadas, rechazo de proyectos inválidos, selección de exportación, envío al worker, descarga del ZIP, bloqueo de controles y recuperación tras un error.                                                 |
| `tests/assembly-guide.test.tsx` | Datos del proyecto recibidos por la guía, ocho pasos y archivos asociados, posición de luz, retroceso, reinicio, cierre, ciclo de Tab, restauración de foco y scroll, reapertura y posiciones según medidas.                   |
| `tests/mesh.test.mjs`           | Geometría y STL de litofanías.                                                                                                                                                                                                 |
| `tests/lamp-editor.test.tsx`    | Flujo del editor de litofanías con sus dependencias de navegador simuladas.                                                                                                                                                    |
| `tests/navigation.test.tsx`     | Navegación compartida y contenido de las rutas.                                                                                                                                                                                |
| `tests/artwork.test.ts`         | Validación de archivos de imagen y eliminación de contenido activo en SVG.                                                                                                                                                     |

Las pruebas de interfaz usan jsdom y sustituyen canvas, imágenes, workers o visores según el caso. En la guía se simulan los métodos del diálogo y el visor 3D: las pruebas verifican el flujo y las entradas, pero no renderizan WebGL ni validan CSS, animaciones, gestos o la gestión nativa del foco del navegador.

## Revisión en navegador

Iniciar con `npm run dev` y abrir `/cuadros`. Para comprobar el build de producción, usar `npm run build` y luego `npm start`. Guardar o exportar el proyecto antes de recargar o cambiar de entorno.

1. **Controles:** revisar en escritorio y a 390 px de ancho. Abrir selects, recorrer opciones con teclado y editar números. El foco debe rodear el control completo; las unidades no deben superponerse con el valor. Comparar los campos de la misma fila con etiquetas de una y dos líneas. Repetir en `/lamparas`. El menú puede variar según el soporte del navegador para `base-select`.
2. **Detalle:** abrir una imagen con curvas o diagonales y comparar Borrador, Equilibrado y Alto. La proyección debe actualizarse junto con los cuatro patrones y conservar las medidas. La imagen original permanece en el lienzo; la proyección refleja los recortes fabricables, incluida la eliminación de material suelto.
3. **Descargas:** en Vista 3D exportar ambos formatos. El STL completo debe contener cinco piezas dispuestas una al lado de la otra. Descomprimir el ZIP y comprobar cinco STL con el nombre del proyecto y los números 01 a 05, más `Guia-de-armado.txt`. Abrir cada STL en un slicer: debe contener su pieza acostada, en milímetros y sin separación manual. Usar una caja rectangular para distinguir paredes de ancho y alto diferentes.
4. **Guía actual:** con ese diseño abierto, pulsar `Ver guía de armado`. Comprobar el nombre y las medidas, los recortes reales y las etiquetas de las cinco piezas. Recorrer los ocho pasos, retroceder, reiniciar y saltar con los botones de paso. Cada pared debe ocupar su lado y coincidir con el identificador del archivo.
5. **Luz y resultado:** en el paso 7 comprobar tapa transparente, esfera y distancia de luz. En el paso 8 comprobar la tapa hacia la habitación, la abertura hacia la pared y la proyección del diseño abierto. Girar y centrar la cámara mediante puntero y botones.
6. **Modal:** recorrer controles con Tab y Mayús+Tab; el fondo debe permanecer inactivo. Cerrar con Escape, el botón de cierre y Finalizar. Confirmar regreso del foco al disparador, restauración del scroll y reapertura en el paso 1. Cerrar, cambiar de diseño o medidas y volver a abrir: debe mostrar el proyecto actualizado.
7. **Móvil y movimiento reducido:** a 390 × 844 comprobar ausencia de desbordamiento horizontal, textos y etiquetas legibles, navegación inferior accesible y controles táctiles de la cámara. Con movimiento reducido, las piezas deben cambiar de posición sin desplazamiento animado.
8. **Sin WebGL:** en un entorno sin WebGL, abrir la guía y confirmar un mensaje de error con instrucciones y navegación todavía disponibles. Al cerrar y reabrir no deben acumularse canvas de la guía.

## Límites de la verificación

El cierre y volumen comprobados corresponden a las figuras de prueba. No constituyen una garantía para toda imagen importada ni de imprimibilidad de sus detalles mínimos. La guía de montaje no incorpora encastres ni soporte de luz. Las pruebas automáticas y la revisión visual no sustituyen una impresión y un montaje físicos; la fuente de luz real, su posición, el material y el espesor pueden cambiar la proyección.
