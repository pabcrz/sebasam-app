# SEBASAM Operations App

Aplicación operativa mobile-first para SEBASAM: clientes, cotizaciones, notas de venta/trabajo, cobros, órdenes y nómina. El objetivo de instalación es una PWA en Android Chrome, no un APK; la instalabilidad debe comprobarse en el entorno de destino.

## Empezar en local

1. Instalar dependencias con `pnpm install` (el gestor fijado está en `package.json`).
2. Copiar `.env.example` a `.env` y completar las variables necesarias. No copiar credenciales de otro worktree ni commitear `.env`.
3. Generar Prisma Client con `pnpm prisma:generate`.
4. Ejecutar `pnpm dev`. El acceso interno implementado está en `/admin/login`.

Antes de migrar o importar datos, seguir [DATABASE_SAFETY](./docs/DATABASE_SAFETY.md). No ejecutar `prisma migrate dev` en producción ni incorporar migraciones a `next build`.

## Documentación: una entrada por propósito

| Necesidad | Referencia |
|---|---|
| Entender y operar el producto, sus recorridos y reglas | [Manual de producto](./docs/product-guide/index.md) |
| Consultar estructura, modelos, rutas y límites técnicos | [Arquitectura](./docs/ARCHITECTURE.md) |
| Trabajar con agentes, issues y verificaciones | [Flujo de trabajo con IA](./docs/AI_WORKFLOW.md) |
| Elegir el idioma del producto, código y documentación | [Convención de idiomas](./docs/AI_WORKFLOW.md#language-conventions) |
| Crear ramas y preparar PRs | [Gitflow](./docs/GITFLOW.md) |
| Usar tokens y componentes visuales | [Diseño](./DESIGN.md) |
| Migrar, respaldar o recuperar datos | [Seguridad de base de datos](./docs/DATABASE_SAFETY.md) |
| Promover una revisión a producción | [Guía de publicación](./docs/PRODUCTION_RELEASE.md) |
| Importar información histórica y entender el asistente | [Importación histórica](./docs/HISTORICAL_IMPORT.md) |

No usar el backlog ni los informes históricos como porcentaje de avance actual. GitHub Issues es el tracker de ejecución; las afirmaciones sobre implementación se contrastan con código y pruebas.

## Reglas de negocio 📋

Las reglas R1–R18 se conservan en sus capítulos dueños del [manual](./docs/product-guide/index.md): [cotizaciones y trabajo](./docs/product-guide/quotes-work-orders-notes.md#reglas-objetivo-conservadas), [finanzas](./docs/product-guide/payments-and-receivables.md#reglas-objetivo-conservadas) y [nómina](./docs/product-guide/customers-workers-payroll.md#regla-objetivo-conservada). Los [recorridos](./docs/product-guide/flows.md) distinguen flujo observado y objetivo; no se mantienen copias aquí.

## Propuestas e historial

Los primeros snapshots del MVP se consultan en el historial de Git; para el trabajo vigente, usar GitHub Issues y la documentación actual.

- [Checklist worker](./docs/worker-execution-checklist.md): propuesta no aprobada; no habilita login de trabajadores.
- [OpenSpec](./openspec/README.md): especificaciones y expedientes de cambios, sin dependencia del runtime.
- [Registros ODD](./odd/README.md): alcance y evidencia por trabajo; no reemplazan el tracker ni el manual del producto.

## Verificación local

`pnpm lint`, `pnpm typecheck` y `pnpm test:ui` cubren análisis y tests Vitest. `pnpm test:ui-contract` y `pnpm test:vehicle` ejecutan contratos específicos. `pnpm exec playwright test` usa las fixtures visuales de `tests/playwright`: no demuestra por sí solo un flujo autenticado contra la aplicación y base de datos reales. Ejecutar `pnpm build` cuando el alcance afecte el build.

La lista completa y autoritativa de comandos está en [package.json](./package.json). Los resultados de un informe antiguo no son verificaciones ejecutadas en tu checkout.

<a id="environment-variables"></a>

## Variables de entorno

| Variable | Propósito |
|----------|-----------|
| `DATABASE_URL` | URL de PostgreSQL de Supabase con pool de conexiones para la ejecución de la aplicación. |
| `DIRECT_URL` | URL de Supabase sin pool transaccional para migraciones con Prisma CLI: preferir conexión Direct; se admite Session pooler cuando Direct no es accesible. |
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase que puede exponerse al navegador. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave anónima de Supabase que puede exponerse al navegador. |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave opcional exclusiva del servidor. Nunca exponerla como `NEXT_PUBLIC_*`. |

<a id="commands"></a>

## Comandos

```bash
pnpm dev
pnpm lint
pnpm typecheck
pnpm build
pnpm prisma:generate
pnpm db:migrate:dev
pnpm db:migrate:deploy
pnpm db:backup:public -- --destination /Volumes/SEBASAM-BACKUPS
pnpm db:seed
pnpm bootstrap:admin-profile
pnpm auth:set-password
```

<a id="internal-auth-users"></a>

## Usuarios internos de autenticación

El personal ingresa con nombre de usuario, mientras Supabase Auth conserva internamente
identidades basadas en correo. El usuario visible `pablo` corresponde a `pablo@sebasam.local`.

En el MVP, las cuentas del personal se controlan internamente. No habilitar el registro público.

Crear un usuario interno de Auth o restablecer su contraseña con el script local de administración:

```bash
AUTH_USERNAME="pablo" \
AUTH_PASSWORD="temporary-password" \
SUPABASE_SERVICE_ROLE_KEY="<server-only-service-role-key>" \
pnpm auth:set-password
```

Si el usuario de Auth ya existe, indicar su UUID para restablecer la contraseña:

```bash
AUTH_USERNAME="pablo" \
AUTH_PASSWORD="new-temporary-password" \
AUTH_USER_ID="<supabase-auth-user-uuid>" \
SUPABASE_SERVICE_ROLE_KEY="<server-only-service-role-key>" \
pnpm auth:set-password
```

La clave service role es exclusiva del servidor. No incorporarla a Git, exponerla en código
del navegador ni usar el prefijo `NEXT_PUBLIC_`.

<a id="admin-profile-bootstrap"></a>

## Creación inicial del perfil administrativo

Supabase Auth administra identidad y sesiones. Crear primero el usuario de Auth en Supabase,
con el correo interno correspondiente al nombre de usuario visible; por ejemplo,
`sebas@sebasam.local` para el usuario `sebas`.

Después, crear o actualizar el perfil correspondiente de la aplicación con Prisma:

```bash
BOOTSTRAP_AUTH_USER_ID="<supabase-auth-user-uuid>" \
BOOTSTRAP_USERNAME="sebas" \
BOOTSTRAP_EMAIL="sebas@sebasam.local" \
BOOTSTRAP_DISPLAY_NAME="Sebas" \
BOOTSTRAP_ROLE="ADMIN" \
pnpm bootstrap:admin-profile
```

El script de creación inicial no crea usuarios de Supabase Auth ni necesita una clave service role.
Solo crea o actualiza `UserProfile` para un ID de usuario de Auth existente. `BOOTSTRAP_ROLE`
admite `ADMIN` o `ADMIN_ASSISTANT`.

La gestión interna de usuarios ya tiene una pantalla en `/admin/users`, reservada a Super Admin.
Los scripts anteriores siguen siendo herramientas administrativas. Los componentes deben respetar
los wrappers y las referencias visuales de `DESIGN.md`.

<a id="production-release"></a>

## Publicación en producción

Las publicaciones en producción se orquestan mediante el workflow versionado de GitHub Actions
`.github/workflows/production-release.yml`. Configurar el entorno protegido `production`
de GitHub y Vercel según [`docs/PRODUCTION_RELEASE.md`](./docs/PRODUCTION_RELEASE.md).
No permitir que Vercel publique automáticamente en producción desde `main`: el workflow
invoca Vercel solo después de verificar y aplicar todas las migraciones pendientes de Prisma
incluidas en Git. Una persona a cargo del mantenimiento debe iniciar manualmente el workflow
desde `main`; esa ejecución es la aprobación humana explícita para promover la revisión elegida.
Los pushes a `main` nunca publican automáticamente en producción.


## Restricciones operativas

- Mantener privado el repositorio; no commitear secretos ni `.env`.
- Usar pnpm, no agregar `package-lock.json`.
- Mantener los nombres de variables alineados con `.env.example` y los helpers correspondientes.
- No importar íntegro el schema de otro repositorio.
- No habilitar sign-up público ni self-service de trabajadores como parte de una tarea no relacionada.
- Las reglas de contribución, ramas y PRs viven en [AI_WORKFLOW](./docs/AI_WORKFLOW.md) y [GITFLOW](./docs/GITFLOW.md).
