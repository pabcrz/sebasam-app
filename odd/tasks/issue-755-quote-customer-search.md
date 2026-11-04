# Quote customer search renewal — issue #755
Objective: isolate customer-search orchestration without changing behavior. Branch: `feature/755-quote-customer-search`; base: `f75860d4a33b1c4c1a9ee69b1cb2e37b0d1883ab`.
Delivery: ask-on-risk, one cohesive unit, forecast 350–400 authored lines including this log; runner: `pnpm test:ui`. Risk: item 4 (async debounce/cache/stale-response invalidation).

## Specs
S1. User: "si quisiera replicar está app, de una forma mas eficiente, teniendo cuidado de archivos interminables, modulos concisos, etc. algo que pueda ser mantenible a largo plazo y escalable. porque ahora hay muchas cosas botadas, interfaces medio raras, funciones a medias, etc"
S2. User: "hagamos una renovación. en esto podrías cambiar a shadcn? por ejemplo... solo es una duda jaja". Shadcn remains a question, not installation scope.
S3. User: "siii, me faltó que no trabajemos en el principal." Work only in the registered isolated worktree.
S4. User: "sii, hazlo" in response to merging PR #754 and approving issue #755 to start the separate next unit. Approved issue: https://github.com/pabcrz/sebasam-app/issues/755.

## Tasks
T1 | S1,S3,S4 | inline (existing tests plus one race characterization) | done | Commit: pending; baseline 103 passed, 1 known FormData failure; both new race cases passed.
T2 | S1-S4 | inline (one dependent behavior unit; no writer trigger) | done | Commit: pending; job-11: focused 103 pass/1 known failure; full 1738 pass/5 known failures/30 skipped; lint/typecheck exit 0; no new failures.
T3 | S1-S4 | delegated verify (Risk item 4), then inline delivery | in_progress | Independent verifier passed S1-S4; parent spot check passed 22 selected tests; local commit/evidence recording next. No new push/PR/merge authorized.

## Log
L1. Original user request: "si quisiera replicar está app, de una forma mas eficiente, teniendo cuidado de archivos interminables, modulos concisos, etc. algo que pueda ser mantenible a largo plazo y escalable. porque ahora hay muchas cosas botadas, interfaces medio raras, funciones a medias, etc"
L2. User clarified isolation: "siii, me faltó que no trabajemos en el principal." User approved the next plan with "avanza*" and then "sii, hazlo" for merge/approval/start.
L3. PR #754 merged as base f75860d4; issue #755 has status:approved and type:chore, confirmed by remote readback. Same isolated worktree, new feature branch.
L4. Approved issue constraints: extract only search text/options/known customers/cache/debounce/loading/error/request invalidation into a quotes-local hook. Keep selection business state, fiscal defaults, contact resets, inline creation, JSX, keyboard/portal positioning and dirty snapshots in QuoteBuilder. No shared helper/reducer/action/schema/dependency changes and no shadcn installation.
L5. Allowed source edits: src/features/quotes/components/quote-builder.tsx; new use-quote-customer-search.ts in that directory; quote-builder.test.tsx. This task log is the sole additional tracking surface.
L6. Preserve synchronous invalidation on every edit/selection/inline creation; both success and error/finally must ignore obsolete requests. Preserve local name-only filtering, normalized exact cache, 500ms debounce, minimum 2 characters and server action input. Keep hidden input placement/order; do not fix the pre-existing operation field ordering assertion.
L7. Verification: characterize public UI before extraction; quote-builder, quote-builder-dialog and quote-builder-state suites, full UI suite, lint and typecheck. No meaningful RED: behavior-preserving extraction, so characterize before/after. Independently verify async invariants against this entire document and isolated probes.
L8. Known base failures from pilot: quote-builder native FormData order expects no operation field (1); shared public quote errors lack Visita SEBASAM link (3); note print recovery lacks engranaje image (1). Previously confirmed on clean f02d0c0; full suite had 30 skipped DB-dependent tests; do not invent DB coverage.
L9. Before extraction: job-10 ran builder/dialog/state suites: 103 passed, one known operation/FormData ordering failure (exit 1); both new stale-success/stale-error cases passed. This baseline failure remains outside scope.
L10. Hook extracted inline; rendering AST matches base except the customer-search event handler delegation. Builder 1289 to 1239 lines; diff --check passed.
L12. ASSESS over staged candidate: native medium, escalation item 4 high; independentVerifier true; reviewDue false (under_budget). Independent verifier met S1-S4: isolated focused customer/query/search tests 22 pass, isolated typecheck exit 0; additional temporary public-UI async probes passed. Initial verifier scratch setup failed on a missing generated client before a corrected setup passed; no candidate defect. Parent spot check repeated the focused command: 22 pass, 56 unrelated tests deselected, exit 0. No new blockers. Build/browser not run; presentation unchanged. Verifier reported its scratch /tmp/quote-search-verify.sgUsia retained; no cleanup outside project attempted without authorization.
L11. After extraction job-11: focused exit 1 (103 pass, same 1 FormData failure); full suite exit 1 (1738 pass, same 5 failures, 30 skipped); lint exit 0 (same 2 unrelated warnings), typecheck exit 0. No new failures. Known baseline failures remain visible, not corrected or hidden. T2 source outcome is complete; independent verification/delivery remains T3.
