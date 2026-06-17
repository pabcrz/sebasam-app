# AI Workflow for SEBASAM App

This is the canonical workflow for AI assistants working in this private repository. Tool-specific instruction files should point here instead of duplicating these rules.

## Quick path

1. Read the issue or task first.
2. Follow the Gitflow rules in `docs/GITFLOW.md`.
3. Branch from `develop` for feature and non-production bugfix work.
4. Keep the branch, commits, and PR scoped to one issue or one clearly reviewable slice.
5. Run the checks that match the scope before marking work done.

## Branch and PR rules

| Topic | Rule |
|-------|------|
| Base branch | Branch feature work from `develop`, not `main`. |
| Feature branches | Use `feature/<issue>-short-name` when issue-backed, for example `feature/1-setup-hardening` or `feature/6-quote-draft`. |
| Bugfix branches | Use `bugfix/<issue>-short-name` when issue-backed. |
| PR scope | One branch/PR targets one issue or one clearly reviewable slice of one issue. |
| Target branch | Feature and non-production bugfix PRs target `develop`. Release/hotfix flow follows `docs/GITFLOW.md`. |

## Change discipline

- Do not bundle unrelated changes.
- Do not modify files, dependencies, formatting, generated artifacts, or docs outside the issue scope unless required.
- If an out-of-scope change is required, document why in the PR or handoff summary.
- If implementation reveals extra work, create or request a follow-up issue instead of silently bundling it.
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

## Repository architecture rules

| Topic | Rule |
|-------|------|
| Operational data | Use Prisma for operational business data. |
| Supabase | Use Supabase for Auth and Storage infrastructure. |
| Data boundary | Do not query Prisma-owned business tables through Supabase client helpers. |
| Auth profiles | Store app roles and operational profile data in `UserProfile`. |

## References

- `docs/GITFLOW.md` — branch, PR, release, and hotfix flow.
- `docs/MVP_ISSUES.md` — MVP backlog and acceptance criteria.
- `README.md` — project setup, commands, architecture rules, and deployment notes.
