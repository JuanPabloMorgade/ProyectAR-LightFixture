# LampViewer

**Archivo:** `src/features/lithophane/viewer.tsx`. **Uso:** vista 3D de [LampEditor](lamp-editor.md).

Recibe `positions: Float32Array`, `indices: Uint32Array` y `lit: boolean`. Genera una geometría de Three.js y ofrece giro, desplazamiento y zoom con OrbitControls. Luz encendida aproxima la transmisión según el espesor; Material permite inspeccionar el relieve. La vista no simula ubicación, temperatura ni distribución de los LED instalados.

## Piezas opcionales

- `housingParts?: HousingPart[]`: caja, marco y tapa en sus coordenadas de montaje. `interior` oculta la tapa posterior y vuelve translúcida la caja.
- `sphereCap?: Mesh`: [tapa de la esfera](lamp-sphere.md) en material claro. Con `interior`, el control Ver tapa separada la eleva para inspeccionar el tubo y la abertura; no modifica la exportación.
- `printSupport?: Mesh`: soporte removible en violeta, sin alterar el sombreado de la foto. El editor decide cuándo mostrarlo y oculta la caja durante esa inspección.

El encuadre incluye todas las piezas visibles. Al regenerar la geometría mantiene giro, desplazamiento y zoom relativos al tamaño del conjunto. Cambiar la abertura de la esfera permite seguir inspeccionándola desde el mismo ángulo.

## Ciclo de vida y errores

Un efecto inicializa WebGL y libera renderizador, controles, geometrías y materiales al cambiar las entradas o desmontarse. `onError` avisa al editor si WebGL no puede iniciarse. La generación y exportación funcionan fuera del visor y una malla válida sigue siendo descargable.

El editor entrega cuerpo y tapa de la misma solicitud. Si falla un recálculo, conserva el conjunto anterior con Vista anterior y bloquea su exportación hasta corregir el error. Las pruebas usan geometrías y OrbitControls reales con una superficie WebGL simulada; la apariencia y los gestos requieren revisión en navegador.
