# 02: Reuse component definitions within each lint call

Status: ready
Blocked by: none

## Goal

Resolve a component definition at most once per lint invocation when enriching repeated no-restyle findings. Avoid repeated barrel traversal and repeated parsing of caller-supplied self-reference source while preserving source freshness, project snapshots, and independent diagnostic metadata.

The `report` callback in `packages/selfix/src/index.ts` currently calls `project.resolve` for every no-restyle finding. Introduce a small local lookup scoped to that invocation, where source, filename, and import bindings are constant. Keep the existing public interfaces.

## Acceptance criteria

- [ ] Repeated findings for the same component reuse one resolution within a lint call, including unsuccessful resolutions. Resolve lazily when a no-restyle finding needs metadata; do not eagerly resolve every collected usage.
- [ ] Repeated classes, sites, and configured prop/slot findings preserve complete diagnostic content, locations, severity, deterministic order, and local component policy identity.
- [ ] Each emitted definition remains independently mutable: changing metadata on one diagnostic must not alter another diagnostic, later lint results, or the project snapshot. Retain cloning at the output boundary as needed.
- [ ] Caller-supplied source remains authoritative for self-references. A subsequent call with changed source obtains fresh metadata, while references from other files continue to use the existing disk snapshot. No results leak across source invocations, filenames, imports, or linter instances.
- [ ] Preserve unavailable metadata, cyclic/ambiguous barrel handling, source-only API behavior, and existing failure behavior. Add no new unsupported syntax or discovery support.
- [ ] Add public-linter regressions for repeated recursive and imported/barrel findings, same-named components from different imports across calls, changed supplied source, unavailable definitions, and mutation isolation between findings and calls.
- [ ] Record before/after repeated-use benchmarks with full diagnostic equality and a bounded verification that resolution work is reused. Avoid elapsed-time assertions or tests that merely assert a particular map implementation.
- [ ] Keep reuse in a plain lint-local helper/map without a shared cache service, invalidation machinery, new public API, dependency, or configuration option.

## Verification

Run focused project/public-linter regressions, then `pnpm check` and `git diff --check`. Review cache lifetime, lookup identity, missing-result reuse, lazy evaluation, and cloning explicitly. Append commands, outcomes, review findings, and remaining limitations here.

Benchmark two independent fixtures: (1) 1,000 recursive component usages with a setup script containing 80 declarations and readable size/variant props; (2) 1,000 imported component usages resolved through a module with 500 explicit exports. Each usage should produce a no-restyle finding, for example with `p-4`. Warm the constructed linter and report medians and ranges from at least seven measured lint calls, excluding construction and fixture setup. Compare complete diagnostics and finding counts before/after. Separately verify changed editor source and mutations between findings/calls; do not infer correctness from matching counts alone. Record the source revision and whether ticket 01 is already applied.

Use real Vue parsing and filesystem fixtures. A temporary narrow work-count probe is acceptable for demonstrating avoided resolution work; no new production injection interface or permanent benchmark framework is needed.

## Notes

- Created directly from the performance discussion on 2026-09-20; no separate spec exists. The user approved ready status with no blockers. Ticket 01 is independently useful for distinct Nuxt names and doctor, but is not a prerequisite. Their benefits overlap and are not additive.
- Temporary prototype results on macOS, Node 24.21.0, seven-run warmed medians: recursive fixture 66.61 ms to 3.05 ms; 500-export barrel fixture 13.37 ms to 2.86 ms. Complete diagnostics matched. Prototype checks also covered independent diagnostic mutation, subsequent calls, changed editor source, and unchanged disk snapshots. Treat these as synthetic evidence, not performance thresholds or final implementation validation.
- Temporary audit reproducer: `/tmp/selfix-definition-memo-bench.mjs`; the fixture description above must remain sufficient when that file disappears.
- Existing [core discovery](../component-discovery/01-resolve-component-sources.md) is complete and establishes the snapshot and supplied-source contracts. Broader discovery, parser rewrites, process-global caches, and doctor-specific memoization are outside this ticket.
- Preserve Vue/Tailwind-only consumer peers, original-SFC diagnostics, and no application-expression evaluation. Ticket creation does not authorize implementation, commits, or external publication.
