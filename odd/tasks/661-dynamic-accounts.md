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
- Delivery strategy: `exception-ok`; the user explicitly approved the `size:exception` for this single PR after the full branch diff measured 650 authored changed lines against `develop` (521 additions, 129 deletions; generated files excluded).
- Route: delegated direct writer. Trigger evidence: integration spans multiple non-trivial payment/domain/query/test files and requires reading current merged source before editing.

## Tasks
- [x] **ODD-661-01** Integrate dynamic totals and payment applications with `PayableNote` identity for WORK and standalone SALE targets.
  - Acceptance: quote-backed WORK notes calculate the current confirmed payable total (including active settlement agreement rules) and subtract active applications linked to the actual payable-note ID.
  - Acceptance: standalone SALE notes remain payable with no WorkOrder and keep their own payable-note total as the source of truth.
  - Acceptance: capture/application/reversal/correction paths retain valid note references; no code assumes `payableNoteId === workOrderId`.
  - Acceptance: master/workshop WorkOrder behavior and payroll isolation remain unchanged.
  - Checks observed by the writer: `pnpm prisma generate` passed; targeted RED at `pnpm exec vitest run src/features/payments/payable-note-payment.test.ts` failed because a priced WORK note still used its stale stored total (expected 4,640 cents, received 9,000); post-fix focused runner passed 4 files / 59 tests; `pnpm typecheck`, `pnpm lint`, and `git diff --check` passed. The database-backed payment-request tests ran and passed; Prisma emitted the expected check-constraint error from the test asserting rejection of a customer-only request.
  - Parent spot-check: the same 4-file Vitest command exceeded the 120-second tool timeout after three files reported passing; this second run is incomplete and was not retried.
  - Runtime harness: N/A — this work unit changes server-side payment/read-model behavior and uses focused Vitest tests; no configured E2E harness exists (testing-capabilities #2374).
  - Rollback boundary: revert the PayableNote read-model/query/payment-identity changes and their focused tests in this work unit; do not revert the preceding #669 replay commit.
  - Evidence: code work-unit commit `ba1ebce`; writer-reported focused verification passed 4 files / 59 tests. Native high-risk review for this candidate was approved and acknowledged; it returned one non-blocking reliability warning. Parent readback confirmed the missing-note guard and application path are both restricted to completed WorkOrders. No corrective review transition was opened.

## Progress and Next Step
- Confirmed PRs #675 and #676 merged; PR #669 remains open and GitHub reports `DIRTY`.
- Read the merged schema and payable-note/payment domains through GitHub API; do not rely on the stale local main worktree.
- Rebase completed locally as `941ad0a`; ODD-661-01 implementation is `ba1ebce`; task evidence is `00fdf42`.
- The user approved `size:exception` for the single 650-line PR #669 and authorized the later `--force-with-lease` update. The local branch update is pending publication; no merge is authorized.
- Engram mirror created and read back at topic `odd/661-dynamic-accounts/tasks` (observation #3918).
