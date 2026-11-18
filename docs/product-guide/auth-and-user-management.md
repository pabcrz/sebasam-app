# Autenticación y administración de usuarios

El personal ingresa con cuenta interna; Super Admin administra usuarios autenticables. La ficha laboral no equivale a una cuenta. Empezar aquí antes de los [recorridos operativos](flows.md).

## Inicio de sesión y perfil

Login recibe username/contraseña, normaliza username a minúsculas y construye email interno `username@sebasam.local` para Supabase Auth. Prisma busca perfil por UUID Auth. Perfil inexistente/inactivo o `mustChangePassword` no obtiene acceso operacional normal; páginas y acciones resuelven esos casos de manera distinta. Fuentes: [acciones de auth](../../src/features/auth/actions.ts), [sesión](../../src/lib/auth/session.ts).

Cambiar contraseña exige mínimo ocho caracteres y confirmación coincidente. Supabase cambia contraseña y luego el perfil deja de requerir cambio; cerrar sesión invalida sesión Supabase. Las rutas son `/admin/login`, `/admin/change-password` y `/admin/setup-required`. No habilitar sign-up público; provisión/bootstrap administrativo pertenece al [README](../../README.md#internal-auth-users), no a otro procedimiento aquí.

## Roles y límites

| Guard explícito | Roles admitidos |
|---|---|
| `requireOperationalRole` | `SUPER_ADMIN`, `ADMIN`, `ADMIN_ASSISTANT` |
| `requireAdmin` | `SUPER_ADMIN`, `ADMIN` |
| `requireSuperAdmin` | `SUPER_ADMIN` |

`requireRole` concede a superadmin los roles pedidos y exige sesión/perfil válidos. **No es garantía universal de guards:** verificar cada página, acción y endpoint. `getCurrentProfile` no impone por sí solo toda la política de `requireProfile`; prefijo de ruta, acción exportada o tipo de rol no prueban autorización completa. Fuentes: [sesión](../../src/lib/auth/session.ts) y [frontera técnica](../ARCHITECTURE.md#auth-y-roles).

La revisión de permisos incluye las funciones delegadas: `createWorkOrder` llega a `requireOperationalRole` mediante `ensureWorkOrderPlanned`. En cambio, las acciones fiscales de solicitudes se autorizan por token, sin guard operativo. Consultar [órdenes](quotes-work-orders-notes.md#disponibilidad-y-conexiones) y [solicitudes](payments-and-receivables.md#solicitudes-de-pago-y-configuración), sin inferir UI ni remediar permisos desde documentación.

## Administración de cuentas

`/admin/users` requiere superadmin. Las acciones crean Auth y perfil Prisma, asignan rol, activan/desactivan y restablecen contraseña; alta obliga cambio inicial y genera email interno. Si falla crear perfil, se intenta compensar eliminando usuario Auth. Superadmin no puede degradarse/desactivarse a sí mismo ni retirar el rol/desactivar al último superadmin activo. Ese límite no demuestra una acción de eliminación general de cuentas. Fuentes: [acciones](../../src/features/user-management/actions.ts), [schemas](../../src/features/user-management/schemas.ts).

## Trabajadores

`/admin/workers` crea perfil `WORKER` y clase laboral sin crear credenciales Auth. No confundirlo con usuarios autenticables ni afirmar autoservicio comprobado. El self-service laboral es propuesta separada (GitHub #65). Continuar en [equipo y nómina](customers-workers-payroll.md#equipo).

## Seguridad y siguiente paso

La service-role para creación/reset de usuarios es exclusiva del servidor, nunca del navegador. Ver [cliente admin](../../src/lib/supabase/admin.ts), [arquitectura](../ARCHITECTURE.md#límites-de-datos-y-ejecución) y [seguridad de datos](../DATABASE_SAFETY.md). RLS no protege frente a filtración de esa credencial. No se documenta aquí recuperación/provisión fuera de las acciones observadas ni se certifica configuración desplegada. Los [enlaces públicos](vehicles-and-public-experience.md) tienen contratos tokenizados distintos de una sesión.
