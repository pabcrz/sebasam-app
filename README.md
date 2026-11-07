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
| Entender lo implementado, rutas y límites de datos | [Arquitectura](./docs/ARCHITECTURE.md) |
| Consultar reglas de negocio y objetivos de producto | [Dominio](./docs/DOMAIN_RULES.md) |
| Trabajar con agentes, issues y verificaciones | [AI workflow](./docs/AI_WORKFLOW.md) |
| Crear ramas y preparar PRs | [Gitflow](./docs/GITFLOW.md) |
| Usar tokens y componentes visuales | [Diseño](./DESIGN.md) |
| Migrar, respaldar o recuperar datos | [Seguridad de base de datos](./docs/DATABASE_SAFETY.md) |
| Promover una revisión a producción | [Release runbook](./docs/PRODUCTION_RELEASE.md) |
| Importar información histórica y entender el asistente | [Importación histórica](./docs/HISTORICAL_IMPORT.md) |

> **Referencia actual del ciclo documental:** [Cotizaciones, OT, notas WORK y ventas SALE](./docs/DOCUMENT_LIFECYCLE.md). Distingue emisión financiera, vencimiento de pago, vigencia comercial y caducidad de enlaces.

No usar el backlog ni los informes históricos como porcentaje de avance actual. GitHub Issues es el tracker de ejecución; las afirmaciones sobre implementación se contrastan con código y pruebas.

## Reglas de negocio 📋

La tabla R1–R18, el flujo objetivo y el contrato de cobro se conservan en [DOMAIN_RULES](./docs/DOMAIN_RULES.md). No se mantienen copias en este README.

## Propuestas e historial

Los primeros snapshots del MVP se consultan en el historial de Git; para el trabajo vigente, usar GitHub Issues y la documentación actual.

- [Checklist worker](./docs/worker-execution-checklist.md): propuesta no aprobada; no habilita login de trabajadores.
- [OpenSpec](./openspec/README.md): especificaciones y expedientes de cambios, sin dependencia del runtime.
- [Registros ODD](./odd/README.md): alcance y evidencia por trabajo; no reemplazan el tracker ni el manual del producto.

## Verificación local

`pnpm lint`, `pnpm typecheck` y `pnpm test:ui` cubren análisis y tests Vitest. `pnpm test:ui-contract` y `pnpm test:vehicle` ejecutan contratos específicos. `pnpm exec playwright test` usa las fixtures visuales de `tests/playwright`: no demuestra por sí solo un flujo autenticado contra la aplicación y base de datos reales. Ejecutar `pnpm build` cuando el alcance afecte el build.

La lista completa y autoritativa de comandos está en [package.json](./package.json). Los resultados de un informe antiguo no son verificaciones ejecutadas en tu checkout.

## Environment variables

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Supabase pooled Postgres URL for runtime. |
| `DIRECT_URL` | Supabase non-transaction URL for Prisma CLI migrations: Direct connection preferred, Session pooler accepted when Direct is unreachable. |
| `NEXT_PUBLIC_SUPABASE_URL` | Browser-safe Supabase project URL. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser-safe Supabase anonymous key. |
| `SUPABASE_SERVICE_ROLE_KEY` | Optional server-only key. Never expose it as `NEXT_PUBLIC_*`. |

## Commands

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

## Internal Auth users

SEBASAM uses username-style login for staff, while Supabase Auth still stores email-based
identities internally. The visible username `pablo` maps to `pablo@sebasam.local`.

For the MVP, staff accounts are controlled internally. Do not enable public sign-up.

Create a new internal Auth user or reset an existing user's password with the local/admin script:

```bash
AUTH_USERNAME="pablo" \
AUTH_PASSWORD="temporary-password" \
SUPABASE_SERVICE_ROLE_KEY="<server-only-service-role-key>" \
pnpm auth:set-password
```

If the Auth user already exists, pass its UUID to reset the password:

```bash
AUTH_USERNAME="pablo" \
AUTH_PASSWORD="new-temporary-password" \
AUTH_USER_ID="<supabase-auth-user-uuid>" \
SUPABASE_SERVICE_ROLE_KEY="<server-only-service-role-key>" \
pnpm auth:set-password
```

The service role key is server-only. Never commit it, never expose it to browser code, and never
prefix it with `NEXT_PUBLIC_`.

## Admin profile bootstrap

Supabase Auth owns identity and sessions. Create the Auth user manually in Supabase first,
using the internal email that matches the visible login username, for example
`sebas@sebasam.local` for username `sebas`.

Then create or update the matching app profile with Prisma:

```bash
BOOTSTRAP_AUTH_USER_ID="<supabase-auth-user-uuid>" \
BOOTSTRAP_USERNAME="sebas" \
BOOTSTRAP_EMAIL="sebas@sebasam.local" \
BOOTSTRAP_DISPLAY_NAME="Sebas" \
BOOTSTRAP_ROLE="ADMIN" \
pnpm bootstrap:admin-profile
```

The bootstrap script does not create Supabase Auth users and does not need a service role key.
It only upserts `UserProfile` for an existing Auth user id. `BOOTSTRAP_ROLE` accepts `ADMIN`
or `ADMIN_ASSISTANT`.

La gestión interna de usuarios ya tiene una pantalla en `/admin/users`, reservada a Super Admin.
Los scripts anteriores siguen siendo herramientas administrativas. Los componentes deben respetar
los wrappers y las referencias visuales de `DESIGN.md`.

## Production release

Production releases are orchestrated by the versioned GitHub Actions workflow in
`.github/workflows/production-release.yml`. Configure the protected `production`
GitHub Environment and Vercel as documented in
[`docs/PRODUCTION_RELEASE.md`](./docs/PRODUCTION_RELEASE.md). Do not let Vercel
 auto-deploy production from `main`; the workflow invokes Vercel only after it
verifies and applies all pending committed Prisma migrations. A maintainer must
manually dispatch the workflow from `main`; that dispatch is the explicit human
approval to promote the selected revision. Pushes to `main` never release
production automatically.


## Restricciones operativas

- Mantener privado el repositorio; no commitear secretos ni `.env`.
- Usar pnpm, no agregar `package-lock.json`.
- Mantener los nombres de variables alineados con `.env.example` y los helpers correspondientes.
- No importar íntegro el schema de otro repositorio.
- No habilitar sign-up público ni self-service de trabajadores como parte de una tarea no relacionada.
- Las reglas de contribución, ramas y PRs viven en [AI_WORKFLOW](./docs/AI_WORKFLOW.md) y [GITFLOW](./docs/GITFLOW.md).
