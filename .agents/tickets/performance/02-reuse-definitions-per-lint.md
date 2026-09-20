# 02: Reuse component definitions within each lint call

Status: done
Blocked by: none

## Goal

Resolve a component definition at most once per lint invocation when enriching repeated no-restyle findings. Avoid repeated barrel traversal and repeated parsing of caller-supplied self-reference source while preserving source freshness, project snapshots, and independent diagnostic metadata.

The `report` callback in `packages/selfix/src/index.ts` currently calls `project.resolve` for every no-restyle finding. Introduce a small local lookup scoped to that invocation, where source, filename, and import bindings are constant. Keep the existing public interfaces.

## Acceptance criteria

- [x] Repeated findings for the same component reuse one resolution within a lint call, including unsuccessful resolutions. Resolve lazily when a no-restyle finding needs metadata; do not eagerly resolve every collected usage.
- [x] Repeated classes, sites, and configured prop/slot findings preserve complete diagnostic content, locations, severity, deterministic order, and local component policy identity.
- [x] Each emitted definition remains independently mutable: changing metadata on one diagnostic must not alter another diagnostic, later lint results, or the project snapshot. Retain cloning at the output boundary as needed.
- [x] Caller-supplied source remains authoritative for self-references. A subsequent call with changed source obtains fresh metadata, while references from other files continue to use the existing disk snapshot. No results leak across source invocations, filenames, imports, or linter instances.
- [x] Preserve unavailable metadata, cyclic/ambiguous barrel handling, source-only API behavior, and existing failure behavior. Add no new unsupported syntax or discovery support.
- [x] Add public-linter regressions for repeated recursive and imported/barrel findings, same-named components from different imports across calls, changed supplied source, unavailable definitions, and mutation isolation between findings and calls.
- [x] Record before/after repeated-use benchmarks with full diagnostic equality and a bounded verification that resolution work is reused. Avoid elapsed-time assertions or tests that merely assert a particular map implementation.
- [x] Keep reuse in a plain lint-local helper/map without a shared cache service, invalidation machinery, new public API, dependency, or configuration option.

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

## Implementation progress

- Baseline: `b56a75cd81d47fb868feec72c67bc6b755c049b1`, branch `main`; clean tracked and untracked worktree. Ticket 01 is already applied.
- Owned scope: this ticket, `packages/selfix/src/index.ts`, and public-linter regressions in `packages/selfix/test/project.test.ts`. Temporary benchmark/probe artifacts remain outside tracked sources.
- Behavior-preserving optimization: use real public-linter fixtures and existing discovery regressions, plus a temporary resolution work-count probe; no artificial failing behavior test for already-preserved behavior.

## Completion evidence

- Implemented a plain lint-local definition lookup keyed by the local component name. Source, imports, and filename are fixed for its lifetime. `Map.has` retains unsuccessful resolutions; lookup happens only when emitting no-restyle findings. Every emitted definition is independently cloned. Project resolution, doctor, public APIs, dependencies, and configuration are unchanged.
- Added five public-linter cases (including three unavailable-import variants) covering repeated recursive and barrel findings, all diagnostic fields against source-only behavior, exact locations/severity/local policy identity, configured class/slot props, mutation isolation, changed editor source, stable disk snapshots, changed imports/filenames, and separate linter instances.
- Behavior-preserving validation: new regressions passed on the original implementation after correcting fixture assumptions (explicit self mapping and normalized prop spelling); no artificial red test. The bounded work-count probe demonstrates the optimization itself. Focused `pnpm exec vitest run packages/selfix/test/project.test.ts`: 47 passed before and after the optimization. `pnpm typecheck`: passed.
- `pnpm check`: passed, including 18 test files / 558 tests, playground typecheck/design lint/build, strict docs links and isolated build. First run caught an unused destructuring binding in a new test; renamed it `_definition`. A sandbox run then denied child-process launches with EPERM; an approved unsandboxed run passed fully, and the stalled sandbox run was stopped. pnpm 11.23.0 was invoked through a temporary PATH wrapper for the already-cached installation because no pnpm executable was on PATH.
- `git diff --check`: passed. Final working-tree diff reviewed against the recorded baseline; no staged or unrelated untracked changes.

### Benchmark and work-count evidence

Linux, Node 24.21.0; baseline `b56a75cd81d47fb868feec72c67bc6b755c049b1` (ticket 01 already applied), compared with the current working tree. Baseline compiled output was copied before implementation. Temporary script: `/tmp/selfix-definition-ticket/bench.mjs`; no permanent framework or production instrumentation added.

Both specified fixtures emitted 1,000 findings. Three warmups preceded nine measured calls per implementation; setup/construction and diagnostic equality assertions were excluded from timing. Complete diagnostics were deeply equal before/after and on every measured call.

| Fixture                                            | Before median (range), ms | After median (range), ms | Resolution calls before → after |
| -------------------------------------------------- | ------------------------- | ------------------------ | ------------------------------- |
| Recursive, 80 declarations with size/variant props | 69.10 (67.65–78.61)       | 3.74 (3.31–4.17)         | 1,000 → 1                       |
| Barrel, 500 explicit exports                       | 8.92 (8.40–10.55)         | 3.75 (3.11–6.00)         | 1,000 → 1                       |

Separate temporary instrumented copies counted resolver entry without substituting parsing or filesystem behavior. Missing metadata also fell from 1,000 resolutions to one. Allowed classes, classless usages, and an inline-style-only finding each performed zero resolutions before and after. These are synthetic measurements, not timing thresholds or general application performance promises. Source freshness and mutation contracts are separately covered by public-linter regressions.

### Review

- Standards: independent subagent reviewed actual changes, resolver/callers, tests, AGENTS.md and README contracts; zero findings.
- Spec: independent subagent mapped acceptance criteria to implementation, regressions, and the temporary benchmark; zero findings.
- Review scope: baseline above, initially clean worktree, owned files listed under implementation progress. Reviewers received focused-test/typecheck evidence; final full checks and benchmark results were verified by the implementing agent. The only subsequent code edit was the unused-binding rename required by lint.
- No unresolved blocking findings or known nonblocking implementation limitations. Implementation committed as `8bbaf4f6821c24f28c32a51d8862241ec335bea8` after the user requested committing and pushing all changes. Completion evidence is recorded in the following documentation commit.
