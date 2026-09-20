# 03: Remove redundant filesystem traversal work

Status: ready
Blocked by: none

## Goal

Avoid redundant filesystem operations during CLI file selection and project snapshot creation while preserving the exact selected files, captured sources, supported path behavior, failures, and deterministic output.

Both `packages/selfix/src/cli.ts` and `packages/selfix/src/project.ts` read directories with file-type information and then stat their children again. The project snapshot also revisits directories reached through overlapping aliases because it tracks captured source files but not visited directories. Reuse known entry information and remember visited snapshot directories within the existing walkers.

## Acceptance criteria

- [ ] Reuse directory-entry type information for recursively enumerated children instead of restatting each child. Continue inspecting explicit input/mapping paths where that information is unavailable; preserve existing handling of their symlinks and special file types.
- [ ] Traverse an already visited project directory at most once per snapshot, including overlapping aliases, without skipping required explicit files or statically imported sources outside the root. Preserve established path identity; do not introduce new realpath-based canonicalization semantics just to deduplicate directories.
- [ ] Preserve file/directory/glob selection, overlapping input deduplication, config-relative exclusions, ignored directories, nested symlink behavior, extension/index probing, alias precedence, and deterministic final output.
- [ ] Preserve eager source snapshot semantics and supplied-source precedence. Lint must not gain lazy filesystem reads or silently observe a different dependency revision because traversal was deferred.
- [ ] Preserve actionable failures for missing/unreadable requested inputs, mapping targets, and captured sources. Required traversal/read failures must not become a clean result; do not promise atomic snapshots or add a general filesystem race-handling layer.
- [ ] Add focused CLI and project regressions covering overlapping inputs and aliases, external imports, explicit paths, symlinks, exclusions, unavailable targets, and snapshot isolation. Verify findings and doctor output where file selection matters.
- [ ] Demonstrate reduced redundant operations with a bounded before/after traversal probe and equivalent outputs. Record CLI and project-snapshot measurements separately so parsing/theme work is not mistaken for traversal cost.
- [ ] Keep the two walkers simple and local. Add no shared filesystem service, concurrent worker system, broad exclusion change, new configuration, or runtime dependency.

## Verification

Run focused CLI and project tests, then `pnpm check` and `git diff --check`. Review directory deduplication, explicit-versus-enumerated paths, symlink behavior, and propagation of filesystem failures. Record commands, outcomes, review findings, and limitations here.

Reproduce the CLI audit with 2,000 small Vue files, a valid Tailwind stylesheet/config, and `project: false` to isolate file selection from snapshot creation. Compare complete output and exit status using alternating before/after runs, warmups, and at least seven measured invocations; report medians and ranges. Add a separate project snapshot fixture with overlapping alias roots and an imported source outside the root, confirming the captured definitions and their immutability after disk edits. Measure operation counts outside timing runs where instrumentation could affect results. Keep fixture creation outside measured intervals, run without unrelated builds, and avoid wall-clock unit-test thresholds or a permanent benchmark layer.

## Notes

- Created directly from the performance discussion on 2026-09-20; no separate spec exists. The user approved ready status with no blockers. This is one bounded traversal cleanup across the existing CLI and snapshot walkers, not a prerequisite refactor for other tickets.
- Audit evidence on macOS with Node 24.21.0: an in-process CLI over 2,000 files with discovery disabled took approximately 112.96 ms before and 100.51 ms using existing directory-entry information. Seven measured alternating runs after warmup; ranges were approximately 108.57–119.38 ms and 95.68–101.57 ms. Output matched for that fixture. This is synthetic evidence, not an expected universal 11% improvement.
- Directory deduplication was identified by inspection; its additional benefit has not been established on a representative large project. Measure it during implementation instead of attributing the CLI prototype's gain to both changes.
- Temporary audit reproducer: `/tmp/selfix-walk-ab.mjs`. Preserve a reproducible fixture description and commands here when recording completion; do not depend on temporary files surviving.
- Existing [core discovery](../component-discovery/01-resolve-component-sources.md) establishes external-import capture, explicit mappings, and immutable snapshots. Do not replace eager discovery with lazy disk access or narrow source capture to only lint-selected files.
- Ticket creation does not authorize implementation, commits, or external publication.
