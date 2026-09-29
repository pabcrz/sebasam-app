# Quote-to-sale conversion

## Objective

Allow an existing quotation to be converted directly into a payable `SALE` note while preserving the quotation as historical context and leaving the normal `WORK` flow unchanged.

## Problem

The current direct-sale operation creates a new quotation, while the existing quotation-to-note action creates a `WorkOrder`. Issue #659 requires an explicit operation choice when converting an existing quotation.

## Authorized scope

- Issue #659: `feat(sales): convertir cotizaciones opcionalmente en ventas`
- Clean worktree: `/Users/pabcrz/Dev/sebasam/sebasam-app-worktrees/issue-659-sale-conversion`
- Base: `origin/develop`

## Checklist

- [x] Add an explicit `WORK`/`SALE` conversion operation to the quotation conversion contract.
- [x] Convert an existing quotation to a `SALE` payable note without creating a `WorkOrder`.
- [x] Preserve the existing `WORK` conversion behavior and quotation lifecycle/audit data.
- [x] Expose the operation choice from the quotation UI with validation and clear state.
- [x] Label the existing-quotation SALE action `Crear nota de venta` and navigate successful creation directly to `/admin/notas`.
- [x] Persist a `WORK`/`SALE` intent on draft quotations, defaulting existing and new quotations to `WORK`.
- [x] Expose the intent choice from the create-quotation form without issuing a note.
- [x] Add/update focused action and component tests.
- [x] Run applicable checks and record evidence.
- [x] Create a conventional work-unit commit on the feature branch.

## Acceptance criteria

- An existing quotation can remain only a quotation.
- An existing quotation can become a sale without a `WorkOrder`.
- The resulting note retains the source quotation reference.
- Direct sales without a quotation remain valid.
- The workshop flow retains its master/`WorkOrder` rules.
- After selecting SALE on an existing quotation, the action is presented as `Crear nota de venta`.
- After successful SALE creation, the user is taken directly to `/admin/notas`; the quotation does not remain in WorkOrder management.
- The create-quotation form can start either a WORK or SALE-intent draft; conversion to a note remains a separate manual action.

## Route and checks

- Route: delegated direct writer; implementation spans server action/schema, quotation UI, and tests.
- TDD: unknown until project configuration is checked; use the repository's existing test conventions.
- Required checks: focused Vitest tests for conversion and quotation UI, `pnpm typecheck`, `pnpm lint`, and `git diff --check`.

## Progress

- Worktree created from `origin/develop`.
- Code audit identified `createDirectMaterialSale` as the no-`WorkOrder` SALE pattern and `convertQuoteToNoteAction` as the existing-quote WORK path.
- Implemented the explicit conversion operation and verified both branches.

## Evidence

- `src/features/work-orders/actions.ts` now accepts `WORK`/`SALE`; SALE validates commercial material/refacciones-only concepts, prevents duplicate/unsafe conversions, creates an issued `PayableNote` with `kind: SALE` and `quoteId`, records decision/lifecycle audit rows, and never creates a `WorkOrder`.
- `src/features/work-orders/components/work-order-operations-dialog.tsx` exposes the operation selector only for an unassigned quote with a conversion action; SALE bypasses master assignment while WORK retains the existing assignment path.
- `src/features/work-orders/components/work-order-operations-dialog.tsx` labels SALE creation as `Crear nota de venta` and routes successful SALE conversion to `/admin/notas`; WORK continues to refresh its existing management state.
- `src/features/work-orders/components/work-order-operations-dialog.test.tsx` verifies the SALE label, conversion payload, direct `/admin/notas` navigation, and absence of a refresh after successful SALE creation.
- Clarification verification: focused Vitest `1 file, 24 passed` (`work-order-operations-dialog.test.tsx`); `git diff --check` passed.
- Focused Vitest: `4 passed`, `106 passed` (`actions.test.ts`, work-order operations dialog, quote mobile card, quote list row).
- `pnpm typecheck`: passed.
- `pnpm lint`: passed.
- `git diff --check`: passed.
- The mobile card keeps Edit, Print, Share, and the WORK/SALE flow action in one compact flex row; only the flow action changes to the primary variant, preserving card height across states.
- Focused Vitest: 2 files, 27 passed (`quote-action-presentation`, `quote-mobile-card`).
- `pnpm typecheck`, `pnpm lint`, and `git diff --check`: passed.
- Work-unit commit: `159744c fix(quotes): unify mobile action row`.
- Work-unit commit: `d3cc523 feat(sales): convert quotes to sale notes`.
- Review receipt: medium-risk reliability review acknowledged with no findings.
- `QuoteOperationKind` is persisted on `Quote` with a `WORK` default/backfill; SALE intent is validated server-side as material/refacciones-only and does not issue a note during draft creation.
- Existing quote edit and conversion flows carry the persisted intent forward; conversion UI starts from that intent but still permits explicit supported-operation selection.
- The create-quotation form now exposes `Trabajo`/`Venta`; selecting `Venta` keeps the document as a draft and does not create a note.
- Focused Vitest: 8 files, 212 passed; `pnpm typecheck`, `pnpm lint`, `pnpm prisma validate`, and `git diff --check` passed.
- The migration is present but was not applied to a database during this local implementation run.

## Issue #659 regression fix evidence

- The mobile quote card now forwards `quote.operation` to `WorkOrderOperationsDialog`, matching the desktop quote row.
- A persisted SALE quote without a WorkOrder or payable note now opens with `Crear nota de venta`, explains that no WorkOrder is created, and omits the WORK assignment section until the user explicitly switches to WORK.
- WORK quotes retain the existing assignment/manage-work trigger and dialog behavior.
- Focused Vitest: `2 files, 43 passed` (`quote-mobile-card.test.tsx`, `work-order-operations-dialog.test.tsx`).
- `pnpm typecheck`: passed.
- `pnpm lint`: passed.
- `git diff --check`: passed.
- Work-unit commit: `2a71c90 fix(sales): clarify persisted sale conversion UI`.
- SALE cards without a WorkOrder now display `Venta de refacciones` instead of `Sin orden de trabajo`.
- Focused Vitest: `1 file, 19 passed` (`quote-mobile-card.test.tsx`).
- `pnpm typecheck`, `pnpm lint`, and `git diff --check`: passed.
- Secondary `Compartir` no longer uses the primary visual variant when WORK assignment or SALE conversion is primary; each card now has one primary action visually and structurally.
- Focused Vitest: `1 file, 20 passed` (`quote-mobile-card.test.tsx`).
- `pnpm typecheck`, `pnpm lint`, and `git diff --check`: passed.
- Work-unit commit: `8ebb516 fix(quotes): keep one primary action`.
- Mobile action priority now uses `activeSharedQuote`: unshared operational quotes prioritize `Compartir`; shared quotes prioritize WORK assignment or SALE note conversion.
- Clarification: retain `Asignar trabajo` / `Crear nota de venta` as prominent, labeled primary buttons; only the primary identity toggles between that contextual action and `Compartir`. Keep Edit and Print compact, and keep the non-primary Share/WorkOrder action available among compact controls.
- The mobile card now renders `actionPresentation.primary` as a full-width labeled primary above compact Edit/Print/Share/WorkOrder controls. The non-primary Share/WorkOrder control remains available in the compact row; Edit and Print remain icon-only. Share uses its normal button size when primary.
- Focused Vitest: `2 files passed, 27 tests passed` (`quote-mobile-card.test.tsx`, `quote-action-presentation.test.ts`).
- `pnpm typecheck`: passed (`tsc --noEmit`).
- `pnpm lint`: passed (`eslint`).
- `git diff --check`: passed.
- Runtime harness: N/A; presentation-only component behavior is covered by the focused Vitest tests, with no independent runtime boundary for this change.
- Rollback boundary: revert only the mobile quote card presentation and share-button sizing changes plus their component tests and this issue-task evidence; no quote business logic changes.
- Focused Vitest: `2 files, 27 passed` (`quote-action-presentation`, `quote-mobile-card`).
- `pnpm typecheck`, `pnpm lint`, and `git diff --check`: passed.
- DRAFT/SENT WORK actions are primary and require explicit customer acceptance or a bounded exceptional reason; APPROVED WORK remains direct.
- SALE actions remain direct and bypass acceptance/reason prompts; server-side WORK creation rejects SALE-intent quotes.
- Acceptance decisions are recorded in the quote lifecycle audit when a DRAFT/SENT quote is promoted.
- Focused Vitest: `4 files, 106 passed` (`quote-action-presentation`, `quote-mobile-card`, `work-order-operations-dialog`, `work-orders/actions`).
- `pnpm typecheck`, `pnpm lint`, and `git diff --check`: passed.
- Review correction: quote conversion now falls back to the persisted operation when callers omit it; the schema no longer defaults omitted conversion operations to WORK.
- Focused Vitest: 4 files, 86 tests passed (`work-orders/actions`, `work-orders/schemas`, `quote-mobile-card`, `quote-action-presentation`).
- `pnpm typecheck`, `pnpm lint`, and `git diff --check`: passed.
- Mobile action regression: when a shared quote has a payable note but no WorkOrder, the unavailable work-order control no longer occupies primary; Share is promoted to the large labeled primary. Existing work-order priority is preserved when a WorkOrder exists. `resolveQuoteActionPresentation` is only consumed by `QuoteListCard`, so desktop actions are unchanged.
- Focused Vitest: 2 files, 29 tests passed (`quote-mobile-card`, `quote-action-presentation`); `pnpm typecheck`, `pnpm lint`, and `git diff --check`: passed.
- Runtime harness: N/A; this is a mobile card presentation branch covered by the component regression test.
- Rollback boundary: revert the mobile quote presentation selector and tests plus this evidence line; no business flow changes.
