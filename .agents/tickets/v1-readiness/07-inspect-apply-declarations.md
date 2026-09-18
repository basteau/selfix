# 07: Inspect declarations introduced by @apply

Status: ready
Blocked by: 05-correct-custom-selector-attribution.md

## Goal

Include Tailwind-applied declarations in custom-class inspection so @apply cannot hide padding, raw colors, or other policy-relevant effects.

## Acceptance criteria

- [ ] With Tailwind imported, .card { margin: 1rem; @apply p-4 bg-red-500; } is inspected as containing spacing and raw color, with independent applicable rule findings.
- [ ] Use the loaded Tailwind compiler/theme for applied utility semantics instead of maintaining a second utility grammar.
- [ ] Preserve the distinction between semantic theme values and raw palette/literal values when incorporating applied declarations.
- [ ] Imported stylesheets and mixtures of direct and applied declarations retain all relevant effects without duplicate diagnostics.
- [ ] Invalid or unsupported @apply analysis produces an actionable failure rather than silently skipping the directive.
- [ ] Document the supported @apply boundary in [theme documentation](../../../docs/themes.md).

## Verification

Add inspection and public-linter fixtures covering raw palette utilities, semantic utilities, direct/applied mixtures, imports, and invalid applied utilities. Exercise the same loaded theme used for ordinary class validation.

Run `pnpm check` before reporting implementation complete. Append commands, outcomes, review findings, and completion evidence during implementation.

## Notes

scanDeclarations currently discards statements beginning with @, including @apply. The audit reproduced a false clean result for the example in the criteria. Ticket 05 supplies reliable selector ownership. Full nested-selector support is not an artificial prerequisite; unresolved combinations must remain explicit.

Scope and dependencies approved for implementation.

Created from the approved v1-readiness audit discussion; no separate spec was supplied. Audit baseline: selfix 1ba8a7e99339b43eb91b503face00ec0e72f63c0; upstream comparison: shadcn-ui/lint bf89dcb7f66a306c7ac4943065298902afdbd969. Follow AGENTS.md: one standalone runner/config, Vue and Tailwind as the only consumer peers, no application-expression evaluation, deterministic original-SFC diagnostics, and no new runtime packages. Preserve attribution if adapting upstream code.
