# ODD Task Document: Simplified Patron Profile

## Objective

Provide the patron, using the existing `ADMIN` role, with a focused operational surface for Customers, Quotes, Work Orders, and Notes while preserving the complete existing commercial flows and detail previews.

## Problem

The current administrative shell exposes payroll, historical data, assistant, payment configuration, workers, and other internal modules alongside the patron's daily commercial work. The patron needs the normal Quote → WORK Note or SALE Note flow without the surrounding administrative complexity.

## Why

Reduce navigation and first-glance cognitive load without introducing a duplicate business entity, a new role, or parallel quote/work/note behavior.

## Authorized scope

- Issue: GitHub #689
- Base: `origin/develop` at `23d20416259b30ba7a7845ad0afc3e2e8ec9d724`
- Worktree: `/Users/pabcrz/Dev/sebasam-app-worktrees/689-patron-profile`
- Branch: `feature/689-patron-profile`
- Role rule: `ADMIN` receives the simplified surface; `SUPER_ADMIN` retains the complete administrative surface. Preserve existing behavior for other roles unless the existing role guard requires it.
- Route: delegated direct implementation, because the change spans shell, dashboard, and tests.
- TDD: Standard mode; no strict-TDD project capability was found. Runner: `pnpm test:ui`.

## Constraints

- Reuse `Customer`, `Quote`, `WorkOrder`, and `PayableNote`.
- Do not add a `PATRON` role or duplicate business entities.
- Do not change quote-to-WORK/SALE lifecycle semantics.
- Cards remain the natural entry point; do not add redundant “Ver” buttons.
- Hide complexity from the patron surface, but keep server-side authorization unchanged and authoritative.
- Keep the full quote preview and note/work detail available after opening a card.

## Tasks

### T1 — Role-aware patron navigation

- [x] Limit the `ADMIN` desktop and mobile navigation to Inicio, Clientes, Cotizaciones, Trabajos, and Notas.
- [x] Keep the complete navigation for `SUPER_ADMIN`.
- [x] Preserve existing route matching, profile menu, logout, and accessibility behavior.
- [x] Add/update shell tests for ADMIN and SUPER_ADMIN navigation.
- Route: delegated direct writer.
- Checks: focused `admin-shell` tests passed; `pnpm typecheck` passed; `git diff --check` passed.
- Commit: pending.

### T2 — Simplified patron dashboard

- [ ] Pass the authenticated role into the dashboard view.
- [ ] For `ADMIN`, remove payroll, worker, KPI, and receivables complexity from the first glance.
- [ ] Keep operational quote/work queues and add direct quick access for Clientes, Cotizaciones, Trabajos, and Notas where needed.
- [ ] Preserve the existing quote creation action and customer lookup.
- [ ] Keep the complete dashboard for `SUPER_ADMIN`.
- [ ] Add/update dashboard tests for both surfaces.
- Route: delegated direct writer.
- Checks: focused dashboard/page tests, `pnpm typecheck`.

### T3 — Integration regression verification

- [ ] Verify that existing quote preview, edit, share, and conversion actions remain unchanged.
- [ ] Verify that existing WORK and SALE note detail/payment/share/print actions remain unchanged.
- [ ] Verify that Customers remains accessible from the simplified surface.
- [ ] Run `pnpm lint`, `pnpm typecheck`, focused tests, and `pnpm build` if the final diff affects production build wiring.
- Route: delegated direct verification.

## Acceptance criteria

- An `ADMIN` sees only Inicio, Clientes, Cotizaciones, Trabajos, and Notas in the primary navigation.
- A `SUPER_ADMIN` retains the existing complete navigation.
- The ADMIN first view does not expose payroll, historical, assistant, payment configuration, worker management, KPI, or account-statement complexity.
- Cards and queue links open the existing full previews/details without duplicate “Ver” actions.
- The patron can create, edit, and share quotes and continue them into WORK or SALE notes through existing flows.
- Customers remains available for context and related operations.
- No business records or server-side permission boundaries are duplicated or weakened.

## Progress

- Status: T1 implemented; T2 implementation pending.
- Verification evidence: clean worktree created from `origin/develop`; CodeGraph initialized.
- Next step: commit T1, implement T2, then run T3 checks.

## Work-unit evidence

- T1 commit: pending.
- T2 commit: pending.
- T3 verification: pending.
