# LampEditor

**Archivo:** `src/features/lithophane/editor.tsx`. **Ruta:** `/lamparas`.

Es el editor cliente de litofanías. No recibe props. Permite cargar JPG, PNG o WebP, elegir panel plano, curvo o semicircular, ajustar medidas, espesores, contraste, inversión y detalle, previsualizar la malla y descargar un STL binario.

## Estado y dependencias

- Mantiene ajustes de `Settings`, nombre, foto, píxeles, malla, indicador de cálculo, mensajes de estado y modo de iluminación de la vista.
- Usa refs para entradas de archivo, worker e identificadores de solicitudes. Estos identificadores evitan aplicar resultados de fotos o mallas anteriores a los ajustes vigentes.
- `mesh.ts` valida parámetros, convierte el brillo en espesor, genera la malla cerrada y serializa el STL. `mesh.worker.ts` calcula la malla fuera del hilo principal; [LampViewer](lamp-viewer.md) la presenta en 3D.

## Efectos y persistencia

- Al montarse crea el worker y recupera `proyectar:lamp:v1` de `localStorage` o carga una imagen de ejemplo. Al desmontarse termina el worker.
- Al cambiar la foto o los ajustes, solicita de nuevo la malla tras una breve espera.
- Reduce la foto a un máximo de 800 píxeles por lado antes de procesarla. Guarda el proyecto en el navegador y permite exportar e importar JSON.
