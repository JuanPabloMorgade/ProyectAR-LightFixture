# LampEditor

**Archivo:** `src/features/lithophane/editor.tsx`. **Ruta:** `/lamparas`.

Es el editor cliente de litofanías. No recibe props. Permite cargar JPG, PNG o WebP, elegir panel plano, curvo o semicircular, ajustar medidas, espesores, contraste, inversión y detalle, previsualizar la malla y descargar un STL binario.

**Exportar de pie con soporte removible**, activado inicialmente para las tres formas, prepara el STL del panel con una base baja y contactos que se cortan después de imprimir. **Ver soporte de impresión** lo muestra en violeta y oculta la caja mientras se inspecciona. El soporte agrega 3 mm al alto de impresión y se retira antes del montaje. La preferencia `settings.printStand` se guarda en v1; su ausencia equivale a activado y `false` recupera la exportación anterior. Ver [soporte y separación](lamp-print-stand.md).

Para Plano y Curvo ofrece **Generar caja trasera**, desactivado inicialmente. Agrega caja, marco frontal y tapa desmontable, con espacio para la luz de 25 mm y holgura total de 0,3 mm iniciales. Se ajustan entre 12–80 mm y 0,1–0,6 mm. La vista muestra las cuatro piezas ensambladas y **Ver interior de la caja** retira visualmente la tapa y vuelve translúcida la caja. La descarga pasa a un ZIP con cuatro STL y guía. Semicírculo descarga solo el panel; al volver a Plano o Curvo recupera la configuración de caja. Ver [geometría y montaje](lamp-housing.md).

Detalle ofrece Borrador (80), Equilibrado (160), Alto (256) y **Muy alto (384 puntos)**. La resolución se aplica al lado de mayor tamaño y el otro eje conserva las proporciones del panel. Muy alto aumenta un 50% la resolución lineal respecto de Alto; al refinar ambos ejes, la cantidad de celdas aumenta aproximadamente 2,25 veces. El valor se guarda en el proyecto v1 y se acepta al recuperar o importar, sin cambiar el valor inicial de 160. El worker usa la misma resolución para la vista y el STL.

## Estado y dependencias

- Mantiene ajustes de `Settings`, nombre, foto, píxeles, malla, indicador de cálculo, mensajes de estado y modo de iluminación de la vista.
- Los avisos de operaciones usan el `Toast` compartido: éxito para guardar, abrir, cargar y exportar; advertencia persistente si falla el almacenamiento local. Los errores de cálculo y validación conservan su lugar junto al visor y el bloqueo correspondiente.
- Usa refs para entradas de archivo, worker e identificadores de solicitudes. Estos identificadores evitan aplicar resultados de fotos o mallas anteriores a los ajustes vigentes.
- `mesh.ts` valida parámetros, convierte el brillo en espesor, genera la malla cerrada y serializa el STL. `mesh.worker.ts` calcula el panel y las piezas opcionales de `housing.ts` fuera del hilo principal, transfiriendo sus buffers. `housing-export.ts` orienta y empaqueta el kit; [LampViewer](lamp-viewer.md) lo presenta en 3D.

## Efectos y persistencia

- Al montarse crea el worker y recupera `proyectar:lamp:v1` de `localStorage` o carga una imagen de ejemplo. Al desmontarse termina el worker.
- Al cambiar la foto o los ajustes, solicita de nuevo la malla tras una breve espera.
- Reduce la foto a un máximo de 800 píxeles por lado antes de procesarla. Guarda el proyecto en el navegador y permite exportar e importar JSON.
- `settings.housing` es opcional en proyectos v1. Su ausencia conserva el panel anterior. Se valida al recuperar/importar; las dimensiones incompatibles con la curvatura se rechazan. Un error del generador bloquea la descarga y se anuncia como alerta; corregir la medida solicita un resultado nuevo.
