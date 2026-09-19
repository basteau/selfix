# 06: Replace implementation explanations with practical limits

Status: in-progress
Blocked by: 01-simplify-api-options.md

## Goal

Help readers load their real theme and understand the check’s meaningful limits, without a parser or compiler specification.

## Acceptance criteria

- [ ] Keep the theme entry, relative CSS imports, exact aliases, and runnable Nuxt preparation workflow. Remove package-export resolution algorithms and move pinned integration versions to maintainer verification if still needed.
- [ ] Replace exhaustive selector tables and declaration-association mechanics with a brief supported-CSS explanation and common failure guidance. Retain enough actionable information to avoid recommending unsupported fixes.
- [ ] Retain a small class-expression example and the consequential limits on dynamic bindings, helper recognition, configured props, wrappers, and source formats. Remove syntax inventories not needed for a user decision.
- [ ] Delete functional-utility transparency/compiler detail from the normal reading path. Keep an unusual restriction only if it materially helps recover from an actual error; do not manufacture an advanced page to preserve every paragraph.
- [ ] Keep clean-result scope, parse/loading failures, and trusted executable configuration explicit. Keep theme preparation honest about stale/missing generated files. Repair links from troubleshooting and reference pages.

## Verification

Verify retained CSS and binding examples with the current linter; verify Nuxt instructions against existing integration fixtures without claiming a fresh network smoke run unless executed. Check error guidance against actual errors. Run link/build validation through pnpm check and git diff --check. Record removed topics and retained consequential limits.

## Notes

Own apps/docs/content/analysis.md and themes.md plus tightly scoped troubleshooting/maintainer/link adjustments. Depend on 01 for final path/lifecycle terminology. Preserve completed CSS-loading and Nuxt behavior; this does not authorize expanding selector support or weakening unsupported-input failures. Older exhaustive documentation requirements are superseded for prose, not product behavior.

Created from the product/docs clarity discussion. The user approved the eight-ticket breakdown and dependencies, with 01–03 retained as drafts pending interface decisions. No separate spec exists. Approval here is to create local tickets, not to implement, commit, push, release, or publish externally.

Keep one publishable package, two private apps, standalone selfix.config.ts, Vue/Tailwind-only consumer peers, and no evaluation of application expressions. Preserve deterministic actionable original-SFC diagnostics. Prefer plain functions and Node built-ins. Keep essential setup in README and detailed docs in apps/docs/content; no port/migration documents or nested AGENTS.md files. Preserve existing working-tree changes and completed ticket identities.

## Implementation baseline

Starting revision: e1bd3e1 on main; clean worktree; dependency01 done. Own analysis/themes plus incoming README/troubleshooting labels and maintainer integration-version record.
