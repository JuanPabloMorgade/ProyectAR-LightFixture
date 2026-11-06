# Litofanías (`/lamparas`)

**Archivo:** `src/app/lamparas/page.tsx`.

Monta [LampEditor](../components/lamp-editor.md) dentro de [Shell](../components/shell.md). La página no genera geometría ni mantiene el estado del editor.

## Flujo actual

1. El editor inicia con la imagen de ejemplo y los parámetros predeterminados. Diseños guardados comienza vacío: para aplicar uno hay que seleccionarlo y pulsar Aplicar (✓).
2. Primero se elige Plana, Curva o Esfera navideña mediante tarjetas. Los paneles de 180° existentes siguen abriéndose.
3. Se carga JPG/PNG/WebP con recomendaciones junto al cargador y una guía visual. Las fotos de esfera reciben orientación de proporciones sin bloquear la creación.
4. Se ajustan medidas y opciones básicas; espesores, contraste, inversión y Detalle están en Ajustes avanzados.
   Al activar Generar caja trasera, Textura del marco muestra un resumen compacto y Personalizar textura abre una galería con 12 acabados: Sin textura, Líneas, Ondas, Puntos, Hexagonal, Low Poly, Topográfica, Diamante, Voronoi, Madera, Concéntrica y Martillada. Incluye filtros por categoría y mantiene Esquinas del marco como primer grupo de controles. El modal permite elegir Frente, Laterales o Todo el exterior, presets de intensidad y ajustes de profundidad y escala; incluye el mismo visor 3D. Aplicar confirma y Cancelar o Escape descarta el borrador. El relieve de hasta 0,6 mm hacia adentro se refleja en los STL de las piezas elegidas, sin cambiar foto, tamaño exterior ni encastres; se conserva en los proyectos guardados.
   Esquinas del marco permite conservar las puntas rectas o redondearlas de 0 a 100 % (radio máximo de perfil: 2,4 mm), incluso sin textura. Se aplica al exterior de caja, marco y tapa, se muestra en 3D y se exporta en sus STL; conserva el hueco de la foto y los encastres. Los proyectos anteriores mantienen esquinas rectas.
5. El visor tiene mayor altura y conserva luz, giro, zoom e inspección de componentes. El botón de la esquina superior derecha amplía la vista a pantalla completa; se vuelve con el mismo botón o Escape. Si el navegador no permite pantalla completa nativa, se amplía dentro de la ventana con foco contenido y fondo inactivo. El mismo visor permanece montado para conservar ángulo y zoom. La descarga aparece inmediatamente después del resumen. Las guías de impresión, montaje y datos técnicos son desplegables; la seguridad necesaria queda visible.
6. Nombre, guardados, Exportar proyecto, Importar y Guardar están en una barra compacta. Los [guardados compartidos](../components/saved-designs.md) mantienen independientes lámparas y cuadros.

## Variantes

Plano y Curvo exportan un panel o una [caja de iluminación opcional](../components/lamp-housing.md): cuatro STL y guía. Los paneles usan inicialmente [soporte removible](../components/lamp-print-stand.md), que se corta y retira después de imprimir. La vista permite inspeccionarlo en violeta.

Las [esferas navideñas](../components/lamp-sphere.md) tienen cuerpo hueco, base cerrada, foto en relieve exterior y tapa desmontable con tubo guía. Exportan dos STL y guía. La abertura inicial es Ø22 mm y se ajusta de 8 a 30 mm; el cuerpo mide de 30 a 250 mm y debe superar la abertura en al menos 8 mm.

Debajo de la fotografía, **Cómo aplicar la foto** permite cubrir los 360° con una panorámica o conservar la proporción en un sector frontal, dejando liso el resto. En foto centrada, **Estiramiento horizontal** ensancha la imagen de 0 a +75 %, en pasos de 1 %, sin recortarla ni cambiar su altura y con límite en los 360° disponibles. El modo y el porcentaje se guardan en el proyecto y se aplican a la vista y al STL. Los proyectos anteriores mantienen su comportamiento.

## Detalle y vista previa

Borrador, Equilibrado, Alto y Muy alto usan 80, 160, 256 y 384 puntos. Ultra usa 448 para paneles y 512 para esferas, adaptándose al alternar variantes. En una esfera de Ø80 mm, Ultra aproxima 0,25 mm entre muestras en ambos sentidos. Los archivos son más pesados y el resultado sigue dependiendo de la foto y la impresión.

La misma malla alimenta la vista y el STL. Un recálculo fallido conserva la última vista válida y bloquea la descarga; cerrar el toast no habilita una malla desactualizada. La vista iluminada es orientativa. La guía de la esfera incluye las indicaciones de iluminación, montaje y sujeción.
