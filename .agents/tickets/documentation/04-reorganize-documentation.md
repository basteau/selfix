# 04: Reorganize documentation around a concise README

Status: done
Blocked by: none

## Goal

Help new users understand and start using selfix from a concise root README, while making detailed guides, reference material, troubleshooting, and maintainer procedures easy to find in repository Markdown documentation.

Relocate and organize the existing documentation as one bounded change. Preserve its examples, supported behavior, guarantees, attribution, and important limitations. This is documentation work, not a runtime feature or a documentation-site project.

## Acceptance criteria

- [x] The root README focuses on what selfix does, one concrete violation and correction, supported versions and alpha status, installation, minimal complete configuration, the command to run, a linked six-rule summary, scope, documentation/contributor links, attribution, and license. Aim for roughly 120–180 lines without sacrificing essential instructions or accuracy.
- [x] Essential caveats remain visible at the point of use: all six rules default to errors; exclusions skip every rule; configuration executes as Node code; analysis targets Vue SFCs and does not provide autofix. Move compiler-capability troubleshooting details out of the opening installation paragraph.
- [x] Create `docs/README.md` as a short navigation map and the agreed pages: `getting-started.md`, `adoption.md`, `rules.md`, `configuration.md`, `cli.md`, `api.md`, `themes.md`, `analysis.md`, `troubleshooting.md`, and `maintaining.md`. Each page has a route back to the index and useful links to related material. Keep the six rule references together initially.
- [x] Preserve the complete runnable tutorial, including theme/component setup, failing diagnostic with original source location, correction, and successful output, in getting-started. Keep existing-project rollout, warning thresholds, local/CI commands, and coding-agent instructions discoverable in adoption.
- [x] Retain full rule, configuration, shared-policy, CLI, and API reference coverage. Give defaults and precedence one authoritative location; guides link to it. Keep examples and relevant limitations together. Preserve CSS resolution and Nuxt UI theme preparation in themes, and supported expressions, uncertainty, coverage limits, and trust boundaries in analysis.
- [x] Preserve symptom-driven troubleshooting and development/package verification/release instructions. Separate historical release bootstrap material from the routine release procedure within maintaining; do not discard necessary operational knowledge or perform release actions.
- [x] Replace AGENTS.md's README-only documentation requirement with a clear rule assigning essentials to the root README and details to `docs/`. Keep AGENTS.md the central contributor/agent guide; do not add nested agent guides or duplicate contributor standards across pages.
- [x] Update documentation-location requirements and links in unfinished tickets where they explicitly require README-only updates, without changing their behavioral scope, approval status, dependencies, or identities. Preserve completed ticket history, including documentation tickets 01–03.
- [x] Repair moved section links and anchors throughout affected documentation. Verify the shortened README's documentation links work from GitHub, npm, and the installed package: docs omitted from the tarball must use appropriate repository URLs. Keep the root README authoritative for the existing packaging copy workflow and verify the packed copy.
- [x] Preserve standalone-runner positioning, `selfix.config.ts`, Vue/Tailwind-only consumer peers, and upstream acknowledgment. Do not add a documentation site, runtime features, alternate integrations, port/migration documents, new release versions, or publication steps.

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

## Implementation progress

- Baseline on selection: `f294eb5a3852c151297739d3ffcc0554e55dc17c` on `main`; tracked, untracked, and staged worktree changes all empty. The previously staged ticket was committed between turns.
- Owned scope: root README, AGENTS.md documentation-location rule, new docs pages, unfinished ticket documentation-location wording, and this ticket. No commit requested.
- Documentation-only work follows the approved validation boundary: real CLI fixtures, link/render checks, packed README inspection, and `pnpm check`; no artificial red tests.

### Source inventory and destinations

- getting-started.md: Quickstart, Define the theme and component, Configure and run the check
- adoption.md: Adopt in an existing project, Run locally and in CI
- rules.md: Rules, no-restyle, no-raw-colors, no-arbitrary-values, no-inline-styles, no-unknown-classes, require-static-classes
- configuration.md: Configuration, Project settings, Component recognition, Configured class props, Shared policy, Component contracts, Choose a variant or a contract, Custom messages
- cli.md: CLI, Discovery and output
- api.md: API
- themes.md: Themes, CSS import resolution, Nuxt UI application themes
- analysis.md: How analysis works, Vue class bindings, Limitations and trust
- troubleshooting.md: Troubleshooting, A component does not receive no-restyle findings, A dynamic class still fails after an allowance, A scoped style block is reported, A custom class is unknown, The CLI finds no Vue files, CSS or theme loading fails, API results do not reflect a theme edit, Vue compiler capabilities are missing
- maintaining.md: Development, Releases, Routine releases, Historical bootstrap, One-time setup, First release: 0.1.0-alpha.0

- Root opening, attribution, license, and essential setup remain in README.md. Full local/CI/agent commands moved to adoption; Vue compiler capability troubleshooting moved out of installation to troubleshooting. Routine releases precede the preserved, collapsed historical bootstrap.

### Completion and verification

- README shortened from 822 to 125 lines. Added the documentation index and ten focused pages; retained complete tutorial, policy/reference examples, analysis limits, troubleshooting, theme/Nuxt guidance, and release procedures. Updated AGENTS.md and documentation destinations in eight unfinished tickets; their statuses, dependencies, and behavioral scopes remain unchanged. Completed documentation tickets 01–03 remain untouched.
- `pnpm check` passed: typecheck, Oxlint, Oxfmt, 9 Vitest files / 272 tests, and playground typecheck, design lint (2 files, no findings), and Vite build. The sandboxed pnpm attempt failed registry signature verification because network access was unavailable; the same command passed with escalation. A bundled pnpm 11.19.0 fallback check also passed while that run was pending. No source/dependency changes or new runtime tests were needed.
- `pnpm --filter selfix pack --out /tmp/selfix-doc04.tgz` passed using bundled pnpm. Archive inspection confirmed the packed README is byte-identical to the root README and docs are omitted as expected; repository URLs target the new local paths and anchors. Packaging code is unchanged.
- `python3 /tmp/verify-selfix-doc04.py` passed using the packed CLI and real workspace Vue/Tailwind peers in automatically removed temporary consumers. Extracted root README and full tutorial CSS/config examples both produced the exact no-restyle diagnostic at `src/Example.vue:6:31`, exit 1; the correction produced the documented clean output, exit 0. `pnpm run lint:design` checked both fixture files cleanly. The minimal README setup used a plain Button; the full tutorial used its complete semantic theme and Button. Adoption executable content was preserved unchanged.
- `node /tmp/verify-selfix-doc04-markdown.mjs` passed: checked 32 documentation/ticket pages, 139 local or repository file/fragment links, 10 GFM tables, 45 fenced blocks, and the collapsed historical section. Generated GFM-compatible HTML for all documentation pages. `node /tmp/render-selfix-doc04.mjs` then rendered representative README/configuration/analysis/maintaining pages in temporary headless Chrome; screenshots were visually inspected, including expanded historical content. The bundled Playwright browser was unavailable; installed Chrome worked with sandbox escalation.
- `git diff --check` passed. Final scope includes tracked changes plus all 11 untracked documentation pages; index remains empty. No commit, push, release, or publication requested or performed.

### Review

- Standards: independent subagent reviewed the full owned working-tree scope against `f294eb5a3852c151297739d3ffcc0554e55dc17c`, code/package contracts, and original README. **0 findings.**
- Spec: separate independent subagent reviewed the same scope and all ticket criteria, including preservation, navigation, packaged-link strategy, and ticket scope. **0 actionable findings.** No blocking or unresolved nonblocking review findings.
- Limits: hosted GitHub/npm rendering and HTTP availability of the new documentation URLs cannot be checked before these files are pushed/published. Local targets/fragments, GFM rendering, and packed README contents were verified. Registry installation, network-dependent Nuxt/package smoke suites, and release operations were not run; no relevant executable or packaging behavior changed. The package consumers used locally available real peers.
