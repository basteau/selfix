# 02: Make file matching consistent

Status: done
Blocked by: none

## Goal

Give exclusion and file-override patterns one understandable model, including explicit roots and directory behavior. This is a bounded file-selection change, not an attempt to make imports, component names, and class tokens all use the same syntax.

## Acceptance criteria

- [x] Approve the exact pattern grammar, root, directory semantics, and compatibility policy before implementation. Use before/after examples for generated, src/generated, src/**/*.vue, dotfiles, and zero-directory ** matches.
- [x] Use one tested file-pattern model for user exclusions and overrides. State how CLI input globs relate to it; assess discrepancies without unnecessarily replacing Node glob discovery.
- [x] Keep generated/dependency-directory skipping, deterministic deduplication, symlink traversal rules, original diagnostic paths, and empty-scan failures intact. Exclusions skip every rule and cannot be undone by overrides.
- [x] Validate unsupported patterns with actionable errors. Do not silently reinterpret an old exclusion into a broader or narrower scan; apply the approved compatibility decision explicitly.
- [x] Update validation, CLI selection, shared matching code, examples, and documentation together without adding runtime dependencies.

## Verification

Add focused Vitest cases through public CLI and override behavior for files/directories/globs, nested and dot paths, outside-root files, alternate working directories, invalid patterns, excluded explicit inputs, and empty scans. Inspect src/cli.ts excluded(), src/config.ts filePattern(), test/cli.test.ts, and test/overrides.test.ts. Run pnpm check and git diff --check; record compatibility evidence.

## Notes

Current exclusions use bare path segments or path prefixes, while overrides use a restricted glob grammar and CLI inputs use Node glob. Recommended direction: one explicit config-relative file-pattern model for exclusions and overrides, keeping import/class matching separate. Exact handling of legacy bare-directory entries and CLI-glob breadth remains unresolved, so this ticket stays draft. Completed v1-readiness/14 remains historical evidence; do not rewrite it.

Created from the product/docs clarity discussion. The user approved the eight-ticket breakdown and dependencies, with 01–03 retained as drafts pending interface decisions. No separate spec exists. Approval here is to create local tickets, not to implement, commit, push, release, or publish externally.

Keep one publishable package, two private apps, standalone selfix.config.ts, Vue/Tailwind-only consumer peers, and no evaluation of application expressions. Preserve deterministic actionable original-SFC diagnostics. Prefer plain functions and Node built-ins. Keep essential setup in README and detailed docs in apps/docs/content; no port/migration documents or nested AGENTS.md files. Preserve existing working-tree changes and completed ticket identities.

## Approved design

The user approved both the baseline commits and the proposed breaking designs, then authorized sequential implementation with clean per-ticket commits. This supersedes the earlier creation-only authorization and unresolved draft notes.

Approved replacement: exclusions use the existing override glob grammar, rooted at the config directory. Match full relative paths. Use **/generated/** for the old bare generated directory and src/generated/** for the old src/generated prefix. Reject legacy non-glob directory shorthand with an actionable suggested replacement rather than silently changing its meaning; exact .vue file exclusions remain valid. Both models support *, **, ?, dotfiles and zero-directory **. Retain Node glob for CLI input selection and document its separate shell-facing role. Keep built-in generated-directory skips and failure behavior. Breaking change, no release/version bump.

## Implementation baseline

Starting revision: 67d0987 on main; clean worktree. Own exclusion matching, shared validation, CLI regression tests, affected docs and this ticket.

## Completion

Implementation: 9c53841. Public CLI tests failed with old matching, then all 42 focused tests passed. pnpm check passed (482 tests, playground, docs links/build); git diff --check passed. Independent Standards and Spec reviews: no findings. Breaking shorthand change documented; no release or push.
