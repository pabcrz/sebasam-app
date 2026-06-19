# Agent Instructions

Follow the canonical repository workflow in `docs/AI_WORKFLOW.md`.

<!-- BEGIN:nextjs-agent-rules -->
## Next.js version warning

This version has breaking changes. Before changing Next.js APIs, conventions, or file structure, read the relevant guide in `node_modules/next/dist/docs/` and heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## GitHub Issues and PR Workflow

GitHub Issues are the execution tracker for SEBASAM work.

- Before implementation or PR work, use an approved GitHub issue.
- For new planned work, create, search, or link a GitHub issue first.
- Branch per issue using conventional branch names (`feature/<issue>-short-name`, `bugfix/<issue>-short-name`).
- PRs must:
  - Include `Closes #N` in the description.
  - Include exactly one `type:*` label.
  - Use conventional commits.
- Completed historical local MVP items are represented as closed GitHub issues grouped in milestone `MVP histórico completado`.
- Future work must close issues through PR merge, not by editing local backlog only.
