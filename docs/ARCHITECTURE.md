# Arquitectura implementada de SEBASAM

Referencia del código versionado, no de la configuración efectiva de producción ni de un porcentaje de avance. Las reglas y objetivos de producto viven en [DOMAIN_RULES](./DOMAIN_RULES.md); los pendientes se acuerdan en GitHub Issues.

## Límites de datos y ejecución

| Área | Contrato y evidencia |
|---|---|
| Datos operativos | Prisma es la vía de acceso a datos de negocio; no consultar esas mismas tablas mediante helpers de Supabase client. El cliente usa `@prisma/adapter-pg`: [`src/lib/prisma.ts`](../src/lib/prisma.ts). |
| Auth y Storage | Supabase provee identidad e infraestructura; los roles y perfiles operativos están en `UserProfile`. La service role key es exclusivamente server-side. |
| Runtime y migraciones | `DATABASE_URL` configura el adaptador de runtime; `DIRECT_URL`, la CLI de Prisma en [`prisma.config.ts`](../prisma.config.ts). |
| Build y release | `build` genera Prisma Client y ejecuta Next.js; no aplica migraciones. El workflow de release migra antes de invocar Vercel: [runbook](./PRODUCTION_RELEASE.md). |
| Perímetro SQL | Las migraciones habilitan RLS y revocan permisos de `anon`/`authenticated` en `public`. Revisar todas las migraciones aplicadas y el rol efectivo; una política RLS aislada no demuestra acceso. Ver [DATABASE_SAFETY](./DATABASE_SAFETY.md). |

El rol de conexión que usa Prisma debe tener los permisos necesarios; no asumir que una URL, un archivo del repo o una política histórica prueban la configuración de la base desplegada.

## Organización y funcionalidades presentes

Las features agrupan schemas de entrada, lógica de dominio, acciones, queries y componentes. `src/lib` contiene infraestructura compartida; `src/components/ui` concentra wrappers y primitivas visuales. El dominio separa cotización comercial, operación de trabajo y movimientos financieros.

| Área implementada | Evidencia principal |
|---|---|
| Clientes, contactos y vehículos | [`src/features/customers`](../src/features/customers/), [`src/features/vehicles`](../src/features/vehicles/) |
| Cotizaciones, secciones y decisiones públicas/administrativas | [`src/features/quotes`](../src/features/quotes/); `Quote`, `QuoteSection`, `QuoteDecision`, `SharedQuote` en el schema |
| Órdenes, asignación y ejecución administrativa | [`src/features/work-orders`](../src/features/work-orders/); `WorkOrder`, `WorkAssignment`, `ExecutionRecord` |
| Notas de trabajo/venta y aplicaciones de cobro | `PayableNote`, `Payment`, `PaymentApplication` en [`schema.prisma`](../prisma/schema.prisma); [`src/features/payments/domain.ts`](../src/features/payments/domain.ts) |
| Estado de cuenta, crédito y correcciones financieras | `LedgerEntry`, `PaymentCorrection`, `QuoteCommercialCorrection`; funciones de resumen/corrección en el dominio de pagos |
| Nómina y controles semanales | [`src/features/payroll`](../src/features/payroll/); `HelperPayrollWeek`, `PayrollWeekControl`, `WorkOrderLaborAdvance` (no existe un modelo llamado `WeeklyPayroll`) |
| Gestión interna de usuarios | [`src/features/user-management`](../src/features/user-management/); página `/admin/users` con `requireSuperAdmin` |
| Historia y asistente | [Importación histórica](./HISTORICAL_IMPORT.md); páginas `/admin/historical` y `/asistente` |

Esta tabla prueba presencia de código/modelos, no cobertura completa de todos los criterios de aceptación ni éxito de integración en producción. Los tests al lado de las features y rutas documentan casos concretos; sus resultados deben ejecutarse en la revisión que se entrega.

## Auth y roles

Supabase Auth se vincula con `UserProfile.id` por UUID. El login visible usa username y una identidad interna de email; la autorización depende del perfil activo y de guards de servidor, no del prefijo de URL.

[`src/lib/auth/session.ts`](../src/lib/auth/session.ts) define:

- `requireOperationalRole`: `SUPER_ADMIN`, `ADMIN`, `ADMIN_ASSISTANT`.
- `requireAdmin`: `SUPER_ADMIN`, `ADMIN`.
- `requireSuperAdmin`: solo `SUPER_ADMIN`.
- `requireRole` concede a `SUPER_ADMIN` acceso a los roles pedidos; también exige perfil/sesión válidos.

El schema incluye `WORKER` y `workerKind` (`MASTER`/`HELPER`) para registros laborales y asignaciones. Eso no equivale a un portal de trabajador ni concede acceso operativo. El self-service `/mis-trabajos` y `/mi-nomina` continúa siendo una propuesta separada del registro admin-led (GitHub #65).

Las cuentas internas no usan sign-up público. Hay gestión de usuarios en `/admin/users`, reservada a Super Admin; los scripts de Auth y bootstrap descritos en el [README](../README.md) siguen siendo herramientas administrativas, no instrucciones para exponer service role al navegador.

## Hosting y modelo de rutas

El hosting previsto separa la landing `sebasam.com` de la aplicación `app.sebasam.com`, sin `basePath` compartido. Los dominios activos se comprueban en el proveedor; no se verificaron como parte de esta referencia.

La navegación implementada **sí usa `/admin`**. [`getRootRedirectPath`](../src/lib/auth/root-redirect.ts) manda `/` a `/admin` si hay usuario o a `/admin/login` si no lo hay; los guards resuelven después perfil, rol y cambio de contraseña. Las carpetas `(protected)` son route groups, no segmentos de URL.

| Ruta existente | Propósito |
|---|---|
| `/admin/login`, `/admin/change-password`, `/admin/setup-required` | Acceso y resolución de perfil/contraseña |
| `/admin` | Dashboard interno |
| `/admin/customers`, `/admin/customers/[id]` | Clientes y detalle; `/estado-de-cuenta` agrega su cuenta |
| `/admin/quotes`, `/admin/quotes/nueva`, `/admin/quotes/[id]/edit` | Cotizador; `/admin/quotes/[id]/print` es su salida imprimible |
| `/admin/work-orders`, `/admin/work-orders/[id]` | Gestión operativa |
| `/admin/notas`, `/admin/notas/[id]/print` | Notas y salida imprimible |
| `/admin/workers`, `/admin/workers/[id]/edit` | Trabajadores administrados internamente |
| `/admin/nomina` | Nómina; incluye rutas de impresión de firmas y sobres |
| `/admin/configuracion-pago`, `/admin/users` | Configuración financiera y administración de usuarios con sus guards específicos |
| `/cotizacion/[token]` | Documento público tokenizado, decisiones y estado de pago cuando corresponde |
| `/datos-de-pago/[token]`, `/datos-de-pago/cuenta/[token]` | Superficies públicas de datos de pago |
| `/datos-pago` | Página genérica, no prueba de pago ni instrucciones de una operación específica |
| `/admin/historical`, `/asistente` | Consulta histórica y asistente; este último exige autorización operativa |

Fuente del mapa: [`src/app`](../src/app/). La presencia de una página no concede permisos: revisar el guard de la acción/página correspondiente.

### Propuesta histórica de rutas semánticas

El mapa anterior proponía reemplazar el namespace administrativo por `/login`, `/cotizacion`, `/cotizacion/[id]`, `/cliente`, `/cliente/[id]`, `/trabajador`, `/trabajador/[id]`, `/nomina` y `/trabajo/[id]`, más `/c/[token]` como portal futuro. **No es el mapa implementado ni una migración aprobada por esta limpieza.** La ruta pública `/cotizacion/[token]` ya existe y no debe confundirse con esos aliases propuestos.

## Modelo y estados: no confundir producto con enums

El [schema](../prisma/schema.prisma) es la fuente de nombres persistidos. Actualmente:

| Concepto | Valores persistidos |
|---|---|
| `QuoteStatus` | `DRAFT`, `SENT`, `APPROVED`, `REJECTED`, `CANCELLED`, `ARCHIVED` |
| `WorkOrderStatus` | `PLANNED`, `ASSIGNED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED` |
| `PaymentMethod` | `CASH`, `TRANSFER`, `CREDIT_CARD`, `DEBIT_CARD`, `OTHER` |
| `PaymentStatus` | `PENDING`, `PAID` |

`ESPERA`, `PARTIAL` y los estados de factura de las [reglas de producto](./DOMAIN_RULES.md) no son automáticamente enums existentes. El saldo se calcula a partir de notas, capturas y aplicaciones; no se deduce de `QuoteStatus` ni de `PaymentRequestStatus`.

La autorización por secciones ya aparece en `acceptSharedQuote` y `authorizeQuote`, con `authorizedSectionIds` y `QuoteSection.isAuthorized`. La aceptación y creación/inicio de una orden no deben confundirse: revisar las acciones y validaciones operativas antes de afirmar qué transición ejecuta cada entrada. Las propuestas `ACEPTADA → ESPERA → EN_PROCESO` conservan su significado de producto sin sustituir los guards actuales por una descripción idealizada.

`PaymentRequest` controla instrucciones tokenizadas y sus datos fiscales; no registra por sí solo un pago ni demuestra liquidación. Capturas, aplicaciones, crédito y reversiones pertenecen al [dominio de pagos](../src/features/payments/domain.ts). La intención de las instrucciones públicas y el contrato fiscal se mantienen en [DOMAIN_RULES](./DOMAIN_RULES.md), separados de la evidencia de implementación.

## Referencias y límites de esta guía

- [Diseño](../DESIGN.md): tokens, composición y componentes; Figma es referencia visual, no prueba de cobertura.
- [Runbooks](../README.md#documentación-una-entrada-por-propósito): configuración y operaciones con datos/release.
- GitHub Issues: tracker de ejecución; el historial de Git conserva los primeros snapshots del MVP, no pendientes actuales.
- Instalabilidad PWA, seguridad efectiva de la base, credenciales y despliegue requieren verificación en su entorno; no se deducen de este inventario estático.
