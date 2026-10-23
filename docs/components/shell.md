# Shell

**Archivo:** `src/components/shell.tsx`. **Uso:** las tres rutas de `src/app/`.

Envuelve el contenido en un encabezado con marca y navegación principal, un elemento `<main>` y un pie. Recibe `children: React.ReactNode` y no tiene estado propio.

Es un componente cliente porque `usePathname()` de `next/navigation` determina qué enlace está activo y establece `aria-current="page"`. Usa `next/link` para navegar y `lucide-react` para iconos. No tiene efectos secundarios ni accede al almacenamiento.
