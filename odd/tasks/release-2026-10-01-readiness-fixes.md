# Release 2026-10-01 Readiness Fixes and Closeout

## Objective
Track seven local readiness fixes separately from the existing five-child release chain, then close the release through its dependency order without mixing scopes or bypassing required checks/reviews.

## Scope and decisions
- Repository: `github.com/pabcrz/sebasam-app`.
- Worktree: the selected release worktree for this repository.
- Initial implementation branch: `fix/release-2026-10-01-05-ui`; PR #731 was the fifth child in the 2026-10-01 feature branch chain. Final candidate was merged to `main` as `245d05a4cafeb51126ce16d5f7b99c831a3fa516` and deployed through the documented workflow.
- User selected a separate issue and PR for the seven local readiness fixes. Do not add them to PR #731, whose stated scope is customer overflow, action icon sizing, and duplicate payment-dialog printing.
- User authorized issue creation and explicitly authorized applying protected `status:approved` to exact issue #748.
- Preserve the selected older snapshot; exclude PR #721 and #722–#727 from the original candidate.
- Preserve old and new partial backup directories; do not delete them without user direction.

## Existing readiness changes
1. `src/features/quotes/actions.ts` and `src/features/quotes/actions.test.ts`: revoke active shared links when archiving standalone SALE Notes; preserve payment records and WORK-note behavior.
2. `src/app/admin/(protected)/notas/[id]/print/not-found.test.tsx` and `src/features/public-quotes/components/shared-quote-error-state.test.tsx`: align stale 404 assertions with branded recovery UI.
3. `src/features/payroll/components/payroll-signing-sheet-document.tsx` and `src/features/payroll/components/payroll-components.test.tsx`: render fixed-pay helpers in printable signing sheets.
4. `docs/PRODUCTION_RELEASE.md`: align automatic deployment documentation with `vercel.json`.

## Tasks

### RC-01 — Create and approve the readiness issue
- Status: done.
- Duplicate search covered all open and closed GitHub issues. No exact duplicate found. Related issues were distinguished: #603 is action-button layout; #707 is the 404 experience implementation; #491 covers fixed-pay helpers in payroll/Excel, not the signing-sheet print gap.
- Created and read back [issue #748](https://github.com/pabcrz/sebasam-app/issues/748), `bug: close release readiness gaps in selected 2026-10-01 candidate`, with labels `type:bug` and, after exact user authorization, `status:approved`. Issue #748 was closed by merged release tracker PR #750.

### RC-02 — Prepare a dedicated issue-backed child PR
- Status: done.
- Issue #748 is open and approved with `type:bug` and `status:approved`.
- Created child branch `fix/748-release-readiness` from PR #731 head `85f8d4016e75d42340998d7b04586202d1a6d21d`; pushed to origin.
- Work-unit commit: `fa612bf9287a93e3467be838cbe57656934e44a4` (`fix(release): close selected-candidate readiness gaps`). Task evidence recorded in follow-up docs commit `45032f2`.
- Independent checks: focused Vitest 4 files / 122 tests passed; `pnpm typecheck` passed; `pnpm lint` passed with two unused-variable warnings in `src/features/work-orders/components/nota-detail-dialog.tsx`; `git diff --check` passed.
- Native ASSESS on the code commit against #731 head reported medium risk, 170 changed lines, RDD on, `reviewDue: false` (`under_budget`); plan records writer self-verification, no independent verifier. No review lineage was started.
- Created PR #749: https://github.com/pabcrz/sebasam-app/pull/749, `Closes #748`, base PR #731, exactly one `type:bug` label. PR #749 merged into #731 as `1d7e0afdee46bb666561071091a6c35a7105d651`.

### RC-03 — Validate and integrate the existing release chain
- Status: done.
- Chain order integrated: #749 → #731 → #730 → #729 → #728 → #719 → `release/2026-10-01`.
- Completed merge commits: #749 `1d7e0afdee46bb666561071091a6c35a7105d651`; #731 `f1be34987691b1435d35194f1ab82af75eb98e61`; #730 `3b0b4ecfb1e57031ec98e3e27b5997273ebfb84a`; #729 `563535e2ca82e8f9d1be092644a3c3f0b810fdad`; #728 `c880fb246e04dfa21e38fac21851f2e266db5328`; #719 `2743be8804a7a01bd13ad6124af40bad2b184420`.
- Each child PR was marked ready only after Vercel and Vercel Preview Comments passed; the chain was merged with normal merge commits. Tracker PR #750 was separately checked, marked ready, and merged to `main` after exact user authorization.
- At the pre-merge protection check, chain-base branches were unprotected and `main` required zero approvals and no status checks. Checks were verified after each parent update; no failed or pending check was bypassed.
- Tracker PR #750: https://github.com/pabcrz/sebasam-app/pull/750, base `main`, head `release/2026-10-01`, labels `type:chore` and explicitly authorized `size:exception`; merged as `245d05a4cafeb51126ce16d5f7b99c831a3fa516`.

### RC-04 — Complete production release gate
- Status: done.
- Vercel Production Supabase ref `hulvyebgganhuraszpjb`; Preview ref `ytcpqwqcqnvkqbpddevt`. Each environment's `DATABASE_URL` and `DIRECT_URL` refs match its `NEXT_PUBLIC_SUPABASE_URL`.
- Production public schema/data backup created from Production `DIRECT_URL` via PostgreSQL 17.11 `pg_dump` at the user-selected Drive backup destination in `sebasam-public-2026-10-28T08-25-43-964Z`. Independent verification confirmed nonempty SQL files, both SHA256 checksums, and exactly four expected files. No restore test or Google Drive remote-sync confirmation; Auth and Storage excluded.
- Playwright CLI 0.1.22 installed globally for this macOS user, skill in `~/.agents/skills/playwright-cli`. Post-release `/admin/login` smoke at 375×812 showed the login form, with 0 console errors and 0 warnings; no credentials were entered, and authenticated routes remain untested.
- PR #750 merged to `main` as `245d05a4cafeb51126ce16d5f7b99c831a3fa516`. GitHub Environment `Production` was confirmed to contain the required secret names (`DATABASE_URL`, `DIRECT_URL`, `VERCEL_PROJECT_ID`, `VERCEL_TEAM_ID`, `VERCEL_TOKEN`) and restrict deployment to `main`; no secret values were read.
- User explicitly authorized one `workflow_dispatch` of `Production Release` from `main`. Run #41025543318 completed successfully at the exact SHA: Prisma validation, `db:migrate:deploy`, final `prisma migrate status`, and production Vercel deployment all passed. Deployment ID `CPw7JF2aTRRbU9djtutwe4GsxUPK`; site https://app.sebasam.online.

## Verification evidence
- Work-unit commit: `fa612bf9287a93e3467be838cbe57656934e44a4` (`fix(release): close selected-candidate readiness gaps`).
- Focused combined candidate tests: 4 files / 122 tests passed.
- User-reported full UI suite: 202 files passed, 3 skipped; 1,666 tests passed, 30 skipped.
- User-reported lint: 0 errors, 2 warnings in `nota-detail-dialog.tsx`; typecheck emitted no diagnostics; production build exited 0.
- `git diff --check` passed for the readiness candidate.
- Post-release browser smoke: `/admin/login`, 375×812, form visible, 0 console errors and 0 warnings. Authenticated flows remain unverified.
- Production public backup checksums independently passed. Restore and Google Drive cloud-sync completion remain unverified; Auth and Storage exports were out of scope.

## Current repository state
- Parent PR #731 head/base: `85f8d4016e75d42340998d7b04586202d1a6d21d` / `feat/release-2026-10-01-04-rls`.
- Readiness work-unit commit `fa612bf9287a93e3467be838cbe57656934e44a4` is in PR #749; task evidence doc commit `45032f2` and follow-up `d6e3051` are on the child branch.
- PR #749 was merged into #731's head as `1d7e0afdee46bb666561071091a6c35a7105d651`; PR #731 was merged into #730's head as `f1be34987691b1435d35194f1ab82af75eb98e61`.
- #729 merged into PR #728 head as `563535e2ca82e8f9d1be092644a3c3f0b810fdad`; #728 merged into PR #719 head as `c880fb246e04dfa21e38fac21851f2e266db5328`.
- PR #719 merged to `release/2026-10-01` as `2743be8804a7a01bd13ad6124af40bad2b184420`; local branch `release/2026-10-01` is fast-forwarded to that commit.
- Release tracker PR #750 merged at `245d05a4cafeb51126ce16d5f7b99c831a3fa516`; GitHub Actions Production Release run #41025543318 completed successfully at that SHA.
- Local branch `docs/release-2026-10-01-closeout` is based on the deployed `main` commit and contains this final task-record update. No secrets were read; no manual production migrations were run.
- Empty partial directory from failed PostgreSQL 16 attempt remains at the user-selected Drive backup destination as `sebasam-public-2026-10-28T08-24-40-673Z`; preserve it.
