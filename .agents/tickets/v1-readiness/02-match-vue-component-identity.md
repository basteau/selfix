# 02: Match Vue component identity

Status: done
Blocked by: none

## Goal

Apply component recognition and contracts to the same runtime component identities that Vue resolves, without confusing native tags or type imports with component bindings.

## Acceptance criteria

- [x] Importing Button does not make native button elements inherit Button recognition, contracts, or configured class props.
- [x] Elements rendered literally under v-pre do not acquire imported-component identity.
- [x] Supported exact and kebab-case tag spellings, including UIButton used as u-i-button, match Vue resolution; spellings Vue does not resolve do not acquire invented aliases.
- [x] Type-only declarations and type-only import specifiers do not establish runtime component identity.
- [x] Ordinary imported, renamed, and configured global components retain their documented behavior and original diagnostic locations.
- [x] Cover normal and fallback template collection paths using Vue compiler behavior as the reference; keep any identity helper small and local.

## Verification

Add collector and public-linter regressions for native/component pairs, acronym names, v-pre, renamed imports, mixed type/value imports, contracts, and classProps. Compare representative identities with Vue compilation without evaluating application code.

Run `pnpm check` before reporting implementation complete. Append commands, outcomes, review findings, and completion evidence during implementation.

## Notes

- Implementation baseline: `main` at `9ab0bb9518c46beee674c4f05ac264db8e97c77f`; tracked and untracked worktree clean. Owned scope: component identity in `packages/selfix/src/vue.ts`, focused collector/public-linter regressions, and this ticket. No commit requested.

The audit reproduced native button receiving no-restyle after importing Button, u-i-button escaping the imported UIButton policy, and import type incorrectly establishing UI identity. Start at collectElement, collectImportAliases, and kebabCase in packages/selfix/src/vue.ts. Dynamic/namespace forms are separately scoped in draft ticket 13.

Scope and dependencies approved for implementation.

## Completion evidence

- Replaced generated kebab aliases with a local exact/camelized/PascalCase lookup matching Vue. Vue's element classification prevents native and `v-pre` tags from inheriting import identity; type-only declarations/specifiers are excluded.
- Red/green: focused `pnpm exec vitest run packages/selfix/test/vue.test.ts` selections reproduced native/v-pre identity leakage (2 failures), acronym/camelized/underscore mismatches (4 failures), and type-only import identity (2 failures). Each passed after its corresponding fix; the complete collector suite passed all 60 tests.
- Compiler-reference regressions compare generated Vue template bindings and TypeScript import metadata without evaluating application code. Public-linter regression passed for recognition, contracts, class props, configured globals, rejected spellings, and exact original offsets/lines/columns.
- `pnpm typecheck` passed during implementation. Final `pnpm check` passed: typecheck, Oxlint, Oxfmt, package build, 272 Vitest tests across 9 files, and playground typecheck/design lint/build.
- Tooling note: initial launcher was broken, so focused checks used bundled pnpm 11.19.0. After the launcher repair, its default version-selection step stalled and was interrupted; final checks used installed pnpm 12.4.2 with `pnpm_config_pm_on_fail=ignore`. No repository package-manager configuration changed.
- Independent Standards review: 0 findings. Independent Spec review: 0 findings. Both reviewed the actual working-tree changes against the recorded baseline; final formatting changed no behavior.
- No remaining nonblocking findings. Compatibility matrix and package smoke checks were not run separately; those belong to other tickets. Commit and push subsequently requested; implementation commit will be recorded after success.

Created from the approved v1-readiness audit discussion; no separate spec was supplied. Audit baseline: selfix 1ba8a7e99339b43eb91b503face00ec0e72f63c0; upstream comparison: shadcn-ui/lint bf89dcb7f66a306c7ac4943065298902afdbd969. Follow AGENTS.md: one standalone runner/config, Vue and Tailwind as the only consumer peers, no application-expression evaluation, deterministic original-SFC diagnostics, and no new runtime packages. Preserve attribution if adapting upstream code.
