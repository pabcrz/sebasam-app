# Release 2026-10-01 Readiness Fixes and Closeout

## Objective
Track seven local readiness fixes separately from the existing five-child release chain, then close the release through its dependency order without mixing scopes or bypassing required checks/reviews.

## Scope and decisions
- Repository: `github.com/pabcrz/sebasam-app`.
- Worktree: the selected release worktree for this repository.
- Current branch: `fix/release-2026-10-01-05-ui`; PR #731 is the fifth child in the 2026-10-01 feature branch chain.
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
- Created and read back [issue #748](https://github.com/pabcrz/sebasam-app/issues/748), `bug: close release readiness gaps in selected 2026-10-01 candidate`, with labels `type:bug` and, after exact user authorization, `status:approved`.

### RC-02 — Prepare a dedicated issue-backed child PR
- Status: done.
- Issue #748 is open and approved with `type:bug` and `status:approved`.
- Created child branch `fix/748-release-readiness` from PR #731 head `85f8d4016e75d42340998d7b04586202d1a6d21d`; pushed to origin.
- Work-unit commit: `fa612bf9287a93e3467be838cbe57656934e44a4` (`fix(release): close selected-candidate readiness gaps`). Task evidence recorded in follow-up docs commit `45032f2`.
- Independent checks: focused Vitest 4 files / 122 tests passed; `pnpm typecheck` passed; `pnpm lint` passed with two unused-variable warnings in `src/features/work-orders/components/nota-detail-dialog.tsx`; `git diff --check` passed.
- Native ASSESS on the code commit against #731 head reported medium risk, 170 changed lines, RDD on, `reviewDue: false` (`under_budget`); plan records writer self-verification, no independent verifier. No review lineage was started.
- Created and read back draft PR #749: https://github.com/pabcrz/sebasam-app/pull/749, `Closes #748`, base PR #731, exactly one `type:bug` label.

### RC-03 — Validate and integrate the existing release chain
- Status: in progress.
- Chain order: #719 → #728 → #729 → #730 → #731 → #749. #749 merged into #731; #731 merged into #730; #730 merged into #729; #729 merged into #728.
- Completed merge commits: #749 `1d7e0afdee46bb666561071091a6c35a7105d651`; #731 `f1be34987691b1435d35194f1ab82af75eb98e61`; #730 `3b0b4ecfb1e57031ec98e3e27b5997273ebfb84a`; #729 `563535e2ca82e8f9d1be092644a3c3f0b810fdad`.
- Current step: #728 is open/draft; verify its checks after the #729 merge. If green, mark ready and integrate #728 into #719, then #719 into the release tracker branch.
- At last protection check, chain-base branches were unprotected, `main` required zero approvals and no status checks, and PRs through #729 had successful Vercel/Preview Comments checks. Verify each updated parent PR's checks after every child merge; never bypass a failed/pending status.
- `release/2026-10-01` and `main` both pointed to `c67722a67f815ccdef4838d8fc1e7646a3804a8c`; no tracker PR exists and an empty tracker PR cannot yet be created. Create the release-to-main tracker PR after the child chain updates the release branch.

### RC-04 — Complete production release gate
- Status: pending.
- Vercel Production Supabase ref `hulvyebgganhuraszpjb`; Preview ref `ytcpqwqcqnvkqbpddevt`. Each environment's `DATABASE_URL` and `DIRECT_URL` refs match its `NEXT_PUBLIC_SUPABASE_URL`.
- Production public schema/data backup created from Production `DIRECT_URL` via PostgreSQL 17.11 `pg_dump` at the user-selected Drive backup destination in `sebasam-public-2026-10-28T08-25-43-964Z`. Independent verification confirmed nonempty SQL files, both SHA256 checksums, and exactly four expected files. No restore test or Google Drive remote-sync confirmation; Auth and Storage excluded.
- Playwright CLI 0.1.22 installed globally for this macOS user, skill in `~/.agents/skills/playwright-cli`. Production `/admin/login` rendered at 375×812 with no console errors/warnings; no authenticated routes tested.
- After the chain is integrated and the tracker PR is merged to `main`, inspect production migration status/configuration and promote only through the documented GitHub `Production Release` workflow from `main`. User authorized completing this release flow; no workflow dispatch has occurred.

## Verification evidence
- Work-unit commit: `fa612bf9287a93e3467be838cbe57656934e44a4` (`fix(release): close selected-candidate readiness gaps`).
- Focused combined candidate tests: 4 files / 122 tests passed.
- User-reported full UI suite: 202 files passed, 3 skipped; 1,666 tests passed, 30 skipped.
- User-reported lint: 0 errors, 2 warnings in `nota-detail-dialog.tsx`; typecheck emitted no diagnostics; production build exited 0.
- `git diff --check` passed for the readiness candidate.
- Production browser smoke: `/admin/login`, 375×812, no console errors/warnings. Authenticated flows remain unverified.
- Production public backup checksums independently passed. Restore and cloud-sync completion remain unverified.

## Current repository state
- Parent PR #731 head/base: `85f8d4016e75d42340998d7b04586202d1a6d21d` / `feat/release-2026-10-01-04-rls`.
- Readiness work-unit commit `fa612bf9287a93e3467be838cbe57656934e44a4` is in PR #749; task evidence doc commit `45032f2` and follow-up `d6e3051` are on the child branch.
- PR #749 was merged into #731's head as `1d7e0afdee46bb666561071091a6c35a7105d651`; PR #731 was merged into #730's head as `f1be34987691b1435d35194f1ab82af75eb98e61`.
- #729 merged into PR #728 head as `563535e2ca82e8f9d1be092644a3c3f0b810fdad`.
- Current local branch is `feat/release-2026-10-01-02-404` at PR #728 head `563535e2ca82e8f9d1be092644a3c3f0b810fdad`.
- The task record is modified locally for RC-03 progress; it is not yet committed/pushed. No production release dispatch has occurred.
- Empty partial directory from failed PostgreSQL 16 attempt remains at the user-selected Drive backup destination as `sebasam-public-2026-10-28T08-24-40-673Z`; preserve it.
