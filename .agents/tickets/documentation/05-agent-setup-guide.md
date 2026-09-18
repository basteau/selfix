# 05: Add an agent setup guide

Status: done
Blocked by: none

## Goal

Give a coding agent a bounded, verifiable procedure for configuring selfix in an existing Vue 3 / Tailwind CSS 4 project while preserving its existing setup and making the chosen rule policy explicit.

## Acceptance criteria

- [x] Add `docs/agent-setup.md`, linked from the documentation index, adoption guide, and a concise root README entry. Include a copyable prompt pointing agents to the guide; root links must work from the packaged README.
- [x] The procedure inspects the package manager, workspace/app boundaries, supported Node/Vue/Tailwind versions, existing scripts and selfix configuration, real application CSS entries, and actual component import strings before proposing edits.
- [x] Use only the standalone runner and `selfix.config.ts`. Preserve existing application files, lint tools, policies, exclusions, scripts, and workspace conventions; do not replace existing configuration wholesale or add ESLint/Oxlint adapters.
- [x] Keep each app's theme and import settings scoped correctly. Describe explicit commands/config paths for workspaces without promising automatic project discovery or adding another integration format.
- [x] Explain that all six omitted rules default to errors. For a new setup, establish the intended policy or use the documented gradual adoption recipe with explicit severities. Preserve an existing policy; do not disable rules, widen allowances/exclusions, or change the theme merely to achieve a clean run.
- [x] Make exclusion semantics visible: excluding a component directory skips every rule, and there are currently no per-file rule overrides. Link to authoritative configuration/adoption references instead of duplicating defaults and precedence tables.
- [x] Verify configuration loading separately from enforcement. In a disposable fixture using the selected theme and policy, demonstrate a known violation and its supported correction, then run the actual project command and distinguish existing findings from setup failures. Leave no probe files or application edits behind.
- [x] Provide a handoff checklist: changed files, exact run command, enabled rules/severities, remaining findings, coverage limitations, and where policy is configured. Include the edit–check–correct–rerun instruction for the consumer's existing agent guide without adding nested AGENTS.md files to selfix.
- [x] Keep configuration execution/trust guidance and supported-analysis limits discoverable. Do not imply automatic variant discovery, autofix, or guaranteed styling coverage. No runtime feature, dependency, release, or publication changes.

## Verification

Use documentation-focused validation, not artificial runtime tests. Exercise the guide against temporary conventional Vue and two-app workspace fixtures through the built CLI, with distinct theme/config paths and preserved existing scripts/policy. Verify a known finding and correction, expected exit behavior, and cleanup. Check local paths, anchors, and package-safe README links. Run `pnpm check` and `git diff --check`; record outcomes, independent review, and remaining limitations before completion.

## Completion evidence

- All nine acceptance criteria met: guide and copyable prompt added, all three navigation links added, existing-policy preservation clarified in adoption, and setup/verification/handoff documented without runtime changes.
- `node /tmp/selfix-agent-docs-verify.mjs` passed against the built CLI for a conventional app and two workspace apps, and passed again after the fresh build. Distinct CSS paths, import prefixes, theme tokens, warning/error policies, existing scripts and exclusions were exercised. Verified loading, located findings, warning limits, corrections, theme isolation, real source commands, exit 2 for missing config/input/theme, byte-preserved application/config/script files, and complete fixture cleanup.
- All 65 checked local/repository-target links and anchors passed; new root link is an absolute GitHub URL suitable for the packaged README.
- `pnpm check` passed: typecheck, Oxlint, Oxfmt, 9 Vitest files / 340 tests, and playground typecheck, design check (2 Vue files, zero findings), and production build. Initial formatting failure in the docs index was corrected before the successful rerun. Sandboxed pnpm stalled; successful run used approved execution outside the sandbox.
- `git diff --check` passed; index empty. Final owned diff and untracked guide inspected. Independent Standards and Spec reviewers found zero issues against baseline `e2c2cfcb8f39a803ef2acdbc7c1037ac6da0bbfe`. Subsequent changes were docs table formatting and ticket evidence only. No unresolved review findings.
- Concurrent Tailwind source/tests, `docs/themes.md`, and v1-readiness/07 ticket work appeared after baseline; preserved and excluded from owned scope. Full check covers the shared worktree.
- Limitations: validation used installed local Vue/Tailwind and built CLI, not a registry install or every package manager/framework. Documentation-only work; no artificial runtime tests added.
- User subsequently requested commit and push. Documentation committed as `5105221a4bc7a53ca253a197566e8ba6d10406c1` (`docs: add agent setup guide`). Completion evidence is recorded in a separate ticket-only commit.

## Notes

- Implementation baseline: `e2c2cfcb8f39a803ef2acdbc7c1037ac6da0bbfe` on `main`; tracked/index/untracked worktree clean. Owned scope: this ticket, new `docs/agent-setup.md`, and navigation/preservation wording in `README.md`, `docs/README.md`, and `docs/adoption.md`. Documentation-only validation follows the ticket's temporary CLI fixture strategy. No commit requested.

- Created from the user's selection of recommendations 1–3 in the agent-support discussion. This is recommendation 3; recommendation 1 reuses [default rejection guidance](../v1-readiness/11-improve-default-rejection-guidance.md), and recommendation 2 reuses [spelling suggestions](../core-hardening/12-suggest-spelling-corrections.md). No runtime dependency on those tickets: the guide describes supported behavior at implementation time.
- Reference: https://github.com/shadcn-ui/lint/blob/main/SETUP.md . Adapt the inspect/preserve/verify/handoff approach, not upstream integration details. Upstream's no-new-rules setup cannot transfer literally because selfix enables omitted rules by default. Preserve attribution if adapting text.
- Existing documentation: [adoption](../../../docs/adoption.md), [getting started](../../../docs/getting-started.md), [configuration](../../../docs/configuration.md), and [analysis](../../../docs/analysis.md). Keep detailed user guidance in docs/ and essentials in README.md.
- Agent evaluations and Vue component metadata discovery were discussed separately and are outside these selected tickets. No separate spec was supplied. Ticket creation does not authorize implementation, commit, or push.
