# Notes Card Preview — Issue #688

## Objective
Make selecting a Notes card open the document preview and provide an explicit primary card action for managing payments.

## Problem
The current Notes card click behavior prioritizes payment details, while users need to inspect the note and its concepts. This differs from Quotes and active Work Orders, whose cards open a preview.

## Why
Align the primary card interaction with the document-oriented task users expect while preserving the existing payment workflows as secondary actions.

## Scope and constraints
- Authorized issue: GitHub issue #688.
- Work only in `odd/tasks/notes-card-preview.md`'s repository worktree on branch `feature/688-notes-card-preview`.
- Clicking the note card body opens the note preview with document concepts.
- Provide a visible, labeled primary “Gestionar pagos” action on every note card, using the same manage icon as Quotes; it opens the existing payment/detail dialog.
- Keep archive, revoke, rollback, and other existing actions in the card actions menu.
- Preserve existing role, state, and payment-action permission behavior.
- Do not change payment calculations, persistence, filters, or metrics.
- TDD: strict; source: project testing-capability configuration (`sdd-init/sebasam-app`); runner: `pnpm test:ui -- <test-file>`.
- Implementation route: delegated direct. Trigger: preparation reads and implementation span the list component and its behavior tests.
- Delivery strategy: ask-on-risk; no PR chain selected or authorized.

## Acceptance criteria
- Clicking a Notes card opens the document preview with the note's concepts.
- Every Notes card presents a primary “Gestionar pagos” button with the Quotes manage icon, opening the existing payment/detail dialog.
- Archive, revoke, rollback, and other secondary actions remain in the actions menu.
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
- [x] NCP-2 — Promote payment management to a visible primary action on every Notes card, matching the Quotes manage icon.
  - Checks: focused completed-note list test; `pnpm typecheck`; `pnpm lint`.
  - Verification evidence: `pnpm exec vitest run src/features/work-orders/components/work-order-completed-list.test.tsx` — 14/14 passed; `pnpm typecheck` — passed; `pnpm lint` — passed with 8 warnings and 0 errors; `git diff --check` — passed. RED ordering/result could not be confirmed because the implementation delegation returned a transport error; the final regression suite is green.
  - Runtime harness: N/A — the card interaction is covered by the focused component test; local dev server remains available at port 3003 for manual inspection.
  - Rollback boundary: revert the new primary payment-management action and its focused coverage in `src/features/work-orders/components/work-order-completed-list.tsx` and `src/features/work-orders/components/work-order-completed-list.test.tsx`.
  - Commit identity: `06a8bbe7cb5cce9c8591c3547e1ce3b3a8dca1fa` (`feat(notas): make payment management a primary action`).
  - Receipt-driven assessment: medium; `under_budget` (159 changed lines across the current committed feature slice), no review is due.
  - Route: delegated direct; trigger: implementation and regression test both change the completed-note card behavior.

## Progress and next step
- Worktree created clean from local `develop` at `6a40db6`.
- NCP-1 implementation complete: card click opens the note preview with its note folio and concepts; the payment/detail dialog is available separately.
- NCP-2 implementation complete: every Notes card now has a primary `Gestionar pagos` button with the Quotes `ClipboardList` icon; the existing card body still opens preview and the payment item was removed from the overflow menu.
- NCP-2 committed as `06a8bbe7cb5cce9c8591c3547e1ce3b3a8dca1fa`; receipt-driven assessment is medium / under_budget, so no review is due for the current slice.
- No push, PR, or merge has been performed; the feature branch remains local.
