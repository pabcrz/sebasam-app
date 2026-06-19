# SEBASAM Operations Architecture

This app is the clean operational core for SEBASAM. It manages customers, quotes, work orders, worker assignments, and execution records without carrying legacy schema or workflow debt.

## Core rules

| Area | Rule |
|------|------|
| Business data | Prisma is the only data-access layer for operational records. Do not mix Supabase client queries with Prisma for the same tables. |
| Auth | Supabase Auth owns identity. App roles live in `UserProfile`. |
| Quote to work order | A `WorkOrder` must reference exactly one approved `Quote`. Urgent or already-done work still starts from an administrative approved quote. |
| Database URLs | Runtime uses `DATABASE_URL` with the pooled Supabase URL. Migrations use `DIRECT_URL`. |
| Deployment | `next build` may generate Prisma Client, but migrations run only through `db:migrate:deploy`. |

## Feature layout

Feature folders group input schemas, server actions, and read queries:

- `src/features/customers`
- `src/features/quotes`
- `src/features/work-orders`

Shared infrastructure stays in `src/lib`, currently Prisma and Supabase helpers.

## Auth and app roles

Supabase Auth identity is linked to `UserProfile.id` by the Auth user UUID. Login uses the
internal email derived from the visible username, but authorization always checks the Prisma
profile role. Access roles are `ADMIN`, `ADMIN_ASSISTANT`, and `WORKER`; worker labor
classification is stored separately as nullable `workerKind` (`MASTER` or `HELPER`).

Internal staff passwords are controlled by admins, not public sign-up. Use server-only service
role tooling for Auth user creation/reset until the future admin screen exists.

## Hosting and route model

`sebasam.com` belongs to the public landing project. This operational app runs on
`app.sebasam.com` as a separate deployment, without a Next.js `basePath` or shared subpath
proxy.

The app uses one login and role-aware routing. The root `/` is the post-login hub; it renders
or redirects based on `UserProfile.role`. The `/admin` namespace is intentionally avoided:
administrative features use semantic routes, and access is enforced by role guards in the
server layer instead of by URL prefix.

Target route map:

| Route | Role | Purpose |
|---|---|---|
| `/` | `ADMIN`, `ADMIN_ASSISTANT`, `WORKER` | Role-aware home hub after login. |
| `/login` | Public | Single staff login. |
| `/cotizacion` | `ADMIN`, `ADMIN_ASSISTANT` | Quote list and creation. |
| `/cotizacion/[id]` | `ADMIN`, `ADMIN_ASSISTANT` | Quote detail and editing. |
| `/cliente` | `ADMIN`, `ADMIN_ASSISTANT` | Customer list and creation. |
| `/cliente/[id]` | `ADMIN`, `ADMIN_ASSISTANT` | Customer detail and editing. |
| `/trabajador` | `ADMIN`, `ADMIN_ASSISTANT` | Workshop team management. |
| `/trabajador/[id]` | `ADMIN`, `ADMIN_ASSISTANT` | Worker detail. |
| `/nomina` | `ADMIN`, `ADMIN_ASSISTANT` | Weekly payroll. |
| `/mis-trabajos` | `WORKER` | Assigned work for the signed-in worker. |
| `/mi-nomina` | `WORKER` | Own estimated payroll. |
| `/trabajo/[id]` | Role-scoped | Work detail with role-specific visibility. |
| `/c/[token]` | Public customer token | Future tokenized customer portal. |

Route slugs use singular Spanish without accents (`cotizacion`, `nomina`) to keep URLs stable
and ASCII-only.

## UI source of truth

Figma is the source of truth for final screens and components. Technical issues may add neutral
functional UI only. Future UI implementation should use Radix primitives for behavior/accessibility
and Tailwind wrappers that encode the Figma design system.

## MVP boundaries

The initial target is an installable PWA for Android Chrome. APK packaging and tokenized customer portals are intentionally out of scope.
