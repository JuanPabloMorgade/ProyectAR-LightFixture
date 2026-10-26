import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import '../components/ui/ui.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  icons: {
    icon: '/assets/favicon.ico',
  },
  title: 'ProyectAR — Diseñá con luz',
  description: 'Creá cuadros de sombra y litofanías para imprimir en 3D.',
};
export default function Layout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-AR" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
