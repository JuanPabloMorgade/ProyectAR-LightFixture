"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sun, Lamp, ArrowUpRight, Layers3 } from "lucide-react";
export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  return (
    <>
      <header className="site-header">
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
            <Link href={url} key={url} className={path === url ? "active" : ""} aria-current={path === url ? "page" : undefined}>
              {label}
            </Link>
          ))}
        </nav>
        <span className="local-badge">
          <span /> Espacio local
        </span>
      </header>
      <main>{children}</main>
      <footer>
        <span>
          <Layers3 size={15} /> De una idea a una pieza real.
        </span>
        <span>ProyectAR · Diseñado para imprimir</span>
      </footer>
    </>
  );
}
export { Sun, Lamp, ArrowUpRight };
