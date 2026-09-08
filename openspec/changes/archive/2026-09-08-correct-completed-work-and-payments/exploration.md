## Exploration: correct-completed-work-and-payments

### Current State

Issue #484 is approved and open. Completed work orders are listed in `Notas` and remain operationally `COMPLETED`, but `isQuoteEditable` returns false whenever a related work order is completed. The work-order detail page therefore hides `QuoteBuilderDialog`, while `updateDraftQuote` independently rejects the update. The only correction action exposed for a completed order is `rollbackWorkOrder`, which cancels the order, may restore the quote to `DRAFT` or `SENT`, revokes shared links, cancels active payment requests, and refuses any payment, application, or ledger activity. This violates the confirmed rule that a completed, unpaid order must stay completed while its commercial data is corrected.

Quote updates replace all sections and items and recalculate totals in one serializable transaction. They currently reject a new total below the aggregate of payments with `status = PAID`; they do not distinguish reversed payments in that aggregate. The update also sets the quote status to `DRAFT`, clears `approvedAt`, and does not write a quote lifecycle event. That behavior is acceptable for ordinary draft editing but is unsafe as-is for completed-note correction because it would change the quote lifecycle while the work order remains completed.

Payment capture is already available from the completed-notes list through `recordPaymentAction`. Captures create an immutable `Payment`, a `PAYMENT_CAPTURE` ledger entry, and—when the target is completed—an active `PaymentApplication` plus `PAYMENT_APPLICATION` ledger entry. Payment and application operation keys are unique. All payment domain mutations use serializable Prisma transactions.

`reversePaymentCapture` already marks the payment and active applications reversed, creates `PAYMENT_REVERSAL` and `APPLICATION_REVERSAL` debit entries, requires a reason and actor, and is exposed through `ReversePaymentDialog` only in the customer account statement. Its optional `operationKey` is passed through but is not used for an idempotency lookup or persisted on the reversal ledger entries. Repeating a reversal returns current credit and zero applications rather than replaying a specific correction operation. The existing ledger model supports `reversedMovementId`, but current reversal writes do not link counter-movements to their originals.

There are two important read-model inconsistencies to resolve in implementation: `listCompletedWorkOrders` sums every `PAID` payment without filtering `reversedAt: null`, while financial summaries do filter reversed payments; and completed-list payment totals are quote-level rather than application-level. Payroll derives labor and commission directly from current completed-order quote items, including `customPayrollBaseCents` and `customRatePercent`, so changing quote items or prices changes future payroll calculations without changing completion status. Existing assignments, execution records, and `completedAt` are not touched by quote update code.

### Affected Areas

- `src/features/quotes/lib/editability.ts` — currently freezes every quote attached to a completed work order; the rule must become payment-aware without unlocking cancelled quotes.
- `src/features/quotes/actions.ts` — `updateDraftQuote` replaces commercial data, resets quote status, aggregates payments, and needs a completed-unpaid correction path with concurrency-safe guards and correct status preservation.
- `src/app/admin/(protected)/work-orders/[id]/page.tsx` — currently hides editing for completed orders and is the natural direct entry point for correction.
- `src/app/admin/(protected)/notas/page.tsx` — supplies completed-note actions and is the practical location for editing and correcting payments.
- `src/features/work-orders/components/work-order-completed-list.tsx` — currently opens a preview and payment capture but has no edit or payment-correction action.
- `src/features/work-orders/components/work-order-operations-dialog.tsx` — describes completed concepts as frozen and exposes rollback; completed-order correction UX should not route users through cancellation.
- `src/features/work-orders/actions.ts` — rollback is intentionally destructive to operational state and should remain a separate unsafe correction path, not the implementation of this rule.
- `src/features/work-orders/queries.ts` — completed-list payment filtering currently counts reversed captures as paid and must be audited alongside the new flow.
- `src/features/payments/domain.ts` — contains capture/application/reversal invariants and is the correct transaction boundary for a replacement-payment operation.
- `src/features/payments/actions.ts` — admin authorization and path revalidation wrapper; a new correction action should require an administrator and carry the authenticated actor.
- `src/features/payments/components/reverse-payment-dialog.tsx` — reusable reason-and-confirm reversal UI, but insufficient for one-flow replacement capture without an amount/method form and correction-specific result handling.
- `src/features/customers/queries.ts` and `src/features/customers/components/customer-account-statement.tsx` — existing audit/ledger presentation and current reversal entry point.
- `prisma/schema.prisma` — payments are immutable captures with reversal fields; unique operation keys exist for payments/applications, while no dedicated correction-operation record exists.
- `src/features/payroll/domain.ts` — computes payroll from current completed quote items, so commercial corrections have downstream payroll effects that should be made explicit and tested.
- Existing tests in `src/features/quotes/lib/editability.test.ts`, `src/features/quotes/actions.test.ts`, `src/features/payments/domain.test.ts`, `src/features/payments/actions.test.ts`, and `src/features/work-orders/components/work-order-completed-list.test.tsx` — provide focused seams, but no completed-unpaid quote update or atomic replacement-payment coverage exists.

### Approaches

1. **Payment-aware completed quote editing plus atomic replacement payment operation** — allow the existing builder to edit a completed quote only when no active or historical payment exists; preserve `WorkOrder.status = COMPLETED`, assignments, execution records, quote approval/commercial state as deliberately specified, and update the quote/items transactionally. Add a domain operation that validates the original payment belongs to the target completed work order, reverses the original capture and applications, creates the replacement capture/application and all ledger movements, and uses a unique correction operation key for idempotent retries.
   - Pros: directly satisfies the business rule, preserves immutable financial history, reuses the current builder and payment primitives, and keeps both correction paths in one user flow.
   - Cons: requires careful status semantics for a quote whose prices changed after completion, a durable idempotency design, and tests for race/retry behavior.
   - Effort: Medium/High

2. **Keep completed quotes frozen and improve navigation around existing reversal** — add an edit-like entry that sends users to the customer statement, then have them reverse and recapture separately; retain rollback for commercial changes.
   - Pros: smallest code change and minimal schema/domain work.
   - Cons: explicitly fails the confirmed unpaid-edit rule, preserves the bureaucratic payment workflow, and leaves rollback as the normal correction mechanism.
   - Effort: Low

3. **Introduce a dedicated correction/audit aggregate** — add a `PaymentCorrection` record with original/replacement payment IDs, actor, reason, operation key, and state, then execute the reversal and replacement under one serializable transaction.
   - Pros: makes idempotency, audit, and correction history first-class and prevents ambiguous reuse of payment operation keys.
   - Cons: adds migration and read-model complexity; the current payment and ledger schema can already represent the financial facts, so the aggregate may be more than the smallest safe slice.
   - Effort: High

### Recommendation

Use Approach 1 for the first implementation, with a narrow dedicated correction operation key contract. Do not reuse `reversePaymentCapture` as a two-step UI workflow: extend or compose domain primitives inside one serializable transaction so the original reversal, replacement capture, application, and ledger entries commit or roll back together. Preserve `COMPLETED` and all operational history for unpaid commercial edits. For paid orders, expose `Correct payment` from the completed-note context and require only the replacement amount, method (defaulting to the original), and a concise reason; do not permit arbitrary quote-total changes through that path. Add an explicit idempotency contract—ideally a small correction record if the existing schema cannot safely identify the replacement on retry—rather than relying on the optional, currently ignored reversal key.

The implementation should also fix reversed-payment filtering in completed-list totals and define whether a commercial edit with any payment is wholly blocked or permits only non-financial fields. The confirmed requirement safely determines the unpaid path and the atomic payment-correction invariant; it does not fully determine quote lifecycle status after an unpaid completed edit, whether payment correction may alter method/date/reference, or the policy for paid quote metadata edits.

### Risks

- Current quote update resets status to `DRAFT`; doing that while retaining a completed work order would create an inconsistent quote/work-order pair and may alter public-note rendering, payment eligibility, and shared-document behavior.
- Changing a completed quote total below active applied payments can create invalid balances; paid edits must be blocked or use a separate financial adjustment process.
- `listCompletedWorkOrders` currently counts reversed `PAID` payments, so a reversal/correction can display stale paid balances unless the query is corrected.
- Concurrent quote edits, payment capture, and payment correction require serializable transactions plus conditional state checks; retry handling must not create duplicate replacement payments.
- Shared quote/public document consumers read the same quote and may see corrected data immediately; decide whether existing shared links remain valid and whether a correction event is required.
- Payroll is derived from mutable quote items, so post-completion edits can change payroll reports for the period; this may be intended, but retroactive payroll policy and already-adjusted payroll records need confirmation.
- Existing rollback and reversal tests use mocks that may not expose missing query methods or realistic unique-constraint/concurrency failures; new tests must cover commit atomicity and idempotent retry behavior.

### Ready for Proposal

Yes. The confirmed unpaid-edit and atomic payment-correction rules are sufficiently clear for a proposal. Before implementation, the proposal should explicitly choose quote status/approval preservation after an unpaid completed edit, the paid-order field policy, replacement payment metadata rules, shared-link behavior, and whether a dedicated `PaymentCorrection` table is warranted for durable idempotency.
