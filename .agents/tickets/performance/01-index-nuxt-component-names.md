# 01: Index prepared Nuxt component names once

Status: ready
Blocked by: none

## Goal

Resolve supported prepared Nuxt component names through a lookup index constructed once per project snapshot, eliminating repeated full-map scans during lint and doctor. Preserve all existing component identity, ambiguity, precedence, metadata, and failure behavior.

The current global-component branch in `packages/selfix/src/project.ts` copies the generated map and normalizes every name on every resolution. Replace that repeated search with a small local map; do not broaden supported discovery or introduce a cache framework.

## Acceptance criteria

- [ ] Construct the generated-name index once per project snapshot and use direct lookups for exact and existing kebab-case names in both lint and doctor resolution.
- [ ] Preserve the current candidate-count semantics: ambiguous names remain unresolved even when competing entries point to the same source. An entry whose exact and normalized names coincide counts only once. Do not give exact matches new precedence over normalized collisions.
- [ ] Preserve explicit component mapping precedence, imported-component resolution, supported default exports, unavailable definitions, and actionable errors for malformed or missing prepared artifacts and sources.
- [ ] Preserve complete diagnostic content, severity, order, original SFC locations, prop/slot context, and doctor output. Definition discovery must not change recognition or enforcement.
- [ ] Keep indexes isolated between project snapshots. Recreating a linter reflects changed generated metadata; existing snapshots retain their established behavior.
- [ ] Add focused regressions covering exact names, kebab names, lowercase names, normalization collisions, unknown names, explicit overrides, lint findings, and doctor usages without class attributes. Reuse real parsers and temporary prepared metadata fixtures.
- [ ] Record a reproducible before/after benchmark with complete output equivalence for repeated and distinct component usages. Measure lint and doctor separately; do not claim independent speedups from overlapping optimizations can be added together.
- [ ] Keep the implementation local to existing project discovery using plain functions and a map. Add no dependency, public API, configuration, watcher, or persistent cache.

## Verification

Run focused project and CLI/doctor regressions, then `pnpm check` and `git diff --check`. Review precedence and collision handling explicitly before marking done. Record commands, outcomes, review findings, and remaining limitations here.

Reproduce the audit workload with 2,000 generated component declarations pointing to valid local Vue sources and 1,000 repeated recognized `<UiComponent250 class="p-4" />` usages. Construct a linter outside each measured lint interval, warm it, and report the median of at least five measurements. Compare complete diagnostics before/after, including definition paths. Add a workload using many distinct generated names and a doctor workload so local reuse from ticket 02 cannot hide name-index behavior. Keep fixture preparation outside measured intervals and report fixture sizes, versions, finding/usage counts, and timing ranges. Use behavioral regression tests, not wall-clock assertions or a permanent benchmark subsystem.

## Notes

- Created directly from the performance review discussion on 2026-09-20; no separate spec exists. The user approved this ticket as ready with no blockers. Numbering is suggested implementation order, not a dependency chain. Ticket creation does not authorize implementation, commits, or external publication.
- Audit evidence on macOS with Node 24.21.0: 2,000 generated names and 1,000 repeated violations took approximately 265.35 ms before and 3.38 ms with a temporary name-index prototype, median of five warmed lint runs. Full diagnostics and selected collision cases matched. These synthetic measurements are supporting evidence, not a required threshold or application-wide guarantee.
- Temporary audit reproducer: `/tmp/selfix-project-perf.mjs`. Temporary files may disappear; the workload description above is the durable reproduction basis. Prototype checks do not replace regression coverage and review of the final implementation.
- Reuse completed [core component discovery](../component-discovery/01-resolve-component-sources.md) and [doctor](../doctor/01-explain-component-protection.md). The broader discovery draft is not a prerequisite and must not be absorbed.
- Preserve the standalone runner, Vue/Tailwind-only consumer peers, immutable source snapshots, and explicit unsupported-input/loading failures. Do not evaluate application expressions or framework configuration.
