# 01: Respect helper shadowing

Status: ready
Blocked by: none

## Goal

Prevent name-based recognition of `cn`, `clsx`, and `twMerge` from treating locally replaced or template-shadowed functions as trusted class helpers. Unknown calls must remain dynamic; never execute application expressions.

Currently a local `const cn = () => 'p-[13px]'` used as `cn('p-2')` is incorrectly considered static and clean. Slot-local helpers have the same problem.

## Acceptance criteria

- [ ] Calls shadowed by slot or loop bindings are dynamic, without claiming their arguments describe the returned classes.
- [ ] Conflicting local function and variable declarations prevent helper recognition, including declarations outside the supported static-constant shapes.
- [ ] Existing unshadowed helper behavior is preserved.
- [ ] `require-static-classes` reports affected calls at their original SFC attribute locations.
- [ ] No helper body, default initializer, or application expression is evaluated.
- [ ] Focused tests cover local replacements, template shadowing, unaffected siblings, and normal/fallback template collection where applicable.

## Verification

Exercise collection in `packages/selfix/test/vue.test.ts` and observable rule output in `packages/selfix/test/rules.test.ts`. Include throwing function bodies as non-execution fixtures. Run `pnpm check`; append commands and outcomes here during implementation.

## Notes

Approved from the core-hardening discussion. Start in `packages/selfix/src/vue.ts`, particularly helper-call collection and binding/scope tracking. Import-aware helper discovery, configurable helpers, and cross-file tracing are explicitly deferred. Do not grow the name-only allowlist. Completion requires review and passing checks.
