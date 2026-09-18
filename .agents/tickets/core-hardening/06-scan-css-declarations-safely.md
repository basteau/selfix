# 06: Parse CSS declaration boundaries safely

Status: in-progress
Blocked by: none

## Goal

Replace the relevant structural CSS regexes with a bounded scanner so strings, comments, escapes, and nested values cannot create fake declarations or truncate real ones. This ticket delivers observable correctness, not a preparatory framework.

Currently `.label { content: "literal;color:red;"; }` can be reported as containing a raw color even though the text is only string content.

## Acceptance criteria

- [x] Declaration-like text inside a quoted value is not interpreted as separate CSS declarations.
- [x] Escaped quotes, semicolons/braces inside strings, and comment-like string contents are preserved correctly.
- [x] Actual comments and ignored `@property` registration blocks do not contribute class declarations.
- [x] Nested function values remain intact for downstream inspection, including commas and semicolons where syntactically permitted.
- [x] Generated Tailwind CSS and existing supported custom-class forms retain their classifications.
- [x] Malformed or unsupported input is not silently converted into a misleading clean inspection result; document the bounded behavior in tests.
- [x] No new runtime dependency or full CSS cascade/selector engine is introduced.

## Verification

Add compiler/custom-CSS regressions in `packages/selfix/test/tailwind.test.ts`, with at least one public `no-raw-colors` assertion for the string-content false positive. Run `pnpm check`; append commands and outcomes during implementation.

## Notes

Approved from the core-hardening discussion. Relevant functions in `packages/selfix/src/tailwind.ts`: `collectCustomClasses`, `parseDeclarations`, and `stripIgnoredCss`. Keep scanner helpers local and purposeful. Ticket 07 depends on reliable value boundaries; do not build speculative parser APIs for it. Completion requires review and passing checks.

## Implementation progress

- Baseline: main at fca050f491c7aa4aad9c7bcfd41514eec8621201; tracked and untracked worktree clean.
- Owned scope: packages/selfix/src/tailwind.ts, packages/selfix/test/tailwind.test.ts, and this ticket.

- Replaced structural regex extraction with a shared local boundary scanner for custom and generated declarations. Strings, escapes, comments, and nested parentheses/brackets preserve declaration boundaries; each stylesheet is scanned independently.
- Red: `pnpm exec vitest run packages/selfix/test/tailwind.test.ts -t 'does not treat quoted'` reproduced the false raw-color finding.
- Green: `pnpm exec vitest run packages/selfix/test/tailwind.test.ts` passed all 51 tests; `pnpm typecheck` passed.
- Full verification: initial sandboxed `pnpm check` failed on subprocess EPERM restrictions. Approved unsandboxed `pnpm check` passed: typecheck, lint, formatting, 192 tests, playground typecheck/design lint/build.
- Independent code review against fca050f491c7aa4aad9c7bcfd41514eec8621201: Standards 0 findings; Spec 0 findings. Both reviewed current owned changes with a clean baseline.
- Bounded behavior: malformed declaration boundaries and block-valued custom properties fail explicitly. This structural scanner is not a complete CSS validator or selector/cascade engine; existing selector matching remains bounded.
- Implementation and verification complete; requested commit pending.
