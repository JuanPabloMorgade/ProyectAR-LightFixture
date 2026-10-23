import Link from "next/link";
import { Shell, Sun, Lamp, ArrowUpRight } from "@/components/shell";
export default function Home() {
  return (
    <Shell>
      <div className="home">
        <div className="eyebrow">
          <span /> TU TALLER DE LUZ
        </div>
        <section className="hero">
          <div>
            <h1>
              Ideas que toman forma.
              <br />
              <em>Fotos que se vuelven luz.</em>
            </h1>
            <p>
              Diseñá piezas únicas para tu impresora 3D.
              <br />
              Elegí una experiencia y empezá a crear.
            </p>
          </div>
          <div className="hero-note">
            <span>01 / 02</span>
            <p>
              Dos formas de transformar
              <br />
              la luz en algo tuyo.
            </p>
            <ArrowUpRight size={30} />
          </div>
        </section>
        <section className="project-grid" aria-label="Elegir editor">
          <Link href="/cuadros" className="project-card shadow-card">
            <div className="card-visual shadow-visual">
              <div className="sun-projection" />
              <div className="shadow-box">
                <span>✳</span>
              </div>
              <span className="visual-tag">PROYECCIÓN DE SOMBRAS</span>
              <div className="visual-label">
                La luz también
                <br />
                puede dibujar.
              </div>
            </div>
            <div className="card-content">
              <span className="card-icon">
                <Sun size={22} />
              </span>
              <div>
                <h2>Cuadros de sombra</h2>
                <p>Una imagen. Una luz. Una pared que cobra vida.</p>
                <span className="tags">
                  Vista 3D <b>·</b> Patrones SVG <b>·</b> Exportación STL
                </span>
              </div>
              <ArrowUpRight className="card-arrow" />
            </div>
          </Link>
          <Link href="/lamparas" className="project-card lamp-card">
            <div className="card-visual lamp-visual">
              <div className="lamp-halo" />
              <div className="art-lamp">
                <div className="mountain mountain-back" />
                <div className="mountain mountain-front" />
                <div className="lamp-sun" />
              </div>
              <div className="lamp-base" />
              <span className="visual-tag">LITOFANÍAS PERSONALIZADAS</span>
              <div className="visual-label">
                Tus recuerdos,
                <br />
                en otra luz.
              </div>
            </div>
            <div className="card-content">
              <span className="card-icon">
                <Lamp size={22} />
              </span>
              <div>
                <h2>Lámparas con fotos</h2>
                <p>Convertí una foto en un panel que se ilumina.</p>
                <span className="tags">
                  Foto a relieve <b>·</b> Plano o curvo <b>·</b> Exportación STL
                </span>
              </div>
              <ArrowUpRight className="card-arrow" />
            </div>
          </Link>
        </section>
        <section className="steps">
          <div>
            <span>01</span>
            <h3>Elegí tu imagen</h3>
            <p>Una foto, un dibujo o un patrón.</p>
          </div>
          <div>
            <span>02</span>
            <h3>Dale tu forma</h3>
            <p>Ajustá las medidas y explorá el resultado.</p>
          </div>
          <div>
            <span>03</span>
            <h3>Hacelo real</h3>
            <p>Descargá el STL y preparalo en tu slicer.</p>
          </div>
        </section>
        <p className="privacy-note">
          Tus fotos se procesan en tu dispositivo. No se suben a un servidor.
        </p>
      </div>
    </Shell>
  );
}
