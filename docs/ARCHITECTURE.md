# Arquitectura de operaciones SEBASAM

Esta app es el núcleo operativo limpio de SEBASAM: clientes, cotizaciones, órdenes de trabajo, asignaciones y registros de ejecución.

## Reglas de arquitectura

| Área | Regla |
|---|---|
| Datos de negocio | Prisma es la única capa de acceso a datos operativos. No mezclar consultas de Supabase client con Prisma para las mismas tablas. |
| Auth | Supabase Auth es dueño de la identidad. Los roles de la app viven en `UserProfile`. |
| Cotización → orden de trabajo | Una `WorkOrder` debe referenciar exactamente una `Quote` aceptada o autorizada administrativamente. Tras la aceptación o autorización, la orden pasa por `ESPERA` antes de `EN_PROCESO`. El trabajo urgente o ya realizado también parte de una cotización administrativa autorizada con nota de canal/motivo. |
| URLs de base de datos | Runtime usa `DATABASE_URL` con el pooler de Supabase. Las migraciones usan `DIRECT_URL`. |
| Despliegue | `next build` puede generar Prisma Client, pero las migraciones corren solo a través de `db:migrate:deploy`. |

## Organización de features

Las carpetas de feature agrupan schemas de entrada, server actions y queries de lectura:

- `src/features/customers`
- `src/features/quotes`
- `src/features/work-orders`

La infraestructura compartida vive en `src/lib`: actualmente helpers de Prisma y Supabase.

## Auth y roles de la app

La identidad de Supabase se vincula con `UserProfile.id` mediante el UUID de usuario de Auth. El login usa el email interno derivado del username visible, pero la autorización siempre revisa el rol del perfil de Prisma. Los roles de acceso son `ADMIN`, `ADMIN_ASSISTANT` y `WORKER`; la clasificación laboral del empleado se guarda por separado como `workerKind` nullable (`MASTER` o `HELPER`).

Las contraseñas del staff interno las controlan los admins, no el sign-up público. Usar herramientas server-only con service role para crear o resetear usuarios de Auth hasta que exista la pantalla de admin correspondiente.

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
| `WorkOrder` | Orden de trabajo que nace de una cotización aceptada o autorizada administrativamente | `Quote`, `WorkAssignment`, `ExecutionRecord` |
| `WorkAssignment` | Asignación de empleado a orden de trabajo | `WorkOrder`, `UserProfile` |
| `ExecutionRecord` | Reporte de ejecución realizado | `WorkOrder`, `UserProfile` |

La autorización administrativa no crea un flujo paralelo: usa el mismo registro de cotización/alcance, lo marca como aceptado y exige una nota con canal y motivo (p. ej. "autorización por teléfono"). La evidencia inicial es opcional. Tras la aceptación o autorización, la orden pasa por `ESPERA` hasta que se confirme espacio del taller y disponibilidad de maestro.

## Límites del MVP

El objetivo inicial es una PWA instalable en Android Chrome. El empaquetado como APK y los portales de clientes tokenizados están fuera del alcance inmediato.
