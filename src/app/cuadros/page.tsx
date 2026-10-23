import { Shell } from "@/components/shell";
export default function ShadowPage() {
  return (
    <Shell>
      <section className="editor-heading">
        <div>
          <div className="eyebrow">ESTUDIO / CUADROS DE SOMBRA</div>
          <h1>Dibujá con luz.</h1>
          <p>
            Creá el patrón, ajustá la fuente de luz y descargá las piezas para
            imprimir.
          </p>
        </div>
        <span className="pill">SVG + STL</span>
      </section>
      <div className="legacy-wrap">
        <iframe
          src="/shadowbox/index.html"
          title="Editor de cuadros de sombra"
          className="shadow-editor"
        />
      </div>
    </Shell>
  );
}
