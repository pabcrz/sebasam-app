# Production release runbook

GitHub Actions is the production release authority. It applies reviewed, versioned
Prisma SQL migrations before it triggers Vercel; Vercel must not automatically
deploy production from `main`.

## Manual configuration

### Quote retention cron

The repository declares daily execution of `/api/cron/quote-retention` at
`0 0 * * *` (UTC) in [`vercel.json`](../vercel.json). **Whether the cron is enabled
and actually runs in deployed production was not verified here.** Archive/trash
policy, protected dependencies and restoration belong to the
[quotation chapter](./product-guide/quotes-work-orders-notes.md#retención-y-restauración);
the implemented handler is [route.ts](../src/app/api/cron/quote-retention/route.ts).
The route fails closed unless
the request includes the Vercel cron authorization header matching `CRON_SECRET`.
Add `CRON_SECRET` as a Vercel project environment variable for Production (and
Preview only when scheduled processing is intentionally enabled there); use a
high-entropy value and keep it out of source control, logs, and build output.
Vercel supplies the cron authorization header from that configured value. After
configuration, verify the cron is enabled for the intended deployment and monitor
the route's success/failure logs. Do not manually invoke it against a production
database as part of local development.

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
   [`vercel.json`](../vercel.json) disables automatic Git deployments for all
   branches except `develop`; `main` is explicitly disabled.

This policy is mandatory: automatic Vercel deployment from `main` and GitHub
Actions can otherwise race, allowing application code to reach production before
its required database migration completes.

## Release sequence

1. A maintainer selects the `main` branch and starts `Production Release` with
   `workflow_dispatch`. Starting it is the explicit human approval for that
   production release; pushes to `main` never start it.
2. The workflow rejects any dispatch that is not from `main`, then always runs
   `prisma validate`, `pnpm db:migrate:deploy`, and a final `prisma migrate
   status` for the release revision. This applies any pending committed migration
   even when the selected `main` revision did not modify `prisma/migrations/`.
3. `pnpm db:migrate:deploy` applies only committed SQL files under
   `prisma/migrations/`; it does not apply `schema.prisma` by itself.
4. Only after that job succeeds, the deploy job checks out the exact
   `${{ github.sha }}` release revision and runs the official Vercel CLI in
   noninteractive production mode: `vercel deploy --prod --yes`.
5. The CLI receives `VERCEL_TOKEN`, `VERCEL_PROJECT_ID`, and `VERCEL_ORG_ID`.
   The workflow maps the existing `VERCEL_TEAM_ID` GitHub Environment secret to
   `VERCEL_ORG_ID`; no additional secret is required. A CLI failure fails the
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
- [ ] `vercel.json` disables automatic Git deployments for every branch except `develop`; `main` is explicitly disabled.

See [`DATABASE_SAFETY.md`](./DATABASE_SAFETY.md) for the supported backup command
and its coverage boundary.

## Incident runbook

If validation, migration deployment, final migration status, or Vercel CLI
deployment fails:

1. Stop promotion: do not re-run the workflow and do not trigger Vercel manually.
2. Preserve the GitHub Actions logs and identify the release commit, migration
   name, database state, and the Vercel CLI failure output.
3. Diagnose manually with the approved database-access procedure and the verified
   backup evidence. Escalate before any database-changing action.
4. Resume only through an explicitly reviewed and approved release decision.

Do not automate or perform a destructive retry, reset, rollback, restore, or
`prisma migrate resolve` from this workflow or as an incident shortcut. The
workflow's rollback boundary ends before database recovery: recovery requires a
separate, manually approved incident plan.
