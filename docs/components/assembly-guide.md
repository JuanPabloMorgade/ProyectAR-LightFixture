# Guía 3D de armado

**Archivos:** `src/features/shadowbox/assembly-guide.tsx`, `assembly-viewer.tsx`, `assembly.ts` y `assembly-guide.css`.

## Entrada desde el editor

En `/cuadros`, el botón `Ver guía de armado` aparece debajo de las medidas del paso `Vista 3D`. Está habilitado cuando hay cuatro máscaras, una simulación y espacio válido para los soportes LED. Abre un modal con las piezas del proyecto actual.

`AssemblyGuide` recibe `name`, `settings`, `masks`, `simulation`, `onClose` y `fabrication?: Fabrication`. Mantiene únicamente el paso activo. Cada apertura empieza en el primer paso y no modifica el proyecto.

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

`AssemblyViewer` genera las piezas con `fabricationParts`, las convierte con `assemblyMesh` y usa las posiciones de `assembly.ts`. Son las mismas mallas que se exportan al STL. Primero muestra todas las piezas separadas; luego anima y destaca la pieza actual. Desde el paso 7 aparecen los marcadores de 1 a 3 LEDs, y desde el paso 8 aparece la proyección. Sin configuración de fabricación conserva las piezas planas anteriores.

La cámara permite arrastrar para girar, usar rueda o gesto de dos dedos para acercar y utilizar botones para girar o centrar la vista. Al cambiar de paso adapta el encuadre. Con `prefers-reduced-motion: reduce`, las piezas se ubican directamente sin animación de desplazamiento.

Los botones `Anterior`, `Siguiente`, `Reiniciar` y los ocho pasos permiten recorrer la guía; `Finalizar` la cierra. Usa los componentes compartidos `Modal`, `ModalHeader`, `ModalFooter` y `Button`. El diálogo nativo se muestra en la capa superior del navegador, bloquea el scroll de fondo, mantiene Tab dentro de sus controles y se cierra con Escape, el botón de cierre o un clic en el fondo exterior. Al cerrarse devuelve el foco al botón que lo abrió. Esta lógica se comparte con el recorte de imágenes.

## Ciclo de vida y límites

Al cambiar medidas, máscaras o simulación, la escena se reconstruye. Al desmontarse desconecta el `ResizeObserver`, detiene el bucle de renderizado y libera controles, geometrías, materiales, textura y renderizador. Si no puede iniciar WebGL o preparar la escena, conserva los textos y la navegación entre pasos con un mensaje de error.

La tapa del prototipo incorpora soportes LED y conductos para sus patas; las paredes usan encastres guiados opcionales, sin traba. Las instrucciones explican la orientación de impresión y el asiento del LED. El ajuste se calibra mediante impresión de prueba. Los marcadores no representan el encapsulado exacto y la proyección sigue estimada desde una única fuente central, incluso con varios LEDs. Ver [fabricación del prototipo](shadow-fabrication.md).

Las pruebas de comportamiento y los recorridos visuales están descritos en [Verificación](../testing.md).
