# Cuadros de sombra (`/cuadros`)

**Archivo:** `src/app/cuadros/page.tsx`.

La ruta monta el [ShadowEditor](../components/shadow-editor.md) dentro de [Shell](../components/shell.md). El editor propone un recorrido libre de tres pasos numerados: **1. Cómo funciona**, **2. Diseñador de patrones** y **3. Vista 3D**. Una entrada nueva comienza en Cómo funciona, pero cualquier paso se puede elegir sin cargar una imagen ni completar campos.

Cómo funciona presenta el recorrido: cargar una imagen propia o probar un ejemplo, ajustar el diseño y revisar el modelo para descargarlo. Su acción **Siguiente** lleva al diseñador y mantiene accesible la explicación técnica de la geometría. En el diseñador, **Cargar imagen** es la acción principal y Rayos, Flor, Estrellas y Texto se ofrecen debajo como ejemplos. Las acciones **Atrás** y **Siguiente** recorren los pasos 1 y 3. Vista 3D conserva el visor, los controles y las descargas; **Volver al diseño** lleva al paso 2.

El selector de pasos es usable con teclado: Tab, Enter y Espacio usan el comportamiento nativo de sus botones; las flechas, Inicio y Fin seleccionan y enfocan los pasos correspondientes. El paso actual se anuncia con `aria-current="step"`.

El editor permite dibujar o cargar una imagen, ajustar la caja y la luz, ver la proyección estimada, inspeccionar la caja en 3D y descargar patrones SVG. En Vista 3D permite elegir entre un STL de cinco piezas o un ZIP con cada pieza en su propio STL, numerada y nombrada.

**Luz y armado** permite seleccionar de 1 a 3 LEDs y ajustar cuerpo, reborde, altura y holgura. La tapa incorpora los soportes y conductos; las paredes ofrecen encastres guiados opcionales. El visor muestra las mismas piezas que se exportan. Si no hay espacio para el soporte, se indica cómo corregir las medidas antes de descargar. La proyección sigue estimada desde una fuente central. Ver [fabricación del prototipo](../components/shadow-fabrication.md).

En Vista 3D, debajo de las medidas, `Ver guía de armado` abre la [guía 3D](../components/assembly-guide.md) en un modal. Utiliza el diseño abierto para mostrar la disposición de las cinco piezas, la luz y la proyección final en ocho pasos.

Abrir un diseño guardado o importar un JSON válido restaura la imagen, el nombre y los ajustes recuperados y entra directamente al Diseñador de patrones. Cambiar de paso no reinicia el proyecto ni sus canvas; cancelar el recorte conserva el diseño anterior.

La página no mantiene estado ni procesa imágenes: esas tareas pertenecen a `src/features/shadowbox/`. Usa el layout raíz de `src/app/layout.tsx`; los estilos específicos del editor se importan desde `shadowbox.css` en el propio editor.
