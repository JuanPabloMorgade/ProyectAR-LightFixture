# Componentes UI compartidos

**Carpeta:** `src/components/ui`. **Importación:** `@/components/ui`.

Los componentes contienen presentación, HTML accesible y comportamiento común. El editor conserva los cálculos, validación del proyecto, procesamiento de imágenes y exportación. No se agregaron dependencias de interfaz.

`ui.css` se importa una sola vez desde `src/app/layout.tsx` y usa las variables de `globals.css`. Ajustar allí el aspecto de los controles evita copiar estilos en cada pantalla. Los botones especiales del lienzo y la guía conservan sus clases de dominio con `variant="unstyled"`.

## Componentes disponibles

| Componente                            | Uso                                                                                                     |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `TextField`                           | Input con etiqueta; admite `type="email"`, `name`, `required`, `ref` y otras props nativas.             |
| `NumberField`                         | Input numérico, con `unit`, `min`, `max` y `step`.                                                      |
| `SelectField`                         | Select con etiqueta y `options` o hijos `<option>`.                                                     |
| `TextAreaField`                       | Área de texto con etiqueta, altura mínima y ajuste vertical.                                            |
| `RangeField`                          | Slider con etiqueta y `valueLabel` visual opcional.                                                     |
| `Checkbox`                            | Checkbox con etiqueta clickeable.                                                                       |
| `FileInput`                           | Entrada de archivo, oculta por defecto; admite `ref`, `accept` y `multiple`.                            |
| `Input`, `Select`, `TextArea`         | Controles sin envoltorio para composiciones especiales; requieren etiqueta asociada o nombre accesible. |
| `FormField`                           | Etiqueta, ayuda y error para un control personalizado mediante render prop.                             |
| `Button`, `IconButton`                | Acciones con variantes y estado de carga; los botones de ícono requieren `label`.                       |
| `Modal`, `ModalHeader`, `ModalFooter` | Contenedor nativo con foco, cierre y bloqueo de scroll compartidos.                                     |
| `SegmentedControl`                    | Grupo de botones de selección única, con valores string o number y estado `aria-pressed`.               |
| `Table` y subcomponentes              | Tabla HTML con región horizontal desplazable, caption y encabezados semánticos.                         |
| `Toast`, `ToastViewport`              | Avisos flotantes con variantes, cierre, duración y acción opcional.                                     |

Los controles aceptan props HTML tipadas y referencias de React 19. Los campos etiquetados generan un ID con `useId` o usan el `id` recibido; conectan `description` y `error` mediante `aria-describedby`, y marcan errores con `aria-invalid`. `fieldClassName` modifica el contenedor; `className` modifica el control.

## Campos

En un componente cliente:

```tsx
import { NumberField, SelectField, TextField, TextAreaField } from '@/components/ui';

<TextField label="Nombre" value={name} maxLength={100}
  onChange={(event) => setName(event.target.value)} />

<NumberField label="Ancho" unit="cm" min={6} max={80} step={1}
  value={width} onChange={(event) => setWidth(Number(event.target.value))}
  description="Ancho exterior del cuadro" error={widthError} />

<SelectField label="Detalle" value={detail}
  onChange={(event) => setDetail(Number(event.target.value))}
  options={[{ value: 96, label: 'Borrador' }, { value: 224, label: 'Alto' }]} />

<TextAreaField label="Notas" rows={4} placeholder="Detalles del proyecto…"
  value={notes} onChange={(event) => setNotes(event.target.value)} />
```

`onChange` recibe el evento nativo de React. El componente no convierte, redondea ni limita valores por su cuenta. La pantalla decide cómo manejar valores vacíos y cuándo convertirlos a número o validarlos. No envolver estos campos en otro `<label>`.

Para un control especial, `FormField` entrega `id`, `aria-describedby` y `aria-invalid`. Es necesario pasarlos al elemento que recibe el foco:

```tsx
<FormField label="Diseño" description="Elegí un diseño guardado">
  {(controlProps) => (
    <Select
      {...controlProps}
      value={selected}
      onChange={(event) => setSelected(event.target.value)}
      options={designOptions}
    />
  )}
</FormField>
```

## Botones y modales

```tsx
<Button variant="primary" loading={saving} onClick={save}>
  {saving ? "Guardando…" : "Guardar"}
</Button>
```

`Button` usa `type="button"` por defecto para evitar envíos accidentales. Usar `type="submit"` cuando corresponda. `loading` deshabilita la acción y establece `aria-busy`; el contenido durante la carga lo define la pantalla. Variantes: `primary`, `secondary` (predeterminada), `ghost` y `unstyled`.

Para un modal, generar `titleId` con `useId` en la pantalla y mantener `open` en estado:

```tsx
<Modal open={open} onClose={() => setOpen(false)} aria-labelledby={titleId}>
  <ModalHeader
    title="Editar proyecto"
    titleId={titleId}
    onClose={() => setOpen(false)}
  />
  <TextField
    label="Nombre"
    value={name}
    onChange={(event) => setName(event.target.value)}
  />
  <ModalFooter>
    <Button onClick={() => setOpen(false)}>Cancelar</Button>
    <Button variant="primary" onClick={save}>
      Guardar
    </Button>
  </ModalFooter>
</Modal>
```

`Modal` también acepta `aria-label` en lugar de `aria-labelledby`. Se muestra mediante `showModal`, por encima de la página, y comparte Escape, clic exterior, ciclo de Tab entre controles, restauración del foco y bloqueo de scroll. El cierre solicita `onClose`; la pantalla actualiza `open` o desmonta el componente. Los overlays de recorte y armado ya usan esta implementación. El contador de scroll permite superponer modales sin desbloquear el fondo al cerrar solo uno.

## Tablas

```tsx
import {
  Table,
  TableCaption,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui";

<Table label="Piezas del cuadro">
  <TableCaption>Archivos para imprimir</TableCaption>
  <TableHeader>
    <TableRow>
      <TableHead>Pieza</TableHead>
      <TableHead>Archivo</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableHead scope="row">Tapa frontal</TableHead>
      <TableCell>05-tapa-frontal.stl</TableCell>
    </TableRow>
  </TableBody>
</Table>;
```

`Table` requiere `label` para nombrar su región desplazable. `TableHead` usa `scope="col"` por defecto; indicar `scope="row"` para encabezados de fila. También están disponibles `TableFooter` y las props nativas de cada elemento. No incorpora ordenamiento, paginación ni carga de datos. Se deja disponible para próximas pantallas; actualmente los editores no muestran tablas de datos ni áreas de texto.

## Toast

Los avisos comparten la superficie violeta, bordes, tipografía e iconos del proyecto. `Toast` admite `title`, `description`, `variant` (`success`, `info`, `warning`, `error`), `onDismiss`, `duration` en milisegundos y `action: { label, onClick }`. No requiere proveedor ni dependencias nuevas.

```tsx
import { Toast, ToastViewport } from '@/components/ui';

<ToastViewport>
  {notice && (
    <Toast key={notice.id} title="Proyecto guardado"
      description="Tu diseño está disponible en este navegador."
      variant="success" onDismiss={() => setNotice(null)} />
  )}
</ToastViewport>
```

Montar un solo viewport por página, fuera de contenedores con recorte o scroll. Cada aviso nuevo debe tener una clave nueva para reiniciar su duración. El editor controla el estado; cerrar el Toast debe retirarlo. Puede contener varios avisos. La acción no cierra automáticamente la notificación.

Información y éxito duran 6 segundos por defecto; advertencias y errores permanecen hasta cerrarse. `duration={0}` desactiva el cierre automático. El temporizador conserva el tiempo restante al pausarse por puntero o foco, y se cancela al desmontar. El componente no mueve el foco: anuncia errores mediante `alert` y el resto mediante `status`. Los iconos y colores diferencian las variantes. Respeta movimiento reducido y adapta ancho y controles al móvil.

Ambos editores usan el Toast para los avisos de operaciones; mantienen errores y validaciones junto al contexto que los produce. `tests/toast.test.tsx` cubre anuncios, cierre, acción, temporizadores, pausa y desmontaje.

## Integración y verificación

- Ambos editores usan los campos, entradas de archivo y botones compartidos.
- La selección de forma de litofanía usa `SegmentedControl`.
- Recorte de imagen y guía de armado usan `Modal`, `ModalHeader` y `ModalFooter`.
- `tests/ui.test.tsx` prueba contratos accesibles y eventos; las pruebas de editores y guía comprueban la integración. Los estilos y el comportamiento nativo del diálogo requieren revisión en navegador.
