# 13: Recognize static dynamic and namespace components

Status: draft
Blocked by: 02-match-vue-component-identity.md

## Goal

Extend component recognition to statically identifiable Vue dynamic and namespace forms without executing expressions or tracing arbitrary modules.

## Acceptance criteria

- [ ] Agree on supported :is expression forms and behavior for unresolved component identity before implementation.
- [ ] An imported Button used as component :is="Button" receives the same applicable policy as a direct Button tag.
- [ ] A namespace import used through UI.Button preserves its import source and appropriate component identity.
- [ ] Type-only imports, native tags, local replacements, and relevant scope rules do not create false component identities.
- [ ] Decide the component name used for contracts, classProps, and diagnostic metadata for namespace/dynamic forms.
- [ ] Add original-location, normal/fallback collector, configuration, and public-rule coverage for the agreed boundary.

## Verification

After resolving identity and uncertainty semantics, add collector/public-linter fixtures and compare representative forms with Vue compilation. Include throwing application expressions to prove they are not executed.

Run `pnpm check` before reporting implementation complete. Append commands, outcomes, review findings, and completion evidence during implementation.

## Notes

The audit reproduced clean results for component :is="Button" and UI.Button with forbidden p-4 despite imported UI identities. Ticket 02 establishes correct direct identity resolution. Draft approval is for retaining this scope only; unresolved identities must not receive an invented policy.

Approved for retention as draft work, not implementation-ready; resolve the listed design/testing decisions before promotion to ready.

Created from the approved v1-readiness audit discussion; no separate spec was supplied. Audit baseline: selfix 1ba8a7e99339b43eb91b503face00ec0e72f63c0; upstream comparison: shadcn-ui/lint bf89dcb7f66a306c7ac4943065298902afdbd969. Follow AGENTS.md: one standalone runner/config, Vue and Tailwind as the only consumer peers, no application-expression evaluation, deterministic original-SFC diagnostics, and no new runtime packages. Preserve attribution if adapting upstream code.
