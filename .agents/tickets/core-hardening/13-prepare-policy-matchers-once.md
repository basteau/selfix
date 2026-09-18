# 13: Prepare policy matchers once

Status: done
Blocked by: none

## Goal

Prepare regular-expression and wildcard policy matchers when constructing a linter rather than rebuilding them repeatedly for every rule/site/token. Preserve observable behavior and use plain functions rather than introducing a rule framework.

Current matching reconstructs component-import/name regexes, contract regexes, and wildcard patterns during linting. A single matching Button contract was observed being constructed repeatedly during one lint call.

## Acceptance criteria

- [x] Component recognition, ignore-import rules, contract selection, and allow/deny matchers reuse prepared matching state across files linted by one linter.
- [x] First matching contract behavior, option inheritance/list replacement, and deny precedence remain unchanged.
- [x] Base-class matching versus colon-containing full-token matching remains unchanged, including variants, importance markers, and negative signs.
- [x] Diagnostic content, ordering, and severity remain unchanged for representative existing policies.
- [x] Invalid configuration still fails before linting with existing actionable validation behavior.
- [x] Focused verification demonstrates that policy regex construction does not repeat per lint call; avoid timing thresholds or a permanent benchmark layer.
- [x] No new runtime dependency or public configuration format is introduced.

## Verification

Use existing contract/configuration regressions and add repeated-lint equivalence cases plus a bounded matcher-construction probe/test at the narrowest practical seam. Run `pnpm check`; record the probe method, commands, and outcomes during implementation.

## Notes

Approved from the core-hardening discussion. Start in `packages/selfix/src/index.ts` at `matches`, `policy`, `isDesignComponent`, and settings preparation, coordinating with `config.ts` validation only where necessary. This is independently verifiable and does not require restructuring all rule evaluation or changing token ownership. Completion requires review and passing checks.

## Implementation baseline

- Starting HEAD: `f05c1551fb76ea1e5b1b979e586b2489e02e35aa`, branch `main`.
- Initial tracked/index changes: none. Untracked `.agents/tickets/documentation/` is unrelated and preserved.
- Owned scope: this ticket, `packages/selfix/src/index.ts`, and `packages/selfix/test/rules.test.ts`.

## Verification and review

- Prepared component/import regexes and effective contract allow/deny matchers in linter construction; rule evaluation reuses them across files.
- Red: `pnpm exec vitest run packages/selfix/test/rules.test.ts -t 'prepares policy'` failed as intended with 30 policy regex constructions across two lint calls.
- Green: `pnpm exec vitest run packages/selfix/test/rules.test.ts` passed all 40 tests. `pnpm typecheck` passed.
- Probe: temporarily proxy the native RegExp constructor, delegate to the real implementation, capture pattern strings, and restore the global in finally. Only policy patterns constructed after linter creation are asserted absent; real Vue/Tailwind parsing and compilation remain in use. No timing thresholds.
- `pnpm check`: initial sandbox run hit subprocess EPERM errors; rerun with execution permission passed all 224 tests, typecheck, Oxlint, Oxfmt, package build, and playground typecheck/design lint/build.
- Independent Standards review: no findings. Independent Spec review: no findings. Reviewers inspected the working-tree diff against the starting revision; test execution evidence supplied by implementer.
- Final diff and index reviewed; unrelated documentation tickets excluded. No remaining nonblocking limitations.

## Completion

Implementation committed as `965166b` (`refactor(policy): prepare matchers once per linter`). All acceptance criteria and required checks passed.
