# 05: Correct custom selector attribution

Status: done
Blocked by: none

## Goal

Associate custom declarations with actual supported class selectors, without inventing classes from selector text or silently accepting unsupported attribution.

## Acceptance criteria

- [x] Class-like text inside quoted attribute values does not create a known class or associated declarations.
- [x] Classes appearing only in negation do not receive the excluded rule's declarations; supported subject classes retain their associations.
- [x] Escaped class names are decoded and matched correctly within the supported subset, or rejected explicitly; partial names are never invented.
- [x] Existing simple selectors, selector lists, and supported pseudo-class forms preserve behavior.
- [x] Unsupported attribution fails with a useful CSS-inspection error instead of yielding a clean or fabricated result.
- [x] Document and test the bounded selector subset without introducing a full cascade engine or runtime package.

## Verification

Add inspection and public-rule regressions for [data-url="a.fake"], .card:not(.ghost), escaped colon names, ordinary hover selectors, lists, and unsupported forms. Assert both absence of invented associations and retention of genuine declarations.

Run `pnpm check` before reporting implementation complete. Append commands, outcomes, review findings, and completion evidence during implementation.

## Notes

collectCustomClasses in packages/selfix/src/tailwind.ts currently uses a class-name regex over the complete selector string. The audit showed fake, ghost, and a partial escaped name becoming known. This ticket establishes the attribution boundary used by tickets 06 and 07; it is an observable fix, not a parser-framework prefactor.

Scope and dependencies approved for implementation.

Created from the approved v1-readiness audit discussion; no separate spec was supplied. Audit baseline: selfix 1ba8a7e99339b43eb91b503face00ec0e72f63c0; upstream comparison: shadcn-ui/lint bf89dcb7f66a306c7ac4943065298902afdbd969. Follow AGENTS.md: one standalone runner/config, Vue and Tailwind as the only consumer peers, no application-expression evaluation, deterministic original-SFC diagnostics, and no new runtime packages. Preserve attribution if adapting upstream code.

## Implementation progress

- Baseline: `c5dda5d22cd61cdf3fa7052f2d95e0eaa1a8c642`, branch `main`.
- Pre-existing changes preserved: modified core-hardening/12 and v1-readiness/11 tickets, and untracked documentation/05 ticket. No staged changes.
- Owned scope: custom selector attribution in `packages/selfix/src/tailwind.ts`, focused Tailwind/public-rule tests, `docs/analysis.md`, and this ticket. Implementation initially completed without a commit; the user subsequently requested commit and push.

## Completion evidence

- Replaced selector-wide class matching with complete-token attribution for unescaped ASCII compounds, lists, nonfunctional pseudos, and bounded `:is()`, `:where()`, and `:not()` forms. Attribute text and negated classes cannot create associations. Escapes, unsupported functions/relationships, nested negation, and nested selector rules fail explicitly with the selector and reason.
- Validate custom rule headers before visiting declarations, including ancestors with no direct declarations. Cache class names per selector. Conditional at-rules retain enclosing ownership; generated Tailwind declaration inspection is unchanged. Documented the subset in `docs/analysis.md`; no runtime dependencies added.
- Red/green: direct `node_modules/.bin/vitest run packages/selfix/test/tailwind.test.ts -t ...` runs reproduced attribute-text invention, negation contamination, unsupported nested negation, mixed selector-list rejection, and unsupported ancestry acceptance before their fixes. The resolved-object failures in rejection tests surfaced Vitest's object-inspection `bare.split` formatting error; after fixes those cases reject with the expected CSS error.
- `node_modules/.bin/vitest run packages/selfix/test/tailwind.test.ts packages/selfix/test/rules.test.ts`: final 147 tests passed. Public regressions cover independent no-restyle/no-raw-colors findings, unknown classes, exact original-SFC locations, and errors with all rules disabled.
- `node_modules/.bin/tsc --noEmit`: passed during implementation, including after review fixes.
- First full `pnpm check` caught an incorrect regression fixture assumption (unknown classes are rejected by no-restyle). Fixed the fixture to give excluded classes legitimate layout-only declarations, keeping unknown-class behavior tested separately. Subsequent full check passed before review; final rerun after review fixes passed all 307 tests across 9 files, lint, formatting, typecheck, package build, and playground typecheck/design lint/build.
- `git diff --check`: passed. The full staged implementation diff was reviewed before the requested commit.
- The sandboxed pnpm startup failed registry-signature verification because of restricted network access. Approved elevated pnpm runs completed successfully; focused tests also ran directly through the installed Vitest executable.

## Review

- Working-tree review pinned to `c5dda5d22cd61cdf3fa7052f2d95e0eaa1a8c642`, with the owned paths and baseline above. Two independent subagents reviewed Standards and Spec axes using the code-review skill.
- Standards: one P2 finding, selector-list branch state leaking into unrelated branches. Fixed with per-branch state reset and a focused regression. Re-review: zero remaining findings; reviewer independently passed all 147 focused tests.
- Spec: two P2 findings, the same branch-state issue and unsupported ancestor/nested relationships escaping validation. Fixed both with failing-then-passing regressions and header validation. Re-review: zero remaining findings.
- Remaining bounded limitations are documented: escaped identifiers are rejected rather than decoded; this is conservative attribution rather than cascade matching; supported nested selector ownership remains follow-up ticket 06. No unresolved review findings.
- Concurrent untracked `.agents/tickets/component-discovery/` files appeared during implementation and were left untouched, along with all initial unrelated changes.

## Commit

- User requested commit and push after implementation completion.
- Implementation commit: `70272097cdeb1e675e48357566496f8442b6a30f` (`fix(tailwind): correct custom selector attribution`).
- Ticket completion evidence is committed separately so it can record the implementation hash.
