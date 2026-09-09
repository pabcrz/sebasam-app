# Proposal: Correct Completed Work and Payments

## Intent

Let administrators correct unpaid completed work and payment mistakes without cancelling operational history or rewriting financial records. This implements approved issue #484 from the completed-work context.

## Scope

### In Scope
- Allow free commercial edits when a `COMPLETED` work order has no active payment; preserve status, assignments, execution records, `completedAt`, and quote state.
- Block arbitrary edits while an active payment exists. Reversed captures remain auditable but neither block editing nor count as paid.
- Add one correction flow that changes payment amount and method, requires actor and reason, and atomically reverses the original capture/applications and records its replacement using the current timestamp.
- Require durable correction linkage and idempotent retries; leave schema choice to design.
- Exclude reversed payments from completed-list totals and show corrected quote/note data.

### Out of Scope
- Reopening/cancelling work, historical date/reference changes, document versioning, and arbitrary paid-work edits.
- Closed-period payroll policy; payroll continues using final corrected concepts.

## Capabilities

### New Capabilities
- `completed-work-correction`: Payment-aware, history-preserving completed-work editing.
- `payment-correction`: Atomic, auditable, idempotent payment replacement.

### Modified Capabilities
- None; no OpenSpec capabilities exist.

## Approach

Add a completed-work quote-update path with transaction-time state/payment guards. Compose reversal and replacement inside one serializable payment transaction, preserving immutable rows and recording actor, reason, linkage, and ledger movements. Expose both actions from completed-list/detail views and make read models use active payments only.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/features/quotes/` | Modified | Editability and state-preserving updates |
| `src/features/payments/`, `prisma/schema.prisma` | Modified | Atomic correction and linkage |
| `src/features/work-orders/`, `src/app/admin/(protected)/` | Modified | Entry points, totals, and views |
| `src/features/payroll/domain.ts` | Verified | Corrected concepts remain inputs |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Duplicate or partial correction | Medium | Serializable transaction, unique key, atomic tests |
| Quote/work-order lifecycle divergence | Medium | Preserve statuses and assert invariants transactionally |
| Retroactive payroll change | Medium | Document non-goal; add regression coverage |

## Rollback Plan

Disable correction entry points and revert application/query changes. Retain audit data and immutable history; reverse replacements through the supported operation rather than deleting rows.

## Dependencies

- Approved issue #484 and existing Prisma domain models.

## Success Criteria

- [ ] Unpaid completed work is corrected without changing operational state or history.
- [ ] Active payments block editing; reversed payments do not block or inflate totals.
- [ ] One submission atomically records reversal and replacement with audit fields.
- [ ] Retrying one correction key creates no duplicate financial rows.
- [ ] Views and payroll inputs use final corrected concepts.
