Closes #

## PR Type

- [ ] New feature
- [ ] Bug fix
- [ ] Documentation only
- [ ] Code refactoring
- [ ] Maintenance/tooling
- [ ] Breaking change

## Summary

<!-- Bulleted summary of the intent, behavior, and impact of the change -->

## Changes

| Area | Change |
|------|--------|
| <!-- Package, domain, or layer --> | <!-- Description of change --> |

## Test Plan

<!-- Check off all relevant verifications executed -->
- [ ] `pnpm exec prisma generate` (if schema was modified)
- [ ] `pnpm typecheck`
- [ ] `pnpm lint`
- [ ] `pnpm test:vehicle` / `pnpm test:ui-contract` (if vehicles or contracts affected)
- [ ] Focused / module tests (`pnpm test:ui <path>`)
- [ ] Production build (`pnpm build` when app code/runtime affected)

## Warnings

<!-- Document size exceptions, approved scope changes, or staging/production migration notes -->

## Contributor Checklist

- [ ] Linked approved issue `Closes #<number>`.
- [ ] Added exactly one `type:*` label (`type:feature`, `type:bug`, `type:docs`, etc.).
- [ ] Conventional commit format used.
- [ ] No `Co-Authored-By` or AI attribution trailers.
- [ ] No secrets or `.env` files touched or committed.
