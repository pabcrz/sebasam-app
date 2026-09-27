# Custom 404 and unavailable-resource experience

## Objective

Redesign the App Router 404 page and provide clear contextual copy for unavailable public quotes and missing notes, without exposing an internal home-navigation action or changing authentication behavior.

## Problem and Rationale

The current global 404 page offers an internal “Volver al inicio” link even for public or protected URLs and provides no visual distinction for unavailable quotes or notes. Issue #707 requests a branded recovery screen with a restrained animated illustration and resource-aware Spanish copy.

## Scope

- Issue #707: redesign the root App Router 404 with the specified gear/loose-part SVG, subtle drop motion, large `404` with a blue central zero, Spanish title and generic support copy, and external “Visita SEBASAM” action.
- Remove internal homepage navigation from the 404 experience.
- Show contextual quote/note unavailable copy at their applicable not-found/error boundaries.
- Reuse existing design tokens, limit the visual to one shadow, center the card, keep its width near 420px, and respect responsive safe-area insets.
- Respect `prefers-reduced-motion` for the falling part.
- Preserve all existing authentication and authorization flows.

## Constraints

- GitHub issue: [#707](https://github.com/pabcrz/sebasam-app/issues/707), OPEN; labels `type:feature`, `status:approved`.
- Feature branch: `feature/707-404-error-page` in worktree `issue-707-custom-404`.
- Base: `origin/develop` at `33b18f4e2d382eb030f7a9ee6ab274aa39f7b27d`.
- Preserve unrelated uncommitted note-filter task document in the original checkout.
- Do not replace existing protected-route authentication behavior with 404 responses.
- No internal “ir/volver al inicio” action on the 404 screen.
- External CTA target: `https://sebasam.online`.
- Estimated authored diff: approximately 250 lines, excluding generated output; advisory only. Delivery strategy: `ask-on-risk`; no chain strategy selected unless accumulated work exceeds the existing review budget.

## TDD and Verification

- TDD mode: **ON (strict)**.
- Source: project testing-capabilities cache `sdd-init/sebasam-app` (Engram observation #2373).
- Test runner: `pnpm exec vitest run <test-file-paths>`.
- Follow RED → GREEN → REFACTOR for each task; record the failing regression test before implementation.
- Applicable closure checks: focused Vitest tests, `pnpm typecheck`, `pnpm lint`, `git diff --check`; run `pnpm build` if the implementation changes production build/runtime behavior beyond the tested route components.
- Receipt-driven development: **ON by default**, confirmed read-only with `gentle-ai review mode status` in the issue worktree. Assess each work-unit commit against the previous reviewed boundary and follow the returned native review transition if due.

## Authorized Scope and Acceptance Criteria

### 404-1 — Redesign global not-found experience

**Route:** delegated direct. The implementation spans multiple non-trivial UI/style/test files; one writer owns the complete task. Exploration was delegated because route and token context crosses multiple files.

- [x] Add failing focused tests for the new title/copy, large accented 404, external action, and absence of internal navigation.
- [x] Replace the current 404 UI with a centered responsive design and max width near 420px.
- [x] Include an inline SVG gear with a detached falling fastener and subtle motion; disable that motion under `prefers-reduced-motion`.
- [x] Use existing palette/spacing/radius/shadow tokens; retain exactly one card shadow and include safe-area insets.
- [x] Use the Spanish title and generic supporting message from the user’s request.
- [x] Link “Visita SEBASAM” to `https://sebasam.online`; render no internal home link.
- [x] Run the focused test, record exact result, and commit as one coherent work unit.

### 404-2 — Contextual quote and note unavailable copy

**Route:** delegated direct, continuing with the same writer where possible; route-specific Next.js not-found behavior and existing quote error states span multiple files.

- [x] Add failing coverage for contextual quote/note copy before changing the relevant error boundaries.
- [x] Ensure every unavailable quote-link state and the bare `/cotizacion/` route show quote-specific workshop-contact copy; keep expired/revoked headings distinct.
- [x] Render the shared 404 experience with note-specific workshop-contact copy when a note record is missing.
- [x] Keep existing authentication and authorization behavior unchanged.
- [x] Preserve differentiated expired/revoked headings while applying the shared quote-unavailable copy.
- [x] Run focused tests, record exact results, and commit as a separate coherent work unit.

## Progress and Evidence

- Issue #707 created, read back, and confirmed OPEN with `type:feature`; `status:approved` added after exact issue-bound user consent and successful readback.
- User clarified that protected URLs should keep their existing authentication/access flow; do not convert protected responses to 404.
- Read the installed Next.js 16.2.9 `not-found` file-convention guide before considering route-local not-found files.
- Read-only mapping: root `src/app/not-found.tsx` currently links to `/`; quote unavailable states render `SharedQuoteErrorState`; missing note print records call `notFound()`; existing tokens live in `src/app/globals.css`.
- Original checkout’s unrelated payroll changes were committed before this task; an untracked `odd/tasks/note-filters-query-efficiency.md` remains there and must not be touched.
- Current task worktree is based on `origin/develop` SHA `33b18f4e2d382eb030f7a9ee6ab274aa39f7b27d`; it has no CodeGraph index. Repository-specific instructions prohibit initializing one in this workflow, so use targeted direct reads in this worktree.
- 404-1 RED: `pnpm exec vitest run src/app/not-found.test.tsx` failed on the missing new title before implementation.
- 404-1 GREEN: `pnpm exec vitest run src/app/not-found.test.tsx` passed after implementation (included in the complete focused command below).
- 404-1 focused/closure checks: `pnpm exec vitest run src/app/not-found.test.tsx src/features/public-quotes/components/shared-quote-error-state.test.tsx 'src/app/admin/(protected)/notas/[id]/print/not-found.test.tsx'` — PASS, 3 files / 6 tests; `pnpm typecheck` — PASS; `pnpm lint` — PASS; `git diff --check` — PASS.
- `pnpm build` — PASS (production build, type validation, and route generation succeeded).
- Offline dependency setup: `pnpm install --offline --frozen-lockfile` succeeded from local cache; initial typecheck preceded Prisma client generation and failed due to unavailable generated Prisma types. The production build generated Prisma Client, after which `pnpm typecheck` passed.
- 404-1 commit: `1285379` (`feat(errors): redesign global 404 recovery page`). Rollback boundary: `src/app/not-found.tsx`, `src/app/not-found.test.tsx`, and this task record’s 404-1 evidence.
- Native assessment initially requested declaration for unrelated untracked 404-2 files; after a target-bound `gentle-ai review status` identified the pending task-2 paths, assessment was rerun with untracked scope excluded and the returned inventory digest. Result: `risk=medium`, reason `executable_change` (`src/app/not-found.test.tsx`), `changed_paths=3`, `changed_lines=150`, `review_due=false`, `review_due_reason=under_budget`; next action: continue with 404-2 without starting native review.
- 404-2 RED: `pnpm exec vitest run src/features/public-quotes/components/shared-quote-error-state.test.tsx 'src/app/admin/(protected)/notas/[id]/print/not-found.test.tsx'` — failed as expected: quote not-found copy mismatched; note test could not resolve the not-yet-created route not-found view.
- 404-2 GREEN and final focused check: `pnpm exec vitest run src/app/not-found.test.tsx src/features/public-quotes/components/shared-quote-error-state.test.tsx 'src/app/admin/(protected)/notas/[id]/print/not-found.test.tsx'` — PASS, 3 files / 6 tests.
- Final closure checks after all implementation: `pnpm typecheck` — PASS; `pnpm lint` — PASS; `git diff --check` — PASS; `pnpm build` — PASS, Next.js 16.2.9 production compilation/typecheck/static page generation completed.
- 404-2 commit: `f03778b` (`feat(errors): add contextual unavailable resource states`). Rollback boundary: `src/features/public-quotes/components/shared-quote-error-state.tsx`, its focused test, the new print-route `not-found.tsx` and test, plus this task record’s 404-2 evidence.
- Native assessment against the unchanged last-reviewed boundary `33b18f4e2d382eb030f7a9ee6ab274aa39f7b27d`: `risk=medium`, reason `executable_change` (`src/app/admin/(protected)/notas/[id]/print/not-found.test.tsx`), `changed_paths=7`, `changed_lines=193`, `review_due=false`, `review_due_reason=under_budget`; next action: stop; no native review transition is due.
- Parent spot check: the exact focused Vitest command above passed again (3 files, 6 tests). Parent assessment of the remaining task-document-only diff: passive, 1 path / 3 lines, no review due.
- Follow-up compliance pass: the first implementation left expired/revoked quote body text and `/cotizacion/` contextualization unchanged, and used a simplified note-only page rather than the requested shared 404 layout. Correct these within 404-2 before considering the task complete.
- Compliance correction RED: `pnpm exec vitest run src/app/not-found.test.tsx src/features/public-quotes/components/shared-quote-error-state.test.tsx 'src/app/admin/(protected)/notas/[id]/print/not-found.test.tsx' src/app/cotizacion/not-found.test.tsx src/app/cotizacion/page.test.tsx` — failed before production edits: missing quote route files, expired/revoked body copy mismatches, and note view lacked shared 404 presentation.
- Compliance correction GREEN: the same focused command passed, 5 files / 8 tests. The bare `/cotizacion/` page now calls `notFound()` and uses its route-level not-found copy; expired/revoked headings remain differentiated with shared quote copy; note not-found delegates to the global reusable 404 presentation.
- Required focused command (without the separate route-page invocation test): `pnpm exec vitest run src/app/not-found.test.tsx src/features/public-quotes/components/shared-quote-error-state.test.tsx 'src/app/admin/(protected)/notas/[id]/print/not-found.test.tsx' src/app/cotizacion/not-found.test.tsx` — PASS, 4 files / 7 tests. Additional `pnpm exec vitest run src/app/cotizacion/page.test.tsx` — PASS, 1 test confirming route-level notFound delegation.
- Compliance correction checks: `pnpm typecheck` — PASS; `pnpm lint` — PASS; `git diff --check` — PASS; `pnpm build` — PASS; build lists `/cotizacion` as a static route.
- Compliance correction commit and assessment are pending.

## Next Step

Commit and assess the 404-2 compliance correction; stop at any native review transition requiring parent lifecycle coordination.
