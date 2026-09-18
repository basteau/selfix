# 15: Allow narrow dynamic-style exceptions

Status: draft
Blocked by: none

## Goal

Permit intentional dynamic properties and CSS variables without granting unrestricted inline styling to a component.

## Acceptance criteria

- [ ] Agree on property-level configuration, CSS-variable treatment, and interaction with existing style allow/deny contracts before implementation.
- [ ] Decide behavior for opaque bindings, spreads, computed keys, null values, and literal raw colors within permitted properties or variables.
- [ ] Support agreed measured-width/progress-variable cases while retaining diagnostics for unrelated forbidden styling.
- [ ] Separate inline property permissions from the policy governing SFC style blocks; preserve existing configurations deliberately.
- [ ] Never evaluate application expressions or infer runtime values.
- [ ] Document the policy and provide original-location config/collector/rule/CLI regressions for the agreed cases.

## Verification

After design approval, exercise literal and dynamic values, CSS variables, raw colors, mixed allowed/forbidden properties, whole-style exceptions, unsupported objects, and SFC style blocks. Include non-execution fixtures.

Run `pnpm check` before reporting implementation complete. Append commands, outcomes, review findings, and completion evidence during implementation.

## Notes

packages/selfix/src/index.ts currently matches the synthetic token style for the whole site. Upstream offers property-level allowances, but its semantics are reference material rather than automatically approved selfix behavior. Resolve compatibility and uncertainty semantics before implementation.

Approved for retention as draft work, not implementation-ready; resolve the listed design/testing decisions before promotion to ready.

Created from the approved v1-readiness audit discussion; no separate spec was supplied. Audit baseline: selfix 1ba8a7e99339b43eb91b503face00ec0e72f63c0; upstream comparison: shadcn-ui/lint bf89dcb7f66a306c7ac4943065298902afdbd969. Follow AGENTS.md: one standalone runner/config, Vue and Tailwind as the only consumer peers, no application-expression evaluation, deterministic original-SFC diagnostics, and no new runtime packages. Preserve attribution if adapting upstream code.
