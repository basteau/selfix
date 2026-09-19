# 07: Give CLI and API documentation distinct jobs

Status: in-progress
Blocked by: 01-simplify-api-options.md, 02-unify-file-matching.md

## Goal

Let terminal users learn to run a check and tool authors learn to consume results without reading each other’s internals.

## Acceptance criteria

- [ ] Keep CLI commands, input selection, all supported flags, output format choice, stdout/stderr behavior, and exit codes concise and accurate.
- [ ] Make the API page the canonical home for diagnostic fields and linter reuse/recreation. Replace the CLI schema section with a useful link; update all incoming diagnostic/lifecycle links.
- [ ] Use the settled API and path model from 01–02 in one runnable API example. Keep the distinction between findings and thrown/loading errors.
- [ ] Remove the exported-type inventory and repeated path/lifecycle explanations. Retain public entry-point guidance necessary to use the API; TypeScript declarations supply exhaustive type names.
- [ ] Preserve original-file location meaning, optional discovery guidance, clean-array behavior, and the fact that failed loading is not a clean result.

## Verification

Run the documented API example and representative CLI text/JSON commands on failing and corrected source. Validate schema claims against actual diagnostics and declarations. Check all moved anchors and render both pages. Run pnpm check and git diff --check.

## Notes

Own apps/docs/content/cli.md and api.md with incoming-link fixes. Current CLI hosts diagnostic schema while API carries an export inventory; consolidation should reduce reading rather than add a new reference page. Code ticket 01 owns immediate correctness updates; this ticket owns editorial consolidation.

Created from the product/docs clarity discussion. The user approved the eight-ticket breakdown and dependencies, with 01–03 retained as drafts pending interface decisions. No separate spec exists. Approval here is to create local tickets, not to implement, commit, push, release, or publish externally.

Keep one publishable package, two private apps, standalone selfix.config.ts, Vue/Tailwind-only consumer peers, and no evaluation of application expressions. Preserve deterministic actionable original-SFC diagnostics. Prefer plain functions and Node built-ins. Keep essential setup in README and detailed docs in apps/docs/content; no port/migration documents or nested AGENTS.md files. Preserve existing working-tree changes and completed ticket identities.

## Implementation baseline

Starting revision: 21046f7 on main; clean worktree; dependencies01–02 done. Own CLI/API and incoming diagnostic links.
