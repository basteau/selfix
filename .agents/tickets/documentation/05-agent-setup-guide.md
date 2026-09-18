# 05: Add an agent setup guide

Status: ready
Blocked by: none

## Goal

Give a coding agent a bounded, verifiable procedure for configuring selfix in an existing Vue 3 / Tailwind CSS 4 project while preserving its existing setup and making the chosen rule policy explicit.

## Acceptance criteria

- [ ] Add `docs/agent-setup.md`, linked from the documentation index, adoption guide, and a concise root README entry. Include a copyable prompt pointing agents to the guide; root links must work from the packaged README.
- [ ] The procedure inspects the package manager, workspace/app boundaries, supported Node/Vue/Tailwind versions, existing scripts and selfix configuration, real application CSS entries, and actual component import strings before proposing edits.
- [ ] Use only the standalone runner and `selfix.config.ts`. Preserve existing application files, lint tools, policies, exclusions, scripts, and workspace conventions; do not replace existing configuration wholesale or add ESLint/Oxlint adapters.
- [ ] Keep each app's theme and import settings scoped correctly. Describe explicit commands/config paths for workspaces without promising automatic project discovery or adding another integration format.
- [ ] Explain that all six omitted rules default to errors. For a new setup, establish the intended policy or use the documented gradual adoption recipe with explicit severities. Preserve an existing policy; do not disable rules, widen allowances/exclusions, or change the theme merely to achieve a clean run.
- [ ] Make exclusion semantics visible: excluding a component directory skips every rule, and there are currently no per-file rule overrides. Link to authoritative configuration/adoption references instead of duplicating defaults and precedence tables.
- [ ] Verify configuration loading separately from enforcement. In a disposable fixture using the selected theme and policy, demonstrate a known violation and its supported correction, then run the actual project command and distinguish existing findings from setup failures. Leave no probe files or application edits behind.
- [ ] Provide a handoff checklist: changed files, exact run command, enabled rules/severities, remaining findings, coverage limitations, and where policy is configured. Include the edit–check–correct–rerun instruction for the consumer's existing agent guide without adding nested AGENTS.md files to selfix.
- [ ] Keep configuration execution/trust guidance and supported-analysis limits discoverable. Do not imply automatic variant discovery, autofix, or guaranteed styling coverage. No runtime feature, dependency, release, or publication changes.

## Verification

Use documentation-focused validation, not artificial runtime tests. Exercise the guide against temporary conventional Vue and two-app workspace fixtures through the built CLI, with distinct theme/config paths and preserved existing scripts/policy. Verify a known finding and correction, expected exit behavior, and cleanup. Check local paths, anchors, and package-safe README links. Run `pnpm check` and `git diff --check`; record outcomes, independent review, and remaining limitations before completion.

## Notes

- Created from the user's selection of recommendations 1–3 in the agent-support discussion. This is recommendation 3; recommendation 1 reuses [default rejection guidance](../v1-readiness/11-improve-default-rejection-guidance.md), and recommendation 2 reuses [spelling suggestions](../core-hardening/12-suggest-spelling-corrections.md). No runtime dependency on those tickets: the guide describes supported behavior at implementation time.
- Reference: https://github.com/shadcn-ui/lint/blob/main/SETUP.md . Adapt the inspect/preserve/verify/handoff approach, not upstream integration details. Upstream's no-new-rules setup cannot transfer literally because selfix enables omitted rules by default. Preserve attribution if adapting text.
- Existing documentation: [adoption](../../../docs/adoption.md), [getting started](../../../docs/getting-started.md), [configuration](../../../docs/configuration.md), and [analysis](../../../docs/analysis.md). Keep detailed user guidance in docs/ and essentials in README.md.
- Agent evaluations and Vue component metadata discovery were discussed separately and are outside these selected tickets. No separate spec was supplied. Ticket creation does not authorize implementation, commit, or push.
