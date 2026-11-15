# SEBASAM — Sistema de diseño

> Fuente de verdad visual: la propuesta [SEBASAM Consistencia Visual](./docs/SEBASAM%20Consistencia%20Visual.html) (v2, nov 2026), rastreada en el issue #807. Cuando este documento y el código difieran en reglas visuales, gana este documento y se corrige el código.
> Este documento conserva contratos visuales y criterios de diseño, no un inventario de funcionalidades. Los flujos de negocio viven en el [manual de producto](./docs/product-guide/index.md) y el estado implementado en [ARCHITECTURE](./docs/ARCHITECTURE.md).

## Resumen

- Producto: sistema de gestión para taller (cotizaciones, órdenes de trabajo, clientes, pagos, nómina, inventario). El acceso inmediato es admin-led.
- Prioridad: **web mobile-first** (verificar a 375 px) con escritorio a 1366 × 768, en modo claro y oscuro.
- Tema: **claro por defecto**; el modo oscuro no invierte el claro (ver paleta).
- Tipografía: **una sola familia, Inter**, con cifras tabulares para montos, folios, placas y CLABE. Sin DM Mono.
- Iconos: **Tabler, set outline, trazo 2**, detrás de un wrapper propio `<Icon name>`.
- Filosofía: se trabaja por **pieza**, no por pantalla. Una pantalla solo cambia porque cambia una pieza compartida de `src/components/ui`, nunca por un estilo suelto.

## Reglas del sistema

1. **Botones: 40 / 36 / 32 px** (`lg` / `default` / `sm`), todos con área táctil de 44 px. `lg` para la acción principal, `default` para todo lo demás, `sm` para herramientas y filas. El tamaño lo decide la jerarquía de la acción, no la pantalla.
2. **Una acción primaria por superficie**, siempre en el mismo lugar: abajo o a la derecha.
3. **Tres niveles de azul**, cada uno con un trabajo:
   - Gradiente de marca: solo marca dónde estás (pestaña activa e ítem activo de la barra lateral).
   - Azul plano `#0A3D8F`: acción principal de la página ("Nueva", "Agregar", "Siguiente", "Guardar").
   - Tonal (fondo azul tenue, texto azul): acción de cada tarjeta.
   Nada más lleva gradiente.
4. **Radios múltiplos de 4**: 8 px para elementos pequeños dentro de un control; 12 px para todo lo que se toca (botones, campos, chips, opciones del segmentado, pestaña activa); 16 px para el contenedor del segmentado y para superficies (tarjetas, listas, secciones); 24 px arriba en las hojas. La pastilla queda solo para insignias de estado y el indicador de la pestaña activa.
5. **Sombra o borde, nunca los dos.** Una superficie sobre el fondo de la página (tarjeta, lista, cifra) se separa con sombra y sin borde. Una superficie dentro de una hoja o panel, que ya es blanca, lleva borde fino y sin sombra.
6. **Cerrar (✕) siempre arriba a la derecha** en hojas, diálogos y flujos; nunca a la izquierda ni abajo.
7. **Pestañas para cambiar de sección, segmentado para filtrar.** Pestañas subrayadas: Resumen / Vehículos, Pendientes / Por periodo. Segmentado: Todas / Pendientes / Pagadas.
8. **Estados y montos.** Un estado = una insignia. "Activo" no se muestra cuando es lo normal; solo se marca lo que se sale de lo normal (Inactivo). Los montos van en semibold con cifras tabulares.
9. **Color semántico solo en el dato.** Sin bordes laterales de colores ni iconos dentro de cajitas.
10. **Toda tarjeta abre su vista previa.** Cotizaciones, trabajos y notas muestran los conceptos en solo lectura al tocarlas, sin entrar a editar.
11. **Un solo scroll por pantalla.** Sin cajas con scroll dentro de otra caja con scroll, salvo tablas anchas, que se desplazan solo de lado.

## Tokens fundamentales

### Paleta · modo claro y modo oscuro

Los tokens semánticos cambian según la clase `light`/`dark` en `<html>`. El modo por defecto es **claro**. El oscuro usa grises tinta con un tinte azul leve, azules menos saturados y la acción principal en casi blanco con texto oscuro.

| Uso | Token | Claro | Oscuro |
|---|---|---|---|
| Fondo de pantalla | `--background` / `--color-bg-soft` | `#F3F6FA` | `#0E131B` |
| Superficie (tarjetas, hojas) | `--color-surface` | `#FFFFFF` | `#161D28` |
| Superficie secundaria | `--color-surface-muted` | `#F7F9FC` | `#121923` |
| Borde | `--color-border-light` | `#D7E0EA` | `#263142` |
| Texto principal | `--color-text-main` | `#001024` | `#E7ECF3` |
| Texto secundario | `--color-text-muted-fg` | `#475569` | `#B4BFCD` |
| Texto tenue | `--color-text-muted` | `#64748B` | `#8C99AB` |
| Acción principal | `--color-btn-primary` | `#0A3D8F` | `#EEF2F7` |
| Texto sobre acción principal | `--color-on-btn-primary` | `#FFFFFF` | `#0E131B` |
| Acción de tarjeta (fondo) | `--color-tonal-bg` | `#E6F1FB` | `#24375A` |
| Acción de tarjeta (texto) | `--color-tonal-fg` | `#004AAD` | `#FFFFFF` |
| Gradiente de marca (navegación activa) | `--gradient-primary` | `linear-gradient(90deg, #004AAD 0%, #001024 100%)` | igual |
| Monto | `--color-amount` | `#004AAD` | `#B9D2FA` |
| Enlace | `--color-link` | `#004AAD` | `#9CC0F5` |
| Éxito | `--color-status-success-fg` | `#15803D` | `#6FD39A` |
| Advertencia | `--color-status-warning-fg` | `#B45309` | `#F2C46B` |
| Error | `--color-status-danger-fg` | `#B91C1C` | `#F29B9B` |
| Información | `--color-status-info-fg` | `#004AAD` | `#9CC0F5` |

Los nombres son los tokens de `src/app/globals.css`. Marca: base `#004AAD`, deep navy `#001024`, tinte `#E6F1FB`. Los fondos de estado (`--ok-bg`, `--warn-bg`, `--bad-bg`, `--info-bg`) son pasteles de bajo alfa con borde de alfa medio y texto/dot en el color sólido. Preferir neutros con tinte azul; no usar grises puros. Encabezado de documentos (`--doc-head-bg`): gradiente de marca en claro, gris tinta `#1B2433` sin gradiente en oscuro.

### Tipografía

| Estilo | Fuente | Peso | Tamaño | Interlineado |
|---|---|---|---|---|
| Display | Inter | Regular 400 | 28px | 1.1em |
| Title | Inter | Extra Bold 800 | 20px | 1.2em |
| Subtitle | Inter | Semi Bold 600 | 16px | 1.3em |
| Body | Inter | Regular 400 | 16px | 1.5em |
| Body sm | Inter | Regular 400 | 14px | 1.5em |
| Caption | Inter | Medium 500 | 12px | 1.2em |
| Montos / folios / placas / CLABE | Inter, `font-variant-numeric: tabular-nums` | Semi Bold 600 | según contexto | — |

### Espaciado, formas y tamaños

| Token | Valor | Uso |
|---|---|---|
| `--space-xs` / `sm` / `md` / `lg` / `xl` | 4 / 8 / 16 / 24 / 32 px | Escala de espaciado. |
| `--radius-sm` | 8px | Elementos pequeños dentro de un control. |
| `--radius-md` | 12px | Todo lo que se toca. |
| `--radius-lg` | 16px | Contenedor del segmentado y superficies. |
| `--radius-sheet` | 24px | Esquinas superiores de las hojas. |
| `--control-lg` / `--control-md` / `--control-sm` | 40 / 36 / 32 px | Escala de botones. |
| `--tap-min-height` | 44px | Área táctil mínima (invisible si el control es menor). |
| `--screen-padding-x` | 16px | Padding horizontal de pantalla. |

### Sombras

| Token | Valor | Uso |
|---|---|---|
| `--shadow-sm` | `0 1px 3px rgba(0,16,36,.06), 0 1px 2px rgba(0,16,36,.04)` | Elementos pequeños. |
| `--shadow-md` | `0 4px 12px rgba(0,16,36,.07), 0 2px 4px rgba(0,16,36,.04)` | Dropdowns, hojas. |
| `--shadow-card` | `0 1px 2px rgba(0,16,36,.05), 0 4px 14px rgba(0,16,36,.07)` | Tarjetas, listas, cifras sobre el fondo. |
| `--shadow-card-hover` | `0 2px 4px rgba(0,16,36,.06), 0 8px 22px rgba(0,16,36,.1)` | Hover de tarjeta. |
| `--shadow-action` | `0 2px 6px rgba(0,74,173,.25)` | Acción principal. |
| `--shadow-focus` | `0 0 0 3px rgba(0,74,173,.25)` | Anillo de foco (en oscuro, `--color-focus-ring` más luminoso). |

## Piezas compartidas

Cada pieza se construye una vez en `src/components/ui`; las pantallas solo las combinan.

| Pieza | Contrato |
|---|---|
| `PageHeader` | Título y estado a la izquierda; primaria al final; secundarias como iconos o en ⋯. |
| `SearchBar` + `FilterSheet` | Una búsqueda que entiende folio, cliente, concepto, placas y ECO. Los filtros activos quedan visibles como chips. |
| `PeriodNavigator` | Mismo en Notas, Nómina y Estado de cuenta (En curso, Hoy, Semana, Mes, Año, Todo); cada pantalla elige qué vistas ofrece; con una sola vista no muestra el segmentado (sin selector de una opción). |
| `StatTile` | Cifra clave con fondo tinte, no borde de color; la explicación va en ⓘ. |
| `InfoTip` (`src/components/ui/info-tip.tsx`) | ⓘ junto a una etiqueta corta; al activarlo muestra la explicación. Se cierra con Esc o al salir del foco. Lo usan `StatTile` y los filtros de Notas y Trabajos. |
| `EntityCard` (cotización y trabajo; `src/components/ui/entity-card.tsx`, identidad en `src/lib/unit-identity.ts`) | Tocar la tarjeta fuera de los botones abre la vista previa; las acciones siguen en el pie. Identidad de la unidad: ECO + modelo; si no hay ECO, placas + modelo; si no, solo el modelo; el chofer va aparte con icono de persona; nunca "Sin ECO" de relleno. Primaria según estado (`resolveQuoteActionPresentation`): borrador → Compartir · enviada → Autorizar · aceptada → Crear orden · rechazada → Corregir · archivada → Restaurar. |
| `DocumentPreview` (`src/components/document-preview.tsx`) | Vista previa única de cotización, trabajo y nota: se abre al tocar una tarjeta y es el último paso de crear o editar. Estado y tipo; cliente y unidad en un bloque; servicio; conceptos por sección con franja y subtotal, líneas sutiles y sin marco; totales con importe en letra, subtotal, IVA y total grande; notas (líneas que empiezan con "-" son lista); formas de pago. Sin encabezado del taller y sin scroll propio: el contenedor (`Sheet` / `DialogMobileBody`) hace el scroll. El PDF, la impresión y el enlace público conservan su plantilla. |
| `ListRow` (clientes, trabajadores, usuarios) | Toda la fila abre el detalle; a la derecha va el dato que sirve para decidir (saldo, trabajos activos), no un botón. |
| `Section` + `DangerZone` | Si el dato se explica solo (teléfono, correo, dirección) no lleva etiqueta: icono más dato, o "Sin teléfono" en gris. Leer primero, editar a demanda. Lo destructivo vive aparte, al final, con contorno rojo; nunca como botón sólido en medio del flujo. |
| `Sheet` | Para filtrar, gestionar, editar y "Más". Sale desde abajo con asa y fondo oscurecido, se cierra tocando afuera. En escritorio se abre como panel derecho de 420 px sin oscurecer la lista. |
| `Tabs` | Cambian de sección dentro de la página (Resumen / Vehículos). Pestaña subrayada: la activa va en negrita con línea de 2 px en gradiente de marca; las demás en gris. Nunca filtran una lista. |
| `SegmentedControl` | Filtra una lista (Todas / Pendientes / Pagadas). Contenedor de 16 px sin borde ni margen interno; la opción elegida va en tonal y ocupa todo el alto. Con `href` cada opción es un enlace y la actual lleva `aria-current`. |
| `Chip` / `ChipAdd` / `ChipRow` | Chip elige una opción: sin borde, elegido en tonal, hover tonal con contorno fino, `aria-pressed`. ChipAdd agrega algo ("+ Mano de obra"): borde punteado, hover tonal. ChipRow: una sola fila con scroll horizontal; nunca salta de renglón. |

**Formato de periodos** (`src/lib/period-format.ts`, usado por `PeriodNavigator`): la semana va de lunes a sábado (Notas); Estado de cuenta usa lunes a domingo con `weekDays: 7`. Fechas en minúsculas: «9–14 de noviembre de 2026»; si la semana cruza meses, «30 de octubre – 4 de noviembre de 2023»; si cruza años, «28 de diciembre de 2026 – 2 de enero de 2027»; mes «noviembre de 2026»; año «2026». «En curso» marca el periodo actual y «Hoy» aparece solo si el usuario se movió de él. Nunca aplicar `capitalize` a una etiqueta de fecha: CSS convierte «de» en «De».

**Encabezado de página** (`PageHeader`): sin subtítulo, porque los contadores ya se ven abajo. Las acciones secundarias van como iconos o en ⋯ y la primaria va al final.

### Anatomía de hojas, diálogos y flujos

Título a la izquierda, ✕ arriba a la derecha, encabezado de 52 px que no se mueve con el scroll, contenido con scroll propio. Acciones fijas al pie: secundaria a la izquierda y primaria a la derecha. En flujos de varios pasos, ← (paso anterior) va a la izquierda y ✕ sigue a la derecha. Las confirmaciones cortas usan un diálogo centrado de 440 px con la misma anatomía. Los formularios largos van a página completa, nunca en modal.

Implementación en `src/components/ui/dialog.tsx`: `DialogMobileHeader` (52 px; ✕ siempre a la derecha, `DialogMobileBack` a la izquierda en flujos de varios pasos), `DialogMobileBody` (único scroll), `DialogMobileFooter` (secundaria a la izquierda, primaria a la derecha) y `DialogDangerZone` al final del cuerpo. La forma por ancho es `variant="sheet"` en `DialogContent` con la raíz `Sheet`: modal bajo 1024 px (foco atrapado, con oscurecimiento) y no modal desde 1024 px (panel de 420 px sin oscurecer, la lista sigue interactiva). Esc cierra en todos los anchos.

## Patrones de pantalla

- **Crear/editar cotización**: oculta la barra de navegación. Móvil: ← título ✕, progreso y acción fija abajo (contexto a la izquierda, botón compacto con el nombre del paso siguiente a la derecha). Escritorio: pasos a la izquierda, trabajo al centro, resumen fijo a la derecha. Solo hay borrador; salir nunca pierde lo capturado. El último paso es la misma vista previa que abren las tarjetas, sin scroll propio.
- **Conceptos** (paso 2): móvil = lista plana por sección, sin marco; cada fila muestra descripción, cantidad × precio e importe, y se expande con ˅ para editar (tipo en chips de una sola fila, descripción, cantidad y precio en una fila, Duplicar / Eliminar / Listo). Agregar por tipo con chips punteados; ⋮⋮ reordena y deslizar elimina. Escritorio (≥ lg) = tabla editable por sección (Tipo, Descripción, Cant., Precio, Nóm., Importe, acciones); Tab avanza por campo, Enter en el precio agrega un concepto y enfoca su tipo; el resumen queda fijo a la derecha. Un solo scroll por pantalla.
- **Inicio**: bandeja priorizada; primero la operación, el seguimiento de cotizaciones después. Orden: 1) «Siguiente trabajo», la cotización aprobada más antigua sin orden de trabajo, en `EntityCard` destacada con «Asignar» (tonal); oculta si no hay ninguna. 2) «Para hoy»: asignar aprobados y completar trabajos activos; un trabajo detenido pone su fila en ámbar. 3) «Seguimiento de cotizaciones»: enviadas sin respuesta y borradores, en neutro. Cada fila abre su lista ya filtrada (`/admin/quotes?status=APPROVED`, `/admin/work-orders`, `/admin/quotes?status=SENT`, `/admin/quotes?status=DRAFT`). Filas sin bordes de color ni iconos en cajitas; orden en `src/features/dashboard/inbox-priority.ts`.
- **Clientes**: lista que ayuda a decidir; la ficha es una página con pestañas (Resumen / Vehículos / Contactos) y el estado de cuenta es su propia página, enlazada desde Resumen. Se muestran hasta 2 unidades por cliente (primero las que están en el taller).
- **Configuración**: índice agrupado, cada ajuste en su pantalla, guardado por sección y vista previa de cómo lo ve el cliente. "Agregar" abre una hoja.
- **Trabajadores y Usuarios**: `ListRow` y la misma hoja de edición.

## Componentes

### Headers de páginas admin

| Componente | Export | Props / slots / variants |
|---|---|---|
| `AdminPageHeader` | `src/components/admin-page-header.tsx` | `icon: LucideIcon`, `title: string`, `description?: ReactNode`, `actions?: ReactNode`, `children?: ReactNode`, `variant?: "compact" | "expanded"`. Compact (default) conserva Card, icono 40px, gap 12px, padding 16px y título 18px. Expanded presenta Card con padding 24px, icono 48px, gap 16px, separación de composición 24px y título 20px; descripción, acciones y children mantienen una jerarquía explícita. La variante es solo visual. |

**Contrato de uso:** `AdminPageHeader` se reserva para superficies completas del panel, no para diálogos, modales, previews, workspaces ni impresión, que conservan sus headers propios. La implementación actual se consulta en los usos del componente, no en una lista fija de rutas de esta guía. En Configuración, cada ajuste es su propia pantalla y guarda solo su sección: la barra de cambios («Cancelar» / «Guardar») aparece solo con cambios, y los campos de otras secciones viajan como ocultos con su valor guardado, para que la acción compartida no los borre.

### Base UI

Implementar como wrappers Tailwind sobre comportamiento nativo o Radix cuando se requiera accesibilidad avanzada, siguiendo las convenciones de shadcn/ui (ver «Wrappers sobre Radix»).

| Componente | Notas de implementación |
|---|---|
| `Button` | Variantes: `primary`, `secondary`, `outline`, `ghost`, `danger`. Estados: `default`, `hover`, `disabled`, `loading`. Tamaños `lg` 40 / `default` 36 / `sm` 32 px, todos con área táctil de 44 px. El `primary` es azul plano `#0A3D8F` (sin gradiente); la acción de tarjeta usa el estilo tonal. |
| `Input` | Label + input + helper + error. Borde `--border`, radio 12px, altura 36–40px con área táctil de 44px. |
| `Textarea` | Mismo sistema que input; altura flexible. |
| `Checkbox` | Checkbox nativo estilizado o Radix Checkbox; label alineada. |
| `RadioGroup` | Radix RadioGroup; uso en listas cortas y filtros. |
| `Switch` | Radix Switch; preferencias y estados binarios. |
| `Badge` | Pastilla con fondo pastel; solo para estados (una insignia por estado). Tipografía Caption. |
| `Card` | Superficie sobre el fondo: sombra, sin borde. Radio 16px, padding 16–20px. Dentro de hojas y paneles: borde fino, sin sombra. |

### Wrappers sobre Radix

Estos componentes viven bajo `src/components/ui` y nunca exponen Radix directamente a las pantallas.

> **Regla del proyecto:** todas las pantallas deben consumir wrappers desde `src/components/ui`. No importar Radix (`radix-ui` ni `@radix-ui/*`) directamente en pantallas, páginas o componentes de dominio; si un primitivo de Radix no está envuelto aún, crear el wrapper en `src/components/ui` antes de usarlo.

**Convenciones shadcn/ui:** los wrappers siguen el modelo de shadcn/ui (`components.json` en la raíz).

- Importar primitivos desde el paquete unificado `radix-ui` (`import { Checkbox as CheckboxPrimitive } from "radix-ui"`).
- Combinar clases con `cn()` de `@/lib/utils`: el `className` del llamador gana sobre las clases base en conflicto, así que no pasar clases contradictorias en un mismo string.
- Definir variantes con `cva` y exportarlas (por ejemplo `buttonVariants`) para estilizar elementos que no pueden ser el componente, como un `next/link`.
- Para un componente nuevo, `pnpm dlx shadcn@latest add <componente>` y adaptar el resultado a los tokens SEBASAM antes de exportarlo desde `index.ts`. `globals.css` mapea los colores semánticos de shadcn (`bg-popover`, `text-muted-foreground`, `border-input`…) a esos tokens, y `tw-animate-css` provee las animaciones `data-[state]`.
- Antes de agregar un componente con capas (menús, popovers), revisar que use la misma versión de `@radix-ui/react-dismissable-layer` que `Dialog` y `Select` (`pnpm why @radix-ui/react-dismissable-layer`); dos copias rompen el apilado de capas.

| Componente | Uso típico |
|---|---|
| `Select` | Listas desplegables de clientes, vehículos, estados, tipos de ítem. |
| `Dialog` | Confirmaciones, edición rápida, detalles. |
| `DropdownMenu` | Menús de acciones en tablas y tarjetas. |
| `Tabs` | Cambio de sección dentro de una página (subrayadas; la activa lleva el gradiente de marca). El filtrado usa el control segmentado, no pestañas. |
| `Popover` | Paneles flotantes de filtros y ayuda. |
| `Tooltip` | Información contextual (p. ej. "ⓘ" en saldos). |
| `Accordion` | FAQ, secciones colapsables de documento público. |

### Componentes de dominio

### Identidad pública

| Export | Ruta | Responsabilidad |
|---|---|---|
| `PublicBusinessIdentity` | `src/features/public-branding/domain.ts` | Proyección de configuración pública: `businessName?`, `fullName?`, `phone?`, `whatsapp?`. No contiene logo, dirección ni URL de mapas. |
| `toPublicBusinessIdentity` | `src/features/public-branding/domain.ts` | Mapea únicamente nombre y contactos existentes desde `PaymentSettingsData`; omite valores ausentes o vacíos. |
| `PublicBrandHeader` | `src/features/public-branding/public-brand-header.tsx` | Renderiza la identidad y acepta `logoSrc?` independiente, provisto únicamente por el caller. Sin fallback cuando falta. |

La dirección y `mapsUrl` permanecen como datos de ubicación del shell público original, no como parte de `PublicBusinessIdentity`. Los adaptadores basados en `PaymentSettingsData` no pasan `logoSrc`.

| Componente | Responsabilidad |
|---|---|
| `QuoteOperationalBadge` | Mapea `EstadoCotizacion` a etapa humana: Pendiente / Aceptada / Espera / En proceso / Ajuste final / Cancelada. |
| `QuoteFinancialBadges` | Objetivo: muestra por separado estado de pago, estado de factura y saldo pendiente. Solo Admin y Cliente. |
| `QuoteCard` | Resumen compacto de cotización para listados. |
| `QuoteTableRow` | Fila de tabla en dashboard admin. |
| `FilterBar` | Búsqueda + filtros de estado en listados. |

### Estados y carga

| Componente | Uso |
|---|---|
| `EmptyState` | Listados vacíos con icono, título y acción. |
| `LoadingSkeleton` | Placeholders de filas y tarjetas. |
| `ErrorState` | Error de carga con retry. |
| `Toast` | Confirmaciones y errores (Sonner o Radix Toast). |
| `Spinner` | Carga inline y de botón. |
| `Skeleton` | Bloques genéricos de carga. |

### Extensiones comunes

| Componente | Uso |
|---|---|
| `Label` | Etiqueta de campo. |
| `HelperText` | Texto de ayuda bajo un campo. |
| `ErrorText` | Texto de error bajo un campo. |
| `Avatar` | Iniciales de usuario/cliente. |
| `Divider` | Separación visual entre bloques. |
| `PaymentSummary` | Objetivo: resumen de pagos, abonos y saldo pendiente. |
| `LedgerMovementRow` | Objetivo: fila de movimiento de cuenta del cliente. |
| `TimelineItem` | Evento de evidencia/diagnóstico/nota. |
| `EvidenceCard` | Foto o archivo de evidencia. |
| `PayrollSummary` | Resumen de nómina por trabajador. |
| `StockBadge` | Indicador de existencia aproximada. |

### Constructor de cotización MVP

| Componente | Responsabilidad |
|---|---|
| `Stepper` | Indicador de pasos del flujo de cotización. |
| `BottomActionBar` | Barra fija inferior con acciones principales en móvil. |
| `BottomSheet` | Panel inferior para búsqueda y selección. |
| `SearchResultCard` | Resultado de búsqueda de cliente/vehículo. |
| `ClienteSearch` | Búsqueda y selección de cliente. |
| `ClienteCard` | Tarjeta de cliente seleccionado. |
| `UnidadCard` | Tarjeta de vehículo/unidad. |
| `PartidaCard` | Fila editable de partida de cotización. |
| `MaterialForm` | Formulario rápido de ítem tipo material. |
| `ManoObraForm` | Formulario rápido de ítem tipo mano de obra. |
| `ServicioExternoForm` | Formulario rápido de servicio externo. |
| `QuoteTotalsCard` | Subtotal / IVA / Total con toggle de IVA. |
| `QuoteNotesSection` | Notas internas y visibles para cliente. |
| `QuotePreviewCard` | Vista previa de cotización solo para el enlace público y la impresión (las vistas internas usan `DocumentPreview`). |
| `PaymentLinkCard` | Tarjeta opcional de instrucciones para transferencia (importe, cuenta elegible, contacto y comprobante). |

## Shell y navegación

- Una sola barra inferior para todos los roles: Inicio, Cotizaciones, Trabajos, Notas y «Más», solo iconos con nombre accesible (aria-label) y tooltip, sin etiquetas abreviadas; la activa es una pastilla con el gradiente de marca. El rol solo decide qué filas aparecen en la hoja «Más» (p. ej. Clientes y Nómina; para SUPER_ADMIN además Trabajadores, Herramientas y Administración).
- Escritorio: barra lateral colapsada a 64 px (logo corto e iconos); al tocar el logo se expande a 220 px sobre el contenido, sin empujarlo, y recuerda la preferencia. El ítem activo lleva el gradiente de marca.
- Crear/editar cotización oculta la barra de navegación.
- Tap targets mínimos 44px; foco visible obligatorio.
- Rutas operativas protegidas; rutas públicas tokenizadas con `noindex`.

## Flujo de cotización y estados

El flujo y las reglas de autorización pertenecen a [cotizaciones y trabajo](./docs/product-guide/quotes-work-orders-notes.md); los [recorridos](./docs/product-guide/flows.md#flujo-objetivo-conservado) conservan la secuencia objetivo. La autorización puede ser parcial por secciones: presentar alcance y selección sin asumir «todo/nada». Los nombres persistidos pertenecen a [arquitectura](./docs/ARCHITECTURE.md#modelo-y-estados-no-confundir-producto-con-enums).

### Estados operativos

El vocabulario visual objetivo puede usar Borrador, Enviada, Aceptada, Declinada, Cancelada, Espera, En proceso y Ajuste final. Son labels para composición y jerarquía, no otra máquina de estados ni evidencia de enums implementados. La semántica, el actor y la transición se consultan en el capítulo dueño; especialmente Espera no demuestra un estado persistido.

### Reglas de diseño por estado

Separar el indicador operativo de los financieros: `FACTURADA` no implica pagada y `QuoteStatus` no representa cobro ni adeudo. El self-service del trabajador es una propuesta aparte del registro administrativo (GitHub #65). Las transiciones y responsabilidades de negocio se consultan en [cotizaciones](./docs/product-guide/quotes-work-orders-notes.md) y [finanzas](./docs/product-guide/payments-and-receivables.md), sin mantener otra copia aquí.

### Indicadores separados

1. **Operativo** (`QuoteOperationalBadge`): visible para Admin y Cliente. En el MVP inmediato el empleado no accede a la app; el admin gestiona la vista operativa.
2. **Financiero / Documento** (`QuoteFinancialBadges`): solo Admin y Cliente.

El indicador de saldo pendiente es financiero y se muestra junto con el monto; no sustituye ni altera el badge operativo.

### Interfaz interna de cobranza

Criterios de presentación del [contrato financiero canónico](./docs/product-guide/payments-and-receivables.md#contrato-de-cobro-y-facturación), no una política de cobro adicional.

1. Mostrar primero el subtotal general y la fórmula aplicada: sin factura, `total = subtotal`; con factura, `total = subtotal + IVA`.
2. Permitir al personal elegir preferencia de factura y método de pago como controles independientes.
3. Reutilizar `CustomerFiscalProfile`; si faltan datos fiscales, capturarlos en la interfaz interna y confirmar el snapshot de la operación.
4. Para efectivo, ofrecer liquidación total o abono parcial sin generar link ni exigir cuentas bancarias.
5. Para todo abono parcial, mostrar saldo restante, impacto en la cuenta del cliente e indicador financiero en la cotización.
6. Si cambia la preferencia de factura hasta la liquidación final, presentar el recálculo de IVA y total, solicitar confirmación y advertir que se actualizarán las instrucciones de pago.

`Payment`, aplicaciones y ledger ya tienen implementación. Estos puntos son criterios de presentación; no prueban que todos los estados de producto sean enums ni que cada interacción esté cubierta. Ver [arquitectura](./docs/ARCHITECTURE.md).

### Página pública de transferencia

Presentación del contrato de [instrucciones públicas](./docs/product-guide/payments-and-receivables.md#reglas-objetivo-conservadas); la selección efectiva de datos por superficie se describe en [experiencia pública](./docs/product-guide/vehicles-and-public-experience.md#páginas-públicas-de-pago).

- El importe está decidido y se presenta con máxima jerarquía visual.
- Solo aparecen cuentas compatibles con la preferencia fiscal registrada internamente.
- Las acciones son copiar datos, contactar al taller y enviar comprobante.
- No se muestran selector de factura, toggle de IVA ni formulario fiscal.
- `PaymentRequest` identifica instrucciones; la UI no comunica que el pago quedó aplicado o liquidado.
- `/datos-pago` no se usa como referencia contextual; su alcance final está pendiente.

## Pantallas por rol

Criterios de diseño por audiencia, no checklist de implementación. Para rutas y guards existentes, consultar [arquitectura](./docs/ARCHITECTURE.md#hosting-y-modelo-de-rutas).

### Admin

- Dashboard con resumen operativo.
- Listado de cotizaciones con búsqueda y filtros.
- Crear/editar cotización.
- Detalle de cotización (tabs: Resumen / Historial / Costos).
- Órdenes de trabajo: asignación, ejecución, cierre.
- Clientes: alta, búsqueda, edición, historial.
- Trabajadores: alta, asignación a órdenes, registro de ejecución, nómina (admin-led en el MVP inmediato).
- Pagos y ledger; «caja» como módulo completo no se deduce de su existencia.

### Cliente (portal público tokenizado)

- Ver cotización / orden de trabajo asignada.
- Aceptar o declinar cotización.
- Ver evidencia (fotos/diagnóstico) con URLs firmadas.
- Ver instrucciones de transferencia cuando recibe un link contextual.
- Excluido del alcance inicial del MVP, pero ya existe `/cotizacion/[token]`. No confundir esa vista implementada con la cobertura de todos los criterios de portal de esta sección.

### Empleado (post-MVP inmediato)

- Ver órdenes asignadas.
- Reportar ejecución y evidencia.
- Ver solo estado operativo y lo que impacta su nómina.
- **No ve** caja, pagos, saldos, métodos de pago, factura ni ledger.
- **Fuera del MVP inmediato** según GitHub #65; en el MVP el admin captura asignación y ejecución.

## Documento público de cotización

Fuera de la fase #807: páginas públicas y documentos impresos conservan esta plantilla propia (incluido su gradiente de marca) hasta una fase 2. El mapa de rutas y las piezas que usa cada una está en la propuesta de consistencia visual (sección «Todas las rutas»).

- Header con gradiente de marca, logo/nombre y folio.
- Botones outline: "Contactar taller" y "Descargar".
- Bloque cliente/vehículo en grid de 2 columnas.
- Banner `SERVICIO` con fondo `#E6F1FB`.
- Tabla de conceptos: `Cant. / Concepto / Unitario / Importe`.
- Totales: subtotal general / IVA (si aplica) / total pagable grande en `#004AAD`.
- Card o QR de transferencia solo cuando existe un `PaymentRequest` contextual.
- El efectivo no muestra QR, link ni cuentas bancarias.

## Do's and Don'ts

- **Do** usar siempre tokens; no hardcodear colores fuera de tokens.
- **Do** mantener Radix debajo de `components/ui`; las pantallas consumen wrappers.
- **Do** separar estado operativo de estado financiero en la UI.
- **Do** respetar límites de visibilidad por rol.
- **Do** diseñar mobile-first y verificar tap targets ≥ 44px.
- **Don't** mostrar caja/pagos/ledger/factura al empleado.
- **Don't** inventar estilos visuales fuera de este documento y la propuesta de consistencia visual; si falta algo, agregar UI neutral funcional y anotar la discrepancia.
- **Don't** usar gradiente fuera de la navegación activa, ni sombra y borde a la vez, ni bordes laterales de color, ni DM Mono.
- **Don't** usar grises puros; preferir neutros con tinte azul.

## Notas de implementación

1. Revisar las dependencias de `package.json` antes de proponer instalaciones: Radix (vía shadcn/ui) ya está incorporado y las notificaciones usan `react-hot-toast`, no Sonner.
2. Reutilizar los wrappers tokenizados existentes en `src/components/ui`; no crear una segunda capa UI.
3. Usar `QuoteOperationalBadge` y `QuoteFinancialBadges` desde el primer listado de cotizaciones.
4. El schema actual en `prisma/schema.prisma` usa estados en inglés y separa `Quote`/`WorkOrder`; al implementar la UI, alinear los labels visuales con los estados de negocio del manual y los enums de arquitectura.
5. El idioma operativo visible debe ser español de México; los identificadores técnicos permanecen en inglés.
