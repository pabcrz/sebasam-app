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
- Work-unit commit: `f1dcf53 fix(quotes): promote share when work-order action is unavailable`.

## Final mobile quote action UX follow-up

- [x] Keep the labeled WORK/SALE flow action full-width and all Edit/Share/Print actions visible at fixed sizes on every mobile quote card; only flow/Share color variants toggle with `activeSharedQuote`.
- [x] Keep ineligible or incomplete actions visible but disabled, preserve WORK acceptance and SALE/Share validation rules, and do not change desktop quote actions or server logic.
- [x] Add regression coverage for size/color invariants, unsupported statuses, duplicate SALE notes, and DRAFT/SENT WORK with pending prices and the existing acceptance prompt.
- Focused Vitest: `3 files, 60 passed` (`quote-mobile-card`, `quote-action-presentation`, `work-order-operations-dialog`).
- Desktop regression check: `quote-list-row.test.tsx`, `1 file, 13 passed`.
- `pnpm typecheck`: passed (`tsc --noEmit`).
- `pnpm lint`: passed (`eslint`).
- `git diff --check`: passed.
- Runtime harness: N/A; mobile action behavior is covered by focused component tests, and no separate runtime boundary exists.
- Rollback boundary: revert this final mobile action presentation, optional disabled-trigger props, focused tests, and this follow-up evidence; no server or desktop quote behavior changes.
- Work-unit commit: `49065ea fix(quotes): stabilize mobile quote actions`.

## REJECTED-to-DRAFT and quote-card layout follow-up

This authorized follow-up is limited to correcting the rejected-quote UI and harmonizing quote-card layout. Preserve existing backend eligibility, pending-price handling, and acceptance behavior; make no backend, data, or lifecycle changes unless implementation proves one is required.

### Completed tasks

- [x] **QTSC-UI-001 — Restore DRAFT actions after rejection.** DRAFT quotes now expose authorization in desktop rows and mobile overflow while retaining eligible WORK/SALE flow actions and the WORK acceptance prompt.
- [x] **QTSC-CARD-002 — Harmonize quote-card layout.** Added equal-height two-column card tracks; full-height flex cards with anchored action footers; two-line titled quote names; a stable three-row date region; fixed Edit, Print, Share, More order and Share styling; uniform disabled styling; and no incidental quote-card body hover fill.

### Effective requirements

- `strict_tdd: true`
- `runner: pnpm exec vitest run`
- Add focused regression coverage for both pending tasks before implementation.
- Keep the work limited to the UI behavior/layout described above and preserve all existing acceptance and pending-price behavior.

### Completion evidence

- Strict TDD RED: focused quote row/card, action presentation, and quotes page tests failed before implementation (`4 files`, `11 failed`, `40 passed`); failures showed missing DRAFT authorization and layout/action style requirements. A dialog-close selector in the mobile regression test needed a follow-up correction during implementation; source work began only after the intended RED failures were observed.
- Focused GREEN: `pnpm exec vitest run src/features/quotes/components/quote-list-row.test.tsx src/features/quotes/components/quote-mobile-card.test.tsx src/features/quotes/components/quote-action-presentation.test.ts src/features/work-orders/components/work-order-operations-dialog.test.tsx src/components/ui/operational-card.test.tsx 'src/app/admin/(protected)/quotes/page.test.tsx'` — 6 files, 82 tests passed.
- `pnpm typecheck`: passed (`tsc --noEmit`).
- `pnpm lint`: passed (`eslint`).
- `git diff --check`: passed.
- Readiness check: the existing mobile `workStartReady` rule requires a customer or identifiable vehicle and complete item descriptions/positive quantities; SALE additionally requires existing commercial readiness and material/refacciones items. The valid fixture enables the WORK/SALE action; no server eligibility or lifecycle behavior was changed.
- Runtime harness: N/A; quote action and card layout behavior is exercised by focused component and page tests, with no separate runtime boundary for this UI-only change.
- Rollback boundary: revert the DRAFT authorization presentation and quote-card layout/style changes in `quote-list-row.tsx`, `quote-action-presentation.ts`, `quote-mobile-card.tsx`, `page.tsx`, and `operational-card.tsx`, the directly related tests in those components and page, and this follow-up evidence. No server actions, data model, database, or lifecycle logic is included.
- Work-unit commit: `ce4fd06 fix(quotes): restore DRAFT actions and align card layout`.

## DRAFT authorization and sharing follow-up

This user-approved follow-up is limited to DRAFT quote action priority and sharing. Preserve existing commercial validation and lifecycle behavior; do not introduce a new lifecycle path.

### Completed tasks

- [x] **QTSC-DRAFT-AUTH-003 — Make `Authorize` the large primary DRAFT action.** DRAFT quotes without a WorkOrder use `Authorize` as the large mobile primary; eligible WORK assignment and SALE conversion remain available from `More`. Desktop DRAFT rows continue to expose `QuoteAuthorizeForm`.
- [x] **QTSC-DRAFT-SHARE-004 — Share complete DRAFT quotes through the existing `publishSharedQuote` path.** DRAFT Share is enabled only when commercially ready, and QuotesPage routes it through `publishSharedQuote`; non-DRAFT shareable quotes retain `getOrCreateSharedQuoteAction`. Existing action validation and DRAFT-to-SENT-before-link sequence remain authoritative.
- [x] **QTSC-DRAFT-AUTH-005 — Clarify assignment-dialog operation and acceptance defaults.** `WorkOrderOperationsDialog` derives WORK/SALE solely from persisted `quoteOperation`, with no conversion selector. DRAFT/SENT WORK assignment keeps the acceptance question and defaults to `customerAccepted=true`, while allowing the exceptional-reason path. APPROVED assignment is direct; SALE skips WORK acceptance.

### Effective requirements

- `strict_tdd: true`
- `runner: pnpm exec vitest run`
- Add focused regression coverage for all three pending tasks before implementation.
- Preserve existing commercial eligibility/validation and lifecycle rules; sharing uses only the existing DRAFT-to-SENT transition before public-link creation.
- Add focused assignment-dialog regression coverage for QTSC-DRAFT-AUTH-005 before implementation; retain its persisted quote-operation behavior and status-specific acceptance behavior.

### Completion evidence

- Strict TDD RED command: `pnpm exec vitest run src/features/quotes/actions.test.ts src/features/quotes/domain.test.ts src/features/quotes/components/quote-mobile-card.test.tsx src/features/quotes/components/quote-action-presentation.test.ts src/features/quotes/components/quote-list-row.test.tsx src/features/work-orders/components/work-order-operations-dialog.test.tsx 'src/app/admin/(protected)/quotes/page.test.tsx'` — 7 files, 12 failed, 205 passed. The failures captured the missing DRAFT primary/share behavior and assignment-dialog expectations. The first RED run also exposed an isolation issue in the new page test fixture; it was corrected before implementation verification.
- Strict TDD GREEN, same command: 7 files passed, 217 tests passed (including existing `publishSharedQuote` validation/transition tests).
- `pnpm typecheck`: passed (`tsc --noEmit`).
- `pnpm lint`: passed (`eslint`).
- `git diff --check`: passed.
- DRAFT sharing is routed to the pre-existing `publishSharedQuote`; tests verify quote update to SENT is invoked before shared-link creation, while incomplete DRAFT validation leaves it unchanged. No new lifecycle/data/domain path was added.
- Desktop DRAFT authorization was already rendered by `QuoteListRow`; its existing regression test verifies the `QuoteAuthorizeForm` trigger. No desktop layout redesign was made.
- Runtime harness: N/A; the changes are page action routing and component interaction behavior covered by focused Vitest tests, with no independent runtime boundary.
- Rollback boundary: revert the DRAFT action presentation and sharing route in `src/features/quotes/components/quote-action-presentation.ts`, `src/features/quotes/components/quote-mobile-card.tsx`, and `src/app/admin/(protected)/quotes/page.tsx`; the operation/acceptance UI in `src/features/work-orders/components/work-order-operations-dialog.tsx`; their focused tests and this completion evidence. No server action implementation, domain/data model, database, or lifecycle logic was changed.
- Work-unit commit: `feba966 fix(quotes): align draft sharing and assignment actions`.

## Develop database test-data cleanup and flow coverage follow-up

This follow-up completed database-only cleanup and fixture setup in the user-authorized develop database configured by this worktree's `.env`. No source, domain, or test files were changed. Cleanup was limited to positively marked test quotes/notes with no payment, payment-application, ledger, settlement, correction, payment-request, or ambiguous dependency activity. Financially active and operationally linked rows, all master data, and unrelated historical data were preserved.

### Initial read-only inventory — 2026-09-30

The develop database was queried read-only through Prisma before this planning-only stage. Initial totals: **124 Quotes, 49 PayableNotes, 43 WorkOrders, 21 Payments, and 28 LedgerEntries**. Preliminary relation checks identify **109 Quotes and 36 PayableNotes without linked financial activity**, and **15 Quotes / 13 PayableNotes with linked financial activity or settlement/correction records**. These are preliminary inventory and candidate-screening counts only, not final deletion counts or authorization to delete all such rows. The user has confirmed the narrowly defined cleanup scope above. The quote screening includes linked payments, payment requests, commercial corrections, settlements, and linked payable-note activity; the note screening includes payments, applications, ledger entries, payment requests, and correction links.

Cleanup used positive test markers from the actual inventory: `Q-TEST` quote numbers/folios; `DEMO-NQ686` / `DEMO-NQ687` / `LOCAL` titles/descriptions; and clearly test-named titles/folios. A customer marker only corroborated a test record; a customer name alone was never sufficient. The candidate set and all dependent WorkOrders, PayableNotes, payments, applications, ledger entries, payment requests, settlements, corrections, and other known foreign-key dependencies were reselected and inspected inside the serializable cleanup transaction. Candidates with financial/payment activity or non-empty/ambiguous dependencies were skipped. No rows were deleted based only on status, date, customer, or lack of financial links; non-test historical data and all master data were preserved. The actual affected counts and retained duplicate-prevention fixture are recorded below. Future cleanup must repeat these safeguards against its own transactional recheck rather than treating this inventory or these counts as deletion targets.

### Planned data tasks

- [x] **QTSC-DATA-009 — Safely identify and clean only unlinked test fixtures.** Transactionally reselected and checked all marked quotes, notes, and dependent financial/operational rows. Deleted only eligible records; preserved financial and ambiguous dependencies, unrelated history, and master data.
- [x] **QTSC-SEED-010 — Create a multi-concept WORK quote for the existing `Test Payment Customer`.** Seeded distinct material and labor concepts inspired by `bujes RB 117`.
- [x] **QTSC-SEED-011 — Keep a WORK DRAFT with pending price.** Seeded a complete labor description with a null unit price and total.
- [x] **QTSC-SEED-012 — Share a complete WORK DRAFT.** Seeded a commercially complete DRAFT for the existing DRAFT-to-SENT sharing path.
- [x] **QTSC-SEED-013 — Prepare a material/refacciones-only SALE DRAFT.** Seeded MATERIAL and REFACCIONES concepts only; no payable note was created.
- [x] **QTSC-SEED-014 — Prepare a SENT WORK assignment-confirmation case.** Seeded an eligible WORK quote with an active shared link.
- [x] **QTSC-SEED-015 — Prepare an APPROVED WORK direct-assignment case.** Seeded an eligible APPROVED WORK quote.
- [x] **QTSC-SEED-016 — Prepare a REJECTED quote for correction back to DRAFT.** Seeded an eligible REJECTED WORK quote with its rejection decision; it remains REJECTED until manually corrected.
- [x] **QTSC-SEED-017 — Provide a marked issued SALE note for duplicate prevention.** Reused the existing safe issued SALE fixture `0926-007` / `N-240926-02`; no second note was issued.
- [x] **QTSC-SEED-018 — Prepare an incomplete quote with disabled controls.** Seeded a WORK DRAFT with no customer, an empty description, zero quantity, and no price.

### Completion evidence — 2026-09-30

- The transaction preflight matched **84** positively marked quote candidates. It deleted **81 Quotes, 10 PayableNotes, and 5 WorkOrders**; it also removed **80 QuoteSections, 17 QuoteItems, 3 SharedQuotes, 2 QuoteDecisions, and 2 QuoteLifecycleEvents**. The five deleted WorkOrders had no assignments, executions, payment applications/requests, ledger entries, corrections, advances, or completed-work knowledge dependencies. No broad delete, TRUNCATE, or cascade sweep was used.
- **Two marked candidates were skipped and preserved:** quote `0926-002` / note `T-0926-04` has 2 payments, 2 applications, and 3 note ledger entries (6 ledger entries across its linked payments); quote `Q-TEST-1789017914112-74sn` retains its WorkOrder assignment and issued WORK note because that operational dependency is non-empty. One other safe existing issued SALE fixture, `0926-007` / `N-240926-02`, was intentionally retained for duplicate-prevention coverage; its payment, application, ledger, payment-request, and correction counts are all zero.
- Final develop totals: **51 Quotes, 39 PayableNotes, 38 WorkOrders, 21 Payments, 21 PaymentApplications, and 28 LedgerEntries**. Payment/payment-application/ledger totals and all 3 quote-commercial corrections and 3 payment corrections were unchanged. PaymentRequests and SettlementAgreements remain 0.
- New marked fixtures (all have no WorkOrder or PayableNote; no payments were created):
  - `C-300926-01` (`0926-019`) — **DRAFT / WORK** — MATERIAL: 4 × Bujes RB 117; LABOR: 1 × desmontaje e instalación.
  - `C-300926-02` (`0926-020`) — **DRAFT / WORK** — LABOR: 1 × cambio de bujes de barra estabilizadora; unit price and totals pending.
  - `C-300926-03` (`0926-021`) — **DRAFT / WORK** — MATERIAL: 2 × bujes de horquilla; LABOR: revisión y montaje.
  - `C-300926-04` (`0926-022`) — **DRAFT / SALE** — REFACCIONES: 4 × kit de bujes RB 117; MATERIAL: juego de tornillería. No note was issued.
  - `C-300926-05` (`0926-023`) — **SENT / WORK** — MATERIAL: placa de refuerzo; LABOR: reparación y soldadura. An active shared link exists.
  - `C-300926-06` (`0926-024`) — **APPROVED / WORK** — MATERIAL: 2 × perchas reforzadas; LABOR: reemplazo y revisión de balancines.
  - `C-300926-07` (`0926-025`) — **REJECTED / WORK** — MATERIAL: 2 × tensores; LABOR: ajuste y alineación. Rejection decision recorded.
  - `C-300926-08` (`0926-026`) — **DRAFT / WORK** — incomplete LABOR concept; no customer, description, quantity, price, or totals.
- Master counts were unchanged: **56 Customers, 26 Vehicles, 7 UserProfiles, 1 PaymentSettings row, and 2 BankAccounts**. No master rows were created, deleted, or updated.
- Verification was data-only: final Prisma reads confirmed the counts, folios, statuses, operations, item mixes, the active SENT link, absence of notes/work orders for new fixtures, preservation of financial links, and unchanged master counts. UI-path readiness follows from those stored states; no manual UI session or application TDD was claimed. `strict_tdd: true`; runner remains exactly `pnpm exec vitest run` for future code changes.

### Effective requirements and verification boundary

- `strict_tdd: true`; runner remains exactly `pnpm exec vitest run` for any later application/source implementation. TDD remains required for code changes; the authorized work described here is database-only data cleanup/seeding and is not application TDD.
- This follow-up is data setup and flow verification, not application implementation. The completed work verified seed/cleanup invariants directly against the develop database and verified UI-path readiness from the stored states; it did not run a manual UI session or application TDD.
- Reuse existing develop customers and master data; create no customers or other master records. Give each new fixture a stable, uniquely searchable `QTSC-659` marker in its title or description and retain its resulting folio/identifiers for cleanup and reverification.
- No source, domain, or test changes are planned for these seed scenarios. Any discovered need for application changes is out of scope and requires a separate authorized task.
- Verification must record (1) actual deleted quote/note/WorkOrder and dependent-record counts; (2) that all financially active, settlement/correction-linked, ambiguous, or unknown-dependency records were preserved; (3) each seeded case's folio, status, WORK/SALE operation, and item mix; and (4) that no customers, vehicles, users, payment/bank settings, or other master data were created, deleted, or changed. Cleanup and fixture lifecycle must not erase or mutate unrelated historical data.

## Integration-readiness follow-up (2026-10-06)

The user authorized correcting the readiness blockers after reviewing the rebased branch. Issue #659 was labeled `status:approved` before implementation.

### Scope

- Treat the persisted `Quote.operation` as the conversion authority; reject a caller-supplied operation that contradicts it.
- Align desktop SALE conversion eligibility with the mobile card while keeping server-side validation authoritative.
- Add a Playwright browser contract test through the existing Vite harness with mocked server actions. This verifies browser-visible UI and navigation only; server persistence remains covered by focused action tests, not by a shared database browser run.
- Install locked dependencies with a frozen lockfile for verification only. Do not migrate, seed, or mutate any shared database.
- Do not create a PR, merge, or publish from this follow-up.

### Product decision (2026-10-06)

The user explicitly chose to allow pending prices for SALE conversion. Concepts with missing prices remain excluded from the confirmed total; conversion issues the note using the stored confirmed total, which can be zero. Do not add a new price-completion gate in the UI or server action.

### Planned tasks and acceptance

- [x] **QTSC-INT-001 — Enforce persisted operation.** Add a regression test proving a WORK quote cannot be converted to SALE by request override; preserve SALE conversion when the stored quote operation is SALE.
  - Strict TDD RED observed: `pnpm exec vitest run src/features/work-orders/actions.test.ts` — 1 file failed, 1 test failed, 55 passed. The new override test failed because the action returned a SALE note instead of rejecting.
  - Strict TDD GREEN observed after enforcing the stored operation: `pnpm exec vitest run src/features/work-orders/actions.test.ts` — 1 file passed, 56 tests passed. Both the mismatch rejection and stored-SALE conversion passed.
  - Work-unit commit: `998cf0f fix(sales): enforce persisted quote operation`. Keep the successful SALE path free of a WorkOrder.
- [x] **QTSC-INT-002 — Align desktop eligibility.** Apply the same customer/commercial readiness, supported-item, and duplicate-note constraints used by mobile; cover ineligible SALE quotes in the desktop row test.
  - Strict TDD RED observed: `pnpm exec vitest run src/features/quotes/components/quote-list-row.test.tsx` — 1 file failed, 2 tests failed, 14 passed. Both new tests showed an incomplete or unsupported SALE quote still exposed an enabled desktop action.
  - Strict TDD GREEN observed after sharing SALE readiness: `pnpm exec vitest run src/features/quotes/components/quote-list-row.test.tsx src/features/quotes/components/quote-mobile-card.test.tsx src/features/quotes/components/quote-action-presentation.test.ts src/features/work-orders/components/work-order-operations-dialog.test.tsx src/features/work-orders/actions.test.ts` — 5 files passed, 143 tests passed. Desktop incomplete/unsupported/eligible/pending-price behavior, mobile, dialog, and action behavior passed.
  - Work-unit commit: `d6ef1f4 fix(quotes): align sale conversion readiness`.
- [ ] **QTSC-INT-003 — Verify browser-visible SALE flow.** Add a Playwright test in the existing Vite harness using a mock conversion action; assert the SALE label, no WORK master/acceptance UI, exact conversion payload, and navigation to `/admin/notas`.
  - Strict TDD RED observed: `pnpm exec playwright test tests/playwright/sale-quote-conversion.spec.ts` launched the browser and failed at the expected missing `/sale-quote` SALE dialog in the existing NotasFilters-only fixture. A first invocation with `--project=chromium` was invalid because this config has no named project; reran without the selector.
  - Strict TDD GREEN observed: `pnpm exec playwright test tests/playwright/sale-quote-conversion.spec.ts` — browser launched and 1 test passed. It verifies the persisted SALE UI contract, mock payload, absence of WORK controls, and `/admin/notas` navigation; it does not exercise database persistence.
  - Delegation recovery: the initial fixture-writer attempts errored before editing; post-failure status confirmed no partial fixture/shim changes. The documented `subagent_continue` recovery completed the fixture wiring.
- [ ] **QTSC-INT-004 — Verify and reconcile.** Run focused Vitest, Playwright, typecheck, lint, Prisma validation, and `git diff --check`; refresh commit identities after any work-unit commits and report remaining review-size/PR gates.

Non-goals: testing against the shared develop database, applying migrations, preparing PR chains, or changing persisted business data. Browser verification must be described as a mocked UI contract, not proof of database persistence.
