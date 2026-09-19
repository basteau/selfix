# 08: Consolidate adoption and agent setup

Status: ready
Blocked by: 02-unify-file-matching.md, 03-simplify-policy-precedence.md, 04-simplify-first-use.md

## Goal

Give human and agent-assisted adoption one shared setup path, with the agent guide adding only project inspection and proof of enforcement.

## Acceptance criteria

- [ ] Let Getting started own installation prerequisites and Adoption own rollout configuration, scripts, warning limits, and CI. Replace repeated instructions in Agent setup with direct links.
- [ ] Keep the copyable agent prompt, project/theme/import inspection, existing-policy preservation, and known-violation/correction verification. Reduce procedural and handoff duplication without losing cleanup or the real project scan.
- [ ] Keep workspace guidance in one home and link it from the other entry points. Verify distinct app themes and correct config-relative paths under the final matching model.
- [ ] Align headings, sidebar labels, and cross-links with reader tasks. Remove stale links and repeated option tables across the edited docs; preserve useful troubleshooting and release procedures largely unchanged.
- [ ] Apply the editorial deletion rule across the final collection: each paragraph supports choosing, configuring, running, or diagnosing selfix, or a necessary maintainer task. Aim for a further 20–30% reduction from the roughly 9,006-word baseline, without padding or cutting essential constraints to hit a quota.

## Verification

Exercise the rollout script and agent verification steps with temporary conventional and two-app workspace fixtures. Confirm warning limits, preserved policies, separate themes, known failures/corrections, and cleanup. Verify links/navigation and perform a final first-time-reader pass when other documentation tickets have landed; this is coordination, not an artificial dependency. Run pnpm check and git diff --check.

## Notes

Own apps/docs/content/adoption.md and agent-setup.md plus navigation and focused cross-links. Human instructions and agent instructions share facts but serve different tasks. Preserve upstream setup attribution. Keep prior documentation/05 complete; this ticket supersedes duplicated prose, not its enforcement-verification requirement. Coordinate final collection review with 05–07 without blocking independent work on them.

Created from the product/docs clarity discussion. The user approved the eight-ticket breakdown and dependencies, with 01–03 retained as drafts pending interface decisions. No separate spec exists. Approval here is to create local tickets, not to implement, commit, push, release, or publish externally.

Keep one publishable package, two private apps, standalone selfix.config.ts, Vue/Tailwind-only consumer peers, and no evaluation of application expressions. Preserve deterministic actionable original-SFC diagnostics. Prefer plain functions and Node built-ins. Keep essential setup in README and detailed docs in apps/docs/content; no port/migration documents or nested AGENTS.md files. Preserve existing working-tree changes and completed ticket identities.
