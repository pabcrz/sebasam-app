# Arquitectura de operaciones SEBASAM

Esta app es el núcleo operativo limpio de SEBASAM: clientes, cotizaciones, órdenes de trabajo, asignaciones y registros de ejecución.

## Reglas de arquitectura

| Área | Regla |
|---|---|
| Datos de negocio | Prisma es la única capa de acceso a datos operativos. No mezclar consultas de Supabase client con Prisma para las mismas tablas. |
| Auth | Supabase Auth es dueño de la identidad. Los roles de la app viven en `UserProfile`. |
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

Las contraseñas del staff interno las controlan los admins, no el sign-up público. Usar herramientas server-only con service role para crear o resetear usuarios de Auth hasta que exista la pantalla de admin correspondiente.

## Hosting y modelo de rutas

`sebasam.com` pertenece al proyecto de landing público. Esta app operativa corre en `app.sebasam.com` como despliegue independiente, sin `basePath` de Next.js ni proxy compartido por subruta.

La app usa un solo login y rutas según rol. La raíz `/` es el hub post-login; renderiza o redirige según `UserProfile.role`. El namespace `/admin` se evita a propósito: las funciones administrativas usan rutas semánticas y el acceso se controla por role guards en el servidor, no por prefijo de URL.

Mapa de rutas objetivo:

| Ruta | Rol | Propósito |
|---|---|---|
| `/` | `ADMIN`, `ADMIN_ASSISTANT`, `WORKER` | Hub role-aware después del login. |
| `/login` | Público | Login único del staff. |
| `/cotizacion` | `ADMIN`, `ADMIN_ASSISTANT` | Lista y creación de cotizaciones. |
| `/cotizacion/[id]` | `ADMIN`, `ADMIN_ASSISTANT` | Detalle y edición de cotización. |
| `/cliente` | `ADMIN`, `ADMIN_ASSISTANT` | Lista y creación de clientes. |
| `/cliente/[id]` | `ADMIN`, `ADMIN_ASSISTANT` | Detalle y edición de cliente. |
| `/trabajador` | `ADMIN`, `ADMIN_ASSISTANT` | Gestión del equipo del taller. |
| `/trabajador/[id]` | `ADMIN`, `ADMIN_ASSISTANT` | Detalle del trabajador. |
| `/nomina` | `ADMIN`, `ADMIN_ASSISTANT` | Nómina semanal. |
| `/mis-trabajos` | `WORKER` | Trabajos asignados al trabajador logueado. |
| `/mi-nomina` | `WORKER` | Estimación de nómina propia. |
| `/trabajo/[id]` | Según rol | Detalle del trabajo con visibilidad específica por rol. |
| `/c/[token]` | Token de cliente público | Futuro portal tokenizado para clientes. |
| `/datos-de-pago/[token]` | Token de cliente público | Página de datos de pago vinculada a un `PaymentRequest`. |

Los slugs de ruta usan español singular sin acentos (`cotizacion`, `nomina`) para mantener las URLs estables y ASCII-only.

## Referencia de UI

Figma define las pantallas y componentes finales. Los issues técnicos pueden agregar UI neutral funcional. La implementación futura debe usar primitivas de Radix para comportamiento y accesibilidad, envueltas en Tailwind que codifique el sistema de diseño de Figma.

## Modelo de dominio

El dominio separa claramente **cotización comercial** (`Quote`) de **orden de trabajo operativa** (`WorkOrder`).

| Entidad | Responsabilidad | Relación principal |
|---|---|---|
| `UserProfile` | Usuario interno con rol y clasificación laboral | `WorkAssignment`, `ExecutionRecord` |
| `Customer` | Cliente del taller | `Quote`, `Vehicle` |
| `Vehicle` | Unidad vinculada al cliente | `Customer`, `Quote` |
| `Quote` | Propuesta comercial con ítems, secciones y totales | `Customer`, `Vehicle`, `QuoteSection`, `QuoteItem`, `WorkOrder` |
| `QuoteSection` | Grupo de conceptos dentro de una cotización con subtotal propio | `Quote`, `QuoteItem` |
| `QuoteItem` | Línea de cotización con tipo, cantidad y precio | `QuoteSection`, `Quote` |
| `WorkOrder` | Orden de trabajo vinculada a una cotización; debe evolucionar para soportar autorización administrativa y `ESPERA` | `Quote`, `WorkAssignment`, `ExecutionRecord` |
| `WorkAssignment` | Asignación de empleado a orden de trabajo | `WorkOrder`, `UserProfile` |
| `ExecutionRecord` | Reporte de ejecución realizado | `WorkOrder`, `UserProfile` |

Regla objetivo pendiente: la autorización administrativa no debe crear un flujo paralelo; debe usar el mismo registro de cotización/alcance, marcarlo como aceptado y exigir una nota con canal y motivo (p. ej. "autorización por teléfono"). La evidencia inicial es opcional. Tras la aceptación o autorización, la orden debe pasar por `ESPERA` hasta que se confirme espacio del taller y disponibilidad de maestro.

## Autorización parcial y flujo de pago

Una cotización se construye por secciones desde el inicio. La acción principal del cotizador es **Agregar sección**; dentro de cada sección, el usuario agrega conceptos con **Agregar concepto**. Los subtotales por sección y el total de la cotización se calculan automáticamente. El cliente puede autorizar secciones individuales con **Autorizar sección** o la cotización completa con **Autorizar cotización completa**. Las secciones autorizadas no se modelan como cotizaciones separadas; persisten dentro de la misma cotización con su propio estado de autorización. La agrupación retrospectiva de conceptos no es parte del flujo principal del MVP.

> **Terminología:** en la interfaz del cotizador cada línea se presenta como un **concepto** (acción **Agregar concepto**). En el modelo de dominio esa línea sigue siendo `QuoteItem`. Los tipos de concepto incluyen mano de obra, material, refacción, servicio externo y otro.

El flujo de pago es independiente de la aceptación de la cotización:

- Si la cotización no requiere factura, los datos de pago se muestran directamente.
- Si la cotización requiere factura, el sistema solicita los datos fiscales faltantes o confirma los datos fiscales existentes del cliente antes de mostrar los datos de pago.

La distinción operativa `ACEPTADA` → `ESPERA` → `EN_PROGRESO` se preserva: una vez autorizadas las secciones necesarias, la orden de trabajo sigue pasando por `ESPERA` hasta confirmar espacio del taller y disponibilidad de maestro.

## Página pública de datos de pago

La ruta `/datos-de-pago/[token]` es el destino público de un `PaymentRequest`. El token se resuelve server-side y la página guía al cliente por uno de dos caminos:

1. **No requiere factura**: se muestran directamente los datos de pago y un botón/contacto de WhatsApp para enviar el comprobante.
2. **Requiere factura**: se capturan o confirman los datos fiscales, se guardan en `CustomerFiscalProfile` y se almacena un `fiscalSnapshot` en `PaymentRequest`; luego se muestran los datos de pago.

El comprobante se envía por WhatsApp en el MVP; no hay upload ni storage de archivos. Los estados `EXPIRED` y `CANCELLED` se manejan con mensajes de error claros; un token inexistente se trata como inválido.

Esta página está desacoplada de la aceptación de la cotización: el cliente puede recibir los datos de pago sin haber aceptado previamente el link de cotización, dependiendo de cómo se genere el `PaymentRequest`.

## Límites del MVP

El objetivo inicial es una PWA instalable en Android Chrome. El empaquetado como APK y los portales de clientes tokenizados están fuera del alcance inmediato.
