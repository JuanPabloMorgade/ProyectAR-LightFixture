import { BookOpen, ShieldCheck } from "lucide-react";
import type { Settings } from "./mesh";
import { hasHousing } from "./housing-config";
import { hasPrintStand } from "./print-stand";
import { sphereGrid } from "./sphere";
import { SPHERE_LED_GUIDANCE } from "./sphere-export";
import { Disclosure } from "./studio-controls";
import { MODEL_MARK } from "@/lib/model-mark";
import { frameTextureGuide } from "./frame-texture";

export function PrintingGuide({
  settings,
  triangles,
}: {
  settings: Settings;
  triangles: number | null;
}) {
  const sphere = settings.shape === "sphere";
  const box = hasHousing(settings);
  const stand = hasPrintStand(settings);
  return (
    <section className="lamp-learning" aria-labelledby="lamp-learning-title">
      <div className="lamp-learning-heading">
        <BookOpen size={18} aria-hidden="true" />
        <h2 id="lamp-learning-title">De la pantalla a tu impresión</h2>
        <span>Guías y detalles</span>
      </div>
      {sphere && (
        <div className="lamp-safety">
          <ShieldCheck size={20} aria-hidden="true" />
          <div>
            <strong>Antes de iluminar o colgar</strong>
            <p>
              Usá solo LED de baja potencia y baja temperatura. No uses
              lamparitas incandescentes. Comprobá la temperatura antes de dejar
              la guirnalda encendida. No fuerces los LED ni pellizques los
              cables.
            </p>
            <p>
              Usá una sujeción independiente y probá su retención en el cuello.
              La tapa no es un enganche de suspensión; nunca cuelgues la esfera
              del cable eléctrico.
            </p>
          </div>
        </div>
      )}
      <Disclosure
        title="Cómo imprimir tu litofanía"
        subtitle="Materiales, orientación y soportes"
      >
        <p>
          Usá un material translúcido para la foto y probá una pieza pequeña
          para calibrar contraste y espesor.
        </p>
        {sphere ? (
          <>
            <p>
              La esfera se exporta apoyada sobre su pequeña base plana, con el
              fondo cerrado. Prepará brim y soportes en el laminador. La tapa se
              imprime con su cara exterior plana en la cama y el tubo hacia
              arriba.
            </p>
            <p>
              Revisá los soportes y el encastre con tu material antes de
              imprimir la esfera completa.
            </p>
          </>
        ) : (
          <>
            <p>
              {stand
                ? "El panel se exporta de pie con una base baja de soporte y contactos finos. Agrega 3 mm al alto de impresión y va incluido en el STL."
                : "Exportás el panel sin soporte removible. Revisá su orientación y adhesión a la cama en el laminador."}
            </p>
            {stand && (
              <p>
                Al terminar, cortá los contactos al ras del borde inferior y
                retiralos antes de montar la foto. Probá la separación con tu
                material y altura de capa; evitá arrancar el soporte.
              </p>
            )}
            {settings.angle > 0 && (
              <p>En Curvo, revisá los soportes en el laminador.</p>
            )}
            {box && (
              <>
                <p>Imprimí la caja, el marco y la tapa en material opaco.</p>
                <p>
                  {frameTextureGuide(
                    settings.housing?.frameTexture,
                    settings.housing,
                  )}
                </p>
              </>
            )}
          </>
        )}
      </Disclosure>
      <Disclosure
        title="Montaje e iluminación"
        subtitle={
          sphere ? "Tapa, guirnalda y sujeción" : "Luz y armado de la pieza"
        }
      >
        {sphere ? (
          <>
            <p>
              La abertura superior queda libre para pasar varios LED. Medí el
              conjunto y dejá holgura; el cuello no retiene los LED
              automáticamente. No modifiques el cableado de la guirnalda.
            </p>
            <p>
              Introducí los LED por el cuello, pasá el cable por la ranura
              lateral de 4 mm y presioná la tapa suavemente sobre el reborde.
              Acomodá las luces antes de cerrar y probá el encastre sin
              forzarlo.
            </p>
            <p>{SPHERE_LED_GUIDANCE}</p>
          </>
        ) : box ? (
          <>
            <p>
              El kit incluye cuatro piezas: foto, caja, marco y tapa
              desmontable. El marco sujeta la foto y la tapa permite acceder a
              la luz.
            </p>
            <p>
              Los cierres son guiados, sin pestillo: probá la holgura y una
              fijación removible. Dejá espacio para la iluminación y su cable.
              No incluye LED ni fuente.
            </p>
          </>
        ) : (
          <p>
            Iluminá la foto desde atrás con una luz LED. Podés agregar una caja
            trasera para las variantes Plana y Curva desde Personalizá tu
            diseño.
          </p>
        )}
        <p>
          La vista iluminada aproxima el relieve; no representa la distribución
          de la luz instalada. El resultado depende del material, la impresión y
          la iluminación.
        </p>
      </Disclosure>
      <Disclosure
        title="Detalles técnicos"
        subtitle="Malla, geometría y archivos"
      >
        <dl className="lamp-technical">
          <div>
            <dt>Malla del {sphere ? "cuerpo" : "panel"}</dt>
            <dd>
              {triangles === null ? "—" : triangles.toLocaleString("es-AR")}{" "}
              triángulos
            </dd>
          </div>
          <div>
            <dt>Resolución</dt>
            <dd>{settings.resolution} puntos</dd>
          </div>
          <div>
            <dt>Formato</dt>
            <dd>STL binario · milímetros</dd>
          </div>
        </dl>
        <p>
          Marca de origen: {MODEL_MARK}.{" "}
          {sphere
            ? "Grabada en el hombro superior, fuera de la foto."
            : "En relieve detrás de la foto; agrega hasta 0,24 mm al espesor local. El marco y la tapa llevan la marca grabada en el dorso."}
        </p>
        {sphere ? (
          <>
            <p>
              Separación aproximada de la malla:{" "}
              {sphereGrid(settings).horizontalStep.toFixed(2)} mm alrededor y{" "}
              {sphereGrid(settings).verticalStep.toFixed(2)} mm en altura.
            </p>
            <p>
              El diámetro es el máximo exterior del cuerpo. Relieve exterior e
              interior liso; los polos y el cuello quedan sin imagen.
            </p>
            <p>
              Dos piezas: esfera con hombro liso y cuello con reborde, más tapa
              desmontable con tubo guía interior de hasta 36 mm. En esferas
              pequeñas el tubo se acorta para dejar libre el fondo. La ranura
              lateral de 4 mm continúa a lo largo del tubo.
            </p>
            <p>La descarga incluye ambos STL y la guía de armado en un ZIP.</p>
          </>
        ) : (
          <>
            <p>
              {settings.angle
                ? `El ancho corresponde al arco de ${settings.angle}°. `
                : ""}
              La foto completa se adapta al ancho y al alto elegidos.
            </p>
            {box && (
              <p>
                La caja tiene paredes de 2,4 mm y una salida trasera de cable de
                Ø4 mm. El marco cubre 2 mm del borde de la foto. En Curvo, la
                profundidad sigue el radio del panel; tapas y marco agregan
                espesor exterior. La descarga incluye cuatro STL y guía en un
                ZIP.
              </p>
            )}
          </>
        )}
      </Disclosure>
    </section>
  );
}
