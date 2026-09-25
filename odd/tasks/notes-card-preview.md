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
- Size the payment/detail dialog to approximately the document preview width on desktop (`max-w-2xl`) while retaining its current full-screen mobile layout.
- Keep archive, revoke, rollback, and other existing actions in the card actions menu.
- Preserve existing role, state, and payment-action permission behavior.
- Do not change payment calculations, persistence, filters, or metrics.
- TDD: strict; source: project testing-capability configuration (`sdd-init/sebasam-app`); runner: `pnpm test:ui -- <test-file>`.
- Implementation route: delegated direct. Trigger: preparation reads and implementation span the list component and its behavior tests.
- Delivery strategy: ask-on-risk; no PR chain selected or authorized.

## Acceptance criteria
- Clicking a Notes card opens the document preview with the note's concepts.
- Every Notes card presents a primary “Gestionar pagos” button with the Quotes manage icon, opening the existing payment/detail dialog.
- The payment/detail dialog is approximately as wide as the document preview on desktop and remains full-screen on mobile.
- Archive, revoke, rollback, and other secondary actions remain in the actions menu.
- Existing permission and state restrictions remain unchanged.
- Quotes and active Work Orders retain their existing interactions.

## Tasks
- [x] NCP-1 — Add regression coverage for card preview and payment menu behavior, then implement the interaction change.
  - Checks: focused completed-note and preview-dialog tests; `pnpm typecheck`; `pnpm lint`.
  - Verification evidence: after rebase, `pnpm exec vitest run src/features/work-orders/components/work-order-completed-list.test.tsx` — 15/15 passed; `pnpm exec vitest run src/features/quotes/components/quote-preview-dialog.test.tsx` — 13/13 passed; `pnpm typecheck` — passed; `pnpm lint` — passed with 0 warnings and 0 errors; Prisma client generated against current schema. The initial card-interaction RED attempt was blocked by absent dependencies; RED was later observed for the preview-title override. Full suite and production build were not rerun.
  - Runtime harness: N/A — this is an in-app UI interaction covered by the focused component test.
  - Rollback boundary: revert `src/features/work-orders/components/work-order-completed-list.tsx`, `src/features/work-orders/components/work-order-completed-list.test.tsx`, `src/features/quotes/components/quote-preview-dialog.tsx`, and `src/features/quotes/components/quote-preview-dialog.test.tsx`; this removes the preview/menu interaction and optional title override without affecting other callers' default preview titles.
  - Commit identity: `8b6b48db5195e5dd5107710dde3369a921a7d5e0` (`feat(notas): open note preview from cards`, rebased onto current develop).
  - Receipt-driven assessment: medium; current rebased branch range is `under_budget` (183 changed lines), no review is due.
  - Route: delegated direct (writer prepares by reading implementation and tests; behavior spans component and tests).
- [x] NCP-2 — Promote payment management to a visible primary action on every Notes card, matching the Quotes manage icon.
  - Checks: focused completed-note list test; `pnpm typecheck`; `pnpm lint`.
  - Verification evidence: after rebase, completed-note focused test — 15/15 passed; `pnpm typecheck` — passed; `pnpm lint` — passed with 0 warnings and 0 errors. RED ordering/result was not captured because the original implementation delegation returned a transport error; the final regression suite is green.
  - Runtime harness: N/A — the card interaction is covered by the focused component test; local dev server remains available at port 3003 for manual inspection.
  - Rollback boundary: revert the new primary payment-management action and its focused coverage in `src/features/work-orders/components/work-order-completed-list.tsx` and `src/features/work-orders/components/work-order-completed-list.test.tsx`.
  - Commit identity: `856a87df2691a07a19d6af6ef02a01a584b9e422` (`feat(notas): make payment management a primary action`, rebased onto current develop).
  - Receipt-driven assessment: medium; current rebased branch range is `under_budget` (183 changed lines), no review is due.
  - Route: delegated direct; trigger: implementation and regression test both change the completed-note card behavior.
- [x] NCP-3 — Reduce the payment/detail dialog's desktop width to match the document preview while preserving mobile full-screen behavior.
  - Checks: focused completed-note list test; `pnpm typecheck`; `pnpm lint`.
  - Verification evidence: baseline focused test passed 14/14; RED failed 13/14 on the old width; after rebase final focused test passed 15/15; `pnpm typecheck` passed; `pnpm lint` passed with 0 warnings and 0 errors; mobile full-screen classes remain unchanged.
  - Runtime harness: N/A — the dialog width is covered by the focused UI component test; mobile full-screen classes remain unchanged.
  - Rollback boundary: restore `sm:max-w-6xl` in `src/features/work-orders/components/nota-detail-dialog.tsx` and its prior focused expectation in `src/features/work-orders/components/work-order-completed-list.test.tsx`.
  - Commit identity: `0c4dd2e609d8d348d5425ed18a67aafb940114d5` (`fix(notas): reduce payment dialog desktop width`, rebased onto current develop).
  - Receipt-driven assessment: medium; current rebased branch range is `under_budget` (183 changed lines), no review is due.
  - Route: delegated direct; trigger: preparation and implementation span the dialog component and its tests.

## Progress and next step
- Worktree was created clean from local `develop` at `6a40db6`, then rebased onto current `origin/develop` (`622920e`) before PR preparation.
- NCP-1 implementation complete: card click opens the note preview with its note folio and concepts; the payment/detail dialog is available separately.
- NCP-2 implementation complete: every Notes card now has a primary `Gestionar pagos` button with the Quotes `ClipboardList` icon; the existing card body still opens preview and the payment item was removed from the overflow menu.
- NCP-2 committed as `856a87df2691a07a19d6af6ef02a01a584b9e422`; receipt-driven assessment is medium / under_budget, so no review is due for the current slice.
- NCP-3 implementation complete: payment dialog now uses `sm:max-w-2xl` on desktop while retaining full-screen mobile classes.
- NCP-3 committed as `0c4dd2e609d8d348d5425ed18a67aafb940114d5`; receipt-driven assessment is medium / under_budget, so no review is due for the current slice.
- No push, PR, or merge has been performed; the feature branch remains local.
