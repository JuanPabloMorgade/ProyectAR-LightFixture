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

- Cuadros de sombra: presets, pincel y borrador, carga de JPG/PNG/WebP/SVG, recorte circular, medidas de caja y luz, proyección estimada, vista 3D, cuatro SVG y STL con cinco piezas.
- Lámparas: foto JPG/PNG/WebP, panel plano, arco de 120° o semicírculo, medidas en mm, contraste, inversión, espesor mínimo y máximo, vista 3D y STL binario.
- Guardado local y exportación/importación JSON. El editor nuevo de cuadros abre los diseños guardados por la versión anterior en `localStorage` sin borrarlos.
- Las fotos y los modelos se procesan en el navegador; no se envían a un servidor.

## Alcance y atribución

El editor de cuadros se reimplementó como funciones TypeScript y componentes React en `src/features/shadowbox`. Ya no se carga una copia del editor anterior dentro de un `iframe`. El proyecto original inspiró el concepto y las funciones; mantenemos su aviso MIT en [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). Si el código anterior ya fue publicado en el historial Git, ese historial sigue conservando la copia previa.

Las máscaras de corte usan una grilla de precisión configurable. Las curvas de los SVG son contornos poligonales y el STL es una malla de celdas; mayor detalle produce archivos más grandes. La proyección 3D supone una fuente de luz puntual y es orientativa. Verificá el STL en un slicer y probá una pieza física antes de fabricar.

La lámpara exporta el panel, sin base, tapa, portalámparas ni encastres. Los proyectos se guardan en este navegador y pueden perderse si se borran sus datos: exportá JSON para conservar una copia.

## Verificación

```sh
npm run test
npm run typecheck
npm run build
```

Las pruebas cubren proyección de ida y vuelta, bordes de corte, mallas cerradas, orientación de caras y estructura de STL. No sustituyen una prueba de impresión.
