# 06: Preserve nested CSS ownership

Status: ready
Blocked by: 05-correct-custom-selector-attribution.md

## Goal

Ensure supported nested CSS declarations remain associated with the classes they affect, so nesting cannot hide forbidden styling.

## Acceptance criteria

- [ ] .card { margin: 1rem; &:hover { color: red; } } retains the nested color for card inspection and produces the applicable raw-color/restyling findings.
- [ ] Supported nested conditional at-rules preserve class ownership and declaration provenance.
- [ ] Cover nested selector combinations within the selector subset established by ticket 05; unsupported combinations fail explicitly.
- [ ] Do not assign unrelated descendant declarations to an owner without a defined supported interpretation.
- [ ] Imported nested stylesheets and repeated inspection behave consistently.
- [ ] Document supported nesting and explicit failure boundaries in [theme documentation](../../../docs/themes.md) and [analysis limits](../../../docs/analysis.md).

## Verification

Add compiler/custom-CSS and public-linter regressions for parent-reference pseudo selectors, nested conditional at-rules, multiple nesting levels, and an unsupported relationship. Check deterministic categories and independent rule findings.

Run `pnpm check` before reporting implementation complete. Append commands, outcomes, review findings, and completion evidence during implementation.

## Notes

The scanner currently replaces a parent .card selector with &:hover, losing the parent class. Use Tailwind's compiler where appropriate and keep any remaining attribution bounded; do not implement browser selector matching. Ticket 05 supplies reliable selector attribution.

Scope and dependencies approved for implementation.

Created from the approved v1-readiness audit discussion; no separate spec was supplied. Audit baseline: selfix 1ba8a7e99339b43eb91b503face00ec0e72f63c0; upstream comparison: shadcn-ui/lint bf89dcb7f66a306c7ac4943065298902afdbd969. Follow AGENTS.md: one standalone runner/config, Vue and Tailwind as the only consumer peers, no application-expression evaluation, deterministic original-SFC diagnostics, and no new runtime packages. Preserve attribution if adapting upstream code.
