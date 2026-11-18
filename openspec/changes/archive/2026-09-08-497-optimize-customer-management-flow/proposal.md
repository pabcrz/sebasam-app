# Proposal: Optimize Customer Management Flow

## Intent

Streamline customer administration in SEBASAM on mobile and desktop by removing slow full-page navigations for edits, adding quick in-list actions with proactive deletion restrictions, enabling batch cleanup of test records, and fixing mobile FAB content overlap.

## Scope

### In Scope
- **Quick actions per card**: Action menu (`MoreHorizontal`) with Edit, View Statement, and Delete.
- **Proactive deletion restrictions**: Preflight check via Prisma `_count` (`quotes`, `payments`, `paymentRequests`, `ledgerEntries`) disabling delete with an inline explanation ("Tiene N cotizaciones asociadas") before failure.
- **Multi-select mode**: Header toggle with card checkboxes, batch selection counter, and bulk deletion with single confirmation modal.
- **Quick edit modal/sheet**: Responsive `DialogMobileContent` modal for customer fields (`name`, `status`, `phone`, `email`, `address`, `notes`) without navigating away.
- **Mobile FAB clearance**: Bottom padding (`pb-28 sm:pb-0`) on the list container to prevent the floating action button from obscuring the last card.
- **Transactional batch delete action**: Atomic server action supporting bulk customer deletion with integrity enforcement.

### Out of Scope
- Relaxing referential integrity checks (customers with quotes or ledger records remain non-deletable).
- Automated script/seed deletion for historical `test.local` records.

## Capabilities

### New Capabilities
- `customer-management-flow`: Fast list actions, multi-select batch deletion, modal editing, and proactive deletion restriction feedback.

### Modified Capabilities
- None

## Approach

1. **Read Model**: Enhance `listCustomers` query in `src/features/customers/queries.ts` to include `_count` for `quotes`, `payments`, `paymentRequests`, and `ledgerEntries`.
2. **Server Actions**: Implement `deleteCustomersBatchAction` and `updateCustomerAction` in `src/features/customers/actions.ts` returning structured results and revalidating `/admin/customers`.
3. **UI Components**:
   - Create `CustomerEditDialog` using `DialogMobileContent` and `DialogMobileHeader`.
   - Update `CustomerCardList` to support multi-select toolbar and `MoreHorizontal` action menu.
   - Guard card clicks in selection mode so clicking a card toggles its checkbox rather than opening the statement.
4. **Layout**: Add `pb-28 sm:pb-0` in `src/app/admin/(protected)/customers/page.tsx`.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/features/customers/queries.ts` | Modified | Add `_count` selection in `listCustomers` |
| `src/features/customers/actions.ts` | Modified | Add batch delete and inline update server actions |
| `src/features/customers/components/customer-card-list.tsx` | Modified | Multi-select toolbar, quick action menu, selection toggles |
| `src/features/customers/components/customer-edit-dialog.tsx` | New | Inline modal/sheet for fast editing |
| `src/app/admin/(protected)/customers/page.tsx` | Modified | Padding adjustment for FAB clearance |
| `src/features/customers/actions.test.ts` | Modified | Unit tests for batch delete and update actions |
| `src/features/customers/components/customer-card-list.test.tsx` | Modified | UI tests for multi-select, actions menu, and disabled delete |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Accidental bulk deletion | Low | Explicit modal confirmation displaying count of records to delete |
| Selection click conflicts | Low | Disable statement dialog trigger overlay when selection mode is active |

## Rollback Plan

Revert git commits associated with this branch (`feature/497-customer-management-flow`). No database schema migrations are involved.

## Dependencies

- None (uses existing Prisma schema and Radix UI components).

## Success Criteria

- [ ] Each customer card has an action menu with Edit, View Statement, and Delete.
- [ ] Customers with quotes or payments show a disabled delete action with the exact reason inline.
- [ ] Users can enter selection mode, select multiple eligible customers, and delete them in one confirmation.
- [ ] Editing a customer can be done in a modal/sheet without full-page navigation.
- [ ] The mobile floating action button does not obscure the last customer card.
- [ ] All unit and component tests pass.
