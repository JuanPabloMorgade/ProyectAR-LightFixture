# ShadowViewer

**Archivo:** `src/features/shadowbox/viewer.tsx`. **Uso:** pestaña 3D de [ShadowEditor](shadow-editor.md).

Recibe `settings: BoxSettings`, `masks: WallMask[]`, `simulation: Uint8ClampedArray` y `rays: boolean`. Construye la escena 3D de la caja y muestra la proyección estimada; el usuario puede orbitar la cámara y activar la visualización de rayos.

Es un componente cliente. En un efecto crea el renderizador WebGL, escena, cámara y controles de `three`; al cambiar sus entradas reconstruye la vista y al desmontarse libera los recursos. Mantiene un mensaje de error local cuando WebGL no está disponible. No guarda proyectos ni genera el STL.

El alejamiento máximo de la cámara considera tanto el tamaño de la caja como el radio de proyección, para permitir encuadrar toda la sombra con la rueda del mouse.

Esta vista representa los laterales mediante planos con texturas de las máscaras y la tapa mediante un plano liso. No es la escena de la guía de armado: [AssemblyViewer](assembly-guide.md) usa las mallas con espesor de `printParts`, las mismas que se serializan en los STL. Ambas vistas reciben la simulación del proyecto actual.
