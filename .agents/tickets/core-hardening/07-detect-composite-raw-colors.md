# 07: Detect raw colors in fallbacks and composite values

Status: done
Blocked by: 06-scan-css-declarations-safely.md

## Goal

Prevent literal and stock-palette colors in variable fallbacks, gradients, background shorthands, and shadows from bypassing `no-raw-colors`, while preserving semantic theme references.

Current misses include `bg-[var(--color-red-500,red)]`, `[background:red]`, `bg-[linear-gradient(red,blue)]`, and `shadow-[0_0_4px_red]` when only the raw-color rule is enabled.

## Acceptance criteria

- [x] The listed examples are reported by `no-raw-colors` independently of arbitrary-value or restyling rules.
- [x] Palette-variable extraction reads the variable name separately from its fallback arguments, including nested functions.
- [x] Relevant color-bearing composite properties are inspected for literal colors without treating unrelated strings or variable-name substrings as colors.
- [x] Semantic theme utilities and semantic variable references without raw fallbacks remain accepted.
- [x] Existing currentColor and transparent policies remain unchanged.
- [x] Variants, importance markers, and configured Tailwind prefixes retain correct behavior.
- [x] Custom CSS declaration inspection uses the same value semantics where applicable.

## Verification

Add focused compiler-backed and custom-CSS cases in `packages/selfix/test/tailwind.test.ts`; include linter assertions with only `no-raw-colors` enabled. Add positive and negative cases for nested fallbacks. Run `pnpm check`; append commands and outcomes during implementation.

## Notes

Approved from the core-hardening discussion. Build on ticket 06's reliable declaration/value scanning. Relevant code: `hasLiteralColor`, `isColorDeclaration`, `hasRawColor`, and `extractColorVariables` in `packages/selfix/src/tailwind.ts`. Do not compare rendered colors or infer semantic equivalence from color similarity. Completion requires review and passing checks.

## Implementation progress

- Baseline: main at 7ff563c116e34832c438a7d7d5c8b3ec7da3d373; tracked and untracked worktree clean.
- Owned scope: packages/selfix/src/tailwind.ts, packages/selfix/test/tailwind.test.ts, and this ticket.

- Added whole-token color inspection shared by generated and custom declarations, palette-name extraction independent of fallbacks, and color-bearing composite property coverage. Semantic theme references, quoted strings, URLs, and unrelated properties remain accepted.

## Verification results

- Red: `pnpm exec vitest run packages/selfix/test/tailwind.test.ts -t 'composite raw'` reproduced both prefixed and unprefixed fallback misses.
- Red/green: custom URL regression reproduced a false positive for a quoted closing parenthesis; token handling corrected. Review regressions reproduced drop-shadow and text-decoration misses, then passed after extending composite coverage.
- `pnpm exec vitest run packages/selfix/test/tailwind.test.ts`: 54 tests passed. `pnpm typecheck` passed during implementation.
- Initial full check exposed subprocess EPERM restrictions and a duplicate test input; fixed the test fixture and reran with subprocess permissions.
- Final `pnpm check`: passed typecheck, Oxlint, Oxfmt, build, all 195 tests, and playground typecheck/design lint/build after review fixes.

## Review outcomes

- Independent Standards review: one P2 composite-coverage finding, resolved with regressions; re-review found zero remaining findings.
- Independent Spec review: zero findings against all seven acceptance criteria.
- No remaining nonblocking limitations identified within this ticket's scope. Existing bounded CSS inspection remains unchanged.

## Completion

- Implementation committed successfully as 51ab736 (`fix(colors): detect raw colors in composite values`). Ticket complete.
