# ShadowViewer

**Archivo:** `src/features/shadowbox/viewer.tsx`. **Uso:** pestaña 3D de [ShadowEditor](shadow-editor.md).

Recibe `settings: BoxSettings`, `masks: WallMask[]`, `simulation: Uint8ClampedArray`, `interior?: boolean`, `fabrication?: Fabrication` y `artwork?: Uint8ClampedArray`. Construye la escena 3D de la caja y muestra la proyección estimada; el usuario puede orbitar la cámara y activar **Ver interior**. Se eliminó el control de mostrar rayos y su geometría auxiliar.

Es un componente cliente. En un efecto crea el renderizador WebGL, escena, cámara y controles de `three`; al cambiar sus entradas reconstruye la vista y al desmontarse libera los recursos. Mantiene un mensaje de error local cuando WebGL no está disponible. No guarda proyectos ni genera el STL.

El alejamiento máximo de la cámara considera tanto el tamaño de la caja como el radio de proyección, para permitir encuadrar toda la sombra con la rueda del mouse.

`previewParts` y `previewMesh`, de `preview-model.ts`, comparten las piezas y sus coordenadas con la guía de armado. Cambiar de visor o de paso no vuelve a generarlas si las entradas se conservan; un cambio de dibujo, dimensiones, fabricación o relieve invalida el resultado. Los recursos WebGL de cada visor se liberan independientemente.

El montaje actual usa las mismas mallas de `fabricationParts` que la exportación. La vista normal encuadra la sombra completa, el marco abierto hacia la persona y la pared detrás. El tubo y la luz quedan visibles a través del frente. **Centrar vista frontal** recupera ese encuadre. **Ver interior** oculta el marco y muestra la base, tapita de pilas y tapa electrónica translúcidas, acercando la cámara para revisar el montaje. Este estado de inspección no modifica los STL.

El editor usa únicamente LED de 1 W. Los componentes de referencia de `modular-visuals.ts` son visibles en el montaje de pared; sus mallas no se exportan. La base se coloca contra la pared, con un anclaje reforzado. El tubo parte desde dentro de ella. El embellecedor es un marco abierto; la tapa electrónica trasera es el cierre y puede llevar el relieve del arte actual. Todos los componentes son independientes. La simulación mantiene su fuente puntual. La sombra de las piezas impresas sí se calcula; los componentes comprados y cables quedan fuera. La altura de la fuente de 1 W comparte el cálculo físico del poste. Los lectores y escenas históricos, incluido `cob-visuals.ts`, conservan sus referencias para compatibilidad de la API. Ver [fabricación](shadow-fabrication.md).

La posición del emisor incorpora `wallOffset`. En 1 W, el marco y los paneles se acortan hasta dejar holgura detrás del cabezal; el emisor conserva su altura. La proyección ahora incluye la sombra de base, tapas y soportes mediante sus triángulos reales. El editor informa la proporción estimada de recortes bloqueados y omite los completamente ocultos, igual que la exportación. La tapa trasera con diseño usa la misma malla de relieve que el STL; el visor resalta sus aristas, sin aplicar un dibujo que no exista en el archivo exportado.
