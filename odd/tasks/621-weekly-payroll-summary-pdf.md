# Weekly Payroll Summary PDF

## Objective

Add a printable weekly payroll report that mirrors the supplied chronological matrix examples, with a Normal/Ajustada presentation selector and a separate fixed-pay helper section.

## Problem and Rationale

The existing payroll screen has per-worker totals and a separate signing sheet, but no printable weekly work-by-worker summary. The signing sheet is already implemented and is not a substitute for this report.

## Scope

- Issue #621: add a distinct weekly printable report for completed payroll work.
- Present each recorded work concept chronologically in its own row and worker allocations in columns, with row amounts and per-worker totals.
- Provide a Normal/Ajustada selector immediately before one print/PDF button.
- Keep report contents out of the on-screen view; show only the presentation selector and print action, while retaining the document in print output.
- Use subtle horizontal separators rather than a fully gridded table, following existing notes/quote print styling.
- Label the final per-worker half-total row `Pago`.
- Calculate `Pago` from the actual commission amounts; it must be identical in Normal and Ajustada, not computed as half of the Normal displayed base.
- Show the SEBASAM logo in the printable report header.
- Normal uses the existing payroll base presentation amounts.
- Ajustada is display-only: 40% items show 80% of their payroll base (so half of that display equals the 40% commission); 50% items remain at their base. Do not mutate stored data or payroll calculations.
- Include fixed-pay helpers separately at the end, matching the examples; preserve the existing signing sheet as a separate feature.

## Constraints

- Do not change persisted payroll values, commission logic, signing-sheet behavior, or unrelated routes.
- Preserve existing local/untracked work, especially `odd/tasks/note-filters-query-efficiency.md`.
- Work on the existing issue-specific branch. The branch name was observed as `bugfix/621-payroll-envelope-print-width` at session start and is now `fix/621-payroll-envelope-print-width` at the same HEAD; no branch restoration was performed.
- TDD mode: strict, explicitly selected by the user in this session. Test runner: Vitest via `pnpm exec vitest`; focused payroll command: `pnpm exec vitest run src/features/payroll/domain.test.ts src/features/payroll/components/payroll-components.test.tsx src/features/payroll/queries.test.ts`.
- Delivery strategy: `ask-on-risk`; expected authored diff is below the 400-line advisory budget, subject to actual diff.

## Tasks

- [x] P621-02 — Add a pure presentation transformation and chronological report document for the normal and adjusted matrices, including separate fixed-pay helpers. Route: delegated direct (mapping found 4+ relevant files and report requires multiple non-trivial files).
  - Acceptance: each commissionable work concept is a chronological row; adjusted values reflect the 40%/50% presentation rule; `Pago` sums actual item commissions and stays identical across modes; fixed-pay helpers appear separately; underlying payroll calculations are unchanged.
  - Checks: focused payroll domain/component tests passed under explicit strict-TDD authorization. Typecheck, lint, build, and diff check remain unrun pending user approval.
- [x] P621-03 — Refine the report's on-screen and print presentation while preserving the selector, print action, and separate signing sheet.
  - Acceptance: report content is hidden from the page view but renders when printing; the table uses subtle horizontal separators with no full cell grid; the report header includes the SEBASAM logo; final payment row reads `Pago`; the selector/action and existing signing-sheet/envelope behavior remain unchanged.
  - Checks: focused UI test and structural print-path readback under the current strict-TDD authorization.
- [ ] P621-04 — Complete the authorized issue #621 PR delivery after the native RDD gate.
  - Acceptance: use the approved issue, one conventional work-unit commit, the `develop` base, `Closes #621`, and exactly one `type:feature` label; record commit and PR evidence here.

## Progress and Evidence

- Issue #621 is OPEN and labeled `status:approved` and `type:feature`.
- The user explicitly authorized a PR to `pabcrz/sebasam-app` against `develop` using the current authenticated GitHub session, and chose issue #621 as the tracking issue. The issue was reopened with its existing approval/type labels preserved.
- Existing payroll source exposes per-item rate/base/commission, work-order completion timestamps, worker summaries, and fixed-pay helpers separately. The query currently orders completed work newest first; the printable report must sort ascending. Advances lack completion timestamps and need explicit treatment during implementation without silently misordering them.
- The fixed-pay helper table already exists in the app; the new PDF will include helpers in a separate closing section.
- Current branch is `fix/621-payroll-envelope-print-width` at `b65e499` tracking `origin/fix/621-payroll-envelope-print-width`; reflog confirms it was renamed from `bugfix/621-payroll-envelope-print-width` at the same HEAD during this session. No restoration was performed. An unrelated untracked notes task exists and must not be included in the candidate/commit.
- RDD effective state observed as on (default). No review assessment has been made for this work unit yet.
- Route/trigger: delegated direct because the report spans multiple non-trivial payroll files and the required read-to-write preparation covered 4+ files.
- Implemented `buildWeeklyPayrollPresentation` with one chronological row per commissionable work concept, stable within-order item order, separate worker totals, and rounded half-totals. The report UI has the Normal/Ajustada selector immediately before one print/PDF action and a separate closing fixed-pay helper table; fixed pay is not percentage-adjusted. Existing signing-sheet/envelope components were not edited.
- Strict TDD RED: focused Vitest command failed as expected at the new presentation test because `buildWeeklyPayrollPresentation` did not exist (1 failed, 52 passed).
- Strict TDD GREEN: `pnpm exec vitest run src/features/payroll/domain.test.ts src/features/payroll/components/payroll-components.test.tsx src/features/payroll/queries.test.ts` — 3 files passed, 54 tests passed.
- Correction RED: after adding a regression assertion for two commissionable items on one order (separate item rows and item-specific adjusted amounts), the same focused Vitest command failed at the expected row-count assertion (1 failed, 53 passed).
- Correction GREEN: after changing the presentation to emit one row per item, the same focused Vitest command passed — 3 files, 54 tests. The test also confirms chronological order, preserved within-order item order, item-level 40% adjusted totals, and aggregate worker/payment totals.
- Orders with no commissionable items produce no chronological rows because rows are derived from `order.items`; untimed advances remain excluded. No persisted payroll calculation/data or signing-sheet behavior was changed.
- Focused Vitest suite passes (3 files, 56 tests). `pnpm typecheck`, `pnpm lint`, `pnpm build`, `git diff --check`, and native RDD review have not been run. No commit or PR yet. The branch name changed as noted above; no branch restoration was performed.
- The user supplied three reference photos; fixed-pay helpers are displayed in a separate closing section using existing weekly-rate, absence, manual-commission, and payable fields.
- New user refinement: hide the report contents from the page view, use subtle horizontal print separators like notes/quotes, and change the final row label from `Mitad del total` to `Pago`.
- P621-03 strict-TDD RED: added a focused `WeeklyPayrollSummary` component test, then ran `pnpm exec vitest run src/features/payroll/domain.test.ts src/features/payroll/components/payroll-components.test.tsx src/features/payroll/queries.test.ts`. Expected failure: report article lacked `hidden print:block`; 1 failed, 54 passed across 3 files.
- P621-03 GREEN: article now uses `hidden print:block` (the existing print helper serializes its outerHTML); report tables use restrained horizontal row separators with no full cell borders; final half-total label is `Pago`. Selector and single print button remain screen-visible; calculations, fixed-pay content, signing sheet, and envelope were not changed.
- P621-03 focused test passed with the same exact command: 3 files passed, 55 tests passed. The running local dev server was left untouched.
- User corrected the `Pago` interpretation: it must show actual commissions, not half the displayed total. For a 40% item with base $1,000, Normal displays $1,000 and Ajustada $800, while both show Pago $400. The previous implementation derived `Pago` from half of presentation totals; it was corrected to use each item's existing `commissionCents` without changing payroll calculations.
- New user refinement: add the SEBASAM logo to the report header.
- Correction strict-TDD RED: added domain assertions for independent Normal/Ajustada presentation totals and identical actual-commission totals, including an actual 50% worker payment ($500), plus a component regression that checks `Pago` values of $400 and $500 in both modes. The authorized command failed as expected: 2 tests failed, 53 passed (55 total); the domain value was absent and the component showed the incorrect $500 instead of $400 for the 40% worker.
- Correction implementation: renamed `workerHalfTotalsCents` to `workerPaymentCents`, accumulated each item's existing `commissionCents` independently from presentation totals, and rendered the `Pago` row from those actual commissions. No commission calculation or fixed-pay behavior changed.
- Correction GREEN: first post-implementation run found only a test-query ambiguity (`$800.00` occurs in multiple printed cells): 1 failed, 54 passed. Updated the assertion to allow those expected repeated cells, then reran the exact authorized command successfully: 3 files passed, 55 tests passed. Domain assertions prove Normal $300,000 vs Ajustada $260,000 presentation totals while payment remains $130,000 (including the 40%/$1,000-base item at $40,000 actual commission); the component proves payments of $400 and $500 remain identical across modes while the 40% display changes from $1,000 to $800 and the 50% display remains $1,000.
- No typecheck, lint, build, diff-check, or native review has been run. The authorized files are staged for the requested commit; the unrelated notes task is not staged. No commit or PR yet.
- P621-03 logo strict-TDD RED: added a focused header test and ran the authorized command `pnpm exec vitest run src/features/payroll/domain.test.ts src/features/payroll/components/payroll-components.test.tsx src/features/payroll/queries.test.ts`. Expected failure: logo alt text was absent; 1 failed, 55 passed (56 total) across 3 files.
- P621-03 logo implementation: added the compact `/logo-white-short.png` Next Image with `Logo de SEBASAM` alt text and `object-contain invert` beside the report title. The changes are confined to the print-only report header. The first post-implementation run exposed Next Image's optimized `src` representation and an existing signing-sheet assertion made ambiguous by both report and signing logos; assertions were narrowed to source encoding/dimensions and signing-logo dimensions.
- P621-03 logo GREEN: the exact authorized command passed — 3 files passed, 56 tests passed (25 domain, 24 component, 7 query). No other checks were run. The local dev server on port 3000 was left untouched; no commit, staging, branch/worktree change, push, or PR.

## Next Step

Run the required committed-only RDD assessment and follow its exact transition. Then commit/push the authorized work and open the #621 PR against `develop`; record the identities here. Preserve the unrelated untracked notes task.
