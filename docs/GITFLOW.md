# Gitflow Workflow

This repository uses a pragmatic Gitflow model for a small MVP team. The goal is to keep `main` production-ready while still giving development work a safe integration branch.

## Branch rules

| Branch | Purpose | Rule |
|--------|---------|------|
| `main` | Production-ready code only | No direct commits. Changes arrive through PRs from release or hotfix branches. |
| `develop` | Integration branch for MVP development | Feature and bugfix PRs merge here first. |
| `feature/<issue-number>-short-name` | Tracked feature work | Branch from `develop` when a tracker number exists. |
| `feature/<short-name>` | Historical unnumbered branches | Existing naming only; new work requires an approved issue per [AI_WORKFLOW](./AI_WORKFLOW.md#issue-lifecycle). |
| `bugfix/<short-name>` | Non-production bug fixes | Branch from `develop`. |
| `release/<version-or-date>` | Deploy preparation | Branch from `develop`, then PR to `main`; merge back to `develop` after release fixes. |
| `hotfix/<short-name>` | Urgent production fixes | Branch from `main`, then PR to `main` and back to `develop`. |

## Pull request rules

- Open PRs for changes into `develop` and `main`.
- Do not commit directly to `main`.
- Keep PRs focused on one work unit.
- Use work-unit commits: code, tests, and docs for the same deliverable stay together.
- Keep PRs reviewable; split large changes before they become hard to review.
- Include `Closes #N` in the PR description, where `N` is the issue number.
- Add exactly one `type:*` label to each PR.
- Use conventional commits.
- Keep this repository private.

## MVP happy path

1. Create a feature branch from `develop`.
2. Implement one MVP issue or one reviewable slice.
3. Open a PR back to `develop`.
4. When a deploy candidate is ready, create `release/<version-or-date>` from `develop`.
5. Open a PR from the release branch to `main`.
6. After release, merge release changes back into `develop`.
