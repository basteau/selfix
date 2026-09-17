# 01: Respect helper shadowing

Status: in-progress
Blocked by: none

## Goal

Prevent name-based recognition of `cn`, `clsx`, and `twMerge` from treating locally replaced or template-shadowed functions as trusted class helpers. Unknown calls must remain dynamic; never execute application expressions.

Currently a local `const cn = () => 'p-[13px]'` used as `cn('p-2')` is incorrectly considered static and clean. Slot-local helpers have the same problem.

## Acceptance criteria

- [x] Calls shadowed by slot or loop bindings are dynamic, without claiming their arguments describe the returned classes.
- [x] Conflicting local function and variable declarations prevent helper recognition, including declarations outside the supported static-constant shapes.
- [x] Existing unshadowed helper behavior is preserved.
- [x] `require-static-classes` reports affected calls at their original SFC attribute locations.
- [x] No helper body, default initializer, or application expression is evaluated.
- [x] Focused tests cover local replacements, template shadowing, unaffected siblings, and normal/fallback template collection where applicable.

## Verification

Exercise collection in `packages/selfix/test/vue.test.ts` and observable rule output in `packages/selfix/test/rules.test.ts`. Include throwing function bodies as non-execution fixtures. Run `pnpm check`; append commands and outcomes here during implementation.

## Notes

Approved from the core-hardening discussion. Start in `packages/selfix/src/vue.ts`, particularly helper-call collection and binding/scope tracking. Import-aware helper discovery, configurable helpers, and cross-file tracing are explicitly deferred. Do not grow the name-only allowlist. Completion requires review and passing checks.

## Implementation progress

- Baseline: `bf0f0dc55c1a6ea2e337f6fd4e82181d82b3c366` on `main`, clean tracked and untracked worktree.
- Owned scope: this ticket, `packages/selfix/src/vue.ts`, `packages/selfix/test/vue.test.ts`, and `packages/selfix/test/rules.test.ts`.
- Following the approved collector and linter test boundaries.

## Verification results

- Red: `pnpm exec vitest run packages/selfix/test/vue.test.ts` reproduced seven local-declaration failures, then two template-scope failures in normal/fallback collection.
- Green: the collector regressions passed after declaration filtering and scope checks; `pnpm typecheck` passed.
- Review regression: block and loop `var` fixtures failed before the control-flow scan and passed afterward. Nested function `var` and block-local `const` remain outside the enclosing scope.
- `pnpm exec vitest run packages/selfix/test/vue.test.ts packages/selfix/test/rules.test.ts`: 61 tests passed, including exact public diagnostic locations and throwing non-execution fixtures.
- Final `pnpm check`: passed, 148 tests plus typechecking, Oxlint, Oxfmt, and playground typecheck/design lint/build. The first sandboxed run encountered child-process EPERM errors; the full rerun outside the sandbox passed.
- `git diff --check`: passed.

## Review outcomes

- Standards: independent review and re-review found no blocking issues.
- Spec: independent review found missing function-scoped `var` declarations inside control flow. Fixed with focused red/green regressions; re-review confirmed no remaining blockers.
- Known nonblocking limitation: ticket 04 owns separating slot-content scope from owner attributes. For `<Box v-slot="{ cn }" :class="cn('p-2')"><div :class="cn('p-4')" /></Box>`, the owner currently inherits slot shadowing too. Resolve it with the broader owner/child scope correction in ticket 04.
- Import-aware helper discovery, configurable helpers, and cross-file tracing remain deferred as specified.
