# 07: Detect raw colors in fallbacks and composite values

Status: ready
Blocked by: 06-scan-css-declarations-safely.md

## Goal

Prevent literal and stock-palette colors in variable fallbacks, gradients, background shorthands, and shadows from bypassing `no-raw-colors`, while preserving semantic theme references.

Current misses include `bg-[var(--color-red-500,red)]`, `[background:red]`, `bg-[linear-gradient(red,blue)]`, and `shadow-[0_0_4px_red]` when only the raw-color rule is enabled.

## Acceptance criteria

- [ ] The listed examples are reported by `no-raw-colors` independently of arbitrary-value or restyling rules.
- [ ] Palette-variable extraction reads the variable name separately from its fallback arguments, including nested functions.
- [ ] Relevant color-bearing composite properties are inspected for literal colors without treating unrelated strings or variable-name substrings as colors.
- [ ] Semantic theme utilities and semantic variable references without raw fallbacks remain accepted.
- [ ] Existing currentColor and transparent policies remain unchanged.
- [ ] Variants, importance markers, and configured Tailwind prefixes retain correct behavior.
- [ ] Custom CSS declaration inspection uses the same value semantics where applicable.

## Verification

Add focused compiler-backed and custom-CSS cases in `packages/selfix/test/tailwind.test.ts`; include linter assertions with only `no-raw-colors` enabled. Add positive and negative cases for nested fallbacks. Run `pnpm check`; append commands and outcomes during implementation.

## Notes

Approved from the core-hardening discussion. Build on ticket 06's reliable declaration/value scanning. Relevant code: `hasLiteralColor`, `isColorDeclaration`, `hasRawColor`, and `extractColorVariables` in `packages/selfix/src/tailwind.ts`. Do not compare rendered colors or infer semantic equivalence from color similarity. Completion requires review and passing checks.
