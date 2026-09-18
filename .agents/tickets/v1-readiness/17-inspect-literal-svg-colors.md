# 17: Inspect literal SVG colors

Status: draft
Blocked by: none

## Goal

Extend semantic-color policy to explicitly supported literal SVG presentation attributes without evaluating runtime bindings.

## Acceptance criteria

- [ ] Agree on the initial attribute/binding set, allow/deny matching, and diagnostic metadata before implementation.
- [ ] Supported literal fill/stroke colors report no-raw-colors when they bypass semantic color policy.
- [ ] Define and test treatment of currentColor, none, semantic CSS variables, paint-server URLs, and palette references.
- [ ] Decide opaque-expression behavior and interaction with component props without scanning arbitrary unconfigured data.
- [ ] Preserve original SFC locations and existing class-associated color checks.
- [ ] Document the agreed coverage and limits in the root README with focused collector/rule tests.

## Verification

After design approval, test native SVG attributes and agreed literal bindings, semantic exceptions, raw literals, unsupported expressions, and non-SVG/component boundaries. Verify independent class and presentation-attribute findings.

Run `pnpm check` before reporting implementation complete. Append commands, outcomes, review findings, and completion evidence during implementation.

## Notes

The README explicitly excludes fill/stroke attributes today; this is an approved draft feature, not a regression fix. Upstream static SVG color checks are a comparison point. Reuse proven color-value semantics where appropriate without inventing runtime color evaluation.

Approved for retention as draft work, not implementation-ready; resolve the listed design/testing decisions before promotion to ready.

Created from the approved v1-readiness audit discussion; no separate spec was supplied. Audit baseline: selfix 1ba8a7e99339b43eb91b503face00ec0e72f63c0; upstream comparison: shadcn-ui/lint bf89dcb7f66a306c7ac4943065298902afdbd969. Follow AGENTS.md: one standalone runner/config, Vue and Tailwind as the only consumer peers, no application-expression evaluation, deterministic original-SFC diagnostics, and no new runtime packages. Preserve attribution if adapting upstream code.
