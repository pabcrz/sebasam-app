# Arquitectura de operaciones SEBASAM

Esta app es el núcleo operativo limpio de SEBASAM: clientes, cotizaciones, órdenes de trabajo, asignaciones y registros de ejecución.

## Reglas de arquitectura

| Área | Regla |
|---|---|
| Datos de negocio | Prisma es la única capa de acceso a datos operativos. No mezclar consultas de Supabase client con Prisma para las mismas tablas. |
| Auth | Supabase Auth es dueño de la identidad. Los roles de la app viven en `UserProfile`. |
| Cotización → orden de trabajo | Estado actual: una `WorkOrder` referencia una `Quote` aprobada. Objetivo pendiente: soportar autorización administrativa auditada y estado `ESPERA` antes de `EN_PROCESO`. |
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
| `Quote` | Propuesta comercial con ítems y totales | `Customer`, `Vehicle`, `QuoteItem`, `WorkOrder` |
| `QuoteItem` | Línea de cotización con tipo, cantidad y precio | `Quote` |
| `WorkOrder` | Orden de trabajo vinculada a una cotización; debe evolucionar para soportar autorización administrativa y `ESPERA` | `Quote`, `WorkAssignment`, `ExecutionRecord` |
| `WorkAssignment` | Asignación de empleado a orden de trabajo | `WorkOrder`, `UserProfile` |
| `ExecutionRecord` | Reporte de ejecución realizado | `WorkOrder`, `UserProfile` |

Regla objetivo pendiente: la autorización administrativa no debe crear un flujo paralelo; debe usar el mismo registro de cotización/alcance, marcarlo como aceptado y exigir una nota con canal y motivo (p. ej. "autorización por teléfono"). La evidencia inicial es opcional. Tras la aceptación o autorización, la orden debe pasar por `ESPERA` hasta que se confirme espacio del taller y disponibilidad de maestro.

## Límites del MVP

El objetivo inicial es una PWA instalable en Android Chrome. El empaquetado como APK y los portales de clientes tokenizados están fuera del alcance inmediato.
