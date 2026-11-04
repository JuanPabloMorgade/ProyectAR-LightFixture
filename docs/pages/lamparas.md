# Lámparas con fotos (`/lamparas`)

**Archivo:** `src/app/lamparas/page.tsx`.

Monta [LampEditor](../components/lamp-editor.md) dentro de [Shell](../components/shell.md). La página no genera geometría ni mantiene el estado del editor.

## Flujo actual

1. El editor inicia con la imagen de ejemplo y los parámetros predeterminados. Diseños guardados comienza vacío: para aplicar uno hay que seleccionarlo y pulsar la carpeta.
2. Se puede cargar JPG/PNG/WebP o importar un proyecto JSON. Un toast confirma Imagen o Diseño cargado correctamente y sugiere ajustar Detalle.
3. Se elige Plano, Curvo o Esferas navideñas, se revisa el modelo y se descarga la pieza o el kit. Los paneles de 180° existentes siguen abriéndose.
4. Exportar proyecto, Importar y Guardar están en la cabecera. Los [guardados compartidos](../components/saved-designs.md) mantienen independientes lámparas y cuadros.

## Variantes

Plano y Curvo exportan un panel o una [caja de iluminación opcional](../components/lamp-housing.md): cuatro STL y guía. Los paneles usan inicialmente [soporte removible](../components/lamp-print-stand.md), que se corta y retira después de imprimir. La vista permite inspeccionarlo en violeta.

Las [esferas navideñas](../components/lamp-sphere.md) tienen cuerpo hueco, base cerrada, foto en relieve exterior y tapa desmontable con tubo guía. Exportan dos STL y guía. La abertura inicial es Ø22 mm y se ajusta de 8 a 30 mm; el cuerpo mide de 30 a 250 mm y debe superar la abertura en al menos 8 mm.

## Detalle y vista previa

Borrador, Equilibrado, Alto y Muy alto usan 80, 160, 256 y 384 puntos. Ultra usa 448 para paneles y 512 para esferas, adaptándose al alternar variantes. En una esfera de Ø80 mm, Ultra aproxima 0,25 mm entre muestras en ambos sentidos. Los archivos son más pesados y el resultado sigue dependiendo de la foto y la impresión.

La misma malla alimenta la vista y el STL. Un recálculo fallido conserva la última vista válida y bloquea la descarga; cerrar el toast no habilita una malla desactualizada. La vista iluminada es orientativa. La guía de la esfera incluye las indicaciones de iluminación, montaje y sujeción.
