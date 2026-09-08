# Exploration: Optimize Customer Management Flow

## Current State

- **List view (`src/app/admin/(protected)/customers/page.tsx`)**:
  - Fetches up to 50 customers using `listCustomers({ query })`.
  - `CustomerCardList` renders each customer inside a `ListItemCard`.
  - Clicking the card body triggers `CustomerDetailDialog` (via invisible absolute button).
  - The only action button on each card is "Editar", which navigates to `/admin/customers/[id]/edit`.
  - Delete is only possible from `/admin/customers/[id]/edit` by scrolling past the full form into the Danger Zone.
  - No batch selection or batch actions exist.
  - The floating action button (FAB) for "Nuevo cliente" on mobile sits at `bottom: calc(4.5rem + env(safe-area-inset-bottom, 0px))` without sufficient bottom padding in the list, occluding the last customer card.

- **Data model and queries (`src/features/customers/queries.ts`)**:
  - `listCustomers` fetches customer scalars (`id, name, email, phone, status, address, notes, createdAt, updatedAt`), but does not query related counts (`quotes`, `payments`, `paymentRequests`, `ledgerEntries`).
  - As a result, the UI cannot know beforehand if a customer is eligible for deletion.

- **Actions (`src/features/customers/actions.ts`)**:
  - `deleteCustomerAuthorized(customerId)` verifies in a Prisma transaction that the customer has zero quotes, payments, paymentRequests, and ledgerEntries. If any exist, it throws an error.
  - `deleteCustomerFromForm` handles deletion via form submission and redirects with query parameters.
  - No batch deletion action exists.
  - Update action (`updateCustomerFromForm`) performs redirects rather than returning JSON for dialog/modal inline updates.

## Affected Areas

- `src/features/customers/queries.ts` — Add `_count` aggregation (`quotes`, `payments`, `paymentRequests`, `ledgerEntries`) to `listCustomers`.
- `src/features/customers/actions.ts` — Add `updateCustomerAction`, `deleteCustomerAction`, and `deleteCustomersBatchAction` with transactional safety and revalidation.
- `src/features/customers/components/customer-card-list.tsx` — Integrate selection mode, quick actions menu (MoreHorizontal), deletion confirmation, and edit dialog.
- `src/features/customers/components/customer-edit-dialog.tsx` [NEW] — Lightweight modal/sheet for editing customer fields (name, status, phone, address, notes, email) without full navigation.
- `src/features/customers/components/customer-actions-menu.tsx` [NEW] — Dropdown/sheet menu with "Editar", "Ver cuenta", and "Eliminar" (with inline restriction feedback).
- `src/app/admin/(protected)/customers/page.tsx` — Add bottom padding for mobile FAB clearance (`pb-28 sm:pb-0`) and pass deletion/update capabilities to the list.
- `src/features/customers/components/*.test.tsx` & `actions.test.ts` — Unit/UI test coverage for selection, deletion restrictions, batch deletion, and quick edit.

## Approaches

### 1. Unified Client-Side Toolbar & In-Card Quick Actions (Recommended)
- Enhance `CustomerCardList` to manage local selection state (`selectedIds: Set<string>`).
- Add a top toolbar in the card list: "Seleccionar" toggle, batch selection counter, "Seleccionar todos (elegibles)", "Cancelar", and "Eliminar seleccionados" (triggering a single confirmation modal).
- On each card:
  - If in selection mode: show checkbox (disabled if customer has history, with reason tooltip/text).
  - If not in selection mode: show quick actions menu (`MoreHorizontal`) with:
    1. "Editar" → opens `CustomerEditDialog` (reusing `DialogMobileContent`).
    2. "Ver cuenta" → opens statement dialog.
    3. "Eliminar" → disabled with inline message if `quotesCount > 0 || financialCount > 0`; otherwise triggers `DestructiveAction` / `ConfirmDialog`.
- Query optimization: `listCustomers` queries Prisma `_count` in the same query.
- Add `pb-28` to the card list container to eliminate FAB overlap.
- **Pros**: Matches SEBASAM design language, zero extra routes, immediate feedback, prevents illegal deletion attempts before they occur.
- **Cons**: Slightly richer component state in `CustomerCardList`.
- **Effort**: Medium.

### 2. Swipe Actions per Card (Mobile Native style)
- Use touch gesture handlers / swipe-to-reveal for Edit/Delete buttons on each card.
- **Pros**: Feels native on mobile.
- **Cons**: Poor discoverability on desktop/tablets, harder keyboard accessibility (a11y), conflicts with scroll and drag-and-drop gestures, does not solve batch selection.
- **Effort**: High.

## Recommendation

Adopt **Approach 1 (Unified Client-Side Toolbar & In-Card Quick Actions)**:
1. Provide a clear, accessible `MoreHorizontal` actions menu on each card with inline deletion restrictions based on `_count`.
2. Add a multi-select mode with batch deletion for test data cleanup.
3. Use `DialogMobileContent` for quick customer editing without leaving `/admin/customers`.
4. Add bottom padding (`pb-28 sm:pb-0`) to prevent the mobile FAB from covering the last item.

## Risks & Mitigations

- **Risk 1: Accidental deletion of real customers**:
  - *Mitigation*: Single and batch deletions require explicit confirmation via `ConfirmDialog` with counts and names.
- **Risk 2: Concurrency race when deleting**:
  - *Mitigation*: The database transaction in `deleteCustomerAuthorized` already enforces zero quotes and ledger entries atomically at commit time.
- **Risk 3: Selection mode interfering with card click**:
  - *Mitigation*: When selection mode is active, disable the invisible `CustomerDetailDialog` overlay button and make clicking the card toggle the checkbox.

## Ready for Proposal

Yes — the requirements, components, database queries, and accessibility constraints are clear and verified against the codebase.
