# Guía 3D de armado

**Archivos:** `src/features/shadowbox/assembly-guide.tsx`, `assembly-viewer.tsx`, `assembly.ts` y `assembly-guide.css`.

## Entrada desde el editor

En `/cuadros`, el botón `Ver guía de armado` aparece debajo de las medidas del paso `Vista 3D`. Está habilitado cuando hay cuatro máscaras, una simulación y espacio válido para los soportes LED. Abre un modal con las piezas del proyecto actual.

`AssemblyGuide` recibe `name`, `settings`, `masks`, `simulation`, `artwork?`, `onClose` y `fabrication?: Fabrication`. Mantiene el paso activo y referencias para reiniciar el desplazamiento al cambiar de paso. Cada apertura empieza en el primer paso y no modifica el proyecto.

## Secuencia

El modal conserva encabezado, pasos y botones visibles, con una sola zona de desplazamiento: instrucciones en escritorio; modelo e instrucciones juntos en móvil y ventanas de poca altura. La barra es fina y violeta, compartida con el sistema. Las instrucciones admiten foco de teclado y el desplazamiento vuelve al inicio al cambiar de paso.

El montaje actual tiene doce etapas definidas por `assemblySequence`: reconocer piezas; presentar la base y anclaje; instalar conexiones y tapita de pilas; cerrar la tapa electrónica; instalar tubo/paso de cables; montar las cuatro paredes; instalar luz; colocar embellecedor; colgar y comprobar la sombra. `assemblyPlacement` comparte esos tiempos con el visor.

En 1 W, el cabezal se monta en dos rebajes posteriores del marco, detrás del LED. El tubo es solo pasacables. La etapa de luz muestra el marco como referencia translúcida en su posición final para identificar el apoyo del puente. La antigua horquilla sobre el tubo se retiró porque obstruía el cono de luz.

Las cuatro paredes bajan por fuera del único perímetro de la base hasta el reborde inferior. Sus ranuras interiores reciben dos nervios finos por lado. No hay canal entre dos paredes de base. La altura inicial es 20 mm y la tapa de pilas queda al ras de la cara posterior. El paso de pilas muestra la cámara desde atrás para revisar ese acceso; se cambia el portapilas descolgando el cuadro sin desmontar los paneles.

Con 3 AAA hay diez archivos: paredes 01–04, marco abierto 05, base 06, tapa electrónica 07, tubo 08, cabezal 09 y tapita de pilas 10. USB elimina la tapita de pilas. COB usa siete piezas, con sus rebajes detrás del perímetro del marco. La base se apoya en Z=0; los paneles se desplazan por `wallOffset`, no así la base. El resultado conserva el frente abierto y muestra la tapa electrónica trasera lisa o con el mismo diseño en relieve. Los lectores históricos sin montaje de pared conservan sus secuencias anteriores.

## Escena y controles

`AssemblyViewer` obtiene las piezas y sus coordenadas mediante `previewParts` y `previewMesh`, de `preview-model.ts`, compartidos con el visor principal. Internamente usan `fabricationParts` y `assemblyMesh`: son las mismas superficies que se exportan al STL. Primero muestra todas las piezas separadas; luego anima y destaca la pieza actual. El paso de pilas mira desde atrás y el paso de luz muestra el LED de 1 W. En la última etapa aparece la proyección sobre la pared, detrás del cuadro con frente abierto. Las variantes COB y sin configuración de fabricación se conservan para compatibilidad y pruebas.

La cámara permite arrastrar para girar, usar rueda o gesto de dos dedos para acercar y utilizar botones para girar o centrar la vista. Al cambiar de paso adapta el encuadre. Con `prefers-reduced-motion: reduce`, las piezas se ubican directamente sin animación de desplazamiento.

Los botones `Anterior`, `Siguiente`, `Reiniciar` y los pasos de la secuencia permiten recorrer la guía; `Finalizar` la cierra. Usa los componentes compartidos `Modal`, `ModalHeader`, `ModalFooter` y `Button`. El diálogo nativo se muestra en la capa superior del navegador, bloquea el scroll de fondo, mantiene Tab dentro de sus controles y se cierra con Escape, el botón de cierre o un clic en el fondo exterior. Al cerrarse devuelve el foco al botón que lo abrió. Esta lógica se comparte con el recorte de imágenes.

## Ciclo de vida y límites

Al cambiar medidas, máscaras o simulación, la escena se reconstruye. Al desmontarse desconecta el `ResizeObserver`, detiene el bucle de renderizado y libera controles, geometrías, materiales, textura y renderizador. Si no puede iniciar WebGL o preparar la escena, conserva los textos y la navegación entre pasos con un mensaje de error.

La electrónica y el alojamiento de pilas están dentro de la base contra la pared. El separador cierra el lado óptico y la tapa de pilas queda al ras en la cara posterior, accesible al descolgar el cuadro. Los pasos explican cableado, guías de las paredes y cierre removible. El ajuste debe calibrarse con una impresión de prueba y la geometría no certifica disipación térmica. La simulación sigue siendo una aproximación puntual. Ver [fabricación](shadow-fabrication.md).

Las pruebas de comportamiento y los recorridos visuales están descritos en [Verificación](../testing.md).
