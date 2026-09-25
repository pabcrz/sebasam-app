# Profile menu outside-click dismissal

## Objective
Close the admin profile menu when the user clicks outside it, while keeping it open for interactions inside.

## Problem and why
Issue #684 reports that the profile menu closes only when its trigger is clicked again; outside clicks do not dismiss it. The header currently uses a native `<details>` element without outside-click handling.

## Scope and constraints
- Issue: https://github.com/pabcrz/sebasam-app/issues/684
- Authorized scope: `src/components/layout/admin-shell.tsx`, `src/components/layout/admin-shell.test.tsx`, and this task document.
- Do not touch unrelated payroll modifications in the original checkout.
- Preserve native disclosure semantics, toggle-by-trigger behavior, menu links, and interaction within the menu.
- Resolved TDD: enabled by `openspec/config.yaml`; source: project configuration; runner: `pnpm test:ui`.
- Route: delegated direct writer. Trigger evidence: implementation and regression coverage are two non-trivial files; reads that prepare the write belong with the writer.
- Delivery strategy: `ask-on-risk`; estimated change is below the 400-line advisory planning heuristic.

## Acceptance criteria
- Clicking anywhere outside the open profile menu closes it.
- Clicking inside the menu does not close it unless normal navigation/action behavior applies.
- The profile trigger still opens and closes the menu, with accurate accessible expanded state.
- Regression coverage verifies outside dismissal and preserved inside interaction.

## Tasks
- [x] **684-1** Add regression coverage, implement outside-click dismissal, run applicable checks, and create one conventional work-unit commit.
  - Verification: `pnpm exec vitest run src/components/layout/admin-shell.test.tsx`, `pnpm lint`, and `pnpm typecheck`.
  - Route: delegated direct; writer trigger: two non-trivial files and preparation reads belong with the writer.

## Progress and evidence
- Approved issue #684; isolated branch: `bugfix/684-profile-menu-outside-click`.
- Initial check: original checkout contains unrelated modified payroll files; implementation is isolated in a separate worktree.
- Strict TDD RED: the outside-click regression test failed before implementation because the profile `<details>` remained open after an outside click (observed after the offline install; RED was not rerun).
- GREEN: `pnpm exec vitest run src/components/layout/admin-shell.test.tsx` — passed, 1 file and 25 tests.
- `pnpm lint` — passed with 0 errors and 8 warnings in unrelated payment, quote, and work-order files.
- `pnpm typecheck` — passed after `pnpm exec prisma generate`; the first typecheck attempt failed because the locally installed Prisma client had not been generated, and generation used the checked-in local schema only.
- `pnpm build` — passed; emitted an available Prisma update notice and a Node experimental `localStorage` warning.
- Native assessment: medium, under_budget; no review due.
- Parent spot-check: `pnpm exec vitest run src/components/layout/admin-shell.test.tsx` — passed, 1 file and 25 tests.
- Offline install did not change tracked dependency manifests or lockfile.
- Rollback boundary: revert the task commit to remove outside-click handling, its regression tests, and this task evidence; no runtime harness beyond the focused jsdom tests applies.
- Commit identity: `19569b719c95a5d7774eb671b361ccdc8c815321` — `fix(admin): close profile menu on outside click` on `bugfix/684-profile-menu-outside-click`.

## Next step
PR #685 was opened and read back against `develop`: https://github.com/pabcrz/sebasam-app/pull/685. Await CI/review; merge remains human-owned.
