# 01: Simplify API options and path ownership

Status: in-progress
Blocked by: none

## Goal

Make the programmatic API express what callers actually supply, with clear path ownership and no silently ignored CLI settings. Deliver the approved interface, updated callers, focused regressions, and corresponding documentation in one change.

## Acceptance criteria

- [ ] Record and approve a concrete before/after API before implementation. Compare clearer names and narrower types with consolidating project-relative defaults; preserve a separate stylesheet origin when CSS lives elsewhere. State the compatibility/release cost of removals or renames.
- [ ] Separate CLI-only config from API options. Decide explicitly how API validation handles css/exclude supplied in config; do not continue silently accepting irrelevant settings or add a compatibility layer by default.
- [ ] Make CSS imports/aliases, override matching, discovery roots, relative lint filenames, and diagnostic filenames predictable under the chosen design. Avoid requiring repeated project roots for ordinary callers while preserving legitimate separate locations.
- [ ] Update createLinter, lintSource, CLI normalization, exports, internal callers, package smoke coverage, and affected docs together. Source-only API use must remain possible.
- [ ] Preserve original-SFC diagnostics, independent rule enforcement, opt-in API discovery, and the separation between recognition and definition guidance. Failed loading must remain a failure.

## Verification

Use real temporary projects with distinct config/CSS/discovery directories and alternate working directories. Cover source-only calls, relative and absolute filenames, API option rejection, file overrides, CSS aliases, and diagnostic identity. Inspect packages/selfix/test/overrides.test.ts, cli.test.ts, project.test.ts, and scripts/smoke-install.mjs. Add focused Vitest tests and type checks for the approved interface; run pnpm check and git diff --check. Record breaking impacts and any required packed-consumer checks.

## Notes

Current evidence: packages/selfix/src/index.ts exposes base, configBase, and config.project.root; its Config also permits CLI css/exclude fields that API creation does not apply. cli.ts separately normalizes those paths. The user approved this ticket as draft, not an exact replacement interface. Recommended direction: narrower API types and explicit path ownership, without another convenience wrapper or new dependency. Open decisions: option names/defaults, invalid-field handling, and compatibility policy. Coordinate shared config edits with 02 and 03 without imposing a false behavioral dependency.

Created from the product/docs clarity discussion. The user approved the eight-ticket breakdown and dependencies, with 01–03 retained as drafts pending interface decisions. No separate spec exists. Approval here is to create local tickets, not to implement, commit, push, release, or publish externally.

Keep one publishable package, two private apps, standalone selfix.config.ts, Vue/Tailwind-only consumer peers, and no evaluation of application expressions. Preserve deterministic actionable original-SFC diagnostics. Prefer plain functions and Node built-ins. Keep essential setup in README and detailed docs in apps/docs/content; no port/migration documents or nested AGENTS.md files. Preserve existing working-tree changes and completed ticket identities.

## Approved design

The user approved both the baseline commits and the proposed breaking designs, then authorized sequential implementation with clean per-ticket commits. This supersedes the earlier creation-only authorization and unresolved draft notes.

Approved replacement: createLinter({ css, root?, cssBase?, config? }). root defaults to cwd and owns file overrides, CSS alias targets, and default discovery location; cssBase defaults to root and is only the origin for stylesheet imports. Relative cssBase and config.project.root resolve from root; an explicit discovery root stays available. Relative lint filenames refer to root for discovery and overrides, while emitted filenames remain exactly as supplied. Config remains the CLI type; export a narrower LinterConfig without css/exclude for API use and reject those fields at runtime. Reject removed base/configBase options with actionable errors. Keep API discovery opt-in. This intentionally breaks the old API; update consumers and record a BREAKING CHANGE trailer, without compatibility wrappers, version bump, or publication.

## Implementation baseline

Starting revision: 918b51b on main; clean worktree after the approved documentation and ticket baseline commits. Own API/config/CLI normalization, affected consumers and docs, focused tests, and this ticket. User authorized implementation and commits; no push.
