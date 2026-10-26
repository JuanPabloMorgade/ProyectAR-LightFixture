# Documentación funcional

Esta carpeta describe las rutas y los componentes principales de ProyectAR según el código actual de `src/`.

## Estructura

- `pages/`: qué muestra cada ruta de `src/app/`, qué componentes usa y cómo participa el layout global.
- `components/`: responsabilidad, entradas, estado, efectos y dependencias de los componentes compartidos y de los dos editores.

## Páginas

- [Inicio (`/`)](pages/inicio.md): entrada al estudio y navegación hacia los editores.
- [Cuadros de sombra (`/cuadros`)](pages/cuadros.md): montaje del editor de cuadros.
- [Lámparas con fotos (`/lamparas`)](pages/lamparas.md): montaje del editor de litofanías.

## Componentes

- [Shell](components/shell.md): encabezado, navegación, contenido y pie compartidos.
- [Componentes UI](components/ui.md): campos, botones, modales, controles segmentados y tablas reutilizables.
- [ShadowEditor](components/shadow-editor.md): dibujo, máscaras, simulación y exportación de cuadros.
- [ShadowViewer](components/shadow-viewer.md): vista 3D de cuadros.
- [Guía 3D de armado](components/assembly-guide.md): modal, pasos, piezas del proyecto actual y escena de montaje.
- [LampEditor](components/lamp-editor.md): foto, ajustes, proyectos y exportación de litofanías.
- [LampViewer](components/lamp-viewer.md): vista 3D de litofanías.

## Convenciones generales

- `src/app/layout.tsx` define el documento raíz, los metadatos y `src/app/globals.css`. Cada página usa `Shell` para la estructura visible compartida.
- La tipografía global es Inter Variable, cargada desde `src/app/layout.tsx` con `next/font` y aplicada en `src/app/globals.css`.
- Los editores son componentes cliente. El procesamiento de imágenes, la generación de mallas y el almacenamiento de proyectos se hacen en el navegador.
- Los proyectos se guardan en `localStorage`; también se pueden exportar como JSON. El navegador no sincroniza ni respalda esos datos.
- Las pruebas están en `tests/`. Vitest ejecuta la geometría en Node y las pruebas de interfaz y carga de imágenes en jsdom. `npm test` corre la suite una vez; `npm run test:watch` observa los cambios.
- Los componentes de `src/components/ui` comparten el estilo Astra en `ui.css`, importado una vez desde el layout raíz. Usan los tokens de `src/app/globals.css`: foco sobre el control completo, unidades separadas, campos numéricos alineados y selects oscuros. Los navegadores compatibles usan `appearance: base-select`; los demás conservan un select nativo con estilos oscuros. `TextAreaField` y los componentes de tabla están disponibles para nuevas pantallas; los editores actuales no exponen áreas de texto ni tablas de datos. Los estilos propios de la guía 3D permanecen en `assembly-guide.css`.

## Verificación

[Pruebas y revisión manual](testing.md) describe los comandos, la cobertura automática y los recorridos para verificar calidad de recortes, exportaciones y guía de armado.
