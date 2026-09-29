# Action Icon Sizing Consistency — Issue #710

## Objective

Use visually consistent 20×20 icons for comparable action buttons in quote, work-order, and note cards while preserving all existing button dimensions and action behavior.

## Problem and Rationale

The supplied screenshot shows same-sized action buttons with icons at different sizes: edit at 24×24, print at 16×16, and share/more at 20×20. The component implementations confirm these values. The edit glyph looks oversized while the print glyph looks undersized beside the other actions.

## Scope

- Normalize icon-only edit/correction triggers to 20×20.
- Normalize print icons in quote, active work-order, and completed-note action tiles to 20×20.
- Keep share and overflow icons at 20×20.
- Preserve button dimensions, labels/accessibility, variants, action order, and all behavior.
- Add focused regression assertions for the affected action presentations.

## Constraints

- GitHub issue: [#710](https://github.com/pabcrz/sebasam-app/issues/710).
- Worktree: `/Users/pabcrz/Dev/sebasam/sebasam-app-worktrees/feature-710-icon-sizing`.
- Branch: `feature/710-icon-sizing`, based on `origin/develop` at `ef452bd`.
- Preserve the original checkout and its unrelated untracked task documents.
- One delegated writer for the multi-file implementation; no parallel writers.
- TDD mode: strict, from the active project testing-capabilities record (`sdd/sebasam-app/testing-capabilities`, Engram observation #2374); runner: `pnpm test:ui` (Vitest).
- Applicable checks: focused Vitest coverage, `pnpm lint`, and `pnpm typecheck`; runtime harness: N/A (presentational CSS class sizing only).

## Authorized Scope

Only the issue #710 icon-size correction and its focused tests/task evidence are authorized. Do not redesign cards, resize buttons, alter action hierarchy, or change non-card icon sizing.

## Tasks

- [x] **710-1 — Normalize action icon dimensions** (route: delegated direct; trigger: implementation affects multiple non-trivial UI components and tests). Added regression assertions, observed RED, updated the affected components to 20×20, then observed GREEN; no refactor was needed.

## Acceptance Criteria

- Comparable edit/correction, print, share, and overflow card-action icons render with `h-5 w-5` (20×20).
- Existing button dimensions and behavior remain unchanged.
- Focused tests prove the 20×20 classes for the affected cards/actions.
- Applicable lint and typecheck pass.

## Progress and Evidence

- Issue #710 created and verified OPEN with `type:bug`.
- Clean worktree is based at `ef452bd35495fe701d1c380806f60294b8cf4464`, matching `origin/develop`; branch: `feature/710-icon-sizing`.
- CodeGraph mapping confirmed icon-only edit/correction used `h-6 w-6`, compact-card print used `h-4 w-4`, and share/overflow already used `h-5 w-5`.
- TDD mode: strict; source: active testing-capabilities record `sdd/sebasam-app/testing-capabilities` (Engram observation #2374); runner: Vitest 4.
- RED: `pnpm exec vitest run src/features/quotes/components/quote-mobile-card.test.tsx src/features/work-orders/components/work-order-active-list.test.tsx src/features/work-orders/components/work-order-completed-list.test.tsx` — after local offline install and `pnpm exec prisma generate`, 4 expected icon-sizing assertions failed (38 passed); observed old `h-6 w-6` edit/correction and `h-4 w-4` print classes.
- GREEN: same focused Vitest command — 3 files passed, 42 tests passed.
- Lint: `pnpm lint -- src/features/quotes/components/quote-builder-dialog.tsx src/features/quotes/components/quote-mobile-card.tsx src/features/work-orders/components/work-order-active-list.tsx src/features/work-orders/components/work-order-completed-list.tsx src/features/quotes/components/quote-mobile-card.test.tsx src/features/work-orders/components/work-order-active-list.test.tsx src/features/work-orders/components/work-order-completed-list.test.tsx` — passed.
- Typecheck: `pnpm typecheck` — passed.
- Runtime harness: N/A — presentational CSS class sizing only.
- Commit: pending.
- Rollback boundary: revert the single issue #710 work-unit commit; it only contains the four icon sizing changes, their three focused regression suites, and this task evidence.

## Next Step

Create the single conventional work-unit commit, then record its final hash in this task document and report the exact updated text for the parent Engram mirror.
