# Pruebas y revisión manual

## Comandos

Con Node.js 24.22.1 y las dependencias instaladas:

```sh
npm test
npm run typecheck
npm run build
```

`npm run test:watch` ejecuta Vitest durante la edición.

`npm run typecheck` también rechaza imports, variables locales y parámetros sin uso mediante `noUnusedLocals` y `noUnusedParameters` en `tsconfig.json`.

Para revisar Cuadros de Sombra por área:

```sh
npx vitest run tests/wallmount.test.ts tests/projection-occlusion.test.ts tests/layered-panel.test.ts tests/preview-model.test.ts
npx vitest run tests/assembly-guide.test.tsx tests/shadow-editor.test.tsx
```

## Cobertura automática

| Archivo | Comportamiento verificado |
| --- | --- |
| `tests/shadowbox.test.mjs` | Proyección de ida y vuelta, detalle de recortes, marco, partes sueltas y mallas ópticas. |
| `tests/wallmount.test.ts` | Montaje vigente: base inicial de 20 mm, perímetro único, ocho guías y ranuras de paredes, tapa de pilas posterior, altura de componentes, anclaje, pasos circulares, relieve y mallas cerradas con normales coherentes. Incluye variantes históricas de la API. |
| `tests/projection-occlusion.test.ts` | Sombra de piezas opacas, cabezal detrás del emisor, recortes bloqueados, luz que supera la base y coherencia de la simulación. |
| `tests/light-position.test.ts` | Límites del LED, ajuste de proyectos anteriores y recuperación de ajustes sin acumular desplazamientos. |
| `tests/layered-panel.test.ts` | Superficies planas con pocos triángulos, agujeros y ranuras por capas, volumen ocupado equivalente a la rejilla y cierre de uniones. |
| `tests/preview-model.test.ts` | Reutilización entre visores e invalidación al cambiar medidas, holgura, máscaras o imagen del relieve. |
| `tests/stl-export.test.ts` | STL combinado y ZIP, nombres y cantidades según montaje, CRC, guía, escala y equivalencia de geometría. Conserva casos de cinco piezas de la API anterior. |
| `tests/fabrication.test.ts` | Encastres y soportes de fabricación, configuraciones válidas e inválidas y compatibilidad con LEDs individuales y COB. |
| `tests/modular.test.ts` | Generador modular anterior, poste, cabezal, alimentación y separación de componentes. |
| `tests/enclosure.test.ts` | Caja electrónica anterior, tapas, cables y parámetros de compatibilidad. |
| `tests/shadow-editor.test.tsx` | Guardado/importación, migración al montaje actual, navegación con teclado, conservación del dibujo, campos numéricos, USB/AAA, descarga vía worker, errores y ausencia de Mostrar rayos. |
| `tests/assembly-guide.test.tsx` | Doce pasos actuales y secuencias anteriores, identificación de piezas, navegación, foco, restauración del scroll de fondo y reinicio del desplazamiento al cambiar de paso. |
| `tests/ui.test.tsx` | Etiquetas, errores, campos y controles accesibles, carga, modales, ciclo de foco y tablas. |
| `tests/toast.test.tsx` | Avisos transitorios y cierre. |
| `tests/artwork.test.ts` | Archivos de imagen y limpieza de contenido activo en SVG. |
| `tests/navigation.test.tsx` | Rutas, navegación y contenido compartido. |
| `tests/mesh.test.mjs` | Geometría y STL de litofanías. |
| `tests/lamp-housing.test.ts` | Caja de litofanías plana/curva: sólidos cerrados, holguras, cable, orientación de impresión, límites, panel independiente y ZIP de cuatro piezas. |
| `tests/lamp-print-stand.test.ts` | Soporte removible en las tres formas: sólido conectado y cerrado, orientación vertical, contactos, separación, conservación de la foto y detalle de 384 puntos. |
| `tests/lamp-editor.test.tsx` | Flujo del editor de litofanías con dependencias de navegador simuladas. |

Las pruebas de interfaz usan jsdom y sustituyen canvas, imágenes, workers o visores. No renderizan WebGL ni validan la apariencia del CSS, los gestos o la distribución real del scroll. Los casos COB, LEDs individuales, cajas anteriores y exportaciones de cinco piezas verifican compatibilidad; no representan opciones disponibles en el editor actual.

## Revisión en navegador

Iniciar con `npm run dev` y abrir `/cuadros`. Para revisar producción, usar `npm run build` y `npm start`. Guardar o exportar el proyecto antes de recargar.

1. **Cómo funciona:** comprobar recorrido, significado de zonas claras/oscuras, orientación de base y LED, acceso posterior a pilas, 9/10 piezas y explicación de la sombra central. Siguiente debe abrir el diseñador. El desplegable técnico debe funcionar con teclado.
2. **Controles:** revisar en escritorio y a 390 px. Probar teclado, foco, campos vacíos y decimales, unidades y selects. Repetir en `/lamparas`. El menú puede variar según soporte de `base-select`.
3. **Detalle y rendimiento:** abrir una imagen con curvas; comparar Borrador, Equilibrado y Alto. Imagen, proyección y cuatro patrones deben actualizarse coherentemente. Entrar en 3D, abrir la guía y cambiar pasos: el modelo calculado se reutiliza. Cambiar medidas o imagen debe invalidarlo sin mostrar una pieza anterior. Los tiempos dependen de imagen, tamaño y equipo; no hay umbral fijo en las pruebas.
4. **Montaje y sombra:** comprobar base de 20 mm para proyectos nuevos, perímetro único con guías, paredes que bajan por fuera, LED orientado a la pared y marco abierto hacia la habitación. Ver interior debe funcionar; Mostrar rayos debe estar ausente. La base y los tramos cerrados deben bloquear luz en la simulación. El porcentaje de recortes bloqueados mide área de aberturas, no toda la sombra central.
5. **Descargas:** con 3 AAA comprobar diez STL (01–10) o un STL combinado con diez piezas. En USB comprobar nueve, sin tapa de pilas. El ZIP incluye `Guia-de-armado.txt`. Abrir en laminador: milímetros, una pieza por archivo, normales y geometría cerradas, ranuras de paredes hacia arriba y tapa de pilas con cara exterior lisa en la cama. Revisar también una caja rectangular.
6. **Guía actual:** recorrer los doce pasos, retroceder, reiniciar y saltar. Verificar identificación de archivos, paso 3 con vista posterior para pilas, paso 10 con cabezal y marco, paso 12 con proyección. El portapilas debe poder retirarse desde atrás sin desmontar las paredes.
7. **Scroll y modal:** comprobar una sola barra fina y violeta. En escritorio se desplazan las instrucciones, con modelo y botones visibles; en móvil y ventanas bajas se desplaza el cuerpo con modelo e instrucciones. No debe aparecer scroll exterior del diálogo ni desbordamiento horizontal. Cambiar de paso debe volver al inicio del contenido. Probar Tab, Mayús+Tab, desplazamiento de instrucciones por teclado, Escape, cierre y Finalizar; restaurar foco y scroll al salir.
8. **Móvil y movimiento reducido:** a 390 × 844 comprobar textos, controles táctiles, botones inferiores y modelo usable. Con movimiento reducido, las piezas deben colocarse sin animación. En ventanas bajas comprobar que se pueda llegar al final del texto.
9. **Persistencia:** importar proyectos antiguos y verificar aviso de adaptación a 1 W, imagen y medidas conservadas, posición LED ajustada solo cuando no cabe y acceso al diseñador. Guardar y reabrir en AAA y USB. Los proyectos existentes conservan la altura de base guardada.
10. **Sin WebGL:** comprobar mensaje de error con instrucciones y navegación disponibles. Cerrar y reabrir sin acumular canvas o renderizadores.

## Límites de la verificación

Las mallas comprobadas corresponden a las figuras de prueba. La guía incluye encastres y soporte de luz, pero no certifica ajuste físico, carga del anclaje ni disipación. La simulación es puntual e incluye piezas impresas; no reproduce emisor real, penumbra, cables o componentes comprados. Se requiere inspección en laminador y un primer montaje físico.
