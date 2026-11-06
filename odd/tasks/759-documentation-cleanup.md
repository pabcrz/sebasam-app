# Documentation cleanup — issue #759
Objective: distinguish current documentation, proposals and history without changing application behavior. Branch: `feature/759-docs-cleanup`.
Delivery: auto-chain / feature-branch-chain (human selected); forecast 900–1,200 authored changed lines across four reviewable work units; no push or PR authorized. Checks: Markdown references, evidence readback, `git diff --check`; no runtime RED applies to passive documentation.

## Specs

- S1 — "revisa el repo, creo que hay bastante contenido basura.\npor ejemplo la carpeta de openspec no se realmente que tiene.\nla doc no esta al dia, etc. hay muchso archivos que repiten informacion... y algunas reglas un poco raras..."
- S2 — "bien, lo hacemos en un worktree limpio para no chocar con otras cosas"
- S3 — "si hazlo" — approval of the proposed isolated worktree and GitHub issue discovery/creation in the existing session.
- S4 — "autorizo" — approval of #759 scope and applying `status:approved` before implementation.
- Assumptions/scope accepted through #759: documentation only; preserve useful specifications and history; do not silently change contribution policies; preserve original checkout and local drafts; no push, PR or merge.

## Tasks

- T1 [S1,S2,S4] inline; done; README entry point plus verbatim R1–R18 domain reference and history indexes; commit: this slice (`feature/759-01-doc-entrypoints`), hash recorded next slice.
- T2 [S1,S2,S4] inline; pending; reconcile architecture and status against versioned implementation; commit: pending.
- T3 [S1,S2,S4] inline; pending; consolidate duplicated agent/design guidance without changing contribution policies; commit: pending.
- T4 [S1,S2,S4] inline; pending; explain OpenSpec/history ownership, correct stale tooling claims, verify references and final scope; commit: pending.

## Log

L1 — Original request verbatim:
> revisa el repo, creo que hay bastante contenido basura.
> por ejemplo la carpeta de openspec no se realmente que tiene.
> la doc no esta al dia, etc. hay muchso archivos que repiten informacion... y algunas reglas un poco raras...

L2 — User: "bien, lo hacemos en un worktree limpio para no chocar con otras cosas". Worktree created at the user-authorized sibling path from `develop` commit `f02d0c0d37f7a94134eacc13b611494e3b9d0026`; clean status verified, original checkout untouched.

L3 — User: "si hazlo". Issue #759 created once and exact title/body read back; `type:docs`, initially `status:needs-review`.

L4 — User: "autorizo". Approval applied and read back: `status:approved`, `type:docs`; GitHub actor capability ADMIN. No push or PR authorized.

L5 — Human selected `feature-branch-chain`; tracker branch `feature/759-docs-cleanup` remains at the develop base. Slice branches will retain cumulative parentage without push or PR. Remote default branch verified as `develop`.

L6 — Route: parent inline, one coherent documentation cleanup rather than independent behavior units; audit already mapped the relevant surfaces. Existing untracked `docs/product-guide/` and other local artifacts belong to separate work and are not copied. Preserve historical requirements rather than deleting whole directories.

L7 — T1 checks: Python local Markdown destination check and exact preservation of all 18 original domain-rule rows PASS; `git diff --check` PASS. Passive documentation has no meaningful runtime RED; no app tests/build executed. Native assessment: medium, `reviewDue: false`, `under_budget`, no independent verifier required. Slice 1 starts at `f02d0c0` and targets tracker branch `feature/759-docs-cleanup`; subsequent branches target the immediately preceding slice. No PRs created.
