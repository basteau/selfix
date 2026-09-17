# 05: Support Vue same-name class shorthand

Status: ready
Blocked by: none

## Goal

Recognize valid Vue same-name `:class` shorthand as a dynamic binding rather than a missing-expression parse error. Keep the normal and compiler-fallback collection paths consistent.

Vue can compile `<div :class />`, but normal selfix collection currently reports that the class binding lacks an expression. That false parse error also suppresses unrelated rule findings in the file.

## Acceptance criteria

- [ ] A Vue version supporting same-name shorthand collects `:class` as a dynamic class site without a selfix missing-expression error.
- [ ] `require-static-classes` reports the dynamic binding at the original attribute offset when enabled.
- [ ] Disabling that rule does not introduce a parse error for valid shorthand.
- [ ] An independent static class violation in the same valid SFC remains reportable.
- [ ] Normal and fallback collection agree on supported shorthand behavior.
- [ ] Actual malformed bindings remain errors; the change does not suppress compiler failures or require evaluating the reserved word `class` as ordinary JavaScript.

## Verification

Add collector and public-rule regressions. Account explicitly for the supported Vue range: older Vue compiler rejection is not to be silently ignored. Run `pnpm check`; append commands, installed Vue version, and outcomes during implementation.

## Notes

Approved from the core-hardening discussion. Inspect expression normalization and class collection in `packages/selfix/src/vue.ts`. Use the parser's representation rather than rewriting the application source. This ticket is independent of recoverable-error handling. Completion requires review and passing checks.
