# Marca en los modelos imprimibles

`src/lib/model-mark.ts` define el texto fijo **©Generado en ProyectAR**, una fuente de píxeles propia y la profundidad de 0,24 mm. No necesita archivos de fuentes, red ni dependencias adicionales. La marca forma parte de la geometría compartida por el visor y los STL; se incorpora también al regenerar proyectos anteriores, sin cambiar su formato JSON.

| Pieza | Ubicación y terminación |
| --- | --- |
| Cuadros: base de pared | Grabado en el dorso, centrado horizontalmente entre el tubo y el anclaje, por encima de la abertura de pilas. |
| Cuadros: tapa electrónica | Grabado posterior, debajo del agujero central y dentro del faldón. |
| Lámparas: panel plano | Relieve posterior horizontal en la esquina inferior derecha vista desde el dorso, con 5 mm de margen, para conservar el espesor mínimo de la foto. |
| Lámparas: panel curvo | Relieve posterior vertical, cerca de un lateral y separado del borde de sujeción. |
| Lámparas: marco frontal | Grabado en la banda posterior superior, fuera del reborde de guiado. |
| Lámparas: tapa trasera de la caja | Grabado posterior centrado; vertical sobre una mitad en la variante curva, separado de la salida de cable. |
| Esfera navideña | Grabado sobre el hombro superior inclinado, siguiendo el arco, entre la foto y el cuello. |

El tamaño se adapta al espacio disponible. El texto se orienta para leerse desde la cara exterior correspondiente. Las piezas rígidas usan cavidades integradas en la rejilla del sólido, sin superponer mallas; se eliminan los contactos diagonales aislados de la fuente para mantener paredes cerradas. El grabado no atraviesa las placas.

`panel-grid.ts` agrega muestras para las letras a las de la fotografía y mantiene los vértices emparejados de frente y dorso. `print-stand.ts` usa esa misma rejilla y calcula los contactos en milímetros, conservando su ancho de 0,8 mm y la continuidad con el panel. El relieve posterior aumenta el espesor local hasta 0,24 mm; no rebaja la foto.

En la esfera se agregan filas sobre el hombro y un mínimo de muestras angulares para resolver el texto incluso con poco detalle de foto. Se conserva la superficie interior y la geometría del cuello, el paso de LED y el labio de encastre. La cantidad final de triángulos incluye la marca y puede superar la de versiones anteriores con la misma resolución.

La tapa electrónica se orienta para imprimir mediante una rotación de 180° alrededor de Y y su transformación inversa en el montaje. Una reflexión aislada de Z espejaría el texto y el diseño frontal asimétrico del STL.

`tests/model-mark.test.ts` verifica el texto, escala, orientación, relieve posterior, conservación del espesor mínimo, presencia en STL, profundidad de los grabados y ubicación sobre el hombro en varios diámetros. Las pruebas de panel, soporte, caja, esfera y montaje verifican además cierre, conectividad, normales, aberturas y encastres. La legibilidad física final requiere comprobar la vista por capas y una impresión con el material y la boquilla elegidos.
