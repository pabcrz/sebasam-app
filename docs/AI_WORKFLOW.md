# AI Workflow for SEBASAM App

This is the canonical workflow for AI assistants working in this private repository. Tool-specific instruction files should point here instead of duplicating these rules.

## Workflow selection

ODD is the default execution and issue-tracking workflow for this repository. SDD is a complementary requirements-and-design workflow, not a replacement for the repository's issue, Gitflow, or ODD execution rules.

| Situation | Workflow |
|-----------|----------|
| Routine issue-backed implementation | **ODD**: track the issue and implement in scoped work units. |
| The user explicitly requests SDD, or requirements and architecture need agreement through artifacts before implementation | Add the relevant **SDD** proposal/spec/design artifacts, then execute and verify the issue under ODD. |
| It is unclear whether requirements or architecture need those artifacts and the choice would materially change the work | Ask one focused question before creating the SDD artifacts. |

Keep the GitHub issue as the execution tracker. Use SDD artifacts to clarify requirements and design; use ODD task tracking to manage implementation when the work is substantial. Avoid copying the same decisions or task detail into both: keep one execution checklist and link the relevant SDD artifacts from it. An explicit SDD request does not disable ODD, issue-first, or Gitflow requirements.

## Issue lifecycle

GitHub Issues are the execution tracker for SEBASAM work.

- Before implementation or PR work, use an approved GitHub issue.
- For new planned work, create, search, or link a GitHub issue first.
- Completed historical local MVP items are represented as closed GitHub issues grouped in milestone `MVP histórico completado`.
- Future work must close issues through PR merge, not by editing local backlog only.

These existing issue-first requirements also apply to the branch naming examples in GITFLOW; an old unnumbered branch is not permission to start new untracked work.

## Quick path

1. Read the approved issue or task first.
2. Use ODD for issue-based execution; add SDD artifacts only when requested or needed to settle requirements and design.
3. Follow the Gitflow rules in `docs/GITFLOW.md`.
4. Branch from `develop` for feature and non-production bugfix work.
5. Keep the branch, commits, and PR scoped to one issue or one clearly reviewable slice.
6. Run the checks that match the scope before marking work done.

## Branch and PR rules

| Topic | Rule |
|-------|------|
| Base branch | Branch feature work from `develop`, not `main`. |
| Feature branches | Use `feature/<issue>-short-name` when issue-backed, for example `feature/1-setup-hardening` or `feature/6-quote-draft`. |
| Bugfix branches | Use `bugfix/<issue>-short-name` when issue-backed. |
| PR scope | One branch/PR targets one issue or one clearly reviewable slice of one issue. |
| Target branch | Feature and non-production bugfix PRs target `develop`. Release/hotfix flow follows `docs/GITFLOW.md`. |
| Issue linkage | Every PR must link an approved GitHub issue with `Closes #<number>` unless the maintainer explicitly says the change is local-only and will not open a PR. |
| PR type label | Every PR must have exactly one `type:*` label. Create the missing label before opening PRs if the repo workflow requires it. |
| Chained PRs | When a change exceeds the 400-line review budget, split it into stacked PRs or record an explicit `size:exception` from the maintainer. |

### PR description standards

Use the [PR template](../.github/pull_request_template.md) as the single source for description sections and the contributor checklist. The first line must state `Closes #<number>`; select one PR type, summarize intent, map changes, record observed checks, and disclose approved scope/size exceptions or migration cautions. Its checklist retains the existing conventional-commit, no-AI-attribution and secrets-safety requirements.

## Change discipline

- Do not bundle unrelated changes.
- Do not modify files, dependencies, formatting, generated artifacts, or docs outside the issue scope unless required.
- If an out-of-scope change is required, document why in the PR or handoff summary.
- If implementation reveals extra work, create or request a follow-up issue instead of silently bundling it.
- Do not invent final visual design. Use neutral functional UI unless the task explicitly provides Figma screens/components or design-system instructions.
- Keep the repository private.
- Never commit secrets.
- Never commit `.env`.

## Commit discipline

Use atomic, coherent, conventional commits.

One commit should represent one complete reason for change, not a random grouping of files. Keep code, tests, and docs together when they belong to the same deliverable.

Good examples:

```text
feat(quotes): add draft quote totals
fix(auth): redirect unauthenticated admins
docs(workflow): document AI branch rules
```

Avoid commits like:

```text
update files
misc changes
fix stuff
```

## Checks before handoff

Run checks according to the size and risk of the change:

| Change scope | Expected checks |
|--------------|-----------------|
| Docs only | Review Markdown links and changed content. |
| App code | `pnpm lint`, `pnpm typecheck`, and focused tests when available. |
| Build or runtime behavior | `pnpm build` when the change can affect production build output. |
| Prisma schema/migrations | Prisma generate/migration commands appropriate to the task, plus app checks. |

If a check is not run, say why in the handoff.

### Shared test and verification contract

Testing is verification evidence shared by ODD and SDD, not a third planning workflow or an artificial phase that every change must add.

1. For each implementation task, identify a relevant runnable deterministic test and its expected outcome before changing behavior.
2. When such a test exists, observe RED before the fix, reach GREEN, and refactor while the test remains green. Do not claim RED or GREEN without observing it.
3. If no meaningful test or runner applies, or the change is passive documentation, state why and run proportionate structural or functional checks instead of inventing a test.
4. At handoff, list each exact check command and its observed result; explain every planned check that was skipped or unavailable. ODD closes a task only after its applicable proof is recorded. SDD retains its final Verify phase, using task-level evidence rather than replacing it with a vague testing phase.

If a required delegated result is empty, malformed, or incomplete, mark the work blocked and preserve its progress. Report the missing result; do not fabricate evidence, silently switch workflows, or repeat the delegation without a documented supported recovery.

## Repository architecture rules

Follow the data boundaries and auth contracts in [ARCHITECTURE](./ARCHITECTURE.md#límites-de-datos-y-ejecución). That is the canonical architecture reference; this workflow does not maintain another copy.

## References

- `docs/GITFLOW.md` — branch, PR, release, and hotfix flow.
- [Product handbook](./product-guide/index.md) — rules, objectives and observed behavior, not an execution checklist.
- GitHub Issues — current execution tracker; Git history retains early MVP snapshots.
- [README](../README.md) — setup, commands and documentation entry points.
