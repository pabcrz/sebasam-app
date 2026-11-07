# Arquitectura, seguridad y operación

## Límites de datos

Prisma es la vía de acceso a datos operativos PostgreSQL; Supabase Auth administra identidad. El perfil `UserProfile` en Prisma asocia UUID/rol operativo. `requireOperationalRole` admite `SUPER_ADMIN`, `ADMIN`, `ADMIN_ASSISTANT`; `requireAdmin` admite `SUPER_ADMIN` y `ADMIN`. Las acciones críticas vuelven a comprobar permiso en servidor. Referencias: `docs/ARCHITECTURE.md`, `src/lib/auth/session.ts`, `src/lib/prisma.ts`.

La política documentada limita PostgREST para tablas operativas mediante RLS/permisos; Prisma como owner tiene comportamiento distinto. La clave service-role es exclusiva de servidor y no debe incorporarse a cliente. Tablas nuevas requieren RLS habilitado en migración y revisión de permisos por defecto. Referencias: `docs/DATABASE_SAFETY.md`, `src/lib/rls-coverage.test.ts`.

## Operación de base de datos

Runtime usa `DATABASE_URL`; migraciones usan `DIRECT_URL`. `db:migrate:dev` está restringido a Postgres local; cambios remotos se aplican con `db:migrate:deploy` solo tras revisar migración y crear respaldo verificable. El backup documentado cubre únicamente `public`; Auth y Storage requieren exportación separada. No usar despliegue de migraciones como restauración. Fuente de procedimiento: `docs/DATABASE_SAFETY.md`.

## Roles y autenticación

La identidad proviene de Supabase Auth y se asocia por UUID a `UserProfile`; el rol de app se consulta en Prisma. No todas las funciones exportadas están necesariamente protegidas por el mismo guard: la regla se debe comprobar por endpoint/acción. Detalles de login, cambios de contraseña y límites de administración en [autenticación y usuarios](auth-and-user-management.md).

## Rutas públicas y tokens

Los enlaces de cotización, solicitud de pago y cuenta bancaria son superficies públicas autorizadas por token, con reglas separadas de vigencia/revocación. No son un portal autenticado. El token de pago instruye transferencia, no registra captura; el token de cotización permite ver/decidir cotización. Fuentes: `src/features/quotes/domain.ts`, `src/features/payment-requests/domain.ts`, `src/features/payment-settings/domain.ts`.

## Restricciones y diferencias de documentación

`docs/ARCHITECTURE.md` expresa objetivos, incluidos estado `ESPERA` y rutas planeadas. El enum vigente de `WorkOrderStatus` no contiene `ESPERA`; la asignación puede ser inmediata. Se prioriza aquí evidencia actual de código/esquema sobre objetivo arquitectónico. `docs/HISTORICAL_IMPORT.md` sirve como guía de formato, pero su descripción de importación/UX debe cotejarse con las páginas y acciones actuales; esta guía solo afirma transacción y validación observadas en implementación.

El backup no cubre Auth/Storage, RLS no protege frente a credencial service-role filtrada, y la búsqueda semántica histórica no tiene índice vectorial ivfflat/hnsw (ver `docs/HISTORICAL_IMPORT.md`). La proyección de trabajos completados se filtra por estado indexado; ver [conocimiento y asistente](completed-work-and-assistant.md). No se verificaron procedimientos de recuperación integral ni conciliación bancaria automatizada.
