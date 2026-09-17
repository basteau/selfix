# 02: Inspect overlapping custom CSS

Status: ready
Blocked by: none

## Goal

Inspect both Tailwind-generated declarations and recognized custom CSS declarations when they apply to the same class name. Custom CSS must not disappear merely because Tailwind also generates that utility.

With `@import 'tailwindcss'; .mt-4 { color: red; }`, a recognized UI component using `mt-4` currently receives only the layout classification and can pass all rules.

## Acceptance criteria

- [ ] The overlap example includes both layout and color effects and is identified as containing a raw color.
- [ ] A layout-only component contract rejects the overlapping class; `no-raw-colors` independently reports it.
- [ ] Literal-color inspection retains declaration provenance so combining declarations does not incorrectly flag semantic theme utilities.
- [ ] Generated-only utilities and custom-only classes preserve their existing behavior.
- [ ] Existing support for declarations in imported stylesheets remains intact.
- [ ] Results remain deterministic and cached consistently.

## Verification

Add focused inspection tests in `packages/selfix/test/tailwind.test.ts` and a public linter regression in `packages/selfix/test/rules.test.ts`. Cover an imported overlap and a semantic-token non-regression. Run `pnpm check`; append commands and outcomes during implementation.

## Notes

Approved from the core-hardening discussion. Start in `packages/selfix/src/tailwind.ts` at `inspectToken`, which currently selects generated declarations or custom declarations exclusively. Combine conservatively within existing selector support; do not implement a full CSS cascade or selector engine. This does not depend on the declaration-scanner ticket. Completion requires review and passing checks.
