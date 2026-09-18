# 02: Match Vue component identity

Status: ready
Blocked by: none

## Goal

Apply component recognition and contracts to the same runtime component identities that Vue resolves, without confusing native tags or type imports with component bindings.

## Acceptance criteria

- [ ] Importing Button does not make native button elements inherit Button recognition, contracts, or configured class props.
- [ ] Elements rendered literally under v-pre do not acquire imported-component identity.
- [ ] Supported exact and kebab-case tag spellings, including UIButton used as u-i-button, match Vue resolution; spellings Vue does not resolve do not acquire invented aliases.
- [ ] Type-only declarations and type-only import specifiers do not establish runtime component identity.
- [ ] Ordinary imported, renamed, and configured global components retain their documented behavior and original diagnostic locations.
- [ ] Cover normal and fallback template collection paths using Vue compiler behavior as the reference; keep any identity helper small and local.

## Verification

Add collector and public-linter regressions for native/component pairs, acronym names, v-pre, renamed imports, mixed type/value imports, contracts, and classProps. Compare representative identities with Vue compilation without evaluating application code.

Run `pnpm check` before reporting implementation complete. Append commands, outcomes, review findings, and completion evidence during implementation.

## Notes

The audit reproduced native button receiving no-restyle after importing Button, u-i-button escaping the imported UIButton policy, and import type incorrectly establishing UI identity. Start at collectElement, collectImportAliases, and kebabCase in packages/selfix/src/vue.ts. Dynamic/namespace forms are separately scoped in draft ticket 13.

Scope and dependencies approved for implementation.

Created from the approved v1-readiness audit discussion; no separate spec was supplied. Audit baseline: selfix 1ba8a7e99339b43eb91b503face00ec0e72f63c0; upstream comparison: shadcn-ui/lint bf89dcb7f66a306c7ac4943065298902afdbd969. Follow AGENTS.md: one standalone runner/config, Vue and Tailwind as the only consumer peers, no application-expression evaluation, deterministic original-SFC diagnostics, and no new runtime packages. Preserve attribution if adapting upstream code.
