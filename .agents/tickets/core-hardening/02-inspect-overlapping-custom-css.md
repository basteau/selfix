# 02: Inspect overlapping custom CSS

Status: in-progress
Blocked by: none

## Goal

Inspect both Tailwind-generated declarations and recognized custom CSS declarations when they apply to the same class name. Custom CSS must not disappear merely because Tailwind also generates that utility.

With `@import 'tailwindcss'; .mt-4 { color: red; }`, a recognized UI component using `mt-4` currently receives only the layout classification and can pass all rules.

## Acceptance criteria

- [x] The overlap example includes both layout and color effects and is identified as containing a raw color.
- [x] A layout-only component contract rejects the overlapping class; `no-raw-colors` independently reports it.
- [x] Literal-color inspection retains declaration provenance so combining declarations does not incorrectly flag semantic theme utilities.
- [x] Generated-only utilities and custom-only classes preserve their existing behavior.
- [x] Existing support for declarations in imported stylesheets remains intact.
- [x] Results remain deterministic and cached consistently.

## Verification

Add focused inspection tests in `packages/selfix/test/tailwind.test.ts` and a public linter regression in `packages/selfix/test/rules.test.ts`. Cover an imported overlap and a semantic-token non-regression. Run `pnpm check`; append commands and outcomes during implementation.

## Notes

Approved from the core-hardening discussion. Start in `packages/selfix/src/tailwind.ts` at `inspectToken`, which currently selects generated declarations or custom declarations exclusively. Combine conservatively within existing selector support; do not implement a full CSS cascade or selector engine. This does not depend on the declaration-scanner ticket. Completion requires review and passing checks.

## Implementation progress

- Baseline: `abf56053455d8d7a5076837bb58d3eda1f23bdd9` on `main`; no tracked or untracked changes.
- Owned scope: `packages/selfix/src/tailwind.ts`, `packages/selfix/test/tailwind.test.ts`, `packages/selfix/test/rules.test.ts`, and this ticket.
- Following the approved compiler-inspection and public-linter test boundaries.

## Verification results

- Red: `pnpm exec vitest run packages/selfix/test/tailwind.test.ts` reproduced the missing color category and raw-color flag for overlapping `mt-4`.
- Green: the same command passed all 32 tests after separating declaration sources; `pnpm typecheck` passed.
- Added imported-overlap and inline semantic-color provenance coverage. Independent public-rule cases verify the original class attribute at line 2, column 19.
- Final `pnpm check`: passed all 153 tests, typechecking, Oxlint, Oxfmt, and playground typecheck/design lint/build. The first sandboxed run hit subprocess EPERM errors; the full rerun outside the sandbox passed.
- `git diff --check`: passed.

## Review outcomes

- Standards: independent read-only review found no actionable findings.
- Spec: independent read-only review confirmed all six acceptance criteria, with no findings.
- Existing selector and declaration-scanner limitations remain unchanged; no cascade or selector-engine expansion was attempted.
- Implementation and reviews are complete; awaiting the requested commit before marking done.
