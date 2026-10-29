# Lámparas con fotos (`/lamparas`)

**Archivo:** `src/app/lamparas/page.tsx`.

La ruta monta el [LampEditor](../components/lamp-editor.md) dentro de [Shell](../components/shell.md). El editor transforma una foto en un panel de litofanía plano, curvo o semicircular, ofrece una vista 3D y descarga el STL.

Plano y Curvo permiten generar una [caja trasera para iluminación](../components/lamp-housing.md), con marco y tapa desmontables. Se configura el espacio para la luz y la holgura, se inspecciona el interior y se descarga un ZIP con cuatro STL y guía. Semicírculo mantiene la descarga del panel independiente.

La página no mantiene estado ni genera la malla: estas tareas pertenecen a `src/features/lithophane/`. Usa el layout raíz de `src/app/layout.tsx` y los estilos compartidos de `src/app/globals.css`.

Las tres formas ofrecen [exportación de pie con soporte removible](../components/lamp-print-stand.md), activada inicialmente. La base y los contactos quedan en el STL del panel; se cortan y retiran después de imprimir. La vista permite inspeccionarlos en violeta.
