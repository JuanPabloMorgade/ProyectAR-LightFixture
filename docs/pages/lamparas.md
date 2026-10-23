# Lámparas con fotos (`/lamparas`)

**Archivo:** `src/app/lamparas/page.tsx`.

La ruta monta el [LampEditor](../components/lamp-editor.md) dentro de [Shell](../components/shell.md). El editor transforma una foto en un panel de litofanía plano, curvo o semicircular, ofrece una vista 3D y descarga el STL.

La página no mantiene estado ni genera la malla: estas tareas pertenecen a `src/features/lithophane/`. Usa el layout raíz de `src/app/layout.tsx` y los estilos compartidos de `src/app/globals.css`.
