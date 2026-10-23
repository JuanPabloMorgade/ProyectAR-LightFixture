# ProyectAR

Estudio web local con Next.js App Router, React y TypeScript para cuadros de sombra y litofanías imprimibles.

## Inicio

Node.js 24.22.1 (ver `.nvmrc`).

```sh
npm ci
npm run dev
```

Abrir http://localhost:3000. Para producción local: `npm run build` y `npm start`.

## Funciones

- Inicio con acceso a ambos editores.
- Cuadros: editor ShadowBox integrado, patrones, carga de imagen, proyección, vista 3D, SVG y STL.
- Lámparas: foto JPG/PNG/WebP, panel plano, arco de 120° o semicírculo, dimensiones en mm, contraste, inversión, espesor mínimo y máximo, vista 3D y exportación STL binaria.
- Cálculo de litofanías en Web Worker. Malla cerrada con caras frontal, posterior y bordes.
- Guardado de un proyecto de lámpara en el navegador y exportación/importación JSON. El editor de cuadros conserva su biblioteca local original.
- Las fotos se reducen a un máximo de 800 píxeles por lado al cargar; no se envían a un servidor.

## Alcance de esta versión

El editor ShadowBox se preserva en un iframe del mismo origen, con librerías servidas localmente; aún no está reescrito como componentes React. Su código está en `public/shadowbox`, con su licencia MIT original. La litofanía sí es un editor React nativo, en `src/features/lithophane`.

La lámpara exporta el panel, sin base, tapa, portalámparas ni encastres. El ancho curvo se mide sobre el arco de la cara posterior. La imagen se adapta a las proporciones indicadas. La iluminación mostrada es orientativa, no una simulación física. Comprobar el STL en un slicer y hacer una prueba física antes de fabricar.

No hay cuentas, base de datos ni almacenamiento remoto en esta etapa. El guardado local depende de este navegador y puede perderse si se borran sus datos; exportar JSON conserva una copia. Las bibliotecas de cuadros y lámparas todavía son independientes.

## Verificación

```sh
npm run test
npm run typecheck
npm run build
```

Las pruebas del motor comprueban bordes compartidos por dos caras con orientación opuesta, volumen positivo, valores finitos, espesores y estructura del STL para las tres formas. No sustituyen una prueba de impresión.

## Siguientes etapas

Migrar la UI de ShadowBox a React, biblioteca común de proyectos, persistencia de usuarios si se necesita sincronización, bases y encastres paramétricos, y exportaciones en segundo plano si las mallas superan la capacidad del navegador.
