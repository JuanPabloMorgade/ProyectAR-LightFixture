# Inicio (`/`)

**Archivo:** `src/app/page.tsx`.

La portada presenta el estudio, enlaza a `/cuadros` y `/lamparas`, resume los tres pasos de creación y aclara que las imágenes se procesan en el dispositivo.

## Composición y dependencias

- `Shell` aporta la navegación y el pie comunes.
- `next/link` crea los enlaces hacia los dos editores.
- Los iconos `Sun`, `Lamp` y `ArrowUpRight` se reexportan desde `src/components/shell.tsx`.
- Los estilos de la portada están en `src/app/globals.css`.

La página es un componente de servidor sin estado, props ni efectos propios. Usa el layout raíz de `src/app/layout.tsx`.
