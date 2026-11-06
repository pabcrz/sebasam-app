# Autenticación y administración de usuarios

## Inicio de sesión y perfil

El inicio de sesión recibe nombre de usuario y contraseña; normaliza username a minúsculas y construye un correo interno `username@sebasam.local` para Supabase Auth. El perfil de aplicación se busca en Prisma por UUID de Auth. Un perfil inexistente, inactivo o marcado `mustChangePassword` no obtiene acceso operacional normal. Referencias: `src/features/auth/actions.ts` (`loginAdmin`, `changePassword`), `src/lib/auth/session.ts`.

El cambio de contraseña requiere ocho caracteres como mínimo y confirmación coincidente; Supabase cambia la contraseña y después el perfil deja de requerir cambio. El cierre de sesión invalida la sesión de Supabase. Referencia: `src/features/auth/actions.ts`.

## Roles y límites

Los guards distinguen `SUPER_ADMIN`, `ADMIN`, `ADMIN_ASSISTANT` y `WORKER`. `requireOperationalRole` admite los tres roles administrativos; `requireAdmin` solo superadmin/admin; `requireSuperAdmin` solo superadmin. Esto describe los guards explícitos, no implica que cada función exportada tenga un guard: verificar acción por acción. Referencia: `src/lib/auth/session.ts`.

Administración de usuarios (`/admin/users`) requiere superadmin: alta en Auth más perfil Prisma, asignación de rol, activar/desactivar y restablecer contraseña. El alta genera correo interno y obliga al cambio inicial. Si la creación del perfil falla, se intenta compensar eliminando el usuario Auth. Un superadmin no puede degradarse/desactivarse a sí mismo ni eliminar/desactivar al último superadmin activo. Referencias: `src/features/user-management/actions.ts`, `src/features/user-management/schemas.ts`.

## Trabajadores

La ficha de trabajador se administra por separado en `/admin/workers`: crea perfil `WORKER` y clase laboral, no crea credenciales de Auth. No confundir con la gestión de usuarios autenticables. El autoservicio de trabajador no queda confirmado. Referencias: `src/features/workers/actions.ts`, `src/features/user-management/actions.ts`.

## Restricciones

La clave service-role se usa server-side en creación/reset de usuarios; nunca debe enviarse al navegador. Referencias: `src/lib/supabase/admin.ts`, `docs/DATABASE_SAFETY.md`. La política de provisión y recuperación de cuentas fuera de estas acciones no se documenta aquí.
