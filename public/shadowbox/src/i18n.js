/** Local UI translations. Language changes never reload or alter the design. */
(function (global) {
  'use strict';

  const STORAGE_KEY = 'shadowbox.language';
  // Each entry contains English followed by Argentine Spanish.
  const messages = {
    'app.title': ['Shadow Box Designer', 'Diseñador de cuadros de sombra'],
    'app.subtitle': ['Inverse-project a circular wall image into CNC cutout patterns and a printable 3D STL base file for a wall-mounted shadow lamp.', 'Convertí una imagen circular en patrones de corte para CNC y un archivo STL imprimible en 3D para crear una lámpara de sombras de pared.'],
    'language.label': ['Language', 'Idioma'],
    'tab.geometry': ['3D Geometry', 'Geometría 3D'],
    'tab.designer': ['Pattern Designer', 'Diseñador de patrones'],
    'tab.math': ['Math Reference', 'Referencia matemática'],
    'shared.title': ['Shared geometry (applies to both tabs)', 'Geometría compartida (se aplica a ambas pestañas)'],
    'design.current': ['Current design:', 'Diseño actual:'],
    'design.untitled': ['untitled', 'sin título'],
    'action.save': ['Save', 'Guardar'],
    'action.saveAs': ['Save As…', 'Guardar como…'],
    'action.open': ['Open…', 'Abrir…'],
    'action.reveal': ['Reveal folder', 'Abrir carpeta'],
    'action.revealTitle': ['Open the data folder', 'Abrir la carpeta de datos'],
    'action.cancel': ['Cancel', 'Cancelar'],
    'action.delete': ['Delete', 'Eliminar'],
    'geometry.width': ['Box width (W, cm)', 'Ancho de la caja (W, cm)'],
    'geometry.height': ['Box height (H, cm)', 'Alto de la caja (H, cm)'],
    'geometry.depth': ['Box depth (d, cm)', 'Profundidad de la caja (d, cm)'],
    'geometry.lightZ': ['Light z (% of depth)', 'Posición z de la luz (% de profundidad)'],
    'legend.wall': ['Wall (projection plane)', 'Pared (plano de proyección)'],
    'legend.box': ['Box walls (carvable)', 'Paneles de la caja (recortables)'],
    'legend.light': ['Light source', 'Fuente de luz'],
    'legend.lid': ['Lid (occluder)', 'Tapa (bloquea la luz)'],
    'legend.rays': ['Light rays', 'Rayos de luz'],
    'legend.blocked': ['Blocked by lid', 'Bloqueados por la tapa'],
    'geometry.hint': ['drag to orbit · scroll to zoom', 'arrastrá para girar · usá la rueda para acercar o alejar'],
    'geometry.lidHeight': ['Lid height above light (h)', 'Altura de la tapa sobre la luz (h)'],
    'geometry.lidRadius': ['Lid radius', 'Radio de la tapa'],
    'geometry.rays': ['Ray density', 'Densidad de rayos'],
    'geometry.toggleCutouts': ['Toggle sample cutouts', 'Mostrar/ocultar recortes de ejemplo'],
    'geometry.toggleLid': ['Toggle lid', 'Mostrar/ocultar tapa'],
    'geometry.reset': ['Reset view', 'Restablecer vista'],
    'geometry.download': ['Download box STL', 'Descargar STL de la caja'],
    'geometry.thickness': ['Thickness (mm):', 'Espesor (mm):'],
    'geometry.stlHint': ['single .stl with all 5 pieces (4 walls + base plate) as separate solids', 'un único .stl con las 5 piezas (4 paneles + placa base) como sólidos separados'],
    'designer.target': ['Target image (vector — white = lit)', 'Imagen objetivo (vectorial — blanco = iluminado)'],
    'designer.simulation': ['Simulated shadow on wall', 'Sombra simulada sobre la pared'],
    'preset.rays': ['Sun rays', 'Rayos de sol'],
    'preset.flower': ['Flower', 'Flor'],
    'preset.stars': ['Star ring', 'Anillo de estrellas'],
    'preset.text': ['Text ring', 'Anillo de texto'],
    'designer.uploadImage': ['Upload image…', 'Cargar imagen…'],
    'designer.uploadSVG': ['Upload SVG…', 'Cargar SVG…'],
    'designer.clear': ['Clear', 'Limpiar'],
    'designer.drawHint': ['click+drag to draw on the target image (shift+drag to erase)', 'hacé clic y arrastrá para dibujar sobre la imagen (Mayús + arrastrar para borrar)'],
    'designer.applyCrop': ['Apply crop', 'Aplicar recorte'],
    'designer.cropHint': ['drag to pan · scroll to zoom · only the white circle is kept', 'arrastrá para mover · usá la rueda para acercar o alejar · solo se conserva el círculo blanco'],
    'designer.radius': ['Image radius (cm)', 'Radio de la imagen (cm)'],
    'designer.margin': ['Min cutout margin (mm)', 'Margen mínimo de corte (mm)'],
    'designer.patterns': ["Computed cutout patterns (vector — these get CNC'd into the side walls)", 'Patrones de corte calculados (vectoriales — se recortan con CNC en los paneles laterales)'],
    'wall.top': ['Top wall (viewed from inside)', 'Panel superior (visto desde adentro)'],
    'wall.bottom': ['Bottom wall', 'Panel inferior'],
    'wall.left': ['Left wall', 'Panel izquierdo'],
    'wall.right': ['Right wall', 'Panel derecho'],
    'designer.footnote': ["Each wall canvas: horizontal axis = position along wall length, vertical axis = depth (top of canvas = front of box, far from wall, near the lid; bottom = back of box, against the projection wall). White = remove material. Red zone at top = forbidden (at or past the light's z-level — rays from a cutout there go forward, not toward the wall).", 'En cada panel: eje horizontal = posición a lo largo del panel; eje vertical = profundidad (arriba = frente de la caja, lejos de la pared y cerca de la tapa; abajo = parte trasera de la caja, contra la pared de proyección). Blanco = quitar material. Zona roja superior = zona no permitida (a la altura z de la luz o por delante: los rayos que pasan por un recorte allí se alejan de la pared).'],
    'designer.exportSVG': ['Export SVGs (one per wall)', 'Exportar SVG (uno por panel)'],
    'designer.exportPNG': ['Export target as PNG', 'Exportar imagen objetivo como PNG'],
    'save.title': ['Save design as…', 'Guardar diseño como…'],
    'save.location': ['Files are kept in the app data folder.', 'Los archivos se guardan en la carpeta de datos de la aplicación.'],
    'save.browserLocation': ['Designs are kept in this browser.', 'Los diseños se guardan en este navegador.'],
    'save.placeholder': ['design name', 'nombre del diseño'],
    'save.saved': ['Saved', 'Guardado'],
    'save.savedName': ['Saved "{name}"', 'Se guardó "{name}"'],
    'save.nameRequired': ['Please enter a name.', 'Ingresá un nombre.'],
    'save.overwrite': ['"{name}" already exists. Overwrite?', 'Ya existe "{name}". ¿Querés reemplazarlo?'],
    'open.title': ['Open design', 'Abrir diseño'],
    'open.empty': ['No saved designs yet.', 'Todavía no hay diseños guardados.'],
    'open.folder': ['Folder: {path}', 'Carpeta: {path}'],
    'open.browserStorage': ['Browser storage', 'Almacenamiento del navegador'],
    'open.deleteConfirm': ['Delete "{name}"?', '¿Querés eliminar "{name}"?'],
    'error.noPattern': ['No cutout pattern yet — open the Pattern Designer tab once so the masks compute.', 'Todavía no hay un patrón de corte. Abrí la pestaña Diseñador de patrones para calcularlo.'],
    'error.thickness': ['Thickness must be a positive number (mm).', 'El espesor debe ser un número positivo (mm).'],
    'error.stl': ['Could not build the STL file.', 'No se pudo generar el archivo STL.'],
    'error.designImage': ['Could not load target image from this design file.', 'No se pudo cargar la imagen objetivo de este archivo de diseño.'],
    'error.open': ['Could not open the design.', 'No se pudo abrir el diseño.'],
    'error.save': ['Could not save the design.', 'No se pudo guardar el diseño.'],
    'error.list': ['Could not load the saved designs.', 'No se pudieron cargar los diseños guardados.'],
    'error.delete': ['Could not delete the design.', 'No se pudo eliminar el diseño.'],
    'error.reveal': ['Could not open the data folder.', 'No se pudo abrir la carpeta de datos.'],
    'error.image': ['Could not load that image.', 'No se pudo cargar esa imagen.'],
    'error.svgParse': ['Could not parse SVG file.', 'No se pudo leer el archivo SVG.'],
    'error.svgRender': ['Could not render that SVG (it may reference external resources).', 'No se pudo mostrar ese SVG (puede contener referencias a recursos externos).'],
    'math.geometry': ['Geometry', 'Geometría'],
    'math.coordinates': ['Coordinate system: the wall is the plane <code>z = 0</code>. The box sits on the wall and extends outward in <code>+z</code>. The box occupies <code>x ∈ [-W/2, W/2]</code>, <code>y ∈ [-H/2, H/2]</code>, <code>z ∈ [0, d]</code>. The back of the box is sealed against the wall; light reaches the wall only through cutouts in the four side walls.', 'Sistema de coordenadas: la pared es el plano <code>z = 0</code>. La caja se apoya en la pared y se extiende hacia afuera en <code>+z</code>. La caja ocupa <code>x ∈ [-W/2, W/2]</code>, <code>y ∈ [-H/2, H/2]</code>, <code>z ∈ [0, d]</code>. La parte trasera queda sellada contra la pared; la luz llega a ella únicamente a través de los recortes de los cuatro paneles laterales.'],
    'math.light': ['Light source at <code>L = (0, 0, c<sub>z</sub>)</code>, where <code>c<sub>z</sub></code> is the bulb\'s height along the depth axis. The "Light z" slider sets <code>c<sub>z</sub> = lightFrac · d</code>; <code>50%</code> places the bulb at the geometric center (<code>d/2</code>). Lower values pull the bulb toward the wall (more of the box becomes "in front of" the light and is unusable for cutouts); higher values push it forward. Lid is parallel to the wall at <code>z = c<sub>z</sub> + h</code>, blocking forward glare.', 'La fuente de luz está en <code>L = (0, 0, c<sub>z</sub>)</code>, donde <code>c<sub>z</sub></code> es la posición de la lámpara sobre el eje de profundidad. El control "Posición z de la luz" define <code>c<sub>z</sub> = lightFrac · d</code>; un valor de <code>50%</code> ubica la lámpara en el centro geométrico (<code>d/2</code>). Los valores menores la acercan a la pared (una mayor parte de la caja queda por delante de la luz y no sirve para recortes); los valores mayores la desplazan hacia el frente. La tapa es paralela a la pared y está en <code>z = c<sub>z</sub> + h</code>, para bloquear el deslumbramiento frontal.'],
    'math.forward': ['Forward map', 'Proyección directa'],
    'math.forwardIntro': ['For a cutout at <code>(u, z)</code> on the right wall (<code>x = W/2</code>), the ray from <code>L</code> through that point hits the wall at:', 'Para un recorte en <code>(u, z)</code> sobre el panel derecho (<code>x = W/2</code>), el rayo que parte de <code>L</code> y atraviesa ese punto llega a la pared en:'],
    'math.symmetry': ['Symmetrically for the other three walls (swap roles of <code>x</code> and <code>y</code> for top/bottom; flip sign for left/bot). Valid only when <code>z &lt; c<sub>z</sub></code> — cutouts past the light project forward, not toward the wall.', 'Se aplica por simetría a los otros tres paneles (intercambiá <code>x</code> e <code>y</code> para los paneles superior e inferior; invertí el signo para el izquierdo y el inferior). Solo es válido si <code>z &lt; c<sub>z</sub></code>: los recortes por delante de la luz proyectan hacia el frente, alejándose de la pared.'],
    'math.inverse': ['Inverse map', 'Proyección inversa'],
    'math.inverseIntro': ['For a target wall point <code>(X, Y)</code> outside the box footprint, decide which side wall handles it by comparing <code>|X| - W/2</code> vs <code>|Y| - H/2</code> — whichever is larger picks the dominant face. Then back-solve:', 'Para un punto objetivo <code>(X, Y)</code> fuera del área que ocupa la caja sobre la pared, compará <code>|X| - W/2</code> con <code>|Y| - H/2</code> para determinar qué panel lateral le corresponde: el mayor define la cara dominante. Luego calculá la proyección inversa:'],
    'math.inverseCode': ['// for the right face (X > 0, |X|-W/2 >= |Y|-H/2)\nt      = X / (W/2)\nz_cut  = c_z · (1 - 1/t)\nu_cut  = Y / t', '// para la cara derecha (X > 0, |X|-W/2 >= |Y|-H/2)\nt      = X / (W/2)\nz_cut  = c_z · (1 - 1/t)\nu_cut  = Y / t'],
    'math.constraints': ['Constraints: <code>0 &lt; z_cut &lt; c<sub>z</sub> - margin</code>, <code>|u_cut| &lt; H/2</code>. Points violating these are unreachable on this wall.', 'Restricciones: <code>0 &lt; z_cut &lt; c<sub>z</sub> - margin</code>, <code>|u_cut| &lt; H/2</code>. Los puntos que no las cumplen no se pueden alcanzar desde este panel.'],
    'math.circle': ['Why the maximum lit region is roughly a circle', 'Por qué la región iluminada máxima es aproximadamente circular'],
    'math.circleIntro': ['The point source plus rotational symmetry of the box-around-light means that, at equal cutout-z values, equal-radius wall points are reachable. Practically the achievable radius is limited by:', 'La fuente puntual y la simetría de rotación de la caja alrededor de la luz permiten alcanzar puntos de la pared a igual radio cuando los recortes tienen la misma coordenada z. En la práctica, el radio alcanzable está limitado por:'],
    'math.structural': ['<strong>Structural margin</strong> near <code>z = d/2</code> — you can\'t carve infinitely close to the light\'s z-level.', '<strong>Margen estructural</strong> cerca de <code>z = d/2</code>: no se puede recortar infinitamente cerca de la coordenada z de la luz.'],
    'math.falloff': ['<strong>Inverse-square brightness falloff</strong> — far points become invisibly dim.', '<strong>Caída del brillo con el cuadrado de la distancia</strong>: los puntos lejanos se vuelven demasiado tenues para verse.'],
    'math.softness': ['<strong>Penumbra blur</strong> — finite bulb size produces soft shadows, blurrier the closer the cutout is to the bulb (or the farther from the wall).', '<strong>Desenfoque por penumbra</strong>: el tamaño de la lámpara produce sombras suaves, más borrosas cuanto más cerca está el recorte de la lámpara (o más lejos de la pared).'],
    'math.penumbra': ['Penumbra estimate', 'Estimación de la penumbra'],
    'math.penumbraIntro': ['For a bulb of diameter <code>D</code>, the blur radius on the wall at a point reached via a cutout at depth <code>z_cut</code>:', 'Para una lámpara de diámetro <code>D</code>, el radio de desenfoque sobre la pared en un punto alcanzado a través de un recorte a profundidad <code>z_cut</code> es:'],
    'math.penumbraCode': ['blur ≈ D · (z_cut to wall distance) / (bulb to cutout distance)\n     = D · z_cut / (c_z - z_cut)', 'blur ≈ D · (distancia del recorte a la pared) / (distancia de la lámpara al recorte)\n     = D · z_cut / (c_z - z_cut)'],
    'math.penumbraDetail': ['So as <code>z_cut → c<sub>z</sub></code>, blur diverges. Substituting <code>z_cut</code> via the inverse map gives <code>blur = D · (2X/W − 1)</code> for the right face — independent of <code>c<sub>z</sub></code>. The light-z slider therefore doesn\'t change geometric image sharpness; it changes how much of the side panel is usable (more depth on the wall side) and where the cutouts physically sit.', 'Cuando <code>z_cut → c<sub>z</sub></code>, el desenfoque crece sin límite. Al sustituir <code>z_cut</code> mediante la proyección inversa se obtiene <code>blur = D · (2X/W − 1)</code> para la cara derecha, independiente de <code>c<sub>z</sub></code>. Por eso, el control de posición z de la luz no cambia la nitidez geométrica de la imagen: cambia cuánto del panel lateral se puede usar (más profundidad del lado de la pared) y dónde se ubican físicamente los recortes.'],
    'math.brightness': ['Brightness model', 'Modelo de brillo'],
    'math.brightnessIntro': ['Wall illuminance at point <code>(X, Y)</code> reached through a cutout of area <code>A</code>:', 'Iluminancia sobre la pared en el punto <code>(X, Y)</code>, alcanzado a través de un recorte de área <code>A</code>:'],
    'math.brightnessDetail': ['where <code>r</code> is the source-to-wall distance, <code>θ</code> is the angle between the ray and the wall normal. To make outer regions match inner brightness, scale cutout area by roughly <code>r² / cos(θ)</code>.', 'donde <code>r</code> es la distancia entre la fuente y la pared, y <code>θ</code> es el ángulo entre el rayo y la normal a la pared. Para igualar el brillo de las regiones externas con el de las internas, multiplicá el área de los recortes aproximadamente por <code>r² / cos(θ)</code>.'],
  };

  let language = 'es';
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'en' || saved === 'es') language = saved;
  } catch (_) { /* Language switching still works when storage is unavailable. */ }

  function t(key, params = {}) {
    const entry = messages[key];
    const text = entry ? entry[language === 'es' ? 1 : 0] : key;
    return text.replace(/\{(\w+)\}/g, (match, name) =>
      Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : match);
  }

  function setText(element, key, params = {}) {
    element.dataset.i18n = key;
    element.dataset.i18nParams = JSON.stringify(params);
    element.textContent = t(key, params);
  }

  function apply() {
    document.documentElement.lang = language === 'es' ? 'es-AR' : 'en-US';
    document.querySelectorAll('[data-i18n]').forEach((element) => {
      element.textContent = t(element.dataset.i18n, JSON.parse(element.dataset.i18nParams || '{}'));
    });
    // Only our static, trusted math translations contain markup. User data is
    // always inserted with textContent via setText, never interpolated into HTML.
    document.querySelectorAll('[data-i18n-html]').forEach((element) => {
      element.innerHTML = t(element.dataset.i18nHtml);
    });
    ['title', 'placeholder', 'aria-label'].forEach((attribute) => {
      document.querySelectorAll(`[data-i18n-${attribute}]`).forEach((element) => {
        element.setAttribute(attribute, t(element.getAttribute(`data-i18n-${attribute}`)));
      });
    });
    document.querySelectorAll('[data-language]').forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.language === language));
    });
  }

  function setLanguage(next) {
    if (next !== 'en' && next !== 'es') return;
    language = next;
    try { localStorage.setItem(STORAGE_KEY, language); } catch (_) {}
    apply();
    global.dispatchEvent(new Event('languagechange'));
    // Text wrapping can resize the 3D viewport.
    global.dispatchEvent(new Event('resize'));
  }

  global.I18n = {
    t, setText, setLanguage,
    getLocale: () => language === 'es' ? 'es-AR' : 'en-US',
  };
  document.querySelectorAll('[data-language]').forEach((button) => {
    button.addEventListener('click', () => setLanguage(button.dataset.language));
  });
  apply();
})(window);

