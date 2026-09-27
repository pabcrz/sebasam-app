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

- [ ] Add failing coverage for contextual quote/note copy before changing the relevant error boundaries.
- [ ] Ensure unavailable quote links and missing note records show the requested workshop-contact message appropriate to the resource.
- [ ] Keep existing authentication and authorization behavior unchanged.
- [ ] Preserve any differentiated error semantics (such as expired/revoked links) unless the focused acceptance tests require the shared unavailable wording.
- [ ] Run focused tests, record exact results, and commit as a separate coherent work unit.

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
- 404-1 commit identity and native review assessment are pending commit creation and assessment.

## Next Step

Complete 404-1 commit/assessment, then implement 404-2 test-first in this worktree. After each completed task, update this file and its Engram mirror, commit the work unit, and follow the native receipt-driven assessment/review protocol.
