# 05: Support Vue same-name class shorthand

Status: done
Blocked by: none

## Goal

Recognize valid Vue same-name `:class` shorthand as a dynamic binding rather than a missing-expression parse error. Keep the normal and compiler-fallback collection paths consistent.

Vue can compile `<div :class />`, but normal selfix collection currently reports that the class binding lacks an expression. That false parse error also suppresses unrelated rule findings in the file.

## Acceptance criteria

- [x] A Vue version supporting same-name shorthand collects `:class` as a dynamic class site without a selfix missing-expression error.
- [x] `require-static-classes` reports the dynamic binding at the original attribute offset when enabled.
- [x] Disabling that rule does not introduce a parse error for valid shorthand.
- [x] An independent static class violation in the same valid SFC remains reportable.
- [x] Normal and fallback collection agree on supported shorthand behavior.
- [x] Actual malformed bindings remain errors; the change does not suppress compiler failures or require evaluating the reserved word `class` as ordinary JavaScript.

## Verification

Add collector and public-rule regressions. Account explicitly for the supported Vue range: older Vue compiler rejection is not to be silently ignored. Run `pnpm check`; append commands, installed Vue version, and outcomes during implementation.

## Notes

Approved from the core-hardening discussion. Inspect expression normalization and class collection in `packages/selfix/src/vue.ts`. Use the parser's representation rather than rewriting the application source. This ticket is independent of recoverable-error handling. Completion requires review and passing checks.

## Implementation progress

- Baseline: `8abf5fa7bf66f8660f00f01bb2bcc51aa4fabffa` on `main`; clean tracked and untracked worktree.
- Owned scope: this ticket, `packages/selfix/src/vue.ts`, `packages/selfix/test/vue.test.ts`, and `packages/selfix/test/rules.test.ts`.
- Using the approved collector and public-linter test boundaries. Installed Vue: `3.5.42`.

## Verification results

- Red: `pnpm exec vitest run packages/selfix/test/vue.test.ts` failed both shorthand cases as expected: missing expression on the normal AST and reserved-word parsing on the fallback AST.
- Green: `pnpm exec vitest run packages/selfix/test/vue.test.ts packages/selfix/test/rules.test.ts` passed all 85 tests. Covers shorthand and modifier locations, malformed explicit expressions, and independent diagnostics with the static-class rule enabled and disabled.
- `pnpm typecheck` passed during development.
- Final `pnpm check` passed all 183 tests, typechecking, Oxlint, Oxfmt, and playground typecheck/design lint/build. The first sandboxed run failed on subprocess EPERM; the full run outside the sandbox passed.
- `git diff --check` passed.
- Vue `3.5.42` was runtime-tested. The declared Vue range remains unchanged. Pre-3.4 versions retain missing-expression handling through a version gate, and compiler errors are never filtered. Older Vue versions were reviewed in code but not runtime-tested.

## Review outcomes

- Standards: independent reviewer found no actionable findings and independently ran the 85 focused tests.
- Spec: independent reviewer found no actionable findings; all six acceptance criteria map to implementation and tests.
- No unresolved findings. Older-version runtime coverage remains a verification limitation as recorded above.

## Completion

- Implementation commit: `e0f7ac958f2eaedef02f1a46596e28a1d2069d7b` (`fix(vue): support same-name class shorthand`).
- Required checks and independent reviews passed before committing. Ticket marked done after the implementation commit succeeded.
