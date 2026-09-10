# Production release runbook

GitHub Actions is the production release authority. It applies reviewed, versioned
Prisma SQL migrations before it triggers Vercel; Vercel must not automatically
deploy production from `main`.

## Manual configuration

### GitHub Environment

Create a GitHub Environment named `production` and configure it before enabling
the workflow.

| Setting | Required configuration |
| --- | --- |
| Deployment branches | Restrict to the protected `main` branch. |
| Human approval | Required reviewers are unavailable for this private repository and plan. Starting `Production Release` with `workflow_dispatch` from `main` is the explicit human approval to promote to production. |
| Secrets | Add `DATABASE_URL`, `DIRECT_URL`, `VERCEL_TOKEN`, `VERCEL_PROJECT_ID`, and `VERCEL_TEAM_ID`. |

Keep these values only in the `production` Environment. Do not create repository
secrets for them and do not expose them to pull-request workflows.

### Vercel

1. Connect the Vercel project to this GitHub repository.
2. Store the Vercel project ID and owning team ID as the `VERCEL_PROJECT_ID` and
   `VERCEL_TEAM_ID` secrets in the GitHub `production` Environment.
3. Create `VERCEL_TOKEN` as a `production` Environment secret. It must be able
   to create deployments and read their status for that project; never print or
   store its value outside the Environment secret.
4. Do not change Git deployment settings in the Vercel dashboard. The repository
   [`vercel.json`](../vercel.json) disables automatic Git deployments only for
   `main`; preview deployments from other branches remain enabled.

This policy is mandatory: automatic Vercel deployment from `main` and GitHub
Actions can otherwise race, allowing application code to reach production before
its required database migration completes.

## Release sequence

1. A maintainer selects the `main` branch and starts `Production Release` with
   `workflow_dispatch`. Starting it is the explicit human approval for that
   production release; pushes to `main` never start it.
2. The workflow rejects any dispatch that is not from `main`, then always runs
   `prisma validate`, `prisma migrate status`,
   `pnpm db:migrate:deploy`, and a final `prisma migrate status` for the release
   revision. This applies any pending committed migration even when the selected
   `main` revision did not modify `prisma/migrations/`.
3. `pnpm db:migrate:deploy` applies only committed SQL files under
   `prisma/migrations/`; it does not apply `schema.prisma` by itself.
4. Only after that job succeeds, the workflow calls Vercel API v13 to create a
   production deployment with the
   GitHub repository ID and the exact `${{ github.sha }}` release revision.
5. The workflow records the returned Vercel deployment ID and polls its
   `readyState`. It succeeds only when Vercel reports `READY`; `ERROR`,
   `CANCELED`, `BLOCKED`, an API failure, or a five-minute timeout fails the
   release.

Concurrent releases are serialized. An in-progress release is never cancelled.

## Pre-release checklist

- [ ] The release is from protected `main` and its Prisma migrations were reviewed.
- [ ] A recent, verified `public` backup exists outside the workstation.
- [ ] The backup has `public-schema.sql`, `public-data.sql`, `manifest.json`, and
  `SHA256SUMS`, with non-empty files and verified checksums.
- [ ] Supabase Auth and Storage exports were completed separately when they are in scope.
- [ ] A maintainer explicitly approved the production release by dispatching the
  workflow from `main`.
- [ ] `VERCEL_TOKEN`, `VERCEL_PROJECT_ID`, and `VERCEL_TEAM_ID` are configured
  only in the `production` Environment.
- [ ] `vercel.json` disables automatic Git deployment only for `main`.

See [`DATABASE_SAFETY.md`](./DATABASE_SAFETY.md) for the supported backup command
and its coverage boundary.

## Incident runbook

If validation, migration status, migration deployment, Vercel deployment
creation, or Vercel readiness polling fails:

1. Stop promotion: do not re-run the workflow and do not trigger Vercel manually.
2. Preserve the GitHub Actions logs and identify the release commit, migration
   name, database state, Vercel deployment ID, and final or last observed
   `readyState`.
3. Diagnose manually with the approved database-access procedure and the verified
   backup evidence. Escalate before any database-changing action.
4. Resume only through an explicitly reviewed and approved release decision.

Do not automate or perform a destructive retry, reset, rollback, restore, or
`prisma migrate resolve` from this workflow or as an incident shortcut. The
workflow's rollback boundary ends before database recovery: recovery requires a
separate, manually approved incident plan.
