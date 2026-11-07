# Unified product handbook — issue #770
Objective: one connected canonical product manual, with distinct linked technical/runbook references. Base: `develop` @ `bd4e720`; tracker: `feature/770-product-handbook`.
Delivery: auto-chain / feature-branch-chain (human selected); forecast 800–1,200 authored lines in cohesive local slices, no push/PR/merge authorized. Checks: Markdown destinations/anchors, rule IDs/content, navigation, source readback and `git diff --check`; passive documentation has no meaningful runtime RED.

## Specs

- S1 — "bien, ahora revisa docs/product-guide. y hagamos una sola version que este conectado todo. dame tu propuesta."
- S2 — "me agrada tu analisis, implementalo, y actualiza develop antes jaja"
- S3 — Issue authorization answer: "Sí, crear y aprobar el issue" for `github.com/pabcrz/sebasam-app`, title `docs: unificar manual de producto y referencias canónicas`, labels `type:docs` / `status:approved`, same gh session. Delivery answer: "Cadena sobre rama de seguimiento — recomendada"; no publication permission.
- Accepted proposal: `docs/product-guide/index.md` owns the manual entry; add `concepts.md` and `flows.md`; retain chapters for quotations/work/notes, payments, customers/workers/payroll, users, vehicles/public surfaces and completed-work knowledge/assistant; rename dashboard chapter to `dashboard.md` and move agreements into payments. Do not create one giant document.
- Accepted ownership: product behavior has one owner; redistribute unique `docs/DOMAIN_RULES.md` content into appropriate chapters, retain R1–R18 IDs and distinguish objectives from implemented facts, then remove the parallel document. Transfer unique content from guide architecture/platform chapters to the correct manual/technical/runbook owner, then remove those two duplicate chapters without redirect stubs.
- Accepted boundaries: README leads to the manual; ARCHITECTURE owns technical structure/data boundaries/routes, DESIGN owns visual/interaction contracts, HISTORICAL_IMPORT owns import format/procedure, DATABASE_SAFETY/PRODUCTION_RELEASE own operational procedures, AI_WORKFLOW/GITFLOW own contribution. Link instead of duplicating these contracts.
- Accepted chapter shape: purpose/actor, usual journey, own rules/restrictions, actual UI availability versus domain/API capability, connections to other chapters, linked verifiable code/tests. Shared concepts and end-to-end journeys connect work and direct-sale notes, captures/applications/credit, payroll, knowledge and public surfaces. Persisted enums, visual labels, objectives and deployment verification must remain distinct.
- Constraints: documentation only, current merged baseline only, no unmerged issue760 behavior, no app/schema/dependency/workflow changes, no deleted MVP-document restoration, no new doc tooling. Preserve all ten untracked source drafts byte-for-byte in the original checkout; do not move, overwrite or delete them.

## Tasks

- T1 [S1,S2,S3] inline; done; ten original drafts imported byte-identically with 14 relative destinations checked; commit: this seed slice, hash recorded in next slice.
- T2 [S1,S2] delegated (runtime context backstop); pending; connect and reconcile the manual, redistribute unique rules/content, and consolidate technical references with single-topic ownership; commits: pending.
- T3 [S1,S2] inline readback after writer self-checks; pending; verify content preservation, links/anchors, scope and draft integrity, finish local review slices; commits: pending.

## Log

L1 — User request verbatim: "bien, ahora revisa docs/product-guide. y hagamos una sola version que este conectado todo. dame tu propuesta."

L2 — User approval verbatim: "me agrada tu analisis, implementalo, y actualiza develop antes jaja". Original develop fast-forwarded from `f02d0c0` to `bd4e720`; collision preflight passed and all ten draft SHA-256 hashes remained identical. Reused the already-authorized registered docs-cleanup worktree; no new external path was needed.

L3 — Human authorized issue discovery/creation including protected `status:approved`, and selected feature-branch-chain. Duplicate searches returned none; exact target identity, ADMIN permission, existing labels and blank-issue support verified. #770 created once and exact title/body/state/labels read back. No push, PR or merge authorized for this feature.

L4 — Initial draft audit: ten files / 255 lines, broad domain coverage but weak cross-module handoffs, duplicate architecture/platform/import material and stale treatment of architecture as only a proposal. These are findings to reconcile against the updated baseline, not permission to alter product behavior. Historical old MVP snapshots remain deleted. The original untracked task file belongs to prior work and is not overwritten.

L5 — Route: parent imports/verifies untouched drafts, then a bounded worker owns consolidation because the runtime context backstop fired. This is one connected behavior, not parallel independent writers. Parent owns exact deletions if child tools refuse them, task/memory state, native assessment, commit slicing and delivery policy. Workload forecast is advisory; preserve content rather than compressing it to fit a counter. Review child slices against immediate parents; tracker is the eventual final integration branch.

L6 — Tracker commit `30f09c0`; source import checksum checks PASS for all ten drafts, 14 relative destinations PASS, `git diff --check` PASS. No meaningful runtime RED for passive docs. Tracker native assessment was unavailable because freshly copied untracked files required explicit declaration; no lifecycle/retry was attempted, returned plan remains writer self-verification without independent verifier. Source drafts will all be staged in the new seed candidate before that candidate's assessment.
