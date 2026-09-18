# 04: Reorganize documentation around a concise README

Status: ready
Blocked by: none

## Goal

Help new users understand and start using selfix from a concise root README, while making detailed guides, reference material, troubleshooting, and maintainer procedures easy to find in repository Markdown documentation.

Relocate and organize the existing documentation as one bounded change. Preserve its examples, supported behavior, guarantees, attribution, and important limitations. This is documentation work, not a runtime feature or a documentation-site project.

## Acceptance criteria

- [ ] The root README focuses on what selfix does, one concrete violation and correction, supported versions and alpha status, installation, minimal complete configuration, the command to run, a linked six-rule summary, scope, documentation/contributor links, attribution, and license. Aim for roughly 120–180 lines without sacrificing essential instructions or accuracy.
- [ ] Essential caveats remain visible at the point of use: all six rules default to errors; exclusions skip every rule; configuration executes as Node code; analysis targets Vue SFCs and does not provide autofix. Move compiler-capability troubleshooting details out of the opening installation paragraph.
- [ ] Create `docs/README.md` as a short navigation map and the agreed pages: `getting-started.md`, `adoption.md`, `rules.md`, `configuration.md`, `cli.md`, `api.md`, `themes.md`, `analysis.md`, `troubleshooting.md`, and `maintaining.md`. Each page has a route back to the index and useful links to related material. Keep the six rule references together initially.
- [ ] Preserve the complete runnable tutorial, including theme/component setup, failing diagnostic with original source location, correction, and successful output, in getting-started. Keep existing-project rollout, warning thresholds, local/CI commands, and coding-agent instructions discoverable in adoption.
- [ ] Retain full rule, configuration, shared-policy, CLI, and API reference coverage. Give defaults and precedence one authoritative location; guides link to it. Keep examples and relevant limitations together. Preserve CSS resolution and Nuxt UI theme preparation in themes, and supported expressions, uncertainty, coverage limits, and trust boundaries in analysis.
- [ ] Preserve symptom-driven troubleshooting and development/package verification/release instructions. Separate historical release bootstrap material from the routine release procedure within maintaining; do not discard necessary operational knowledge or perform release actions.
- [ ] Replace AGENTS.md's README-only documentation requirement with a clear rule assigning essentials to the root README and details to `docs/`. Keep AGENTS.md the central contributor/agent guide; do not add nested agent guides or duplicate contributor standards across pages.
- [ ] Update documentation-location requirements and links in unfinished tickets where they explicitly require README-only updates, without changing their behavioral scope, approval status, dependencies, or identities. Preserve completed ticket history, including documentation tickets 01–03.
- [ ] Repair moved section links and anchors throughout affected documentation. Verify the shortened README's documentation links work from GitHub, npm, and the installed package: docs omitted from the tarball must use appropriate repository URLs. Keep the root README authoritative for the existing packaging copy workflow and verify the packed copy.
- [ ] Preserve standalone-runner positioning, `selfix.config.ts`, Vue/Tailwind-only consumer peers, and upstream acknowledgment. Do not add a documentation site, runtime features, alternate integrations, port/migration documents, new release versions, or publication steps.

## Verification

Use documentation-focused validation rather than artificial failing runtime tests:

- Inventory the existing README sections before moving them and map each to its destination. Review against the current implementation and completed documentation work so relocation neither drops coverage nor reinstates stale behavior.
- Execute the shortened README setup and full getting-started example through the real built CLI in temporary fixtures. Verify the expected failing diagnostic/location and successful correction. Recheck adoption examples if their executable content changes.
- Check all affected local paths, cross-page links, and heading fragments, including unfinished tickets. Inspect GitHub-compatible Markdown rendering for tables, code blocks, and collapsed sections.
- Use the existing package workflow to create a temporary archive, verify the packed/root README match, and inspect documentation-link destinations from the package context. Do not publish or change package versions. Report any hosted-link or rendering checks that cannot be performed before the new files are pushed.
- Run `pnpm check` and `git diff --check`. Add focused regression coverage only if necessary for a changed packaging behavior; do not add prose snapshots or a new documentation framework.
- Review the complete current diff against the ticket, record findings and fixes, and append commands, outcomes, and remaining limitations before marking done.

## Notes

- Approved by the user as one independently verifiable ticket after the README reorganization discussion. No separate spec was supplied. No dependencies: existing documentation tickets 01–03 are complete, and this is a reorganization of their material rather than a reopening of their work.
- Discussion baseline: the root README was 822 lines and about 7,400 words, mixing onboarding, lookup, explanation, troubleshooting, and maintainer procedures. Recheck the current document at implementation time; preserve newer changes.
- Structural references: [shadcn-ui/lint documentation index](https://github.com/shadcn-ui/lint/blob/main/docs/README.md), [its rule-page pattern](https://github.com/shadcn-ui/lint/blob/main/docs/rules/no-restyle.md), [Ruff tutorial](https://docs.astral.sh/ruff/tutorial/), and [Diátaxis](https://www.diataxis.fr/start-here/). Borrow organization principles, not upstream behavior or claims. Plain repository Markdown is sufficient; do not impose an elaborate taxonomy.
- Related packaging files: `packages/selfix/scripts/package.mjs`, `packages/selfix/scripts/smoke-install.mjs`, and `packages/selfix/package.json`. Reuse existing packaging checks instead of duplicating smoke infrastructure. The existing macOS smoke-path issue belongs to v1-readiness ticket 10.
- Other sessions may be completing v1-readiness work. Inspect initial tracked/untracked changes and ticket notes, preserve unrelated work, and coordinate any overlapping edits before implementation.
- This ticket authorizes the documentation reorganization, including replacing the old README-only project rule during implementation. Creating this ticket does not implement it, close another ticket/spec, or authorize a commit, push, or publication.
