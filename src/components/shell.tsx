"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sun, Lamp, ArrowUpRight, ArrowUp, ShieldCheck } from "lucide-react";
export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  return (
    <>
      <header className="site-header" id="inicio">
        <Link className="brand" href="/" aria-label="ProyectAR inicio">
          <Image
            src="/assets/Logo-ProyectAR.png"
            alt="ProyectAR"
            width={2172}
            height={724}
            priority
          />
        </Link>
        <nav aria-label="Navegación principal">
          {[
            ["/", "Estudio"],
            ["/cuadros", "Cuadros de sombra"],
            ["/lamparas", "Lámparas con fotos"],
          ].map(([url, label]) => (
            <Link
              href={url}
              key={url}
              className={path === url ? "active" : ""}
              aria-current={path === url ? "page" : undefined}
            >
              {label}
            </Link>
          ))}
        </nav>
        <span className="local-badge">
          <span /> Espacio local
        </span>
      </header>
      <main>{children}</main>
      <footer className="site-footer">
        <div className="footer-content">
          <div className="footer-about">
            <Link
              href="/"
              className="footer-brand"
              aria-label="ProyectAR, volver al estudio"
            >
              <Image
                src="/assets/Logo-ProyectAR.png"
                alt="ProyectAR"
                width={180}
                height={60}
                sizes="180px"
              />
            </Link>
            <p className="footer-tagline">De una idea a una pieza real.</p>
            <p>
              Transformá imágenes en luz, sombras y objetos que podés imprimir.
            </p>
            <span className="footer-stamp">DISEÑO DIGITAL · IMPRESIÓN 3D</span>
          </div>
          <nav className="footer-links" aria-label="Explorar ProyectAR">
            <h2>Seguí creando</h2>
            <Link href="/">
              Estudio <ArrowUpRight size={15} aria-hidden="true" />
            </Link>
            <Link href="/cuadros">
              <Sun size={17} aria-hidden="true" /> Cuadros de sombra
            </Link>
            <Link href="/lamparas">
              <Lamp size={17} aria-hidden="true" /> Lámparas con fotos
            </Link>
          </nav>
          <div className="footer-local">
            <ShieldCheck size={22} aria-hidden="true" />
            <h2>Tu creatividad queda con vos</h2>
            <p>
              Tus imágenes se procesan en este navegador. Exportá una copia de
              tus proyectos para conservarlos y seguir creando después.
            </p>
            <span className="footer-local-status">
              <span aria-hidden="true" /> Procesamiento local
            </span>
          </div>
        </div>
        <div className="footer-bottom">
          <p>
            ProyectAR <span aria-hidden="true">·</span> Diseñado para imprimir
          </p>
          <a href="#inicio" className="footer-top">
            Volver arriba <ArrowUp size={15} aria-hidden="true" />
          </a>
        </div>
      </footer>
    </>
  );
}
export { Sun, Lamp, ArrowUpRight };
