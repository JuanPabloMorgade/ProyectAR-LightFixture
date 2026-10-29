# LampViewer

**Archivo:** `src/features/lithophane/viewer.tsx`. **Uso:** vista 3D de [LampEditor](lamp-editor.md).

Recibe `positions: Float32Array`, `indices: Uint32Array` y `lit: boolean`. Convierte la malla en una geometría de `three`, muestra el panel y permite girarlo y acercarlo con controles de órbita. `lit` cambia la presentación entre luz encendida y material.

Acepta también `housingParts?: HousingPart[]` e `interior?: boolean`. Las piezas llegan en coordenadas de montaje: caja, tapa y marco negros, y panel con sombreado por espesor. Interior oculta la tapa y vuelve translúcida la caja. El encuadre se calcula sobre el conjunto completo, y al reconstruir se liberan todas las geometrías y materiales de las piezas. La vista iluminada aproxima el relieve; no simula la ubicación, temperatura ni distribución de una iluminación instalada.

Es un componente cliente. Un efecto inicializa WebGL y libera los recursos al cambiar las entradas o desmontarse. Mantiene un mensaje de error local si WebGL no está disponible. La generación de la malla y la exportación del STL permanecen en `LampEditor` y `mesh.ts`.

`printSupport?: Mesh` agrega el soporte removible en violeta, con sus propios material y geometría. Llega en coordenadas de montaje, sin rotar la foto ni alterar su sombreado por espesor. El editor decide cuándo mostrarlo y oculta la caja durante esa inspección. El soporte participa del encuadre y se libera con el resto de los recursos.
