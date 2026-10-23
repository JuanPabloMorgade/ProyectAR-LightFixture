# ShadowViewer

**Archivo:** `src/features/shadowbox/viewer.tsx`. **Uso:** pestaña 3D de [ShadowEditor](shadow-editor.md).

Recibe `settings: BoxSettings`, `masks: WallMask[]`, `simulation: Uint8ClampedArray` y `rays: boolean`. Construye la escena 3D de la caja y muestra la proyección estimada; el usuario puede orbitar la cámara y activar la visualización de rayos.

Es un componente cliente. En un efecto crea el renderizador WebGL, escena, cámara y controles de `three`; al cambiar sus entradas reconstruye la vista y al desmontarse libera los recursos. Mantiene un mensaje de error local cuando WebGL no está disponible. No guarda proyectos ni genera el STL.
