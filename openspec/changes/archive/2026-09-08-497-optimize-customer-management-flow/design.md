# Design: Optimize Customer Management Flow

## Technical Approach

Adopt a unified in-list interaction model for customer management. Enhance `listCustomers` to eagerly aggregate referential constraints (`quotes`, `payments`, `paymentRequests`, `ledgerEntries`) in a single Prisma query. Expose responsive quick-actions per customer card, modal-based fast editing (`DialogMobileContent`), a multi-select mode for batch deletion of eligible test records, and add bottom clearance padding to prevent mobile FAB clipping.

## Architecture Decisions

| Decision | Choice | Alternatives Considered | Rationale |
|----------|--------|-------------------------|-----------|
| Deletion Eligibility Detection | Prisma `_count` aggregation in `listCustomers` | Separate preflight API calls; Checking on delete attempt only | Eliminates N+1 queries; provides immediate UI feedback before user initiates action |
| Quick Edit Surface | `CustomerEditDialog` using `DialogMobileContent` | Full page navigation; Inline accordion table expansion | Consistent with mobile-first sheet design in SEBASAM; preserves scroll position on `/admin/customers` |
| Action Menu Pattern | `DialogMobileContent` with `MoreHorizontal` trigger | Native popovers; Swipe actions | Follows established `QuoteActionsMenu` pattern; fully accessible and responsive across touch and keyboard |
| Multi-Select Safety | Disable selection checkboxes for ineligible customers | Allow selecting non-deletable records and failing during execution | Prevents user errors up-front; guarantees batch actions only target actually deletable records |
| Mobile FAB Clearance | `pb-28 sm:pb-0` on list container | Moving button to sticky header; Floating container hiding on scroll | Simplest, robust CSS solution with zero JS overhead and consistent spacing across viewports |

## Data Flow

```
[listCustomers Query]
       │
       ▼ (includes _count: { quotes, payments, paymentRequests, ledgerEntries })
[CustomerCardList]
   ├── [Normal Mode] ──────────→ [Card click] → CustomerDetailDialog
   │                             [Actions Menu] → Edit Modal | Delete Confirm | Statement
   └── [Selection Mode] ───────→ [Card / Checkbox click] → Toggle selectedIds Set
                                 [Delete Selected] → Batch Confirm Dialog → deleteCustomersBatchAction
                                                                                   │
                                                                                   ▼ (Prisma $transaction)
                                                                            revalidatePath(/admin/customers)
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/features/customers/queries.ts` | Modify | Include `_count` for referential constraints and export blocker helper |
| `src/features/customers/actions.ts` | Modify | Add `deleteCustomersBatchAction`, `deleteCustomerAction`, and `updateCustomerAction` |
| `src/features/customers/components/customer-edit-dialog.tsx` | Create | Responsive modal/sheet for fast editing without navigation |
| `src/features/customers/components/customer-actions-menu.tsx` | Create | Mobile-ready dropdown/sheet menu with Edit, Statement, and Delete |
| `src/features/customers/components/customer-card-list.tsx` | Modify | Multi-select toolbar, selection checkboxes, actions menu integration |
| `src/app/admin/(protected)/customers/page.tsx` | Modify | Add `pb-28 sm:pb-0` bottom clearance for FAB |
| `src/features/customers/actions.test.ts` | Modify | Test batch delete, single delete action, and update action contracts |
| `src/features/customers/components/customer-edit-dialog.test.tsx` | Create | Test edit dialog validation, form submission, and focus |
| `src/features/customers/components/customer-actions-menu.test.tsx` | Create | Test action triggers, enabled/disabled states, and blocker copy |
| `src/features/customers/components/customer-card-list.test.tsx` | Modify | Test multi-select mode, batch confirmation, and card click gating |

## Interfaces / Contracts

```typescript
export type CustomerDeletionBlocker = {
  canDelete: boolean;
  reason: string | null;
};

export type CustomerCardListItem = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  status: string;
  _count?: {
    quotes: number;
    payments: number;
    paymentRequests: number;
    ledgerEntries: number;
  };
};

export type BatchDeleteResult = {
  success: boolean;
  deletedCount: number;
  error?: string;
};
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit / Domain | `deleteCustomersBatchAction` and `updateCustomerAction` | Vitest with mock Prisma transaction ensuring referential safety |
| Component UI | `CustomerActionsMenu` rendering & blocker text | RTL testing enabled state (0 quotes) vs disabled state (N quotes / payments) |
| Component UI | `CustomerEditDialog` modal submission | RTL testing field updates, error handling, and transition state |
| Integration UI | `CustomerCardList` multi-select mode | RTL testing select all, toggle, batch delete trigger, and cancel flow |

## Migration / Rollout

No database migrations required. Pure UI and server action enhancements completely backward compatible with existing `/admin/customers/[id]/edit` routes.

## Open Questions

None.
