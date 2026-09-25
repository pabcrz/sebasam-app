# Notes Card Preview — Issue #688

## Objective
Make selecting a Notes card open the document preview and keep payment actions and payment details accessible from the card's actions menu.

## Problem
The current Notes card click behavior prioritizes payment details, while users need to inspect the note and its concepts. This differs from Quotes and active Work Orders, whose cards open a preview.

## Why
Align the primary card interaction with the document-oriented task users expect while preserving the existing payment workflows as secondary actions.

## Scope and constraints
- Authorized issue: GitHub issue #688.
- Work only in `odd/tasks/notes-card-preview.md`'s repository worktree on branch `feature/688-notes-card-preview`.
- Clicking the note card body opens the note preview with document concepts.
- Keep payment history/details and current payment actions accessible through the card actions menu.
- Preserve existing role, state, and payment-action permission behavior.
- Do not change payment calculations, persistence, filters, or metrics.
- TDD: strict; source: project testing-capability configuration (`sdd-init/sebasam-app`); runner: `pnpm test:ui -- <test-file>`.
- Implementation route: delegated direct. Trigger: preparation reads and implementation span the list component and its behavior tests.
- Delivery strategy: ask-on-risk; no PR chain selected or authorized.

## Acceptance criteria
- Clicking a Notes card opens the document preview with the note's concepts.
- Payment history/details and payment actions remain available from the actions menu.
- Existing permission and state restrictions remain unchanged.
- Quotes and active Work Orders retain their existing interactions.

## Tasks
- [x] NCP-1 — Add regression coverage for card preview and payment menu behavior, then implement the interaction change.
  - Checks: focused completed-note and preview-dialog tests; `pnpm typecheck`; `pnpm lint`.
  - Verification evidence: `pnpm exec vitest run src/features/work-orders/components/work-order-completed-list.test.tsx` — 13/13 passed; `pnpm exec vitest run src/features/quotes/components/quote-preview-dialog.test.tsx` — 13/13 passed; `pnpm typecheck` — passed; `pnpm lint` — passed with 8 existing warnings and 0 errors; `git diff --check` — passed. The first attempt to observe RED for the card-interaction test was blocked by absent dependencies before source changes; RED was later observed for the preview-title override (`Cotización C-001` rendered instead of expected `Nota N-140826-01`). The initial `pnpm test:ui -- <file>` form ran the full suite and failed while Prisma Client was ungenerated; after local offline install and `pnpm prisma generate`, focused tests passed. Full suite was not rerun.
  - Runtime harness: N/A — this is an in-app UI interaction covered by the focused component test.
  - Rollback boundary: revert `src/features/work-orders/components/work-order-completed-list.tsx`, `src/features/work-orders/components/work-order-completed-list.test.tsx`, `src/features/quotes/components/quote-preview-dialog.tsx`, and `src/features/quotes/components/quote-preview-dialog.test.tsx`; this removes the preview/menu interaction and optional title override without affecting other callers' default preview titles.
  - Commit identity: `cf521849aa093b7c3e9d9496544f1d955a3bf282` (`feat(notas): open note preview from cards`).
  - Receipt-driven assessment: medium; `under_budget` (132 changed lines), so no review is due for this slice yet.
  - Route: delegated direct (writer prepares by reading implementation and tests; behavior spans component and tests).

## Progress and next step
- Worktree created clean from local `develop` at `6a40db6`.
- NCP-1 implementation complete: card click opens the note preview with its note folio and concepts; actions menu opens the existing payment/detail dialog and preserves existing actions.
- Complete. No push, PR, or merge was performed; the feature branch remains local.
