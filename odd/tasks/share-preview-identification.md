# Identifiable Share Previews — Issue #681

Issue: [#681 — Identifiable share previews](https://github.com/pabcrz/sebasam-app/issues/681) (approved)

## Objective

Make shared quotes, work orders, service notes, and payment-account links recognizable from their preview while preserving useful fallbacks and protecting sensitive payment information in metadata.

## Problem

Current share previews do not reliably identify the customer and unit/operator before the folio for quote, work-order, and service-note links; payment-account links also need an explicit payment-details identity and visually recognizable presentation.

## Why

Recipients need to recognize what a shared link concerns before opening it. Payment metadata must communicate the purpose without exposing credentials or account details.

## Scope and constraints

- **T1:** Make quote, work-order, and service-note share previews identify customer and unit/operator before the folio.
- **T2:** Make the payment-account share link preview explicitly identify payment details and be visually recognizable.
- **T4:** Refine the bank-account preview to include the account's bank name dynamically and remove claims of secure/gateway-based payment processing.
- Preserve useful fallbacks when identifying information is unavailable.
- Do not leak payment credentials or account details in metadata.
- The bank name may be shown; do not show account numbers, CLABE, account holder, or token in metadata or the Open Graph image.
- Do not claim that payment is secure or processed through an integrated gateway; occasional Mercado Pago use does not make this bank-account share link a payment gateway.
- Implement only T1, T2, and the accepted T4 refinement within the approved issue scope; task-document and setup-only workers must not edit application source.
- Do not fetch or push. Local work-unit commits on this issue branch are part of the authorized implementation.

## Authorized scope

Approved issue #681: <https://github.com/pabcrz/sebasam-app/issues/681>. Authorized local branch/worktree: `feature/681-identifiable-share-previews` at `/Users/pabcrz/Dev/sebasam/sebasam-app-worktrees/681-identifiable-share-previews`, based on the existing local `develop` branch. Application changes for T1, T2, and accepted refinement T4 are authorized only in this worktree and only within issue #681's stated scope. Do not fetch or push.

## Route and trigger evidence

- **Route:** Delegated-direct. The user authorized implementation in the requested worktree; T4 changes metadata, image rendering, and regression coverage across multiple non-trivial files.
- **Trigger evidence:** The approved issue and accepted T4 refinement require bank-name identification, safe generic fallback, removal of unsupported payment-security/gateway claims, and account-detail privacy. The multi-file writer trigger selects delegated-direct; it does not select SDD.

## Effective TDD mode and runner

- **Mode:** Strict TDD enabled.
- **Source:** Existing project Engram testing-capabilities configuration `sdd/sebasam-app/testing-capabilities` (#2374), recorded 2026-08-27. This was read as existing project configuration; no `sdd-init` command was run.
- **Runner:** `pnpm test:ui` (`vitest run`). Focused coverage: `pnpm test:ui -- <focused test file>`; app checks: `pnpm lint`, `pnpm typecheck`, and `pnpm build` if production build output may be affected, per `docs/AI_WORKFLOW.md`.
- **Requirement:** For each behavior, first add/update focused tests and observe RED, implement to GREEN, then refactor without changing behavior.

## Actionable checklist

- [x] **T1** — Update quote, work-order, and service-note share previews to prioritize customer and unit/operator identification before the folio; retain useful fallbacks.
- [x] **T2** — Update the payment-account share-link preview to explicitly identify payment details and appear visually recognizable, without exposing credentials or account details in metadata.
- [x] **T3** — Resolve and record effective TDD mode/source before app implementation.
- [x] **T4** — Show the bank name dynamically in the account preview; remove unsupported security/gateway claims.

## Acceptance criteria

- Quote, work-order, and service-note previews surface customer and unit/operator identification before the folio when available.
- Missing identifying values use useful existing or defined fallback content rather than blank/unhelpful previews.
- The payment-account share preview clearly identifies payment details and is visually distinguishable.
- Metadata contains no payment credentials or account details.
- The account preview identifies the bank name when available, with generic fallback copy when absent.
- The preview does not claim “pago seguro” or imply an integrated payment gateway.
- Focused tests cover the preview content, fallback behavior, and sensitive-metadata exclusion; applicable lint/typecheck/build checks are recorded.

## Applicable checks

- `pnpm test:ui -- <focused test file>` for focused preview and metadata tests (exact focused test file to be determined during implementation).
- `pnpm lint` and `pnpm typecheck` for app-code changes.
- `pnpm build` if changes can affect production build output.
- Keep focused tests with each behavior and record exact test commands/results and commit IDs here; run `pnpm lint` and `pnpm typecheck` at task closure, plus `pnpm build` if production output is affected.

## Advisory changed-line forecast

Estimate only: approximately **80–180 authored changed lines** across implementation, focused tests, and supporting metadata/presentation changes; generated artifacts excluded. Multi-file scope has uncertainty, so revisit after mapping actual call sites. This is below the repository's 400-line review budget as a planning estimate, not a guarantee.

## Delivery strategy

**`ask-on-risk`** — ask before expanding scope or crossing the review-size/risk boundary; do not silently split or broaden this issue.

## Progress

- [x] Created the issue-specific local worktree and branch from local `develop`.
- [x] Created and read back this feature task document before any app source edit; corrected its TDD source and route evidence before implementation.
- [x] Resolve the effective TDD mode before implementation.
- [x] Implement T1 and T2, verify acceptance criteria, and commit both work units.
- [x] Implement accepted refinement T4, verify its acceptance criteria, and commit the refinement work unit.

## Verification evidence

- Base commit: `6a40db6765b22830c3236a711c8748c4c05a7116` (local `develop`).
- Worktree and branch creation succeeded using local refs only.
- No application source files were changed in this setup task.
- Strict TDD is enabled by the existing project testing-capabilities observation; its exact UI runner is `pnpm test:ui`.
- Feature document read-back: successfully read after creation; contents and scope verified.
- Engram mirror: pending; prior write rejected because multiple active sessions matched. Retry only with an unambiguous session identity.

### T1 outcome

- Shared `/cotizacion/[token]` Open Graph and Twitter titles now lead with customer, operator (when present), and vehicle description; the opaque folio follows those identifiers. The existing fallback still returns the document type when token/customer data is unavailable.
- The Open Graph image now headlines the customer, follows with vehicle/operator identity, and demotes the folio to a smaller document-reference line. Missing customer and vehicle continue to use existing useful fallbacks.
- Strict TDD: `pnpm exec vitest run 'src/app/cotizacion/[token]/page.test.tsx'` first failed three metadata assertions (RED); after implementation it passed (9 tests). `pnpm exec vitest run 'src/app/cotizacion/[token]/opengraph-image.test.tsx'` first failed the new ordering assertion (RED); after implementation it passed (4 tests).
- Rollback boundary: revert only the quote metadata and OG-image changes and their two focused tests; preserve unrelated code and current fallback behavior.
- T1 work-unit commit: `8ad6b20` (`feat(shares): identify customers in quote previews`). Parent's fresh native assessment for this committed-only candidate against the base recorded `risk: medium`, `review_due: false`, `review_due_reason: under_budget`, `changed_paths: 5`, and `changed_lines: 145`; no `next_transition` was returned.
- `pnpm test:ui -- 'src/app/cotizacion/[token]/page.test.tsx'` was attempted but its script ran the full suite; 79 suites initially failed from ungenerated Prisma Client and one unrelated assertion failed. After `pnpm exec prisma generate`, the direct focused Vitest commands above ran successfully.

### T2 plan and progress

- Exact route currently mapped: `/datos-de-pago/cuenta/[token]` (`src/app/datos-de-pago/cuenta/[token]/page.tsx`). A repository glob for `src/app/**/datos-de-cuenta/**` found no route, so the provided `/datos-de-cuenta/estandar-<token>` example does not match this checkout's route layout; the existing shareable bank-account token route remains unchanged.
- Keep payment-account metadata generic and add a purpose-built Open Graph card with no token/account-specific values. Preserve `getPublicBankAccountByToken`, `DirectPaymentPage`, and not-found behavior.
- T2 privacy assertion test covers generic metadata and OG-card text without account-specific values.
- T2 strict TDD evidence: with the regression test retained, temporarily restored only the original generic metadata and a neutral image; `pnpm exec vitest run 'src/app/datos-de-pago/cuenta/[token]/page.test.tsx'` failed the metadata and image-recognition assertions (RED, 2 failures/2 existing tests passed). Restored the descriptive generic metadata and payment card; the same command passed all 4 tests (GREEN).
- The OG metadata and card contain only fixed generic payment purpose text; they do not incorporate route token, bank, account holder, account number, CLABE, or other per-account values. `getPublicBankAccountByToken`, page rendering, and not-found handling are unchanged.
- T2 rollback boundary: revert only this route's metadata, its token-scoped `opengraph-image.tsx`, and the focused test changes; do not touch payment account storage, share-token resolution, or payment rendering.
- Full closure checks: `pnpm test:ui` passed (192 files passed, 3 skipped; 1,549 tests passed, 29 skipped); `pnpm lint` passed with 8 warnings, all outside the changed files; `pnpm typecheck` passed; `pnpm build` passed, including production compilation, TypeScript, and static-page generation.
- T2 work-unit commit: `edfe51a` (`feat(shares): brand public bank account preview`). Its committed-only assessment against base `6a40db6765b22830c3236a711c8748c4c05a7116` reported `risk: medium`, `review_due: false`, `review_due_reason: under_budget`, `changed_paths: 8`, and `changed_lines: 237`; no `next_transition` was returned.

### T4 accepted refinement — implemented

- User approved adding the bank name dynamically to the account preview so the shared link is easier to identify.
- Remove any “pago seguro” claim and wording that suggests an integrated payment gateway; Mercado Pago may be used occasionally, but this link displays account/payment details rather than processing payments.
- Preserve generic fallback copy when no bank name is available and keep account numbers, CLABE, account-holder data, and token out of metadata and the Open Graph image.
- Strict TDD: `pnpm exec vitest run 'src/app/datos-de-pago/cuenta/[token]/page.test.tsx'` failed the four new dynamic-bank/fallback assertions (RED; 4 failed, 2 passed). After implementation the same command passed all 6 tests (GREEN).
- Added `getPublicBankNameByToken`, which applies the same public-share eligibility constraints as the full account lookup but selects only `bankName`. Metadata and the OG image use this narrow lookup; metadata includes the bank when nonblank, and the image uses `Banco` when missing. No account number, CLABE, holder, token, or gateway/security claim is included.
- The existing full account page lookup, rendering props, and not-found validation were not changed. Tests mock the bank-name lookup and make no database request.
- Full closure checks: `pnpm test:ui` failed (2 files failed, 193 passed; 7 tests failed, 1,573 passed). Failures were in unrelated payment concurrency integration tests (Prisma `payableNoteId` constraint) and quote-builder-dialog UI tests (timeouts/interaction failures). `pnpm lint` passed with 8 existing warnings outside changed files; `pnpm typecheck` passed; `pnpm build` passed.
- Rollback boundary: revert only the new bank-name lookup, dynamic metadata/image rendering, focused tests, and this T4 evidence; preserve existing public account retrieval, page rendering, and token validation.
- T4 work-unit commit: `e52e3da` (`feat(shares): identify bank in account previews`). Committed-only native assessment against `6a40db6765b22830c3236a711c8748c4c05a7116`: `risk: medium`, `review_due: false`, `review_due_reason: under_budget`, `changed_paths: 9`, `changed_lines: 307`; reason code `executable_change` referenced `src/app/cotizacion/[token]/opengraph-image.test.tsx`. No `next_transition` was returned. This assessment is not a review approval.

## Rollback boundaries

- Setup rollback: remove only `odd/tasks/share-preview-identification.md` and the issue-specific worktree/branch if explicitly requested; do not alter the base checkout or its unrelated payroll changes.
- Implementation rollback: revert only the files and behavior introduced for T1/T2, preserving pre-existing fallback behavior and unrelated changes. Do not remove or modify payment credentials/account data; none belongs in preview metadata.

## Next step

All approved issue #681 implementation is complete in this worktree. The T4 work-unit commit and committed-only native assessment are recorded above. Engram mirror remains pending because the store reported multiple active sessions; retry synchronization only when session identity is unambiguous. No PR or remote Git operation is authorized.
