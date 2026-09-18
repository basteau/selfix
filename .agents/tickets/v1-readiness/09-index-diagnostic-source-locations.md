# 09: Index diagnostic source locations once

Status: done
Blocked by: none

## Goal

Preserve diagnostic positions while eliminating a full source-prefix scan for every finding.

## Acceptance criteria

- [x] Build reusable source-position information at most once per linted source rather than slicing and splitting the prefix for each diagnostic.
- [x] Line, column, and offset retain the documented one-based/zero-based JavaScript-string semantics for all diagnostic kinds.
- [x] Positions remain correct with CRLF, Unicode, multiline bindings, and multiple findings at the same location.
- [x] Diagnostic content and deterministic ordering remain unchanged.
- [x] Record a bounded before/after diagnostic-heavy benchmark and verify equivalent results without introducing flaky wall-clock unit-test thresholds.
- [x] Use plain local functions; no generic source-map framework, worker pool, or persistent cache is introduced.

## Verification

Add focused source-location regression tests at the public lint boundary. Compare a repeated-element stress fixture before and after the change with warmed linter instances and report sizes, finding counts, and timings. Use behavioral tests rather than timing assertions.

Run `pnpm check` before reporting implementation complete. Append commands, outcomes, review findings, and completion evidence during implementation.

## Notes

- Completed in `a64a04625bfa5b173743387bee3bd62f288aca59`. A lazy per-lint array of line starts replaces repeated prefix splitting; plain binary search locates offsets. No public API, diagnostic fields/content/order, persistent cache or dependency changed.
- Behavior-preserving work: new public location regressions passed before and after the optimization. They cover every diagnostic kind, LF/CRLF, UTF-16 emoji columns, multiline bindings, configured prop/slot locations, repeated findings at one offset, parser errors, and reuse across different sources. No artificial red timing assertion was added.
- Benchmark command: `node /tmp/selfix-location-benchmark.mjs before` / `after`, using built API on macOS Node 24.21.0. One warmed linter with a recognized Button; source is `<template>\n` + `<Button class="bg-[#123456]" />\n` repeated N times + `</template>`. Two warmup runs then median of three measured runs per size. Complete serialized diagnostic SHA-256 hashes matched at every size.
- N / UTF-16 units / findings / before → after milliseconds: 1000 / 32022 / 3000 / 18.12 → 3.28; 2000 / 64022 / 6000 / 69.30 → 4.43; 4000 / 128022 / 12000 / 292.88 → 8.39; 8000 / 256022 / 24000 / 1152.46 → 16.19. Local synthetic measurements, not a general performance guarantee.
- Focused 3 location tests, typecheck, and rebuilt benchmark passed. `pnpm check` passed (401 tests across 10 files, typecheck/lint/format and playground checks/build); `git diff --check` passed. Independent Standards and Spec reviews: zero findings; reviewers inspected benchmark evidence without claiming independent execution. No unresolved scope limitations.

- Starting after ticket 11 completion on `main`; clean worktree/index, baseline commit `aec6569`. Owned scope: source-position lookup in index.ts, public location regressions, and this ticket. Preserve all diagnostic contents and UTF-16 offsets. Use warmed before/after benchmarks and equivalent-output comparisons rather than timing assertions. User authorized a commit per completed ticket.

packages/selfix/src/index.ts emit currently calls source.slice(0, offset).split on every finding. The audit observed approximately 22/72/293/1120 ms for 1000/2000/4000/8000 repeated elements with three findings each. These are local synthetic measurements, not performance promises.

Scope and dependencies approved for implementation.

Created from the approved v1-readiness audit discussion; no separate spec was supplied. Audit baseline: selfix 1ba8a7e99339b43eb91b503face00ec0e72f63c0; upstream comparison: shadcn-ui/lint bf89dcb7f66a306c7ac4943065298902afdbd969. Follow AGENTS.md: one standalone runner/config, Vue and Tailwind as the only consumer peers, no application-expression evaluation, deterministic original-SFC diagnostics, and no new runtime packages. Preserve attribution if adapting upstream code.
