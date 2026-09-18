# 06: Preserve nested CSS ownership

Status: done
Blocked by: 05-correct-custom-selector-attribution.md

## Goal

Ensure supported nested CSS declarations remain associated with the classes they affect, so nesting cannot hide forbidden styling.

## Acceptance criteria

- [x] .card { margin: 1rem; &:hover { color: red; } } retains the nested color for card inspection and produces the applicable raw-color/restyling findings.
- [x] Supported nested conditional at-rules preserve class ownership and declaration provenance.
- [x] Cover nested selector combinations within the selector subset established by ticket 05; unsupported combinations fail explicitly.
- [x] Do not assign unrelated descendant declarations to an owner without a defined supported interpretation.
- [x] Imported nested stylesheets and repeated inspection behave consistently.
- [x] Document supported nesting and explicit failure boundaries in [theme documentation](../../../docs/themes.md) and [analysis limits](../../../docs/analysis.md).

## Verification

Add compiler/custom-CSS and public-linter regressions for parent-reference pseudo selectors, nested conditional at-rules, multiple nesting levels, and an unsupported relationship. Check deterministic categories and independent rule findings.

Run `pnpm check` before reporting implementation complete. Append commands, outcomes, review findings, and completion evidence during implementation.

## Notes

The scanner currently replaces a parent .card selector with &:hover, losing the parent class. Use Tailwind's compiler where appropriate and keep any remaining attribution bounded; do not implement browser selector matching. Ticket 05 supplies reliable selector attribution.

Scope and dependencies approved for implementation.

Created from the approved v1-readiness audit discussion; no separate spec was supplied. Audit baseline: selfix 1ba8a7e99339b43eb91b503face00ec0e72f63c0; upstream comparison: shadcn-ui/lint bf89dcb7f66a306c7ac4943065298902afdbd969. Follow AGENTS.md: one standalone runner/config, Vue and Tailwind as the only consumer peers, no application-expression evaluation, deterministic original-SFC diagnostics, and no new runtime packages. Preserve attribution if adapting upstream code.

## Implementation progress

- Baseline: `d6d3922afbf8dab74e0450ec762af3a227550826`, branch `main`.
- Initial worktree: modified core-hardening/12 and v1-readiness/11 tickets; untracked component-discovery directory and documentation/05 ticket. No staged changes; these are unrelated and preserved.
- Owned scope: `packages/selfix/src/tailwind.ts`, Tailwind/public-rule tests, `docs/themes.md`, `docs/analysis.md`, and this ticket. Implementation initially completed without a commit; the user subsequently requested commit and push.
- Testing boundary: existing real compiler/custom-CSS inspection and public linter APIs, approved in the ticket.

## Completion evidence

- Nested compound branches beginning with one `&` inherit enclosing positive classes; nested positive classes are added without attributing negations or attribute text. Ownership is stored per scanner block, so identical nested headers under different parents cannot share associations.
- Multiple levels, selector lists, and nested media/supports/container/starting-style blocks retain declaration values and literal provenance, including imported CSS overlapping a semantic utility. Unsupported descendants, siblings, implicit nesting, parent references inside functions, and other nested at-rule blocks fail explicitly. No runtime packages or expression evaluation added.
- Updated `docs/themes.md` and `docs/analysis.md` with the supported subset and failure boundaries.
- Red/green: `node_modules/.bin/vitest run packages/selfix/test/tailwind.test.ts -t 'retains declarations from parent-reference'` first failed on rejected `&:hover`, then passed after ownership propagation. The nested-at-rule rejection test first exposed silent acceptance of `@scope`, then passed after bounded at-rule validation. An initial test expectation used the wrong category order; corrected to the existing deterministic category order.
- Review regression red/green: `node_modules/.bin/vitest run packages/selfix/test/tailwind.test.ts -t 'compact conditional'` failed for compact media/supports/container forms before the boundary fix and passed afterward.
- `node_modules/.bin/vitest run packages/selfix/test/tailwind.test.ts packages/selfix/test/rules.test.ts`: final 165 tests passed. Public tests verify independent no-restyle/no-raw-colors findings at exact original-SFC line/column, repeatability, and errors with all rules disabled.
- `node_modules/.bin/tsc --noEmit`: passed during implementation.
- `pnpm check`: passed before review (322 tests), and passed after the review fix (325 tests across 9 files), including typechecking, Oxlint, Oxfmt, package build, and playground typecheck/design lint/build.
- The first sandboxed pnpm startup stalled without output and was interrupted; elevated full-check runs succeeded. No required check remains unavailable.
- `git diff --check`: passed. Unrelated baseline changes preserved; only owned changes included in the requested commits.

## Review

- Reviewed the actual working-tree changes against `d6d3922afbf8dab74e0450ec762af3a227550826`, including the staged/unstaged split and relevant untracked inventory, with the owned scope above.
- Two independent subagents applied the code-review skill: Standards and Spec. Each found the same P2 issue: compact conditional at-rules without whitespace before `(` were rejected. Fixed with three failing-then-passing regressions.
- Standards re-review: zero remaining findings; independently verified compact conditional source reproductions.
- Spec re-review: zero remaining findings; independently verified compact conditional ownership/provenance and unsupported compact scope rejection.
- Remaining limitations are the documented bounded selector subset, with no browser matching or cascade evaluation. No unresolved review findings.

## Commit

- User requested commit and push after implementation completion.
- Implementation commit: `5fbea367e4318b951dc66ae14ae776116e2658da` (`fix(tailwind): preserve nested CSS ownership`).
- Ticket completion evidence is committed separately to record the implementation hash.
