# SEBASAM Operations App

Aplicación operativa limpia para SEBASAM: cotizaciones, órdenes de trabajo, asignaciones y registro de ejecución. El objetivo del MVP es una PWA instalable en Android Chrome, no un APK.

## Resumen del proyecto

| Aspecto | Detalle |
|---|---|
| Propósito | Reemplazar búsquedas en archivos/PDF por una web app mobile-first donde los datos operativos vivan en base de datos. |
| Alcance MVP (actual) | Login admin, clientes, vehículos, cotizaciones en borrador, aprobación → orden de trabajo, PWA foundation. |
| Fuente de verdad visual | Figma — ver [`DESIGN.md`](./DESIGN.md). |
| Fuente de verdad de dominio | `prisma/schema.prisma`, [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) y este README. |
| Hosting objetivo | Landing pública en `sebasam.com`; app operativa independiente en `app.sebasam.com`. |
| Rutas objetivo | `/` es el hub role-aware post-login; `/login` es el único login; `/admin` desaparece como namespace. Ver [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md#hosting-and-route-model). |
| Modelo de dominio | `Quote` y `WorkOrder` separados; cada orden de trabajo nace de una cotización aprobada, incluso para trabajo administrativo urgente. Esto difiere del repo hermano `sebasam`, donde `Cotización` es la entidad central que cambia de fase por estado. |
| Estado actual | Issues 1–7, 5.1 y 5.2 de [`docs/MVP_ISSUES.md`](./docs/MVP_ISSUES.md) completados; Issues 8–12 pendientes. Ver [`docs/MVP_STATUS.md`](./docs/MVP_STATUS.md). |

## Documentos del proyecto

- [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) — reglas de arquitectura, capas y dominio.
- [`docs/GITFLOW.md`](./docs/GITFLOW.md) — flujo de ramas y PRs.
- [`docs/AI_WORKFLOW.md`](./docs/AI_WORKFLOW.md) — protocolo de trabajo con asistentes de IA.
- [`docs/MVP_ISSUES.md`](./docs/MVP_ISSUES.md) — borrador de backlog del MVP (solo lectura; no mover ni renombrar).
- [`docs/MVP_STATUS.md`](./docs/MVP_STATUS.md) — comparación del estado actual contra los requisitos del MVP de los repos fuente.
- [`DESIGN.md`](./DESIGN.md) — sistema de diseño, tokens y componentes basado en Figma.

## Estado de implementación (resumen)

- [x] Setup del proyecto, Prisma + Supabase, login, sesión admin, perfiles/roles.
- [x] CRUD básico de clientes con búsqueda.
- [x] Entidad `Vehicle` vinculada a cliente; placas opcionales; snapshot en cotización.
- [x] Crear cotización borrador con ítems, totales calculados en servidor y validación Zod.
- [x] Aprobar cotización y crear `WorkOrder` transaccionalmente.
- [ ] Asignar `WorkOrder` y registrar ejecución.
- [ ] Finalizar `WorkOrder` y generar PDF/salida final.
- [ ] Verificar instalabilidad PWA.
- [ ] Pipeline de despliegue en Vercel.
- [ ] Localización completa a español de México.

---

## Quick path

1. Copy `.env.example` to `.env` and fill Supabase values.
2. Install dependencies with `pnpm install`.
3. Generate Prisma Client with `pnpm prisma:generate`.
4. Run locally with `pnpm dev`.

## Architecture rules

| Topic | Rule |
|-------|------|
| Stack | Next.js App Router, TypeScript strict, Tailwind, Prisma, Supabase Postgres/Auth/Storage, pnpm. |
| Data access | Use Prisma for operational business data. Do not query the same business tables through Supabase client helpers. |
| Auth | Use Supabase Auth for sessions. Store app roles and profile data in `UserProfile`. |
| Quotes and work orders | Every `WorkOrder` starts from one approved `Quote`. For urgent work, create and approve an administrative quote first. |
| Deploy discipline | `build` runs `prisma generate && next build`. Migrations are never hidden inside `next build`. |
| Repository | Keep this repository private. |
| Branching | Follow the pragmatic Gitflow in `docs/GITFLOW.md`. |

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

Future admin password management can become an app screen, but it must use Radix primitives and
Tailwind wrappers derived from the Figma design system instead of invented visual styling.

## Deploy pipeline

1. Set `DATABASE_URL`, `DIRECT_URL`, and Supabase public env vars in the deploy environment.
2. Run `pnpm db:migrate:deploy` as an explicit release step.
3. Run `pnpm build` to generate Prisma Client and build Next.js.
4. Start with `pnpm start` or the hosting platform equivalent.

## What not to do

- Do not commit `package-lock.json`; this project uses pnpm.
- Do not rename env vars away from `.env.example` without updating Prisma and Supabase helpers.
- Do not run `prisma migrate dev` in production.
- Do not add migrations to `next build`.
- Do not recreate the legacy schema wholesale.
- Do not implement the tokenized customer portal in the initial MVP.

## Reference

See:

- `docs/ARCHITECTURE.md` for the domain and layering rules.
- `docs/GITFLOW.md` for branch and PR workflow.
- `docs/AI_WORKFLOW.md` for AI assistant workflow, branch scope, commit discipline, and handoff rules.
- `docs/MVP_ISSUES.md` for the reviewable MVP issue backlog draft.
- `docs/MVP_STATUS.md` for the current gap analysis against the source MVP docs.
- `DESIGN.md` for the Figma-based design system.
