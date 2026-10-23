import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'ProyectAR — Diseñá con luz',
  description: 'Creá cuadros de sombra y litofanías para imprimir en 3D.',
};
export default function Layout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-AR">
      <body>{children}</body>
    </html>
  );
}
