# Payroll Envelope Print Width

## Objective

Keep the individual payroll envelope within a safe printable width by reducing its total width by approximately 1 cm and distributing the space equally across the left and right sides.

## Problem and Rationale

The printed envelope is too close to the horizontal print boundary, causing content to risk clipping or overflowing. The existing compact three-column layout must remain readable without changing payroll calculations.

## Scope

- Issue #621: retain the compact payroll-envelope presentation already present locally.
- Reduce the printable envelope width from 8.9 cm to approximately 7.9 cm.
- Apply the same printable dimensions to the dedicated print document and modal preview.
- Preserve the same three visible columns: Mano de Obra, %, and A Cobrar.
- Verify the document and modal render paths.

## Constraints

- Do not change payroll data, calculations, or totals.
- Keep the existing user changes limited to the payroll envelope and its focused component tests.
- Work from an issue-specific branch based on `develop`.
- TDD mode: unknown; run focused functional tests and standard app checks.

## Tasks

- [x] P621-01 — Move the existing compact-envelope work to an issue-specific branch, reduce print width by 1 cm, and align both render paths. Route: delegated direct (three source/test files; writer trigger).
  - Acceptance: printed and preview envelope use the same safe width; no column or calculation changes beyond the existing compact presentation.
  - Checks: focused Payroll UI Vitest test, `pnpm typecheck`, `pnpm lint`, `git diff --check`.
  - Commit evidence: `fix(payroll): reduce envelope print width` work-unit commit; SHA recorded in delivery.

## Progress and Evidence

- Issue #621 was reopened on 2026-09-26 with its existing `status:approved` and `type:feature` labels preserved.
- Delivery strategy: ask-on-risk; this task is expected to remain below the 400-line advisory threshold.
- Running authored line count: 13 lines (9 additions, 4 deletions) across the three source/test files; under the 400-line advisory budget.
- P621-01 completed on `bugfix/621-payroll-envelope-print-width`, created from `origin/develop`; the intentional compact-envelope changes were carried from the prior branch.
- Route/trigger: delegated direct writer for issue #621.
- `pnpm exec vitest run src/features/payroll/components/payroll-components.test.tsx`: passed (1 file, 21 tests).
- `pnpm typecheck`: passed.
- `pnpm lint`: passed.
- `git diff --check`: passed.
- Receipt-driven assessment: medium risk, 61 changed lines, `review_due=false` (`under_budget`) against `origin/develop`; the unrelated untracked notes task was explicitly excluded from the candidate inventory.

## Next Step

No remaining implementation work. Preserve `odd/tasks/note-filters-query-efficiency.md` as untracked and outside this commit.
