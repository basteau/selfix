# 07: Inspect declarations introduced by @apply

Status: done
Blocked by: 05-correct-custom-selector-attribution.md

## Goal

Include Tailwind-applied declarations in custom-class inspection so @apply cannot hide padding, raw colors, or other policy-relevant effects.

## Acceptance criteria

- [x] With Tailwind imported, .card { margin: 1rem; @apply p-4 bg-red-500; } is inspected as containing spacing and raw color, with independent applicable rule findings.
- [x] Use the loaded Tailwind compiler/theme for applied utility semantics instead of maintaining a second utility grammar.
- [x] Preserve the distinction between semantic theme values and raw palette/literal values when incorporating applied declarations.
- [x] Imported stylesheets and mixtures of direct and applied declarations retain all relevant effects without duplicate diagnostics.
- [x] Invalid or unsupported @apply analysis produces an actionable failure rather than silently skipping the directive.
- [x] Document the supported @apply boundary in [theme documentation](../../../docs/themes.md).

## Verification

Add inspection and public-linter fixtures covering raw palette utilities, semantic utilities, direct/applied mixtures, imports, and invalid applied utilities. Exercise the same loaded theme used for ordinary class validation.

Run `pnpm check` before reporting implementation complete. Append commands, outcomes, review findings, and completion evidence during implementation.

## Notes

scanDeclarations currently discards statements beginning with @, including @apply. The audit reproduced a false clean result for the example in the criteria. Ticket 05 supplies reliable selector ownership. Full nested-selector support is not an artificial prerequisite; unresolved combinations must remain explicit.

Scope and dependencies approved for implementation.

Created from the approved v1-readiness audit discussion; no separate spec was supplied. Audit baseline: selfix 1ba8a7e99339b43eb91b503face00ec0e72f63c0; upstream comparison: shadcn-ui/lint bf89dcb7f66a306c7ac4943065298902afdbd969. Follow AGENTS.md: one standalone runner/config, Vue and Tailwind as the only consumer peers, no application-expression evaluation, deterministic original-SFC diagnostics, and no new runtime packages. Preserve attribution if adapting upstream code.

## Implementation progress

- Baseline: `e2c2cfcb8f39a803ef2acdbc7c1037ac6da0bbfe`, branch `main`.
- Initial worktree: only `.agents/tickets/documentation/05-agent-setup-guide.md` modified; no staged or untracked changes. Preserving that unrelated work.
- Owned scope: Tailwind inspection, focused inspection/public-linter tests, `docs/themes.md`, and this ticket. No commit was requested initially.
- Testing boundary: existing real Tailwind inspection and public linter fixtures, as approved above.

## Verification and review progress

- Sandboxed pnpm startup failed registry identity verification; authorized elevated runs completed successfully.
- Red/green: `node_modules/.bin/vitest run packages/selfix/test/tailwind.test.ts -t 'inspects direct and applied'` first failed with missing color/spacing and rawColor false, then passed after compiler-backed applied declaration inspection.
- `node_modules/.bin/vitest run packages/selfix/test/tailwind.test.ts packages/selfix/test/rules.test.ts`: 180 tests passed. `node_modules/.bin/tsc --noEmit`: passed.
- First `pnpm check` passed typechecking/lint but stopped on concurrent unrelated `docs/README.md` formatting. User authorized formatting that file; it was already formatted by the time authorization arrived. Full `pnpm check` rerun passed: typecheck, lint, formatting, all 340 tests, package build, and playground typecheck/design lint/build.
- `pnpm test && pnpm --filter playground check`: all 340 tests across 9 files passed; package build and playground typecheck/design lint/build passed. `git diff --check`: passed.
- Independent Standards review: no blocking findings. Independent Spec review: one P2 provenance finding. Applied named utilities containing literal colors (`@utility raw { color: red; }`) and inline overrides of stock palette names (`@theme inline { --color-red-500: #ff0000; }`) escaped no-raw-colors at that review. Ordinary utility inspection has the same existing limitation, but it affects this ticket's explicit provenance criterion.
- User subsequently approved the shared provenance fix (see follow-up below). Implementation stayed in-progress until the final review and subsequently requested commit were complete.
- Concurrent changes to README.md, docs/README.md, docs/adoption.md, docs/agent-setup.md, and the documentation/05 ticket are unrelated; preserved except for the specifically authorized docs/README.md formatting command.

### Approved review follow-up

- User explicitly approved fixing shared color provenance for ordinary and applied utilities.
- Preserve color variable identity in the inspection-only Tailwind design system by clearing INLINE/REFERENCE options on color entries. Keep authored CSS utility literal evidence using the existing declaration scanner and Tailwind's candidate parser; preserve compiler-generated defaults such as opacity transparency.
- Added failing regressions for custom utility literal colors and inline stock palette overrides, then fixed both at the shared inspection boundary. Added positive semantic inline/reference cases, functional utilities, whitespace in definitions, applied transparency/opacity, imported public-linter behavior, and exact SFC public diagnostics.
- Focused inspection/public-linter tests: 190 passed. Typecheck passed. Full check and independent re-review were pending at this checkpoint.

### Final review regressions

- Additional red/green cases preserve quoted bare-value alternatives, eager `--theme()` stock references, stock aliases to CSS variables, and semantic alternatives when raw branches/declarations are omitted by Tailwind.
- Source palette evidence is limited to eager theme references and emitted properties. Ordinary variable references are inspected in emitted CSS; compiler-added opacity transparency is distinguished from authored/standalone/arbitrary transparency.
- `node_modules/.bin/vitest run packages/selfix/test/tailwind.test.ts packages/selfix/test/rules.test.ts`: 197 passed. Typecheck passed. Final full `pnpm check` and re-review were running at this checkpoint.
- User requested a commit when done. No push authorized. Staging was empty at this checkpoint; only owned ticket, source, tests, and theme documentation will be committed.
- Concurrent unrelated documentation work was committed by its owning session; HEAD moved to `4319abeae12ab67939a82137191c2ca88e8b7a02`. Review remains pinned to the recorded initial revision and owned paths.

## Completion evidence

- Final implementation expands applied utility declarations with the same loaded Tailwind compiler used for ordinary classes, preserving selector ownership across imports and supported nesting. Independent no-restyle/no-raw-colors findings remain located at the original SFC class, without duplicates.
- The approved shared fix preserves semantic/stock identity for inline/reference colors and authored CSS utility literals. Final eager color lookup handling preserves simple `--theme(--color-name)` calls symbolically before compilation, replacing the intermediate root/property-level palette flags described above. Tailwind determines which functional declarations survive.
- Bounded limitations are documented in `docs/themes.md`: unknown/extended color lookups and ambiguous authored functional transparency fail explicitly, as do unsupported @apply contexts and legacy standalone !important arguments. No unresolved nonblocking review findings.
- Final focused inspection/public-linter suites: 203 passed. Final `pnpm check`: passed all 363 tests across 9 files, typecheck, lint, formatting, package build, and playground typecheck/design lint/build. `git diff --check` and the full staged implementation diff were reviewed before commit.
- Independent Standards re-review: zero unresolved findings; reviewer independently reran both focused suites (203 passed). Independent Spec re-review: zero unresolved findings; reviewer independently ran the focused transparency/provenance selection (22 passed). All blocking findings were resolved with regression coverage or explicit documented unsupported-analysis failures.
- No separate package-install smoke, Nuxt smoke, or dependency/platform compatibility matrix was run; those are outside this ticket's required checks.
- Implementation commit: `79a5f0e2033fe021dd50b6b7cd94f435682641c7` (`fix(tailwind): inspect applied declarations and preserve color provenance`). User requested commit after implementation; no push requested or performed.
- This ticket completion record is committed separately so it can include the implementation hash.
