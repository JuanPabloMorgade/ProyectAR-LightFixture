# Cuadros de sombra (`/cuadros`)

En **Luz y armado** se usa únicamente LED de 1 W, con 3 pilas AAA o USB de 5 V. Se retiraron el selector de iluminación y los controles COB. Los proyectos anteriores se adaptan a 1 W al abrirse, conservando imagen y medidas e informando el cambio; hay que revisar su montaje. Ver [fabricación](../components/shadow-fabrication.md).

**Archivo:** `src/app/cuadros/page.tsx`.

La ruta monta el [ShadowEditor](../components/shadow-editor.md) dentro de [Shell](../components/shell.md). El editor propone un recorrido libre de tres pasos numerados: **1. Cómo funciona**, **2. Diseñador de patrones** y **3. Vista 3D**. Una entrada nueva comienza en Cómo funciona, pero cualquier paso se puede elegir sin cargar una imagen ni completar campos.

Cómo funciona presenta el recorrido: cargar una imagen propia o probar un ejemplo, ajustar el diseño y revisar el modelo para descargarlo. Su acción **Siguiente** lleva al diseñador y mantiene accesible la explicación técnica de la geometría. En el diseñador, **Cargar imagen** es la acción principal y Rayos, Flor, Estrellas y Texto se ofrecen debajo como ejemplos. Las acciones **Atrás** y **Siguiente** recorren los pasos 1 y 3. Vista 3D conserva el visor, los controles y las descargas; **Volver al diseño** lleva al paso 2.

El selector de pasos es usable con teclado: Tab, Enter y Espacio usan el comportamiento nativo de sus botones; las flechas, Inicio y Fin seleccionan y enfocan los pasos correspondientes. El paso actual se anuncia con `aria-current="step"`.

El editor permite dibujar o cargar una imagen, ajustar la caja y la luz, ver la proyección estimada, inspeccionar la caja en 3D y descargar patrones SVG. En Vista 3D permite descargar nueve piezas (USB) o diez (3 AAA), en un STL combinado o un ZIP con cada STL numerado y nombrado.

**Luz y armado** genera una base contra la pared de 20 mm de altura inicial, anclaje para colgar y tapa de pilas accesible desde atrás al descolgar. Las ranuras interiores de las paredes bajan por las guías exteriores del único perímetro de la base. El separador electrónico deja pasar el tubo y sus cables; puede ser liso o llevar el diseño en relieve real. El marco frontal queda abierto hacia la persona. El LED de 1 W admite 3 AAA o USB. **Ver interior** permite inspeccionar el montaje; se retiró Mostrar rayos.

`Ver guía de armado` recorre doce etapas del conjunto actual. La simulación incluye la separación entre los paneles y la pared causada por la base. La carga del anclaje y el resultado físico requieren calibración. Ver [fabricación](../components/shadow-fabrication.md).

Abrir un diseño guardado o importar un JSON válido restaura la imagen, el nombre y los ajustes recuperados y entra directamente al Diseñador de patrones. Cambiar de paso no reinicia el proyecto ni sus canvas; cancelar el recorte conserva el diseño anterior.

La página no mantiene estado ni procesa imágenes: esas tareas pertenecen a `src/features/shadowbox/`. Usa el layout raíz de `src/app/layout.tsx`; los estilos específicos del editor se importan desde `shadowbox.css` en el propio editor.
