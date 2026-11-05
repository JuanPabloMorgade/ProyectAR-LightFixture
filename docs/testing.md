# Pruebas y revisión manual

## Comandos

Con Node.js 24.22.2 y las dependencias instaladas:

```sh
npm test
npm run typecheck
npm run build
```

`npm run test:watch` ejecuta Vitest durante la edición.

Vitest limita la ejecución a dos workers para evitar competencia entre pruebas de geometría y editores que generan mallas grandes. Las comprobaciones exhaustivas de colisión entre tapa y esfera disponen de 20 segundos por caso; revisan todos los vértices también con la geometría de la marca.

`npm run typecheck` también rechaza imports, variables locales y parámetros sin uso mediante `noUnusedLocals` y `noUnusedParameters` en `tsconfig.json`.

Para revisar Cuadros de Sombra por área:

```sh
npx vitest run tests/wallmount.test.ts tests/projection-occlusion.test.ts tests/layered-panel.test.ts tests/preview-model.test.ts
npx vitest run tests/assembly-guide.test.tsx tests/shadow-editor.test.tsx
```

## Cobertura automática

`tests/model-mark.test.ts` verifica **©Generado en ProyectAR** en la geometría de cuadros, paneles, marcos y esferas: orientación, escala, relieve, grabado superficial, espesor mínimo y conservación en el STL. Ver [marca en los modelos](components/model-mark.md).

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
| `tests/head-mount.test.ts` | Cabezal circular sobre el poste: sólido cerrado, holgura del collar, tope, paso para cables y asiento de la estrella en medidas mínimas, iniciales y máximas. |
| `tests/head-projection.test.ts` | Sombra adicional del cabezal fuera de la sombra de la base: reducción mínima del 50% frente a los brazos anchos en tres configuraciones de referencia. |
| `tests/enclosure.test.ts` | Caja electrónica anterior, tapas, cables y parámetros de compatibilidad. |
| `tests/shadow-editor.test.tsx` | Guardado/importación, migración al montaje actual, navegación con teclado, conservación del dibujo, campos numéricos, USB/AAA, descarga vía worker, errores y ausencia de Mostrar rayos. |
| `tests/assembly-guide.test.tsx` | Doce pasos actuales y secuencias anteriores, identificación de piezas, navegación, foco, restauración del scroll de fondo y reinicio del desplazamiento al cambiar de paso. |
| `tests/ui.test.tsx` | Etiquetas, errores, campos y controles accesibles, carga, modales, ciclo de foco y tablas. |
| `tests/toast.test.tsx` | Prioridad de anuncios, pausa por foco/puntero, cierre manual, acciones y reinicio del temporizador. |
| `tests/artwork.test.ts` | Archivos de imagen y limpieza de contenido activo en SVG. |
| `tests/navigation.test.tsx` | Rutas, navegación y contenido compartido. |
| `tests/mesh.test.mjs` | Paneles cerrados y orientados, espesores, validación y STL binario a 384 y Ultra 448 en Plano/Curvo. |
| `tests/lamp-sphere.test.ts` | Relieve exterior, interior independiente de la foto, polos lisos, diámetro y aberturas. Foto centrada, proporciones y estiramiento de 0 a +75 %, límite en 360° y rechazo de valores inválidos. Ultra 512, STL y ZIP con guía. |
| `tests/lamp-sphere-cap.test.ts` | Tapa cerrada, ranura y paso libres, tubo de hasta 36 mm, encastre sin intersecciones y orientación; incluye esferas pequeñas con espesor máximo. |
| `tests/saved-designs.test.tsx` | Aislamiento de datos y selección entre secciones, orden por nombre, actualización, apertura, confirmación de borrado, recuperación opcional, errores y migración segura con limpieza de metadatos. |
| `tests/lamp-viewer.test.tsx` | Actualización de esfera y tapa conservando vista relativa, geometría nueva y tapa separada; WebGL simulado con OrbitControls reales. |
| `tests/lamp-housing.test.ts` | Caja de litofanías plana/curva: sólidos cerrados, holguras, cable, orientación de impresión, límites, panel independiente y ZIP de cuatro piezas. |
| `tests/lamp-print-stand.test.ts` | Soporte conectado y cerrado, orientación, huecos y contactos, conservación de la foto y ausencia de grietas a 384 y Ultra 448 en paneles de 0/120/180 grados. |
| `tests/lamp-editor.test.tsx` | Inicio predeterminado, guardado/apertura/importación y compatibilidad anterior, eliminación, errores, descargas y Ultra 448/512. Tarjetas de variantes, conservación de ajustes al plegarlos, orden del flujo, seguridad visible y orientación de proporciones. Avisos de Imagen/Diseño con reinicio de seis segundos. |

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
11. **Estudio y desplegables:** comprobar la barra de Proyecto encima de los pasos, Medidas/Ajustes avanzados en el lateral y recomendaciones por paso y herramientas antes del lienzo. Dibujar/Borrar deben anunciar selección y conservarse con el grosor al cambiar de paso. Abrir, editar y cerrar Estrella/Portapilas/Anclaje/Holguras; guardar y recuperar sus valores. El visor debe preceder a la configuración y descarga; la interpretación técnica queda debajo y las advertencias de montaje, visibles. Verificar 390, 768, 1024 y 1440 px sin desbordamiento, selección táctil con llegada al contenido activo y recorrido por teclado sin pérdida de foco. Repetir ayudas y desplegables en lámparas por ser componentes compartidos.
12. **Botones de ícono:** en ambos editores comprobar el tooltip nativo de Aplicar (✓), Eliminar, ayudas y cierres. En la guía de armado, comprobar también los dos giros de cámara. Recorrer las acciones habilitadas con teclado y verificar su nombre accesible. Sin selección, Aplicar y Eliminar deben permanecer deshabilitados; seleccionar no debe aplicar el proyecto automáticamente. Comprobar visualmente que Medidas principales no muestre el antiguo distintivo «02». Los tooltips nativos y la apariencia de los íconos se revisan en navegador; jsdom no los dibuja.

## Revisión de lámparas

Abrir `/lamparas` en escritorio y a 390 × 844:

1. **Inicio y guardados:** con cero, uno y varios diseños, verificar ejemplo inicial, ajustes predeterminados y selector vacío. Seleccionar no cambia el modelo; el botón Aplicar (✓) lo aplica. Guardar dos nombres, actualizar uno, cancelar/confirmar borrado y abrir un guardado anterior. Cuadros y lámparas no deben mezclar sus listas.
2. **Carga y avisos:** cargar una foto y un JSON; confirmar el mensaje Imagen/Diseño cargado correctamente con la sugerencia de Detalle. Cargar otra imagen mientras el aviso sigue visible: su duración debe reiniciarse. Un archivo inválido debe mostrar error y no un éxito nuevo.
3. **Detalle:** probar Muy alto y Ultra en Plano/Curvo (448) y esfera (512). Comprobar adaptación entre variantes, guardado y reapertura manual. En esfera de 80 mm, Ultra debe indicar unos 0,25 mm en ambos sentidos. La foto original puede limitar el detalle efectivo.
4. **Esfera:** inspeccionar relieve exterior en Material y Luz encendida, polos lisos y abertura ajustable. Ver tapa separada debe mostrar el tubo. Cambiar medidas conservando la vista; un error debe mantener el modelo anterior y bloquear la descarga.
5. **STL y montaje:** abrir los archivos en el laminador. Esfera: cuerpo y tapa, base en Z=0 y tubo hacia arriba. Panel: comprobar soporte removible activado/desactivado; kit de caja con cuatro STL y guía. Verificar escala, normales, transiciones, ranuras y contactos. Los encastres requieren prueba física.
6. **Accesibilidad y WebGL:** recorrer selector, Aplicar, papelera, variantes, Detalle y avisos con teclado; comprobar foco visible, textos y ausencia de desbordamiento. Sin WebGL debe ser posible descargar una malla válida.
7. **Estudio y ayuda contextual:** comprobar el orden variante → foto → ajustes. Cambiar las tarjetas con flechas del teclado. Abrir y cerrar Ajustes avanzados sin perder valores; la descarga debe preceder a las guías y la seguridad de esferas quedar visible. Cargar una panorámica, una foto común y una vertical; los avisos no bloquean. Revisar la guía visual en escritorio y móvil, cierre con Escape y retorno del foco. Probar anchos de 390, 768, 1024 y 1440 px.
8. **Foto centrada en esferas:** con fotos cuadradas, verticales y panorámicas, alternar Cómo aplicar la foto. Conservar proporción debe mostrar la foto completa al frente y dejar liso el resto, sin repetición. Guardar, abrir, exportar/importar JSON y alternar variantes debe conservar el modo. Los proyectos anteriores sin la propiedad siguen cubriendo los 360°. Revisar también el STL y la guía del ZIP.
9. **Estiramiento horizontal:** probar 0, 1, 25, 50 y 75 %. Solo debe cambiar el ancho, sin recortar la foto ni modificar la altura, el interior, el cuello o la tapa. El ancho se limita a 360°. Guardar y reabrir a +75 %; alternar variantes y comprobar que conserva el valor. Volver a 0 % debe recuperar la proporción original. El test del editor verifica el máximo del control y la persistencia de +75 %.

## Revisión de la marca de origen

En ambos editores, girar los modelos para leer **©Generado en ProyectAR** desde la cara exterior indicada en [marca en los modelos](components/model-mark.md). Revisar base y tapa electrónica; panel plano y curvo; marco, tapa de caja plana y curva; y hombro superior de la esfera con y sin tapa. Repetir con medidas pequeñas, detalle bajo y Ultra. Descargar los STL individuales y ZIP, abrirlos en un laminador y comprobar texto legible sin espejo, grabados de 0,24 mm y relieve posterior de hasta 0,24 mm en los paneles. Inspeccionar también el soporte removible, la salida de cable, el agujero central y los encastres.

## Límites de la verificación

Las mallas comprobadas corresponden a las figuras de prueba. La guía incluye encastres y soporte de luz, pero no certifica ajuste físico, carga del anclaje ni disipación. La simulación es puntual e incluye piezas impresas; no reproduce emisor real, penumbra, cables o componentes comprados. Se requiere inspección en laminador y un primer montaje físico.
