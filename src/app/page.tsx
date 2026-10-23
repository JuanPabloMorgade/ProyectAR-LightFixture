import Link from "next/link";
import { Shell, Sun, Lamp, ArrowUpRight } from "@/components/shell";

export default function Home() {
  return (
    <Shell>
      <div className="home">
        <section className="hero">
          <div className="eyebrow"><span /> TU TALLER DE LUZ, EN 3D</div>
          <h1>Una imagen.<br /><em>Otra forma de iluminar.</em></h1>
          <p>Transformá tus fotos y dibujos en piezas para imprimir. Diseñá, explorá la luz y hacelo real.</p>
        </section>
        <section className="project-grid" aria-label="Elegir editor">
          <Link href="/cuadros" className="project-card shadow-card">
            <div className="card-visual shadow-visual" aria-hidden="true">
              <div className="sun-projection" /><div className="shadow-box"><span>✳</span></div>
              <span className="visual-tag">LUZ QUE DIBUJA</span>
            </div>
            <div className="card-content">
              <div className="card-heading"><span className="card-icon"><Sun size={20} /></span><h2>Cuadros de sombra</h2></div>
              <p>Un patrón que transforma la luz en una imagen sobre tu pared.</p>
              <span className="card-cta">Diseñar mi cuadro <ArrowUpRight size={17} /></span>
            </div>
          </Link>
          <Link href="/lamparas" className="project-card lamp-card">
            <div className="card-visual lamp-visual" aria-hidden="true">
              <div className="lamp-halo" /><div className="art-lamp"><div className="mountain mountain-back" /><div className="mountain mountain-front" /><div className="lamp-sun" /></div>
              <span className="visual-tag">RECUERDOS QUE ILUMINAN</span>
            </div>
            <div className="card-content">
              <div className="card-heading"><span className="card-icon"><Lamp size={20} /></span><h2>Lámparas con fotos</h2></div>
              <p>Convertí una fotografía en un panel que revela sus detalles con luz.</p>
              <span className="card-cta">Crear mi litofanía <ArrowUpRight size={17} /></span>
            </div>
          </Link>
        </section>
        <section className="steps" aria-label="Cómo crear tu pieza">
          <div><span>01</span><h3>Elegí tu imagen</h3><p>Una foto, un dibujo o un patrón.</p></div>
          <div><span>02</span><h3>Dale tu forma</h3><p>Ajustá las medidas y explorá el resultado.</p></div>
          <div><span>03</span><h3>Hacelo real</h3><p>Descargá el STL y preparalo en tu slicer.</p></div>
        </section>
        <p className="privacy-note">Tus fotos se procesan en tu dispositivo. No se suben a un servidor.</p>
      </div>
    </Shell>
  );
}
