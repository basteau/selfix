# 04: Inspect custom CSS on marker classes

Status: ready
Blocked by: none

## Goal

Keep Tailwind marker classes known while inspecting custom declarations associated with those same tokens.

## Acceptance criteria

- [ ] Custom padding and literal color on group contribute spacing/color categories and raw-color detection rather than being bypassed.
- [ ] Recognized components report no-restyle and no-raw-colors independently when the marker's custom declarations violate policy.
- [ ] Markers without associated custom declarations retain their documented known/layout behavior.
- [ ] Named and prefixed marker forms preserve existing recognition semantics; supported matching custom declarations are included.
- [ ] Imported CSS, cached repeated inspection, and semantic-color provenance remain correct.

## Verification

Add compiler-inspection and public-linter tests for group, peer, and dark, with and without overlapping custom CSS. Include an imported stylesheet and repeated inspection.

Run `pnpm check` before reporting implementation complete. Append commands, outcomes, review findings, and completion evidence during implementation.

## Notes

The early return in inspectToken in packages/selfix/src/tailwind.ts bypasses all custom declarations for markers. Reproduced with .group { padding: 1rem; color: red; } and Button class group. This extends completed core-hardening/02-inspect-overlapping-custom-css.md without reopening or modifying that completed ticket.

Scope and dependencies approved for implementation.

Created from the approved v1-readiness audit discussion; no separate spec was supplied. Audit baseline: selfix 1ba8a7e99339b43eb91b503face00ec0e72f63c0; upstream comparison: shadcn-ui/lint bf89dcb7f66a306c7ac4943065298902afdbd969. Follow AGENTS.md: one standalone runner/config, Vue and Tailwind as the only consumer peers, no application-expression evaluation, deterministic original-SFC diagnostics, and no new runtime packages. Preserve attribution if adapting upstream code.
