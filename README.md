# SEBASAM Operations App

New clean operational app for SEBASAM quotes, work orders, assignments, and execution records. The MVP target is an installable Android Chrome PWA, not an APK.

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
| `DIRECT_URL` | Supabase direct Postgres URL for Prisma CLI migrations. |
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
```

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
