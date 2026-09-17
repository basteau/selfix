# 13: Prepare policy matchers once

Status: ready
Blocked by: none

## Goal

Prepare regular-expression and wildcard policy matchers when constructing a linter rather than rebuilding them repeatedly for every rule/site/token. Preserve observable behavior and use plain functions rather than introducing a rule framework.

Current matching reconstructs component-import/name regexes, contract regexes, and wildcard patterns during linting. A single matching Button contract was observed being constructed repeatedly during one lint call.

## Acceptance criteria

- [ ] Component recognition, ignore-import rules, contract selection, and allow/deny matchers reuse prepared matching state across files linted by one linter.
- [ ] First matching contract behavior, option inheritance/list replacement, and deny precedence remain unchanged.
- [ ] Base-class matching versus colon-containing full-token matching remains unchanged, including variants, importance markers, and negative signs.
- [ ] Diagnostic content, ordering, and severity remain unchanged for representative existing policies.
- [ ] Invalid configuration still fails before linting with existing actionable validation behavior.
- [ ] Focused verification demonstrates that policy regex construction does not repeat per lint call; avoid timing thresholds or a permanent benchmark layer.
- [ ] No new runtime dependency or public configuration format is introduced.

## Verification

Use existing contract/configuration regressions and add repeated-lint equivalence cases plus a bounded matcher-construction probe/test at the narrowest practical seam. Run `pnpm check`; record the probe method, commands, and outcomes during implementation.

## Notes

Approved from the core-hardening discussion. Start in `packages/selfix/src/index.ts` at `matches`, `policy`, `isDesignComponent`, and settings preparation, coordinating with `config.ts` validation only where necessary. This is independently verifiable and does not require restructuring all rule evaluation or changing token ownership. Completion requires review and passing checks.
