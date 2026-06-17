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

## MVP boundaries

The initial target is an installable PWA for Android Chrome. APK packaging and tokenized customer portals are intentionally out of scope.
