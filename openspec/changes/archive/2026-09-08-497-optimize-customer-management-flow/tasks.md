# Tasks: Optimize Customer Management Flow

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 420–520 authored lines |
| 400-line budget risk | Medium |
| Chained PRs recommended | No |
| Suggested split | Single PR with cohesive work-unit commits |
| Delivery strategy | single-pr |
| Chain strategy | size-exception |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Query aggregation and server actions (batch delete, update) | PR 1 | Independent data layer with unit tests |
| 2 | Quick edit dialog and actions menu components | PR 1 | Presentation components with RTL tests |
| 3 | Multi-select toolbar, list integration, and mobile FAB fix | PR 1 | Page integration and end-to-end user flows |

## Phase 1: Data Layer & Referential Preflight (Strict TDD)

- [x] 1.1 RED: Add tests in `src/features/customers/queries.test.ts` asserting `listCustomers` returns `_count` (`quotes`, `payments`, `paymentRequests`, `ledgerEntries`) and test `getCustomerDeletionBlocker` logic.
- [x] 1.2 GREEN: Update `src/features/customers/queries.ts` to include `_count` in `listCustomers` and export `getCustomerDeletionBlocker`.
- [x] 1.3 RED: Add tests in `src/features/customers/actions.test.ts` for `deleteCustomerAction`, `deleteCustomersBatchAction` (transactional multi-delete), and `updateCustomerAction`.
- [x] 1.4 GREEN: Implement `deleteCustomerAction`, `deleteCustomersBatchAction`, and `updateCustomerAction` in `src/features/customers/actions.ts`.

## Phase 2: Quick Edit & Actions Menu Components (Strict TDD)

- [x] 2.1 RED: Create `src/features/customers/components/customer-edit-dialog.test.tsx` testing modal rendering, field prepopulation, submission, and validation handling.
- [x] 2.2 GREEN: Create `src/features/customers/components/customer-edit-dialog.tsx` using `DialogMobileContent`.
- [x] 2.3 RED: Create `src/features/customers/components/customer-actions-menu.test.tsx` asserting menu open, options, and disabled delete with blocker text when history exists.
- [x] 2.4 GREEN: Create `src/features/customers/components/customer-actions-menu.tsx`.

## Phase 3: Multi-Select Mode, List Integration & Layout Clearance (Strict TDD)

- [x] 3.1 RED: Update `src/features/customers/components/customer-card-list.test.tsx` testing selection mode toggle, batch selection, blocked card disabling, and batch confirmation.
- [x] 3.2 GREEN: Update `src/features/customers/components/customer-card-list.tsx` to integrate selection toolbar, checkboxes, actions menu, and quick edit modal.
- [x] 3.3 GREEN: Update `src/app/admin/(protected)/customers/page.tsx` adding bottom clearance (`pb-28 sm:pb-0`) to eliminate mobile FAB overlap.

## Phase 4: Verification & Quality Proof

- [x] 4.1 Run full customer test suites: `pnpm vitest run src/features/customers`.
- [x] 4.2 Run `pnpm lint`, `pnpm typecheck`, and `pnpm build` ensuring zero regressions.
