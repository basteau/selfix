# 16: Configure and resolve class helpers

Status: draft
Blocked by: none

## Goal

Understand explicitly configured class-merging helpers and supported import aliases without executing helper bodies or weakening shadowing protection.

## Acceptance criteria

- [ ] Agree on configuration and whether helper identity is based on import source/export, local name, or an explicit combination.
- [ ] Supported aliased imports and configured helpers expose literal class arguments to existing rules.
- [ ] Local replacements and slot/loop shadowing remain dynamic; unconfigured calls are not guessed to be class helpers.
- [ ] Preserve existing unshadowed cn, clsx, and twMerge behavior or approve any intentional compatibility change.
- [ ] Do not interpret cva/tv variant-definition objects as ordinary class objects; variant-factory collection and mutable object evaluation remain outside this ticket.
- [ ] Validate configuration and document supported identity/argument forms with focused public regressions.

## Verification

After design approval, test named/default import aliases, configured helpers, local replacements, template shadowing, unsupported calls/arguments, and throwing bodies. Cover normal and fallback template collection.

Run `pnpm check` before reporting implementation complete. Append commands, outcomes, review findings, and completion evidence during implementation.

## Notes

Completed core-hardening/01-respect-helper-shadowing.md deliberately deferred import-aware and configurable helper discovery. Preserve its tests and completion record. The current fixed helper set and name-based calls are in packages/selfix/src/vue.ts; do not solve this by simply growing the name allowlist.

Approved for retention as draft work, not implementation-ready; resolve the listed design/testing decisions before promotion to ready.

Created from the approved v1-readiness audit discussion; no separate spec was supplied. Audit baseline: selfix 1ba8a7e99339b43eb91b503face00ec0e72f63c0; upstream comparison: shadcn-ui/lint bf89dcb7f66a306c7ac4943065298902afdbd969. Follow AGENTS.md: one standalone runner/config, Vue and Tailwind as the only consumer peers, no application-expression evaluation, deterministic original-SFC diagnostics, and no new runtime packages. Preserve attribution if adapting upstream code.
