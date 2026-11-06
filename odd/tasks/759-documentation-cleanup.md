# Documentation cleanup — issue #759
Objective: distinguish current documentation, proposals and history without changing application behavior. Branch: `feature/759-docs-cleanup`.
Delivery: auto-chain / feature-branch-chain (human selected); four local reviewable slices, tracker branch unchanged; actual boundaries below; publication authorized by S5; merge not authorized. Checks: Markdown references, evidence readback, `git diff --check`; no runtime RED applies to passive documentation.

## Specs

- S1 — "revisa el repo, creo que hay bastante contenido basura.\npor ejemplo la carpeta de openspec no se realmente que tiene.\nla doc no esta al dia, etc. hay muchso archivos que repiten informacion... y algunas reglas un poco raras..."
- S2 — "bien, lo hacemos en un worktree limpio para no chocar con otras cosas"
- S3 — "si hazlo" — approval of the proposed isolated worktree and GitHub issue discovery/creation in the existing session.
- S4 — "autorizo" — approval of #759 scope and applying `status:approved` before implementation.
- S5 — "Abre la P R. Por favor" — publication of the previously selected feature-branch PR chain; no merge authorization.
- Assumptions/scope accepted through #759: documentation only; preserve useful specifications and history; do not silently change contribution policies; preserve original checkout and local drafts. S5 supersedes the earlier publication restriction; merge remains excluded.

## Tasks

- T1 [S1,S2,S4] inline; done; README entry point plus verbatim R1–R18 domain reference and history indexes; commit: `569ff9c` (`feature/759-01-doc-entrypoints`, 360 authored lines).
- T2 [S1,S2,S4] inline; done; current architecture reconciled; MVP bodies preserved with historical banners; SQL-security description corrected; commit: `9444529` (`feature/759-02-current-architecture`, 186 authored lines).
- T3 [S1,S2,S4] inline; done; deduplicated agent/design guidance; retained issue-first, Next.js warning and all contribution policies; commit: `e5acd00` (`feature/759-03-documentation-rules`, 111 authored lines).
- T4 [S1,S2,S4] inline; done; OpenSpec inventory/config reconciled, closed #497 archived byte-for-byte, final references and scope verified; commit: terminal slice ref `feature/759-04-spec-history` (exact hash mirrored in Engram after commit).

- T5 [S5] inline; done; published tracker #761 (draft) and children #762–#765; exact bodies, SHAs, bases and type:docs read back; all diffs under 400 lines, no auto-merge. Vercel previews may remain pending; merge not authorized.

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

L8 — T2 checks: Python changed-Markdown destinations, actual page-route table, four exact schema enum tables, unchanged original MVP bodies and SQL-revocation source checks PASS; `git diff --check` PASS. Native assessment passive, `reviewDue: false`; runtime tests not applicable. Slice 2 starts at `569ff9c` and targets slice 1.

L9 — T3 checks: Python Markdown destinations/anchors, exact Next.js warning preservation, retained process-policy assertions and unchanged design-token block PASS. `git diff --check` initially failed on an extra EOF blank line in AGENTS; corrected and rerun PASS. Native assessment medium, `reviewDue: false`, under budget. Slice 3 starts at `9444529` and targets slice 2; no source/runtime changes or app-test claim.

L10 — T4: GitHub #497 was read as CLOSED, closedAt `2026-09-08T06:57:17Z`; its historical PASS report and six files were preserved byte-for-byte under the archive. Canonical specs and prior archive unchanged. YAML RED: `ruby -ryaml -e 'YAML.load_file("openspec/config.yaml")'` exited 1, Psych::SyntaxError (line 52 column 5); GREEN: Ruby YAML parse plus schema/TDD, string-array rule shape and tooling assertions exited 0. Metadata now distinguishes Playwright fixtures from authenticated app E2E, ESLint from formatting, and undeclared coverage tooling. OpenSpec CLI compatibility was not executed or claimed.

L11 — Final structural verification: inline Python script passed 82 local Markdown destinations/anchors, exact retention of R1–R18 and historical MVP bodies, all six archived file byte comparisons, unchanged canonical specs/prior archive and docs/config-only scope. `git diff --check` and cached equivalent PASS. App source, schema/migrations, dependencies, workflows and tests unchanged; no app tests/build/browser checks run because the change is passive docs plus YAML syntax/tooling metadata. Original checkout still shows the same six untracked entries; no files copied or edited there. Native assessments for all completed units returned `reviewDue: false`; no review transaction or independent verifier was required.

L12 — Local delivery chain: `feature/759-docs-cleanup` @ `f02d0c0` ← slice 1 `feature/759-01-doc-entrypoints` @ `569ff9c` (360 lines) ← slice 2 `feature/759-02-current-architecture` @ `9444529` (186 lines) ← slice 3 `feature/759-03-documentation-rules` @ `e5acd00` (111 lines) ← slice 4 `feature/759-04-spec-history` (final commit). Counts use additions+deletions with rename detection; unchanged archived moves add no authored lines. Review each slice against its immediate parent, not against develop. No tracker/child PRs or pushes exist; issue remains open for PR-based closure.

L13 — User: "Abre la P R. Por favor". Publish the selected feature-branch chain to github.com/pabcrz/sebasam-app using the same authorized gh session, retaining approved #759 and type:docs. Tracker currently equals develop, so first add the existing slice-1 task document to give it a real documentation diff, then merge that tracker ancestry forward through the local slices without rewriting history. No application content changes; this avoids an empty tracker PR and keeps child diffs isolated.

L14 — Publication confirmed: tracker https://github.com/pabcrz/sebasam-app/pull/761 → develop (draft, 37 lines); #762 → tracker (323); #763 → #762 branch (186); #764 → #763 branch (111); #765 → #764 branch (61 before this evidence-only update). All OPEN, exactly one type:docs, approved #759, body/title/base/head/SHA verified; autoMergeRequest null. No required checks configured in observed rulesets/develop protection. Vercel Preview Comments succeeded for all; Vercel was pending for #761–#764 and succeeded for #765 at the observed head `78d0ffa`. This final metadata-only commit can trigger another preview; pending previews are not represented as green or merge authorization. No merge performed; issue remains open.
