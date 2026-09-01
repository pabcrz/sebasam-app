# SEBASAM — Sistema de diseño (Figma)

> Referencia visual: Figma `b3TlGONh5fTCNUilSHf75b`.
> Este documento traduce la línea visual de Figma a un contrato actionable para implementación en Next.js + Tailwind + Radix.

## Resumen

- Producto: sistema de gestión para taller (cotizaciones, órdenes de trabajo, clientes, pagos, nómina, inventario). El acceso inmediato es admin-led: el admin gestiona trabajadores, asignaciones y ejecución desde el panel principal.
- Prioridad: **web mobile-first**; el uso principal es en celular.
- Tema: **Light por defecto** para operación y documentos; superficies **deep navy** para shell del dashboard, hero y estados de énfasis.
- Tipografía base: **Inter**; monoespaciado para folios, montos y datos de pago: **DM Mono**.
- Filosofía: los componentes nacen del flujo de negocio; no se inventan componentes genéricos sin contrato de datos.

## Tokens fundamentales

### Colores

| Token | Valor | Uso |
|---|---|---|
| `--color-primary` | `#004AAD` | Botones primarios, enlaces activos, énfasis operativo. |
| `--color-primary-hover` | `#003E91` | Hover de elementos primarios. |
| `--color-navy-700` | `#002B68` | Capas intermedias en modo oscuro/deep navy. |
| `--color-navy-800` | `#001B3F` | Surface en modo oscuro/deep navy. |
| `--color-navy-900` | `#001024` | Fondo deep navy, texto principal en light. |
| `--color-white` | `#FFFFFF` | Surface light, texto sobre fondos oscuros. |
| `--color-blue-tint` | `#E6F1FB` | Banners informativos, estados suaves, fondo de servicio en documento público. |
| `--color-on-navy-tint` | `#E6F1FB` | Texto/acento claro sobre superficies navy fijas en ambos modos. |
| `--color-bg-soft` | `#F3F6FA` | Fondo de pantalla en light. |
| `--color-border-light` | `#D7E0EA` | Bordes sutiles en light. |
| `--color-text-muted` | `#64748B` / `#6B7789` | Texto secundario, placeholders. |
| `--color-text-muted-fg` | `#475569` | Texto pequeño sobre superficies suaves cuando se necesita contraste AA. |
| `--gradient-primary` | `linear-gradient(90deg, #004AAD 0%, #001024 100%)` | Fondo oficial de botones primarios y acentos de marca. |
| `--gradient-primary-hover` | `linear-gradient(90deg, #003E91 0%, #001024 100%)` | Estado hover del gradiente primario. |

El gradiente primario es el patrón oficial para acciones primarias y acentos de marca; reemplaza el azul plano en botones `primary` y en heroes de documentos públicos. La base primaria sigue siendo `#004AAD` y el deep navy `#001024`.

### Modo claro y modo oscuro

El producto soporta ambos modos. Los tokens semánticos (`--color-background`, `--color-foreground`, `--color-surface`, `--color-text-main`, etc.) cambian de valor según la clase `light`/`dark` en `<html>`. El modo por defecto es **claro**.

| Token semántico | Modo claro | Modo oscuro | Uso |
|---|---|---|---|
| `--color-background` | `#F3F6FA` | `#001024` | Fondo de pantalla general. |
| `--color-foreground` | `#001024` | `#FFFFFF` | Texto principal sobre fondo base. |
| `--color-surface` | `#FFFFFF` | `#001B3F` | Tarjetas, paneles, inputs, diálogos. |
| `--color-bg-soft` | `#F3F6FA` | `#001024` | Fondos suaves, hover de filas. |
| `--color-border-light` | `#D7E0EA` | `#002B68` | Bordes y separadores sutiles. |
| `--color-blue-tint` | `#E6F1FB` | `#002B68` | Fondos de estado suave y botones secundarios. |
| `--color-text-main` | `#001024` | `#FFFFFF` | Títulos, labels, texto de alto énfasis. |
| `--color-text-muted` | `#64748B` | `#94A3B8` | Texto secundario, placeholders. |
| `--color-text-muted-fg` | `#475569` | `#CBD5E1` | Texto pequeño sobre superficies suaves. |

Reglas de contraste:
- En modo claro el texto oscuro (`#001024`) se usa sobre superficies blancas o azul-tinte.
- En modo oscuro el texto principal es blanco (`#FFFFFF`) y el texto secundario es gris azulado claro (`#94A3B8`).
- Los acentos semánticos mantienen su color base, pero en modo oscuro se prefiere la versión más luminosa para primer plano cuando el badge descansa sobre superficie navy (p. ej. verde `#4ADE80`, amarillo `#FCD34D`, rojo `#FCA5A5`, azul `#93C5FD`).
- Los estados de foco (`--shadow-focus`) se mantienen con el azul semitransparente para ambos modos.

### Acentos semánticos (estados / pagos)

| Token | Valor | Uso |
|---|---|---|
| `--color-status-success` | `#22C55E` | Pagado, completado, activo. |
| `--color-status-warning` | `#F59E0B` | Pendiente, parcial, vencido próximo. |
| `--color-status-danger` | `#EF4444` | Cancelado, error, vencido. |
| `--color-status-info` | `#004AAD` | En proceso, informativo. |

Regla de badges: fondo pastel con alpha bajo + borde con alpha medio + texto/dot en color sólido.

### Tipografía

| Estilo | Fuente | Peso | Tamaño | Interlineado |
|---|---|---|---|---|
| Display | Inter | Regular 400 | 28px | 1.1em |
| Title | Inter | Extra Bold 800 | 20px | 1.2em |
| Subtitle | Inter | Semi Bold 600 | 16px | 1.3em |
| Body | Inter | Regular 400 | 16px | 1.5em |
| Body sm | Inter | Regular 400 | 14px | 1.5em |
| Caption | Inter | Medium 500 | 12px | 1.2em |
| Mono body | DM Mono | Regular 400 | 14–16px | 1.5em |
| Mono display | DM Mono | Regular 400 | 18px | — |

### Espaciado y formas

| Token | Valor | Uso |
|---|---|---|
| `--space-xs` | 4px | Micro-ajustes. |
| `--space-sm` | 8px | Gap pequeño entre elementos relacionados. |
| `--space-md` | 16px | Padding de tarjetas, separación estándar. |
| `--space-lg` | 24px | Separación de secciones. |
| `--space-xl` | 32px | Separación de bloques grandes. |
| `--radius-sm` | 8px | Inputs, badges, chips pequeños. |
| `--radius-md` | 12–14px | Tarjetas, modales, bottom sheets. |
| `--radius-full` | 9999px | Badges, pills, avatares. |
| `--tap-min-height` | 44px | Altura mínima de controles tocables. |
| `--screen-padding-x` | 16px | Padding horizontal de pantalla. |

### Sombras

| Token | Valor | Uso |
|---|---|---|
| `--shadow-sm` | `0 1px 4px rgba(0,0,0,0.07), 0 1px 2px rgba(0,0,0,0.04)` | Tarjetas pequeñas, inputs enfocados. |
| `--shadow-md` | `0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)` | Tarjetas, dropdowns. |
| `--shadow-lg` | `0 8px 24px rgba(0,0,0,0.1), 0 4px 8px rgba(0,0,0,0.05)` | Modales, bottom sheets. |
| `--shadow-focus` | `0 0 0 3px rgba(30,77,140,0.18)` | Anillo de foco. |

## Componentes

### Headers de páginas admin

| Componente | Export | Props / slots / variants |
|---|---|---|
| `AdminPageHeader` | `src/components/admin-page-header.tsx` | `icon: LucideIcon`, `title: string`, `description?: ReactNode`, `actions?: ReactNode`, `children?: ReactNode`, `variant?: "compact" | "expanded"`. Compact (default) conserva Card, icono 40px, gap 12px, padding 16px y título 18px. Expanded presenta Card con padding 24px, icono 48px, gap 16px, separación de composición 24px y título 20px; descripción, acciones y children mantienen una jerarquía explícita. La variante es solo visual. |

**Ownership exacto:** `AdminPageHeader` se usa únicamente en las 15 superficies completas mapeadas: `/admin`, `/admin/customers`, `/admin/customers/[id]`, `/admin/customers/[id]/edit`, `/admin/workers`, `/admin/workers/[id]/edit`, `/admin/quotes`, `/admin/quotes/nueva`, `/admin/quotes/[id]/edit`, `/admin/work-orders`, `/admin/work-orders/[id]`, `/admin/notas`, `/admin/nomina`, `/admin/configuracion-pago` y `/admin/users`. Los diálogos, modales, previews, workspaces y páginas de impresión conservan sus headers propios; nunca renderizan este componente. En Configuración de pago, el botón `Guardar configuración` vive en `actions` y se relaciona externamente con `#payment-settings-form`, preservando la semántica y el flujo del formulario.

### Base UI

Implementar como wrappers Tailwind sobre comportamiento nativo o Radix cuando se requiera accesibilidad avanzada.

| Componente | Notas de implementación |
|---|---|
| `Button` | Variantes: `primary`, `secondary`, `outline`, `ghost`, `danger`. Estados: `default`, `hover`, `disabled`, `loading`. Altura mínima 44px; la variante compacta (`h-9 / 36px`) solo se usa en contextos restringidos. El `primary` usa el gradiente de marca oficial. |
| `Input` | Label + input + helper + error. Bordes `#D7E0EA`, radio 10px, altura 44–48px. |
| `Textarea` | Mismo sistema que input; altura flexible. |
| `Checkbox` | Checkbox nativo estilizado o Radix Checkbox; label alineada. |
| `RadioGroup` | Radix RadioGroup; uso en listas cortas y filtros. |
| `Switch` | Radix Switch; preferencias y estados binarios. |
| `Badge` | Pill con fondo pastel; usado para estados. Tipografía Caption. |
| `Card` | Fondo blanco, borde sutil, radio 12–14px, padding 16–20px. |

### Wrappers sobre Radix

Estos componentes viven bajo `src/components/ui` y nunca exponen Radix directamente a las pantallas.

> **Regla del proyecto:** todas las pantallas deben consumir wrappers desde `src/components/ui`. No importar Radix directamente en pantallas, páginas o componentes de dominio; si un primitivo de Radix no está envuelto aún, crear el wrapper en `src/components/ui` antes de usarlo.

| Componente | Uso típico |
|---|---|
| `Select` | Listas desplegables de clientes, vehículos, estados, tipos de ítem. |
| `Dialog` | Confirmaciones, edición rápida, detalles. |
| `DropdownMenu` | Menús de acciones en tablas y tarjetas. |
| `Tabs` | Navegación de detalle de cotización: Resumen / Historial / Costos. |
| `Popover` | Paneles flotantes de filtros y ayuda. |
| `Tooltip` | Información contextual (p. ej. "ⓘ" en saldos). |
| `Accordion` | FAQ, secciones colapsables de documento público. |

### Componentes de dominio

### Identidad pública

| Export | Ruta | Responsabilidad |
|---|---|---|
| `PublicBusinessIdentity` | `src/features/public-branding/domain.ts` | Proyección de configuración pública: `businessName`, `phone?`, `whatsapp?`. No contiene logo, dirección ni URL de mapas. |
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
| `QuotePreviewCard` | Vista previa de cotización para compartir. |
| `PaymentLinkCard` | Tarjeta opcional de instrucciones para transferencia (importe, cuenta elegible, contacto y comprobante). |

## Shell y navegación

- Mobile-first: bottom navigation de 3–5 items en móvil; sidebar colapsable en desktop.
- El shell es deep navy (`#001024`) con iconos y texto blanco/gris claro.
- Tap targets mínimos 44px; foco visible obligatorio.
- Rutas operativas protegidas; rutas públicas tokenizadas con `noindex`.

## Flujo de cotización y estados

Diagrama del flujo operativo objetivo, desde el login hasta el impacto en ledger y nómina. Varias transiciones siguen pendientes de implementación y están detalladas en `docs/MVP_ISSUES.md`.

```mermaid
flowchart LR
    A[Login] --> B[Cotización<br>BORRADOR]
    B --> C[Armar ítems + vehículo<br>+ evidencia inicial opcional]
    C --> D[Compartir:<br>ENVIADA]
    D --> E{Cliente responde<br>todo/nada}
    E -->|Acepta| F[ACEPTADA]
    E -->|Declina| G[DECLINADA]
    F --> H[WorkOrder<br>ESPERA]
    H --> I[Confirmar espacio + maestro<br>EN_PROCESO]
    I --> J[Asignar maestro/ayudantes<br>desde admin]
    J --> K[Admin registra ejecución<br>+ extras controlados]
    K --> L[Trabajo terminado]
    L --> M[Registrar cobros<br>ajustes, adeudo]
    M --> N[Ledger cliente]
    M --> O[Nómina semanal]
```

### Estados operativos

| Estado | Significado | Quién lo dispara |
|---|---|---|
| `BORRADOR` | Cotización en construcción | Admin / asistente |
| `ENVIADA` | Cotización compartida al cliente | Admin al generar link/PDF |
| `ACEPTADA` | Cliente aceptó todo, o admin autorizó una aceptación externa | Objetivo: cliente vía link con token, o Admin con nota obligatoria |
| `DECLINADA` | Cliente declinó todo | Cliente vía link con token |
| `CANCELADA` | Admin cancela antes o después de enviar | Admin |
| `ESPERA` | Cotización/orden aceptada, a la espera de espacio del taller y disponibilidad de maestro | Objetivo pendiente: sistema al aceptar o autorizar |
| `EN_PROCESO` | WorkOrder activa con empleados asignados | Admin al confirmar espacio y maestro |
| `AJUSTE_FINAL` | Extras o ajustes antes de cerrar | Admin |

### Reglas de diseño por estado

- `ENVIADA` se dispara al compartir URL pública o PDF.
- El cliente acepta o declina **todo/nada** mediante link con token expirable.
- Objetivo pendiente: si el cliente aceptó por fuera del link (p. ej. teléfono), el admin puede marcar la cotización como autorizada con una nota obligatoria de canal/motivo; usa el mismo registro de cotización/alcance.
- Objetivo pendiente: tras `ACEPTADA`, la orden entra en `ESPERA` hasta que el admin confirme espacio del taller y disponibilidad de maestro.
- La transición de `ESPERA` a `EN_PROCESO` ocurre al confirmar espacio y maestro; en ese punto el admin asigna empleados y registra ejecución.
- `FACTURADA` no implica pagada; siempre se muestra el estado financiero aparte.
- `QuoteStatus` nunca representa pago, factura ni saldo pendiente.
- Los estados financieros objetivo se reconocen por grupos separados: pago (`PENDING`, `PARTIAL`, `PAID`), factura (`NOT_REQUESTED`, `DATA_MISSING`, `READY`, `ISSUED`) y saldo pendiente.
- En el MVP inmediato el empleado **no tiene login/app propio**; el admin gestiona asignación y ejecución. El self-service del trabajador (`/mis-trabajos`, `/mi-nomina`) es post-MVP. Ver GitHub #65.

Las reglas de negocio completas viven en [`README.md`](./README.md#reglas-de-negocio-).

### Indicadores separados

1. **Operativo** (`QuoteOperationalBadge`): visible para Admin y Cliente. En el MVP inmediato el empleado no accede a la app; el admin gestiona la vista operativa.
2. **Financiero / Documento** (`QuoteFinancialBadges`): solo Admin y Cliente.

El indicador de saldo pendiente es financiero y se muestra junto con el monto; no sustituye ni altera el badge operativo.

### Interfaz interna de cobranza

1. Mostrar primero el subtotal general y la fórmula aplicada: sin factura, `total = subtotal`; con factura, `total = subtotal + IVA`.
2. Permitir al personal elegir preferencia de factura y método de pago como controles independientes.
3. Reutilizar `CustomerFiscalProfile`; si faltan datos fiscales, capturarlos en la interfaz interna y confirmar el snapshot de la operación.
4. Para efectivo, ofrecer liquidación total o abono parcial sin generar link ni exigir cuentas bancarias.
5. Para todo abono parcial, mostrar saldo restante, impacto en la cuenta del cliente e indicador financiero en la cotización.
6. Si cambia la preferencia de factura hasta la liquidación final, presentar el recálculo de IVA y total, solicitar confirmación y advertir que se actualizarán las instrucciones de pago.

Los registros `Payment`, el cobro parcial en efectivo, el ledger y estos estados financieros son componentes objetivo.

### Página pública de transferencia

- El importe está decidido y se presenta con máxima jerarquía visual.
- Solo aparecen cuentas compatibles con la preferencia fiscal registrada internamente.
- Las acciones son copiar datos, contactar al taller y enviar comprobante.
- No se muestran selector de factura, toggle de IVA ni formulario fiscal.
- `PaymentRequest` identifica instrucciones; la UI no comunica que el pago quedó aplicado o liquidado.
- `/datos-pago` no se usa como referencia contextual; su alcance final está pendiente.

## Pantallas por rol

### Admin

- Dashboard con resumen operativo.
- Listado de cotizaciones con búsqueda y filtros.
- Crear/editar cotización.
- Detalle de cotización (tabs: Resumen / Historial / Costos).
- Órdenes de trabajo: asignación, ejecución, cierre.
- Clientes: alta, búsqueda, edición, historial.
- Trabajadores: alta, asignación a órdenes, registro de ejecución, nómina (admin-led en el MVP inmediato).
- Pagos / ledger / caja (post-MVP inmediato).

### Cliente (portal público tokenizado)

- Ver cotización / orden de trabajo asignada.
- Aceptar o declinar cotización.
- Ver evidencia (fotos/diagnóstico) con URLs firmadas.
- Ver instrucciones de transferencia cuando recibe un link contextual.
- **Fuera del MVP inmediato** según `docs/MVP_ISSUES.md`.

### Empleado (post-MVP inmediato)

- Ver órdenes asignadas.
- Reportar ejecución y evidencia.
- Ver solo estado operativo y lo que impacta su nómina.
- **No ve** caja, pagos, saldos, métodos de pago, factura ni ledger.
- **Fuera del MVP inmediato** según `docs/MVP_ISSUES.md` y GitHub #65; en el MVP el admin captura asignación y ejecución.

## Documento público de cotización

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
- **Don't** inventar estilos visuales que no estén en Figma; si falta algo, agregar UI neutral funcional y anotar la discrepancia.
- **Don't** usar grises puros; preferir neutros con tinte azul.

## Notas de implementación

1. Instalar Radix primitives y Sonner como dependencias cuando se empiece la capa visual real.
2. Crear `components/ui` con wrappers tokenizados antes de tocar pantallas.
3. Usar `QuoteOperationalBadge` y `QuoteFinancialBadges` desde el primer listado de cotizaciones.
4. El schema actual en `prisma/schema.prisma` usa estados en inglés y separa `Quote`/`WorkOrder`; al implementar la UI, alinear los labels visuales con los estados de negocio documentados aquí.
5. El idioma operativo visible debe ser español de México; los identificadores técnicos permanecen en inglés.
