# Shell

**Archivo:** `src/components/shell.tsx`. **Uso:** las tres rutas de `src/app/`.

Envuelve el contenido en un encabezado con marca y navegación principal, un elemento `<main>` y un pie. Recibe `children: React.ReactNode` y no tiene estado propio.

Es un componente cliente porque `usePathname()` de `next/navigation` determina qué enlace está activo y establece `aria-current="page"`. Usa `next/link` para navegar y `lucide-react` para iconos. No tiene efectos secundarios ni accede al almacenamiento.

El footer compartido incluye marca y propósito, enlaces al estudio y a ambos editores, explicación del procesamiento local y recordatorio de exportar proyectos. Una fila inferior ofrece volver al encabezado mediante el enlace nativo `#inicio`. Usa tres columnas en escritorio, dos en tablet y una en móvil, con controles de al menos 44 px y foco visible. No incluye enlaces a servicios o redes que el proyecto no tenga configurados.
