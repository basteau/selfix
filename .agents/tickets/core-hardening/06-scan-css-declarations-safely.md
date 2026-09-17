# 06: Parse CSS declaration boundaries safely

Status: ready
Blocked by: none

## Goal

Replace the relevant structural CSS regexes with a bounded scanner so strings, comments, escapes, and nested values cannot create fake declarations or truncate real ones. This ticket delivers observable correctness, not a preparatory framework.

Currently `.label { content: "literal;color:red;"; }` can be reported as containing a raw color even though the text is only string content.

## Acceptance criteria

- [ ] Declaration-like text inside a quoted value is not interpreted as separate CSS declarations.
- [ ] Escaped quotes, semicolons/braces inside strings, and comment-like string contents are preserved correctly.
- [ ] Actual comments and ignored `@property` registration blocks do not contribute class declarations.
- [ ] Nested function values remain intact for downstream inspection, including commas and semicolons where syntactically permitted.
- [ ] Generated Tailwind CSS and existing supported custom-class forms retain their classifications.
- [ ] Malformed or unsupported input is not silently converted into a misleading clean inspection result; document the bounded behavior in tests.
- [ ] No new runtime dependency or full CSS cascade/selector engine is introduced.

## Verification

Add compiler/custom-CSS regressions in `packages/selfix/test/tailwind.test.ts`, with at least one public `no-raw-colors` assertion for the string-content false positive. Run `pnpm check`; append commands and outcomes during implementation.

## Notes

Approved from the core-hardening discussion. Relevant functions in `packages/selfix/src/tailwind.ts`: `collectCustomClasses`, `parseDeclarations`, and `stripIgnoredCss`. Keep scanner helpers local and purposeful. Ticket 07 depends on reliable value boundaries; do not build speculative parser APIs for it. Completion requires review and passing checks.
