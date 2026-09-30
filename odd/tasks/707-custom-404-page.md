# Custom 404 and unavailable-resource experience

## Objective

Redesign the App Router 404 page and provide clear contextual copy for unavailable public quotes and missing notes, without exposing an internal home-navigation action or changing authentication behavior.

## Problem and Rationale

The current global 404 page offers an internal “Volver al inicio” link even for public or protected URLs and provides no visual distinction for unavailable quotes or notes. Issue #707 requests a branded recovery screen with a restrained animated illustration and resource-aware Spanish copy.

## Scope

- Issue #707: redesign the root App Router 404 with SEBASAM branding, landing-inspired 404 artwork, Spanish title and generic support copy, and a single external information/contact action.
- Remove internal homepage navigation from the 404 experience.
- Show contextual quote/note unavailable copy at their applicable not-found/error boundaries.
- Reuse existing design tokens, limit the visual to one shadow, center the card, keep its width near 420px, and respect responsive safe-area insets.
- Respect `prefers-reduced-motion` for the falling part.
- Preserve all existing authentication and authorization flows.
- Anchor the shared 404 presentation in SEBASAM’s existing identity with the official logo and navy/blue brand treatment.
- Keep card/header padding balanced so the default Card inset does not stack with the 404 layout’s own spacing.
- Use the shared 404 visual for public quote token errors as well as unmatched quote routes, while retaining status-specific titles.
- On mobile, render the 404 without card chrome and use the available viewport; retain the framed card on desktop.
- On mobile, keep the SEBASAM header at the top, center the 404 content in the remaining space, and place the CTA about 24px above the bottom safe area.
- Replace the gear with a single flat vector hex bolt, two subtle motion marks, and a reduced-motion-aware animation; add no other illustration elements.
- Replace the bolt artwork with a landing-inspired 404 treatment, and keep only the public “Ver información y contacto” action to `https://sebasam.online/info`.

## Constraints

- GitHub issue: [#707](https://github.com/pabcrz/sebasam-app/issues/707), OPEN; labels `type:feature`, `status:approved`.
- Feature branch: `feature/707-404-error-page` in worktree `issue-707-custom-404`.
- Base: `origin/develop` at `33b18f4e2d382eb030f7a9ee6ab274aa39f7b27d`.
- Preserve unrelated uncommitted note-filter task document in the original checkout.
- Do not replace existing protected-route authentication behavior with 404 responses.
- No internal “ir/volver al inicio” action on the 404 screen.
- Current external CTA target: `https://sebasam.online/info` (“Ver información y contacto”); task 404-9 supersedes the earlier CTA design.
- Estimated authored diff: approximately 250 lines, excluding generated output; advisory only. Delivery strategy: `ask-on-risk`; no chain strategy selected unless accumulated work exceeds the existing review budget.

## TDD and Verification

- TDD mode: **ON (strict)**.
- Source: project testing-capabilities cache `sdd-init/sebasam-app` (Engram observation #2373).
- Test runner: `pnpm exec vitest run <test-file-paths>`.
- Follow RED → GREEN → REFACTOR for each task; record the failing regression test before implementation.
- Applicable closure checks: focused Vitest tests, `pnpm typecheck`, `pnpm lint`, `git diff --check`; run `pnpm build` if the implementation changes production build/runtime behavior beyond the tested route components.
- Receipt-driven development: **ON by default**, confirmed read-only with `gentle-ai review mode status` in the issue worktree. Assess each work-unit commit against the previous reviewed boundary and follow the returned native review transition if due.
- Last acknowledged review boundary for the next work unit: `19e410769f8d0e3f4310cee225980cc322ba9528`.

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

### 404-3 — Reinforce SEBASAM brand identity

**Route:** delegated direct because this visual refinement updates the shared component and its focused test; one writer owns both files.

- [x] Add a focused failing assertion for the official SEBASAM logo/wordmark in the shared 404 experience.
- [x] Add the existing white SEBASAM logo and wordmark in a compact navy/blue brand header, reusing current visual tokens and typography.
- [x] Keep the page centered and responsive, with one shadow, no additional palette colors, and no changes to error messaging or route behavior.
- [x] Run the focused test, record the exact result, and commit as one coherent work unit.

### 404-4 — Correct stacked 404 card padding

**Route:** delegated direct because the fix spans the shared 404 component and its focused test; one writer owns both files.

- [x] Add a failing assertion that the 404 card has no implicit base padding beyond the explicitly designed header/content spacing.
- [x] Remove the double inset while keeping the brand header and main content visually aligned and responsive.
- [x] Preserve all 404 copy, logo, animation, action, route, and authentication behavior.
- [x] Run the focused test, record the result, and commit as one coherent work unit.

### 404-5 — Unify public quote error presentation

**Route:** delegated direct because the quote error component and its regression test must change together; one writer owns both files.

- [x] Add failing assertions that invalid, expired, and revoked quote links use the shared branded 404 visual.
- [x] Reuse `NotFoundExperience` for all public quote token errors while preserving the title for each error status and the contextual workshop-contact copy.
- [x] Keep the external SEBASAM action, reduced-motion gear, 404 number, and absence of internal home navigation consistent with other 404 states.
- [x] Run the focused quote-error test, record the result, and commit as one coherent work unit.

### 404-6 — Use a full-screen mobile 404 layout

**Route:** delegated direct because the responsive component and focused test must change together; one writer owns both files.

- [x] Add failing responsive assertions for an unframed, viewport-filling mobile layout while retaining the desktop card.
- [x] Remove border, radius, background card surface, and shadow on narrow screens; keep safe-area padding and existing logo/content alignment.
- [x] Preserve the desktop card framing and all error copy, actions, animation, and route behavior.
- [x] Run focused tests and commit the responsive presentation as one coherent work unit.

### 404-7 — Anchor mobile header, center content, and bottom CTA

**Route:** delegated direct because the shared responsive layout and its regression test change together; one writer owns both files.

- [x] Add failing assertions for the mobile order and layout: brand header top, 404 content centered in the remaining viewport, CTA at the bottom with 24px clearance.
- [x] Use a mobile flex-column layout with safe-area-aware bottom spacing; preserve the existing desktop card composition.
- [x] Keep copy, quote/note contextual messages, logo, animation, CTA destination, and route/access behavior unchanged.
- [x] Run focused tests, record the result, and commit as one coherent work unit.

- [x] Extend the mobile brand band edge-to-edge while keeping header, content, and CTA inside the safe-area insets.
- Correction RED: `pnpm exec vitest run src/app/not-found.test.tsx` failed before source changes because mobile main still had outer top/side padding.
- Correction GREEN: same command passed, 1 file / 1 test; verifies full-bleed band, safe-area-protected content, top-header/content/footer order, bottom clearance, and desktop-frame classes.
- Correction checks: `pnpm typecheck`, `pnpm lint`, and `git diff --check` all passed; build intentionally skipped for the live preview.
- Task 404-7 initial commit: `f019e93` (`fix(errors): anchor mobile 404 content and action`); assessment against `19e410769f8d0e3f4310cee225980cc322ba9528` was medium risk, 3 paths / 78 lines, `review_due=false`.
- User clarified to remove only the mobile outer top/side inset; keep notch-safe inner padding and existing desktop layout.
- Full-bleed correction commit: `4635ec0` (`fix(errors): make mobile 404 header full bleed`). Parent committed-only assessment against `19e410769f8d0e3f4310cee225980cc322ba9528`: medium risk, 3 paths / 132 lines, `review_due=false`, under budget.
- Parent spot-check: focused Vitest passed 1/1. Live preview returns 404 and confirms full-bleed header, centered content before the CTA, 24px + safe-area bottom spacing, and desktop card styling.
- Correction commit: `4635ec0` (`fix(errors): make mobile 404 header full bleed`). Mobile main has no outer top/side inset; the gradient header reaches viewport edges with notch-safe inner padding, and content/footer retain safe-area side insets.
- Correction assessment against `19e410769f8d0e3f4310cee225980cc322ba9528`: `risk=medium`, reason `executable_change` (`src/app/not-found.test.tsx`), `changed_paths=3`, `changed_lines=132`, `review_due=false`, `review_due_reason=under_budget`.
- RED: `pnpm exec vitest run src/app/not-found.test.tsx` failed before implementation because the mobile composition contract was missing.
- GREEN: the same command passed, 1 file / 1 test; verifies the top header, centered content, 24px+safe-area CTA footer, and retained desktop card classes.
- Closure: `pnpm typecheck`, `pnpm lint`, and `git diff --check` passed. Build was not run to preserve the live `.next` preview.
- Implementation: mobile uses a full-height flex column: brand header first, central error group flexes/centers, and CTA sits in the bottom footer with `pb-[max(24px,env(safe-area-inset-bottom))]`; desktop remains card-framed.
- Commit: `f019e93` (`fix(errors): anchor mobile 404 content and action`). Rollback boundary: responsive header/content/footer placement in `src/components/errors/not-found-experience.tsx`, responsive assertions in `src/app/not-found.test.tsx`, and task 404-7 evidence.
- Assessment against last reviewed boundary `19e410769f8d0e3f4310cee225980cc322ba9528`: medium risk, 3 paths / 78 lines, `review_due=false`, `under_budget`.
- Parent spot-check: focused test passed, 1 file / 1 test. Live preview response returned 404 and confirms header precedes content, content precedes CTA, and bottom safe-area padding is present.

### 404-8 — Replace the gear with a loose hex bolt

**Route:** delegated direct because the shared SVG/animation and focused test change together; one writer owns both files.

- [x] Add failing assertions for one hex-head bolt, exactly two curved motion marks, and absence of gear artwork.
- [x] Draw a lightweight flat bolt SVG with existing navy/blue tokens at the current illustration footprint.
- [x] Add restrained -6° to 6° rotation and 3–5px vertical motion over about two seconds; disable movement for `prefers-reduced-motion`.
- [x] Preserve all copy, the selected external CTA, and existing mobile/desktop/error behavior.
- [x] Run focused tests and commit as one coherent work unit.
- RED: `pnpm exec vitest run src/app/not-found.test.tsx` failed before production edits because the accessible hex bolt illustration was absent.
- GREEN: same command passed, 1 file / 1 test; confirms a single hex-head bolt/shaft, exactly two separately classed motion paths, no gear artwork, and retained shared 404 content/CTA.
- Checks: `pnpm typecheck`, `pnpm lint`, and `git diff --check` passed. `pnpm build` intentionally skipped for the active preview.
- Implementation: replaced the gear with a 24x24 SVG bolt using existing navy/primary/subtle blue-gray tokens; bolt animates -6° to +6° and 4px vertically over 2.2 seconds and is static for reduced motion.
- Commit: `abf22b2` (`feat(errors): replace 404 gear with hex bolt`). Rollback boundary: the shared SVG/animation and focused bolt-art regression assertions.
- Committed-only assessment against `19e410769f8d0e3f4310cee225980cc322ba9528`: `risk=medium`, reason `executable_change` (`src/app/not-found.test.tsx`), `changed_paths=3`, `changed_lines=196`, `review_due=false`, `review_due_reason=under_budget`.
- Parent spot-check: `pnpm exec vitest run src/app/not-found.test.tsx` passed (1 file/1 test). Live preview returns 404 with the bolt, both motion marks, external CTA, and no gear.

### 404-9 — Replace bolt with landing-inspired 404

**Route:** delegated direct because the shared 404 visual and regression test change together; one writer owns both files.

- [x] Add failing assertions for the landing-inspired 404 artwork and the single information/contact action.
- [x] Remove the bolt and its motion marks/animation; render the landing-inspired 404 with a slashed zero while preserving responsive layout and shared contextual states.
- [x] Keep the only CTA as “Ver información y contacto” to `https://sebasam.online/info`; do not add internal navigation or unrelated actions.
- [x] Preserve quote/note copy, accessibility, safe-area behavior, route semantics, and authentication/access behavior.
- [x] Run focused tests, record observed checks, and close as one coherent work-unit commit.
- RED: `pnpm exec vitest run src/app/not-found.test.tsx` — FAIL before production edits because the information/contact CTA was absent (the rendered CTA was still “Visita SEBASAM” to the root URL).
- GREEN: `pnpm exec vitest run src/app/not-found.test.tsx` — PASS, 1 file / 1 test; verifies the accessible 404 with decorative slash, absence of bolt/motion artwork, exactly one external info/contact link, and the existing responsive/safe-area structure.
- Checks: `pnpm typecheck` — PASS; `pnpm lint` — PASS; `git diff --check` — PASS. `pnpm build` intentionally not run to preserve the active `.next` preview; preview process and files were not touched.
- Implementation: removed the bolt SVG and its reduced-motion animation, styled the central zero with a decorative navy slash in the existing brand palette, and changed the sole CTA to “Ver información y contacto” at `https://sebasam.online/info`. Existing header, copy, mobile/desktop layout, safe areas, route boundaries, and auth/access code were unchanged.
- Work-unit commit: `f2f9536` (`feat(errors): use landing-inspired 404 artwork`). Rollback boundary: shared 404 artwork and CTA in `src/components/errors/not-found-experience.tsx`, corresponding focused assertions in `src/app/not-found.test.tsx`, and this 404-9 task evidence.
- Parent spot-check: `pnpm exec vitest run src/app/not-found.test.tsx` — PASS, 1 file / 1 test; `pnpm typecheck` — PASS; `pnpm lint` — PASS; `git diff --check` — PASS.
- Committed-only native assessment against `19e410769f8d0e3f4310cee225980cc322ba9528`: `risk=medium`, 3 paths / 227 changed lines, `review_due=false`, `review_due_reason=under_budget`; no review transition is due.

## Progress and Evidence

- Issue #707 created, read back, and confirmed OPEN with `type:feature`; `status:approved` added after exact issue-bound user consent and successful readback.
- User clarified that protected URLs should keep their existing authentication/access flow; do not convert protected responses to 404.
- Read the installed Next.js 16.2.9 `not-found` file-convention guide before considering route-local not-found files.
- Read-only mapping: root `src/app/not-found.tsx` currently links to `/`; quote unavailable states render `SharedQuoteErrorState`; missing note print records call `notFound()`; existing tokens live in `src/app/globals.css`.
- Original checkout’s unrelated payroll changes were committed before this task; an untracked `odd/tasks/note-filters-query-efficiency.md` remains there and must not be touched.
- Current task worktree is based on `origin/develop` SHA `33b18f4e2d382eb030f7a9ee6ab274aa39f7b27d`; it has no CodeGraph index. Repository-specific instructions prohibit initializing one in this workflow, so use targeted direct reads in this worktree.
- 404-6 RED/GREEN: `pnpm exec vitest run src/app/not-found.test.tsx` failed before implementation and passed afterward, 1 file/1 test; verifies an unframed mobile surface, desktop card frame, aligned header/content insets, and compact mobile spacing.
- 404-6 closure: typecheck, lint, and diff-check passed; build intentionally skipped to preserve the active `.next` preview. The shared 404 uses a plain responsive wrapper, with desktop chrome only at `md` and above and existing safe-area behavior intact.
- 404-6 commit: `249f6ed` (`fix(errors): use frameless mobile 404 layout`). Assessment against last reviewed boundary `19e410769f8d0e3f4310cee225980cc322ba9528`: medium risk, 3 paths/49 lines, `review_due=false`, under budget. Parent spot-check passed the focused test and confirmed the live preview returns HTTP 404 with mobile-unframed/desktop-framed classes.
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
- Compliance correction commit: `2f63341` (`fix(errors): complete contextual 404 recovery states`). Rollback boundary: the shared presentation extraction, quote state-copy change, bare quote route-level not-found route, print-note presentation replacement, their associated tests, and the correction evidence in this task record.
- The delegated correction assessment reported `risk=high`, `review_due=true`, `review_due_reason=high_risk`, reason `unassessable`, and suggested disabling the clone review switch. That command was not run because the switch is user-owned. Parent re-assessment with the exact committed-only base selectors returned `risk=medium`, `reason=executable_change`, `changed_paths=12`, `changed_lines=274`, `review_due=false`, `review_due_reason=under_budget`; therefore no review transition is due and the clone switch remains ON.
- Parent spot check after the correction: focused Vitest command passed, 4 files / 7 tests. The writer also verified the additional `/cotizacion` page test (1 test); typecheck, lint, diff check, and production build passed.
- 404-3 RED: `pnpm exec vitest run src/app/not-found.test.tsx` — FAIL before component changes, unable to find accessible image `Logo de SEBASAM`.
- 404-3 GREEN: `pnpm exec vitest run src/app/not-found.test.tsx` — PASS, 1 file / 1 test; the test confirms the official logo asset and visible SEBASAM wordmark alongside the existing 404 content.
- 404-3 closure checks: `pnpm typecheck` — PASS; `pnpm lint` — PASS; `git diff --check` — PASS. `pnpm build` intentionally not run because the active local preview uses `.next`; the orchestrator will handle production build later.
- Parent spot check: `pnpm exec vitest run src/app/not-found.test.tsx` — PASS, 1 file / 1 test. Live preview at `http://127.0.0.1:3107/preview-404` returns HTTP 404 and includes the official logo, SEBASAM wordmark, tagline, and external CTA.
- 404-3 changes: `src/components/errors/not-found-experience.tsx` adds the logo/wordmark and compact token-based navy/blue identity header; `src/app/not-found.test.tsx` asserts the official logo and wordmark. No route logic, copy, animation, layout, palette, or shadow behavior changed.
- 404-3 commit: `a86f2a2` (`feat(errors): add SEBASAM branding to shared 404`). Rollback boundary: the official-logo/wordmark header in `src/components/errors/not-found-experience.tsx`, the matching assertions in `src/app/not-found.test.tsx`, and task 404-3 evidence.
- Native committed-only assessment against `33b18f4e2d382eb030f7a9ee6ab274aa39f7b27d`: `risk=medium`, reason `executable_change` (`src/app/admin/(protected)/notas/[id]/print/not-found.test.tsx`), `changed_paths=12`, `changed_lines=313`, `review_due=false`, `review_due_reason=under_budget`; no native review transition is due.
- User reported excess stacked padding in the preview and authorized a focused correction. The Card component’s built-in padding stacks with the 404’s own header/content spacing.
- 404-4 RED: `pnpm exec vitest run src/app/not-found.test.tsx` — FAIL before implementation because the assertion found no zero-padding class and the Card still carried its base `p-[var(--space-md)]` class.
- 404-4 GREEN: `pnpm exec vitest run src/app/not-found.test.tsx` — PASS, 1 file / 1 test; verifies that the 404 Card omits default padding while header horizontal padding equals the content inset.
- 404-4 checks: `pnpm typecheck` — PASS; `pnpm lint` — PASS; `git diff --check` — PASS. `pnpm build` intentionally not run because the active preview shares `.next`.
- 404-4 implementation: introduced an opt-in `flush` prop on `Card` to omit its default padding; the shared 404 uses it and aligns header `px-[var(--space-xl)]` with content `p-[var(--space-xl)]`, retaining compact vertical header padding and existing safe-area handling.
- 404-4 commit: `66398aa` (`fix(errors): remove stacked padding from 404 card`). Rollback boundary: the opt-in `flush` prop in `src/components/ui/card.tsx`, its use and balanced header inset in `src/components/errors/not-found-experience.tsx`, the focused assertions in `src/app/not-found.test.tsx`, and task 404-4 evidence.
- 404-4 native committed-only assessment against `33b18f4e2d382eb030f7a9ee6ab274aa39f7b27d`: `risk=medium`, reason `executable_change` (`src/app/admin/(protected)/notas/[id]/print/not-found.test.tsx`), `changed_paths=13`, `changed_lines=353`, `review_due=false`, `review_due_reason=under_budget`; no parent-coordinated review transition is due.
- Parent spot check: `pnpm exec vitest run src/app/not-found.test.tsx` — PASS, 1 file / 1 test. Live preview returns HTTP 404; rendered Card has no base padding class, and the brand header, wordmark, and CTA remain present.
- User screenshot showed the dynamic quote token error still uses the older red-card layout; keep all status-specific messages but switch its error shell to the shared 404 visual.
- Read the installed Next.js `Server and Client Components` guide: components default to Server Components and should only use Client Components when state, events, lifecycle, or browser APIs are needed. The static shared quote error wrapper has none of these needs.
- 404-5 RED: `pnpm exec vitest run src/features/public-quotes/components/shared-quote-error-state.test.tsx` — FAIL before production changes: all three status tests lacked the shared `404` visual contract.
- 404-5 GREEN: same focused command — PASS, 1 file / 4 tests. The first post-conversion run exposed one stale assertion tied to the old quote-header print classes; the test now asserts the shared 404 tagline's current token classes.
- 404-5 behavior: `SharedQuoteErrorState` is now a Server Component delegating to `NotFoundExperience`, preserving each existing title and the exact quote-contact message. The caller's domain mapping and route behavior are unchanged.
- 404-5 checks: `pnpm typecheck` — PASS; `pnpm lint` — PASS; `git diff --check` — PASS. `pnpm build` intentionally not run to preserve active preview `.next`.
- 404-5 commit: `19e4107` (`fix(quotes): use shared 404 error presentation`). Rollback boundary: `SharedQuoteErrorState` mapping/presentation and its focused regression test, plus the task 404-5 evidence.
- 404-5 committed-only assessment against `33b18f4e2d382eb030f7a9ee6ab274aa39f7b27d`: `risk=medium`, reason `executable_change`, `changed_paths=13`, `changed_lines=437`, `review_due=true`, `review_due_reason=slice_budget_reached`.
- Native review: consented for this exact candidate; one `review-reliability` lens completed with no findings. Final capture was approved and exact acknowledgement burned authority: lineage `review-ae7edbffd2a0450d`, target `sha256:47e220e69f4f6627ff12986603a9d7d5f9480f143ccd854a0366a1203eb82f0a`, consumed revision `sha256:c9020275c5a412fd8feb10cced5272b39d4bc2494954b734efb1f82c5e9877d9`.
- User requested a mobile layout without a visible card frame, scaled to the available viewport, while retaining desktop card styling.
- Mobile layout acceptance: preserve safe-area insets; remove card chrome only below the desktop breakpoint; keep desktop card border/radius/surface/shadow and brand header/content alignment.
- 404-6 commit: `249f6ed` (`fix(errors): use frameless mobile 404 layout`). Assessment against the last acknowledged boundary `19e410769f8d0e3f4310cee225980cc322ba9528`: `risk=medium`, 3 paths/49 lines, `review_due=false`, `under_budget`.
- Parent spot check: `pnpm exec vitest run src/app/not-found.test.tsx` — PASS, 1 file/1 test. Live preview returns HTTP 404; rendered surface has no mobile card chrome and restores the framed card at `md`.
- User refined the mobile composition: SEBASAM header at top, 404 content centered in the remaining height, and CTA near the bottom with 24px clearance above the safe area.
- User requested a single flat hex bolt with two motion marks instead of a gear, and confirmed the 404 should keep only the external “Visita SEBASAM” action.
- Final production build passed in a disposable offline worktree; `/cotizacion` and `/_not-found` were generated. The temporary worktree was removed and the live preview remained running.
- PR #713 opened at https://github.com/pabcrz/sebasam-app/pull/713 to `develop`, `Closes #707`, labels `type:feature` and `size:exception`. The 591-line size exception was explicitly approved; Vercel and Vercel Preview Comments passed.

## Next Step

Task 404-9 is complete in local commit `f2f9536`; do not push while the preview is active. After the preview no longer depends on this worktree’s `.next`, publish the branch update to PR #713; merging remains a separate user decision. Preserve `http://127.0.0.1:3107/preview-404`; do not stop or mutate its process.
