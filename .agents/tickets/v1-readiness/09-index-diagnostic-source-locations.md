# 09: Index diagnostic source locations once

Status: ready
Blocked by: none

## Goal

Preserve diagnostic positions while eliminating a full source-prefix scan for every finding.

## Acceptance criteria

- [ ] Build reusable source-position information at most once per linted source rather than slicing and splitting the prefix for each diagnostic.
- [ ] Line, column, and offset retain the documented one-based/zero-based JavaScript-string semantics for all diagnostic kinds.
- [ ] Positions remain correct with CRLF, Unicode, multiline bindings, and multiple findings at the same location.
- [ ] Diagnostic content and deterministic ordering remain unchanged.
- [ ] Record a bounded before/after diagnostic-heavy benchmark and verify equivalent results without introducing flaky wall-clock unit-test thresholds.
- [ ] Use plain local functions; no generic source-map framework, worker pool, or persistent cache is introduced.

## Verification

Add focused source-location regression tests at the public lint boundary. Compare a repeated-element stress fixture before and after the change with warmed linter instances and report sizes, finding counts, and timings. Use behavioral tests rather than timing assertions.

Run `pnpm check` before reporting implementation complete. Append commands, outcomes, review findings, and completion evidence during implementation.

## Notes

packages/selfix/src/index.ts emit currently calls source.slice(0, offset).split on every finding. The audit observed approximately 22/72/293/1120 ms for 1000/2000/4000/8000 repeated elements with three findings each. These are local synthetic measurements, not performance promises.

Scope and dependencies approved for implementation.

Created from the approved v1-readiness audit discussion; no separate spec was supplied. Audit baseline: selfix 1ba8a7e99339b43eb91b503face00ec0e72f63c0; upstream comparison: shadcn-ui/lint bf89dcb7f66a306c7ac4943065298902afdbd969. Follow AGENTS.md: one standalone runner/config, Vue and Tailwind as the only consumer peers, no application-expression evaluation, deterministic original-SFC diagnostics, and no new runtime packages. Preserve attribution if adapting upstream code.
