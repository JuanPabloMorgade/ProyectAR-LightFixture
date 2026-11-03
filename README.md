# ProyectAR

Estudio web local con Next.js App Router, React y TypeScript para diseñar cuadros de sombra, paneles de litofanía y esferas navideñas imprimibles.

## Inicio

Usá Node.js 24.22.1 (ver `.nvmrc`).

```sh
npm ci
npm run dev
```

Abrí http://127.0.0.1:3000. Para producción local: `npm run build` y `npm start`.

## Funciones

- Cuadros de sombra: presets, pincel y borrador, carga de JPG/PNG/WebP/SVG, recorte circular, medidas de caja y luz, proyección estimada, vista 3D y cuatro patrones SVG. LED de 1 W con nueve piezas (USB) o diez (3 AAA), descargables en un STL combinado o un ZIP con los STL independientes, numerados y nombrados, más una guía de orientación.
- Guía 3D de armado: doce pasos con las piezas del diseño abierto, movimiento de cada pieza, posición de la luz y orientación final contra la pared. Se abre desde `Vista 3D → Ver guía de armado`.
- Lámparas: foto JPG/PNG/WebP, Plano, Curvo de 120° y Esferas navideñas con relieve exterior y tapa tubular. Medidas en mm, contraste, inversión, espesores y vista 3D. Ultra ofrece 448 puntos en paneles y 640 en esferas; los paneles de 180° anteriores siguen abriéndose.
- Guardados locales por nombre y exportación/importación JSON. Ambos editores inician con su ejemplo; para aplicar un diseño hay que seleccionarlo y pulsar la carpeta. Comparten componente, hook y almacenamiento con claves independientes y compatibilidad con versiones anteriores.
- Las fotos y los modelos se procesan en el navegador; no se envían a un servidor.

## Alcance y atribución

El editor de cuadros se reimplementó como funciones TypeScript y componentes React en `src/features/shadowbox`. Ya no se carga una copia del editor anterior dentro de un `iframe`. El proyecto original inspiró el concepto y las funciones; mantenemos su aviso MIT en [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). Si el código anterior ya fue publicado en el historial Git, ese historial sigue conservando la copia previa.

Las máscaras de corte usan una grilla de precisión configurable. Equilibrado duplica el muestreo y Alto lo cuadruplica en cada eje respecto de los valores anteriores, manteniendo la compatibilidad con los proyectos guardados. Un panel de ancho máximo usa 320 columnas en Equilibrado o 896 en Alto; las filas dependen de su profundidad óptica útil, que se deriva de la posición del LED y del espacio para el cabezal. La imagen objetivo conserva una resolución de 512 × 512 píxeles.

Los SVG siguen contornos poligonales y el STL triangula los contornos por capas para conservar ranuras y encastres sin subdividir cada superficie plana en celdas. El visor y la guía reutilizan la geometría calculada. La proyección y las exportaciones aplican el mismo tratamiento de partes sueltas y contactos diagonales. La simulación incluye la sombra de base, tapas, soportes y tramos inferiores cerrados; usa una fuente puntual y no modela el tamaño real del emisor, componentes comprados, cables ni penumbra. Verificá el STL en un slicer y probá una pieza física antes de fabricar.

En los cuadros, la base con anclaje y pilas apoya contra la pared y mide 20 mm por defecto. Tiene un solo perímetro con guías finas para las ranuras interiores de las paredes. La tapa de pilas queda al ras por detrás; se accede al descolgar el cuadro. El separador electrónico deja pasar el tubo y puede ser liso o incluir el mismo diseño en relieve. El frente hacia la persona es un marco abierto. Luz y armado usa únicamente LED de 1 W (3 AAA o USB); los proyectos anteriores se adaptan al abrirlos e informan el cambio. Las máscaras incluyen la separación de la base. La guía explica montaje, colgado y cableado; ajuste, carga del anclaje y disipación requieren prueba física. Ver [fabricación](docs/components/shadow-fabrication.md).

Los paneles de litofanía exportan un STL independiente o, en Plano y Curvo, un kit opcional con caja para iluminación, marco frontal y tapa trasera: cuatro STL y guía. Espacio para la luz y holgura son ajustables. Los paneles, incluidos los de 180° anteriores, ofrecen [soporte removible](docs/components/lamp-print-stand.md) inicialmente activado, que se corta después de imprimir. Las [esferas navideñas](docs/components/lamp-sphere.md) exportan cuerpo y tapa en dos STL más guía, con abertura inicial de Ø22 mm y tubo guía de hasta 36 mm. No se incluyen LED, fuente ni portalámparas. Los proyectos se guardan en este navegador y pueden perderse si se borran sus datos: exportá JSON para conservar una copia. Ver [caja de litofanías](docs/components/lamp-housing.md) y [persistencia compartida](docs/components/saved-designs.md).

## Verificación

```sh
npm run test
npm run typecheck
npm run build
```

Las pruebas cubren proyección de ida y vuelta, mejora de detalle, marcos, mallas cerradas y volumen, orientación de caras, estructura de STL, contenido e integridad del ZIP, escala y nombres de piezas, navegación, guardado, validación de proyectos, imágenes, limpieza de SVG y controles de la guía de armado. Las pruebas de interfaz usan jsdom y no renderizan WebGL ni comprueban la apariencia del CSS. Los pasos de revisión visual y las limitaciones están en [Verificación](docs/testing.md).

La documentación de rutas y componentes está en [docs/README.md](docs/README.md). Para ejecutar Vitest mientras editás, usá `npm run test:watch`.
