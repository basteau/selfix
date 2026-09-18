# 08: Resolve CSS package exports

Status: in-progress
Blocked by: none

## Goal

Load supported package stylesheet exports using CSS-aware resolution instead of relying exclusively on Node's JavaScript resolution conditions. Keep the standalone runner and fail explicitly when the intended stylesheet cannot be loaded.

The inspected Nuxt UI package exposes its main stylesheet through a `style` condition that the current `require.resolve` approach does not select.

## Acceptance criteria

- [x] A fixture package exposing a root `style` export loads through its normal package-name CSS import.
- [x] When a package has separate JavaScript and stylesheet targets, CSS loading selects the stylesheet and never reads the JavaScript target as CSS.
- [x] Documented supported scoped/subpath exports and nested relative stylesheet imports resolve from the importing stylesheet.
- [x] Missing targets and unsupported export forms fail with useful import and origin context rather than silently inspecting a partial theme.
- [x] Existing Tailwind imports and module loading for trusted `@plugin`/`@config` directives remain working; CSS conditions do not alter module semantics.
- [x] Supported resolution forms and limitations are documented in the root README where needed.
- [x] No runtime dependency, automatic Vite/Nuxt configuration loading, or alternate config format is introduced.

## Verification

Use temporary local package fixtures in `packages/selfix/test/tailwind.test.ts`; cover both a style-only export and competing style/JavaScript targets. Add CLI theme-loading coverage if needed. Run `pnpm check`; append commands and outcomes during implementation.

## Notes

Approved from the core-hardening discussion. Start in `packages/selfix/src/tailwind.ts` at the stylesheet/module resolver boundary. Upstream reference: https://github.com/shadcn-ui/lint/blob/53de86f0e7dcc341a9cb45c383a9f2c454d1e958/packages/lint/src/tailwind/oracle.ts#L118-L196 . Adapt only bounded resolver behavior, preserve MIT attribution for adapted code, and do not copy remote-import suppression or workers. Loading the application's generated Nuxt UI theme is ticket 09, not promised by this ticket. Completion requires review and passing checks.

## Implementation progress

- Baseline: `73c43f90f796b58f9514917e4bac87ad795ab733` on `main`; clean tracked/untracked worktree.
- Owned scope: `packages/selfix/src/tailwind.ts`, `packages/selfix/test/tailwind.test.ts`, README, and this ticket.
- Testing boundary: real Tailwind compilation with temporary local packages, as approved above.

## Verification results

- Red: `pnpm exec vitest run packages/selfix/test/tailwind.test.ts` reproduced style-only resolution failure and JavaScript being read as CSS (2 failures, 54 passed).
- Green: both export regressions passed after CSS-aware resolution; `pnpm typecheck` passed.
- Added real package fixtures for root strings, style/default precedence, scoped exact subpaths, nested relative imports, missing/unsupported targets, and unchanged trusted plugin/config module resolution.
- Review regression: a symlinked package could not resolve its physical sibling dependency. Confirmed red, canonicalized stylesheet paths, then all 74 focused tests passed.
- Initial `pnpm check` encountered sandbox subprocess EPERM failures; rerun with execution permission passed all 214 tests and playground checks before the symlink regression was added. Final post-review `pnpm check` passed: typecheck, Oxlint, Oxfmt, package build, all 215 tests, and playground typecheck/design lint/build.

## Review outcomes

- Independent Standards and Spec reviews each identified the same P2 symlink dependency-resolution regression. Fixed with a focused fixture and realpath resolution.
- Both reviewers re-reviewed the fix and reported zero remaining findings.
- Documented limitations: exact CSS targets and style/default conditions only; no wildcard/array exports or automatic generated Nuxt theme loading.
