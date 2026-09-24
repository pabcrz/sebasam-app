# Customer selector dropdown scroll and focus

## Objective
Fix the customer results dropdown used by notes and quotes so its options can be scrolled and keyboard focus stays visually contained.

## Problem and why
Issue #680 reports that scrolling the customer selector in notes/quotes does not work and that its focus effect spills beyond the field/list bounds.

## Scope and constraints
- Issue: https://github.com/pabcrz/sebasam-app/issues/680
- Authorized scope: the shared quote-builder customer selector and its focused regression tests.
- Do not touch unrelated payroll changes in the original checkout.
- Keep the existing portal positioning, bounded viewport behavior, and keyboard interaction intact.
- Resolved TDD: enabled by `openspec/config.yaml`; source: project configuration; runner: `pnpm test:ui`.
- Route: delegated direct writer. Trigger evidence: the implementation and regression test are two non-trivial files, and test/source reads prepare the same bounded write.
- Delivery strategy: `ask-on-risk`; estimated change is below the 400-line advisory planning heuristic.

## Acceptance criteria
- Users can scroll within the customer results when the list exceeds its available height, without the surrounding page stealing that scroll.
- Keyboard focus styling does not render outside the dropdown option boundaries.
- A focused regression test covers the relevant dropdown overflow/focus styling contract.
- Existing keyboard selection, portal placement, and viewport clamping remain intact.

## Tasks
- [x] **680-1** Add focused regression coverage, fix customer-dropdown scrolling/focus containment, run applicable checks, and create one conventional work-unit commit.
  - Verification: `pnpm test:ui -- src/features/quotes/components/quote-builder.test.tsx`, `pnpm lint`, and `pnpm typecheck`.
  - Route: delegated direct; writer trigger: two non-trivial files and preparation reads belong with the writer.

## Progress and evidence
- Approved issue #680; isolated branch: `bugfix/680-customer-dropdown-scroll`.
- Initial check: original checkout contains unrelated modified payroll files; implementation is isolated in a separate worktree.
- RED: `pnpm exec vitest run src/features/quotes/components/quote-builder.test.tsx` failed the new contract test because the listbox did not include `touch-pan-y`; it already had bounded height, vertical overflow, and overscroll containment.
- GREEN: after adding touch gesture panning and making option focus rings inset, the focused suite passed (73 tests).
- Verification: `pnpm test:ui -- src/features/quotes/components/quote-builder.test.tsx` passed (192 files, 1548 tests passed, 3 files/29 tests skipped); `pnpm lint` passed with 8 existing warnings outside this issue; `pnpm typecheck` passed.
- Production build: `pnpm build` passed (Prisma Client generated; Next.js compile, TypeScript checks, and static page generation completed). Output included an upstream Prisma update notice and a Node experimental `localStorage` warning.
- A prior run of the full Vitest command had one unrelated timeout in `quote-builder-dialog.test.tsx` (`discards state and starts fresh when reopened`); the subsequent full rerun passed.
- Runtime harness: N/A — the change is CSS utility behavior in an existing client-side component, covered by UI tests; no separate runtime harness was available or required.
- Rollback boundary: revert only the customer-results listbox/option style changes and the corresponding regression test in the shared quote builder.
- Work-unit commit: `ad1fdd1` — `fix(quotes): contain customer dropdown scrolling and focus`.
- Parent follow-up review found the reported oversized ring belongs to the Cliente search input, whose shared `Input` defaults to a 3px external focus ring. The shared component remains unchanged; this selector now opts into `focus-visible:ring-inset` locally, with a regression assertion on its combobox class.
- Follow-up RED: `pnpm exec vitest run src/features/quotes/components/quote-builder.test.tsx` failed the new Cliente combobox assertion because its class list lacked `focus-visible:ring-inset`.
- Follow-up GREEN: `pnpm exec vitest run src/features/quotes/components/quote-builder.test.tsx` passed (73 tests); `pnpm lint` passed with the same 8 existing warnings outside this issue; `pnpm typecheck` passed.
- Native assessment: medium, under_budget; no review due.
- Parent spot-check: `pnpm test:ui -- src/features/quotes/components/quote-builder.test.tsx` passed (192 files, 1,548 tests passed, 3 files/29 tests skipped); the dialog test that timed out in an earlier full-suite run passed in this run.
- Follow-up work-unit commit: `daa5f97` — `fix(quotes): contain customer input focus ring`.

## Next step
Implementation and local checks are complete; the user has authorized opening the PR. Record the confirmed PR identity after creation.
