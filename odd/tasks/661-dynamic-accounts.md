# Dynamic Payable-Note Accounts — Issue #661

## Objective
Adapt the dynamic-balance work from PR #669 to the merged generic `PayableNote` model so work notes and standalone sale notes use the correct financial identity.

## Problem and Why
PR #669 was written against the work-order-only payment model. PRs #675 and #676 have since merged `PayableNote`, where a standalone sale has no `WorkOrder`, while work notes may reference both a `PayableNote` and a `WorkOrder`. Payment applications require `payableNoteId`; using a work-order ID as that foreign key is incorrect. Dynamic totals must not reintroduce a WorkOrder requirement for direct sales or alter the invariant that work orders are master-assigned or explicitly special/workshop.

## Scope
- Reconcile #669's dynamic confirmed-total and balance behavior with the merged `PayableNote` domain.
- Keep `PayableNote` as the account identity; resolve work-order notes through their actual `payableNoteId`.
- Preserve standalone SALE notes without a WorkOrder, and preserve WORK-note/work-order compatibility.
- Reconcile payment capture, application, reversal/correction, payment-request staleness, queries, and tests only as required by this integration.
- Do not change worker assignment, payroll rules, unrelated UI, or migration history unless current source proves a necessary compatibility fix.

## Constraints
- Approved tracker: GitHub issue #661; update the existing feature branch `feature/661-dynamic-work-order-accounts` and PR #669.
- Keep the main worktree's unrelated payroll modifications untouched.
- No direct-sale note may require a WorkOrder or worker; WorkOrders remain master-assigned or explicitly special/workshop.
- Preserve immutable payment/receipt history and existing payment-reversal semantics.
- Use English for code, tests, comments, and this document.
- Resolved TDD mode: strict TDD enabled per existing project testing-capabilities observation #2374; runner `pnpm test:ui`.
- Delivery strategy: `ask-on-risk`; forecast approximately 250 authored changed lines, excluding generated files.
- Route: delegated direct writer. Trigger evidence: integration spans multiple non-trivial payment/domain/query/test files and requires reading current merged source before editing.

## Tasks
- [ ] **ODD-661-01** Integrate dynamic totals and payment applications with `PayableNote` identity for WORK and standalone SALE targets.
  - Acceptance: quote-backed WORK notes calculate the current confirmed payable total (including active settlement agreement rules) and subtract active applications linked to the actual payable-note ID.
  - Acceptance: standalone SALE notes remain payable with no WorkOrder and keep their own payable-note total as the source of truth.
  - Acceptance: capture/application/reversal/correction paths retain valid note references; no code assumes `payableNoteId === workOrderId`.
  - Acceptance: master/workshop WorkOrder behavior and payroll isolation remain unchanged.
  - Checks: focused payment and payable-note tests; `pnpm prisma generate`; `pnpm typecheck`; `pnpm lint`; `pnpm test:ui`; `git diff --check`.
  - Evidence: work-unit commit hash, focused/full check results, and native review outcome when applicable.

## Progress and Next Step
- Confirmed PRs #675 and #676 merged; PR #669 remains open and GitHub reports `DIRTY`.
- Read the merged schema and payable-note/payment domains through GitHub API; do not rely on the stale local main worktree.
- Next: rebase the clean #669 worktree onto the merged `develop`, add failing tests, implement ODD-661-01, run checks, and prepare the existing PR update. Remote push is deferred until local implementation and checks are complete.
- Engram mirror created and read back at topic `odd/661-dynamic-accounts/tasks` (observation #3918).
