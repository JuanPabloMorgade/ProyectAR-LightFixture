# ShadowViewer

**Archivo:** `src/features/shadowbox/viewer.tsx`. **Uso:** pestaña 3D de [ShadowEditor](shadow-editor.md).

Recibe `settings: BoxSettings`, `masks: WallMask[]`, `simulation: Uint8ClampedArray` y `rays: boolean`. Construye la escena 3D de la caja y muestra la proyección estimada; el usuario puede orbitar la cámara y activar la visualización de rayos.

Es un componente cliente. En un efecto crea el renderizador WebGL, escena, cámara y controles de `three`; al cambiar sus entradas reconstruye la vista y al desmontarse libera los recursos. Mantiene un mensaje de error local cuando WebGL no está disponible. No guarda proyectos ni genera el STL.

El alejamiento máximo de la cámara considera tanto el tamaño de la caja como el radio de proyección, para permitir encuadrar toda la sombra con la rueda del mouse.

Cuando recibe `fabrication?: Fabrication`, usa las mismas mallas con espesor de `fabricationParts` que el STL y la guía: encastres, conductos y soportes cilíndricos integrados en la tapa. `assemblyMesh` comparte la conversión de mm a cm y la orientación. Muestra de uno a tres marcadores LED según la selección, pero la proyección y los rayos siguen usando una fuente puntual central. Sin `fabrication`, conserva los planos texturados anteriores. Ver [fabricación](shadow-fabrication.md).
