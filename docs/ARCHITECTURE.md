# Arquitectura de operaciones SEBASAM

Esta app es el núcleo operativo limpio de SEBASAM: clientes, cotizaciones, órdenes de trabajo, asignaciones y registros de ejecución.

> **Ciclo documental implementado:** [Cotizaciones, OT y notas emitidas](./DOCUMENT_LIFECYCLE.md) describe los modelos y las reglas actuales de emisión y vencimiento. Las secciones de objetivos de este documento conservan contexto histórico; no son evidencia de implementación.

## Reglas de arquitectura

| Área | Regla |
|---|---|
| Datos de negocio y perímetro | Prisma (rol `postgres`) es el único actor autorizado para acceder a datos operativos. El esquema `public` está cerrado a PostgREST mediante RLS y revocación de permisos (`anon`/`authenticated`). No mezclar consultas de Supabase client con Prisma para las mismas tablas. |
| Auth e infraestructura | Supabase Auth es dueño de la identidad. Los roles de la app viven en `UserProfile`. `SUPABASE_SERVICE_ROLE_KEY` queda reservada exclusivamente para operaciones server-side de Auth. |
| Cotización → orden de trabajo | Estado actual: una `WorkOrder` referencia una `Quote` aprobada. Objetivo pendiente: soportar autorización administrativa auditada, autorización parcial por secciones y estado `ESPERA` antes de `EN_PROCESO`. |
| URLs de base de datos | Runtime usa `DATABASE_URL` con el pooler de Supabase. Las migraciones usan `DIRECT_URL`. |
| Despliegue | `next build` puede generar Prisma Client, pero las migraciones corren solo a través de `db:migrate:deploy`. |
| Rutas y roles | `/` es el hub role-aware post-login; `/login` es el único login; evitamos el namespace `/admin`. Ver [Hosting y modelo de rutas](#hosting-y-modelo-de-rutas). |

## Organización de features

Las carpetas de feature agrupan schemas de entrada, server actions y queries de lectura:

- `src/features/customers`
- `src/features/quotes`
- `src/features/work-orders`

La infraestructura compartida vive en `src/lib`: actualmente helpers de Prisma y Supabase.

## Auth y roles de la app

La identidad de Supabase se vincula con `UserProfile.id` mediante el UUID de usuario de Auth. El login usa el email interno derivado del username visible, pero la autorización siempre revisa el rol del perfil de Prisma. Los roles de acceso son `ADMIN`, `ADMIN_ASSISTANT` y `WORKER`; la clasificación laboral del empleado se guarda por separado como `workerKind` nullable (`MASTER` o `HELPER`).

En el MVP inmediato el acceso a la app es **admin-led**: solo `ADMIN` y `ADMIN_ASSISTANT` inician sesión. El rol `WORKER` y la clasificación `workerKind` se usan para modelar empleados como registros operativos (asignaciones, ejecución, nómina, cuenta del cliente), no para login propio. El login/app del trabajador (`/mis-trabajos`, `/mi-nomina`) queda para post-MVP. Ver GitHub #65.

Las contraseñas del staff interno las controlan los admins, no el sign-up público. Usar herramientas server-only con service role para crear o resetear usuarios de Auth hasta que exista la pantalla de admin correspondiente.

## Hosting y modelo de rutas

`sebasam.com` pertenece al proyecto de landing público. Esta app operativa corre en `app.sebasam.com` como despliegue independiente, sin `basePath` de Next.js ni proxy compartido por subruta.

La app usa un solo login y rutas según rol. La raíz `/` es el hub post-login; renderiza o redirige según `UserProfile.role`. El namespace `/admin` se evita a propósito: las funciones administrativas usan rutas semánticas y el acceso se controla por role guards en el servidor, no por prefijo de URL.

Mapa de rutas objetivo:

| Ruta | Rol | Propósito |
|---|---|---|
| `/` | `ADMIN`, `ADMIN_ASSISTANT` | Hub post-login para usuarios administrativos. |
| `/login` | Público | Login único del staff admin. |
| `/cotizacion` | `ADMIN`, `ADMIN_ASSISTANT` | Lista y creación de cotizaciones. |
| `/cotizacion/[id]` | `ADMIN`, `ADMIN_ASSISTANT` | Detalle y edición de cotización. |
| `/cliente` | `ADMIN`, `ADMIN_ASSISTANT` | Lista y creación de clientes. |
| `/cliente/[id]` | `ADMIN`, `ADMIN_ASSISTANT` | Detalle y edición de cliente. |
| `/trabajador` | `ADMIN`, `ADMIN_ASSISTANT` | Gestión del equipo del taller (registros admin-led). |
| `/trabajador/[id]` | `ADMIN`, `ADMIN_ASSISTANT` | Detalle del trabajador. |
| `/nomina` | `ADMIN`, `ADMIN_ASSISTANT` | Nómina semanal calculada desde registros admin. |
| `/trabajo/[id]` | `ADMIN`, `ADMIN_ASSISTANT` | Detalle del trabajo con gestión de asignación y ejecución. |
| `/datos-de-pago/[token]` | Token de cliente público | Instrucciones contextuales y opcionales para una transferencia vinculada a un `PaymentRequest`. |
| `/datos-pago` | Público | Ruta genérica cuyo alcance final de producto está pendiente; no es autoridad para instrucciones contextuales. |

Rutas post-MVP (fuera del MVP inmediato):

| Ruta | Rol | Propósito |
|---|---|---|
| `/mis-trabajos` | `WORKER` | Trabajos asignados al trabajador logueado. |
| `/mi-nomina` | `WORKER` | Estimación de nómina propia. |
| `/c/[token]` | Token de cliente público | Futuro portal tokenizado para clientes. |

Los slugs de ruta usan español singular sin acentos (`cotizacion`, `nomina`) para mantener las URLs estables y ASCII-only.

## Referencia de UI

Figma define las pantallas y componentes finales. Los issues técnicos pueden agregar UI neutral funcional. La implementación futura debe usar primitivas de Radix para comportamiento y accesibilidad, envueltas en Tailwind que codifique el sistema de diseño de Figma.

## Modelo de dominio

El dominio separa claramente **cotización comercial** (`Quote`) de **orden de trabajo operativa** (`WorkOrder`).

| Entidad | Responsabilidad | Relación principal |
|---|---|---|
| `UserProfile` | Usuario interno con rol y clasificación laboral. En el MVP inmediato solo `ADMIN`/`ADMIN_ASSISTANT` inician sesión; `WORKER` modela registros operativos admin-led. | `WorkAssignment`, `ExecutionRecord` |
| `Customer` | Cliente del taller | `Quote`, `Vehicle` |
| `Vehicle` | Unidad vinculada al cliente | `Customer`, `Quote` |
| `Quote` | Propuesta comercial con ítems, secciones y totales | `Customer`, `Vehicle`, `QuoteSection`, `QuoteItem`, `WorkOrder` |
| `QuoteSection` | Grupo de conceptos dentro de una cotización con subtotal propio | `Quote`, `QuoteItem` |
| `QuoteItem` | Línea de cotización con tipo, cantidad y precio | `QuoteSection`, `Quote` |
| `WorkOrder` | Orden de trabajo vinculada a una cotización; debe evolucionar para soportar autorización administrativa y `ESPERA` | `Quote`, `WorkAssignment`, `ExecutionRecord` |
| `WorkAssignment` | Asignación administrativa de empleado a orden de trabajo | `WorkOrder`, `UserProfile` |
| `ExecutionRecord` | Registro administrativo de ejecución realizado | `WorkOrder`, `UserProfile` |
| `CustomerFiscalProfile` | Perfil fiscal reutilizable, administrado por personal interno | `Customer`, `PaymentRequest` |
| `PaymentRequest` | Solicitud tokenizada de instrucciones para transferencia; no registra pagos ni liquidaciones | `Customer`, `Quote` o `WorkOrder`, `CustomerFiscalProfile` |
| `Payment` | Objetivo: cobro aplicado con monto y método | `Customer`, `Quote` o `WorkOrder` |
| `LedgerEntry` | Objetivo: movimiento de la cuenta del cliente | `Customer`, `Payment` |

Regla objetivo pendiente: la autorización administrativa no debe crear un flujo paralelo; debe usar el mismo registro de cotización/alcance, marcarlo como aceptado y exigir una nota con canal y motivo (p. ej. "autorización por teléfono"). La evidencia inicial es opcional. Tras la aceptación o autorización, la orden debe pasar por `ESPERA` hasta que se confirme espacio del taller y disponibilidad de maestro.

## Autorización parcial y dominio financiero

Una cotización se construye por secciones desde el inicio. La acción principal del cotizador es **Agregar sección**; dentro de cada sección, el usuario agrega conceptos con **Agregar concepto**. Los subtotales por sección y el total de la cotización se calculan automáticamente. El cliente puede autorizar secciones individuales con **Autorizar sección** o la cotización completa con **Autorizar cotización completa**. Las secciones autorizadas no se modelan como cotizaciones separadas; persisten dentro de la misma cotización con su propio estado de autorización. La agrupación retrospectiva de conceptos no es parte del flujo principal del MVP.

> **Terminología:** en la interfaz del cotizador cada línea se presenta como un **concepto** (acción **Agregar concepto**). En el modelo de dominio esa línea sigue siendo `QuoteItem`. Los tipos de concepto incluyen mano de obra, material, refacción, servicio externo y otro.

El subtotal general de una cotización integra refacciones, mano de obra y servicios. Sin factura, el total pagable es el subtotal; con factura, es el subtotal más IVA. El personal define la preferencia de factura y captura o reutiliza `CustomerFiscalProfile`. Cuando corresponde, la operación conserva un snapshot fiscal para no depender de cambios posteriores al perfil reutilizable.

La preferencia de factura, el método de pago, el estado de pago, el estado de factura y el saldo pendiente son ejes independientes. `QuoteStatus` describe el flujo operativo y no debe incorporar cobro ni adeudo. Facturada no significa pagada.

El dominio financiero objetivo incluye métodos `CASH`, `TRANSFER` y `OTHER`; estados de pago `PENDING`, `PARTIAL` y `PAID`; y estados de factura `NOT_REQUESTED`, `DATA_MISSING`, `READY` e `ISSUED`. Estas entidades y enumeraciones están planificadas. Cada abono parcial deberá crear o actualizar el saldo del ledger del cliente y el indicador financiero de saldo pendiente de la cotización.

El efectivo puede liquidar o abonar sin `PaymentRequest`. Un cambio de preferencia de factura hasta la liquidación final modifica IVA y total pagable; por eso requiere recálculo controlado, confirmación auditada y regeneración de instrucciones.

La distinción operativa `ACEPTADA` → `ESPERA` → `EN_PROGRESO` se preserva: una vez autorizadas las secciones necesarias, la orden de trabajo sigue pasando por `ESPERA` hasta confirmar espacio del taller y disponibilidad de maestro.

## Instrucciones públicas de transferencia

`PaymentRequest` representa una solicitud tokenizada y revocable de instrucciones, no un `Payment`, una entrada de ledger ni evidencia de liquidación. Su ciclo de token, expiración y cancelación, la reutilización de `CustomerFiscalProfile`, el snapshot fiscal y el filtrado de cuentas bancarias constituyen la base implementada.

La ruta `/datos-de-pago/[token]` debe mostrar únicamente un importe decidido por el personal, las cuentas elegibles para esa transferencia y las acciones de contacto o envío de comprobante. No ofrece selector de factura ni formulario fiscal. La recepción de un comprobante requiere validación interna y registro separado del pago.

El link es opcional y exclusivo para `TRANSFER`; `CASH` no lo necesita. La ruta genérica `/datos-pago` no representa instrucciones ligadas a una operación y su alcance final de producto permanece pendiente.

## Límites del MVP

El objetivo inicial es una PWA instalable en Android Chrome, operada por admin/asistente. El empaquetado como APK, los portales de clientes tokenizados y el login/app de trabajador (`/mis-trabajos`, `/mi-nomina`) están fuera del alcance inmediato.

> **Nota de alcance (GitHub #65):** los trabajadores NO se eliminan del dominio. El MVP inmediato los mantiene como registros admin-managed: el admin asigna maestro/ayudantes, registra quién ejecutó el trabajo y alimenta nómina/cuenta del cliente. El self-service del trabajador queda para post-MVP.
