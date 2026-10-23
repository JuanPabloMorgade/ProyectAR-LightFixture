# LampViewer

**Archivo:** `src/features/lithophane/viewer.tsx`. **Uso:** vista 3D de [LampEditor](lamp-editor.md).

Recibe `positions: Float32Array`, `indices: Uint32Array` y `lit: boolean`. Convierte la malla en una geometría de `three`, muestra el panel y permite girarlo y acercarlo con controles de órbita. `lit` cambia la presentación entre luz encendida y material.

Es un componente cliente. Un efecto inicializa WebGL y libera los recursos al cambiar las entradas o desmontarse. Mantiene un mensaje de error local si WebGL no está disponible. La generación de la malla y la exportación del STL permanecen en `LampEditor` y `mesh.ts`.
