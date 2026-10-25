# Guía 3D de armado

**Archivos:** `src/features/shadowbox/assembly-guide.tsx`, `assembly-viewer.tsx`, `assembly.ts` y `assembly-guide.css`.

## Entrada desde el editor

En `/cuadros`, el botón `Ver guía de armado` aparece debajo de las medidas de la pestaña `Vista 3D`. Está habilitado cuando hay cuatro máscaras y una simulación disponibles. Abre un modal con las piezas del proyecto actual: no carga un modelo de ejemplo ni vuelve a importar la imagen.

`AssemblyGuide` recibe `name: string`, `settings: BoxSettings`, `masks: WallMask[]`, `simulation: Uint8ClampedArray` y `onClose: () => void`. Mantiene únicamente el paso activo. Cada apertura empieza en el primer paso y no modifica las medidas, la imagen ni los archivos guardados.

## Secuencia

| Paso | Acción                                                    | Archivo identificado                                   |
| ---- | --------------------------------------------------------- | ------------------------------------------------------ |
| 1    | Reconocer las cinco piezas separadas                      | Las cinco piezas numeradas                             |
| 2    | Presentar la tapa frontal lisa                            | `05-tapa-frontal.stl`                                  |
| 3    | Ubicar la pared inferior                                  | `02-pared-inferior.stl`                                |
| 4    | Ubicar la pared izquierda                                 | `03-pared-izquierda.stl`                               |
| 5    | Ubicar la pared derecha                                   | `04-pared-derecha.stl`                                 |
| 6    | Ubicar la pared superior                                  | `01-pared-superior.stl`                                |
| 7    | Mostrar la luz dentro de la caja con la tapa transparente | Posición calculada con profundidad y porcentaje de luz |
| 8    | Orientar el cuadro y mostrar la proyección actual         | Tapa hacia la habitación, abertura hacia la pared      |

El ZIP agrega el nombre del proyecto como prefijo de los cinco nombres indicados. La guía usa los identificadores de `PRINT_PARTS`, compartidos con la exportación, para asociar la pieza resaltada a su archivo. Izquierda y derecha se definen mirando la cara lisa desde la habitación.

## Escena y controles

`AssemblyViewer` genera las piezas con `printParts`, convierte sus coordenadas de milímetros a centímetros y las orienta con las posiciones de `assembly.ts`. En el primer paso muestra todas las piezas separadas. Después muestra las piezas incorporadas, anima la nueva hasta su posición y la resalta en violeta. La esfera de luz aparece desde el paso 7 y el plano de proyección desde el paso 8.

La cámara permite arrastrar para girar, usar rueda o gesto de dos dedos para acercar y utilizar botones para girar o centrar la vista. Al cambiar de paso adapta el encuadre. Con `prefers-reduced-motion: reduce`, las piezas se ubican directamente sin animación de desplazamiento.

Los botones `Anterior`, `Siguiente`, `Reiniciar` y los ocho pasos permiten recorrer la guía; `Finalizar` la cierra. El modal nativo usa un portal en `document.body`, bloquea el scroll de fondo, mantiene Tab dentro de sus botones y se cierra con Escape, el botón de cierre o un clic en el fondo exterior. Al cerrarse devuelve el foco al botón que lo abrió.

## Ciclo de vida y límites

Al cambiar medidas, máscaras o simulación, la escena se reconstruye. Al desmontarse desconecta el `ResizeObserver`, detiene el bucle de renderizado y libera controles, geometrías, materiales, textura y renderizador. Si no puede iniciar WebGL o preparar la escena, conserva los textos y la navegación entre pasos con un mensaje de error.

La guía explica orientación y presentación de las piezas. Los STL actuales no incluyen encastres, fijaciones ni soporte para la luz. La esfera indica la posición configurada de una fuente puntual; la proyección conserva los límites del simulador y no garantiza el resultado de una impresión o del montaje físico.

Las pruebas de comportamiento y los recorridos visuales están descritos en [Verificación](../testing.md).
