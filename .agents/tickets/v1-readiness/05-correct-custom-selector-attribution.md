# 05: Correct custom selector attribution

Status: ready
Blocked by: none

## Goal

Associate custom declarations with actual supported class selectors, without inventing classes from selector text or silently accepting unsupported attribution.

## Acceptance criteria

- [ ] Class-like text inside quoted attribute values does not create a known class or associated declarations.
- [ ] Classes appearing only in negation do not receive the excluded rule's declarations; supported subject classes retain their associations.
- [ ] Escaped class names are decoded and matched correctly within the supported subset, or rejected explicitly; partial names are never invented.
- [ ] Existing simple selectors, selector lists, and supported pseudo-class forms preserve behavior.
- [ ] Unsupported attribution fails with a useful CSS-inspection error instead of yielding a clean or fabricated result.
- [ ] Document and test the bounded selector subset without introducing a full cascade engine or runtime package.

## Verification

Add inspection and public-rule regressions for [data-url="a.fake"], .card:not(.ghost), escaped colon names, ordinary hover selectors, lists, and unsupported forms. Assert both absence of invented associations and retention of genuine declarations.

Run `pnpm check` before reporting implementation complete. Append commands, outcomes, review findings, and completion evidence during implementation.

## Notes

collectCustomClasses in packages/selfix/src/tailwind.ts currently uses a class-name regex over the complete selector string. The audit showed fake, ghost, and a partial escaped name becoming known. This ticket establishes the attribution boundary used by tickets 06 and 07; it is an observable fix, not a parser-framework prefactor.

Scope and dependencies approved for implementation.

Created from the approved v1-readiness audit discussion; no separate spec was supplied. Audit baseline: selfix 1ba8a7e99339b43eb91b503face00ec0e72f63c0; upstream comparison: shadcn-ui/lint bf89dcb7f66a306c7ac4943065298902afdbd969. Follow AGENTS.md: one standalone runner/config, Vue and Tailwind as the only consumer peers, no application-expression evaluation, deterministic original-SFC diagnostics, and no new runtime packages. Preserve attribution if adapting upstream code.
