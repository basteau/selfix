# 04: Separate slot-content scope from owner scope

Status: done
Blocked by: none

## Goal

Apply slot parameter shadowing to slot content without applying it to the slot-owning component's own prop expressions. Preserve loop scope behavior and original diagnostic locations.

For an outer `const local = 'p-2'`, `<Box v-slot="{ local }" :class="local"><div :class="local" /></Box>` should resolve the Box class from setup while treating the child class as dynamic. Both are currently dynamic.

## Acceptance criteria

- [x] The owner attribute in the example resolves the outer setup constant.
- [x] Slot descendants use the slot-local binding and remain dynamic when its classes are unknown.
- [x] Slot scope does not leak to siblings or ancestors.
- [x] Loop aliases still apply to the loop element and its descendants as appropriate.
- [x] Nested slots, destructuring, and combined loop/slot scopes preserve the intended lexical boundaries.
- [x] Invalid/unsupported scopes still produce errors without unsafe setup-constant resolution.
- [x] Normal and fallback template collection agree on class results and original SFC offsets for supported examples.

## Verification

Add focused fixtures in `packages/selfix/test/vue.test.ts`, including the owner/child example and nested scope cases. Assert public `require-static-classes` behavior where necessary. Run `pnpm check`; append commands and outcomes during implementation.

## Notes

Approved from the core-hardening discussion. Start with `walkTemplate` and `shadowElementScope` in `packages/selfix/src/vue.ts`. Separate element context from child context using plain functions; no general scope framework is needed. Never evaluate expressions. Completion requires review and passing checks.

## Implementation progress

- Baseline: `359db18338a2018eb23e3e51cfc6f1fbd7dac0ef` on `main`; clean tracked and untracked worktree.
- Owned scope: this ticket, `packages/selfix/src/vue.ts`, `packages/selfix/test/vue.test.ts`, and `packages/selfix/test/rules.test.ts`.
- Using the approved collector and public-linter testing boundaries.

## Verification results

- Red: `pnpm exec vitest run packages/selfix/test/vue.test.ts` reproduced owner-scope failures in both collection paths. The nested fixture then exposed fallback identifier rewriting.
- Green: owner and nested regressions passed after splitting loop/slot contexts and retaining identifiers in fallback compilation. `pnpm typecheck` passed during development.
- Focused collector and public-linter run: 77 tests passed before adding entity coverage; final collector run: 46 tests passed, including entity decoding and original offsets.
- Final `pnpm check`: passed all 177 tests, typechecking, Oxlint, Oxfmt, and playground typecheck/design lint/build. The initial sandboxed run failed on subprocess EPERM; the full rerun outside the sandbox passed.
- `git diff --check`: passed.

## Review outcomes

- Standards: independent review identified an HTML-entity regression in an intermediate expression-source change. Restored decoded expression handling, adjusted fallback compiler options, and added regression coverage. Independent re-review found no remaining actionable findings.
- Spec: independent review and re-review found no actionable findings; all acceptance criteria are covered.
- No unresolved nonblocking findings. Generated template code is never executed.

## Completion

- Implementation commit: `2b3631889d37835da8cae5bc6bb03643a78ef70e` (`fix(vue): separate slot content and owner scopes`).
- Required checks and independent reviews passed before committing. Ticket marked done after the implementation commit succeeded.
