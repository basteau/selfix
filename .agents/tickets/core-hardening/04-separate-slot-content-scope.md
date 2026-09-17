# 04: Separate slot-content scope from owner scope

Status: ready
Blocked by: none

## Goal

Apply slot parameter shadowing to slot content without applying it to the slot-owning component's own prop expressions. Preserve loop scope behavior and original diagnostic locations.

For an outer `const local = 'p-2'`, `<Box v-slot="{ local }" :class="local"><div :class="local" /></Box>` should resolve the Box class from setup while treating the child class as dynamic. Both are currently dynamic.

## Acceptance criteria

- [ ] The owner attribute in the example resolves the outer setup constant.
- [ ] Slot descendants use the slot-local binding and remain dynamic when its classes are unknown.
- [ ] Slot scope does not leak to siblings or ancestors.
- [ ] Loop aliases still apply to the loop element and its descendants as appropriate.
- [ ] Nested slots, destructuring, and combined loop/slot scopes preserve the intended lexical boundaries.
- [ ] Invalid/unsupported scopes still produce errors without unsafe setup-constant resolution.
- [ ] Normal and fallback template collection agree on class results and original SFC offsets for supported examples.

## Verification

Add focused fixtures in `packages/selfix/test/vue.test.ts`, including the owner/child example and nested scope cases. Assert public `require-static-classes` behavior where necessary. Run `pnpm check`; append commands and outcomes during implementation.

## Notes

Approved from the core-hardening discussion. Start with `walkTemplate` and `shadowElementScope` in `packages/selfix/src/vue.ts`. Separate element context from child context using plain functions; no general scope framework is needed. Never evaluate expressions. Completion requires review and passing checks.
