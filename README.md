# ProyectAR

Estudio web local con Next.js App Router, React y TypeScript para diseñar cuadros de sombra y paneles de litofanía imprimibles.

## Inicio

Usá Node.js 24.22.1 (ver `.nvmrc`).

```sh
npm ci
npm run dev
```

Abrí http://127.0.0.1:3000. Para producción local: `npm run build` y `npm start`.

## Funciones

- Cuadros de sombra: presets, pincel y borrador, carga de JPG/PNG/WebP/SVG, recorte circular, medidas de caja y luz, proyección estimada, vista 3D y cuatro patrones SVG. Descarga como un STL con cinco piezas o un ZIP con cinco STL independientes, numerados y nombrados, más una guía de orientación.
- Guía 3D de armado: ocho pasos con las piezas del diseño abierto, movimiento de cada pieza, posición de la luz y orientación final contra la pared. Se abre desde `Vista 3D → Ver guía de armado`.
- Lámparas: foto JPG/PNG/WebP, panel plano, arco de 120° o semicírculo, medidas en mm, contraste, inversión, espesor mínimo y máximo, vista 3D y STL binario.
- Guardado local y exportación/importación JSON. El editor nuevo de cuadros abre los diseños guardados por la versión anterior en `localStorage` sin borrarlos.
- Las fotos y los modelos se procesan en el navegador; no se envían a un servidor.

## Alcance y atribución

El editor de cuadros se reimplementó como funciones TypeScript y componentes React en `src/features/shadowbox`. Ya no se carga una copia del editor anterior dentro de un `iframe`. El proyecto original inspiró el concepto y las funciones; mantenemos su aviso MIT en [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). Si el código anterior ya fue publicado en el historial Git, ese historial sigue conservando la copia previa.

Las máscaras de corte usan una grilla de precisión configurable. Equilibrado duplica el muestreo y Alto lo cuadruplica en cada eje respecto de los valores anteriores, manteniendo la compatibilidad con los proyectos guardados. Para una caja de 15 × 15 × 6 cm, Alto usa 896 × 358 celdas por panel, de aproximadamente 0,17 mm. La imagen objetivo conserva una resolución de 512 × 512 píxeles.

Los SVG siguen contornos poligonales y el STL triangula esos contornos y extruye sus bordes para evitar caras innecesarias en los interiores planos. La proyección y las exportaciones aplican el mismo tratamiento de partes sueltas y contactos diagonales. La simulación supone una fuente de luz puntual y no modela el tamaño de la luz ni la oclusión por el espesor de las paredes. Verificá el STL en un slicer y probá una pieza física antes de fabricar.

En los cuadros, la tapa frontal lisa mira hacia la habitación y el lado abierto hacia la pared. Las piezas actuales no incluyen encastres ni soporte de luz. La guía 3D explica la orientación y presentación de las piezas; no garantiza el ajuste de las uniones ni un ancho mínimo imprimible.

La lámpara exporta el panel, sin base, tapa, portalámparas ni encastres. Los proyectos se guardan en este navegador y pueden perderse si se borran sus datos: exportá JSON para conservar una copia.

## Verificación

```sh
npm run test
npm run typecheck
npm run build
```

Las pruebas cubren proyección de ida y vuelta, mejora de detalle, marcos, mallas cerradas y volumen, orientación de caras, estructura de STL, contenido e integridad del ZIP, escala y nombres de piezas, navegación, guardado, validación de proyectos, imágenes, limpieza de SVG y controles de la guía de armado. Las pruebas de interfaz usan jsdom y no renderizan WebGL ni comprueban la apariencia del CSS. Los pasos de revisión visual y las limitaciones están en [Verificación](docs/testing.md).

La documentación de rutas y componentes está en [docs/README.md](docs/README.md). Para ejecutar Vitest mientras editás, usá `npm run test:watch`.
