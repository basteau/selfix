# 14: Add per-file rule overrides

Status: in-progress
Blocked by: none

## Goal

Let component authors relax selected rules for implementation files while retaining raw-color and unknown-class validation through the existing standalone runner.

## Acceptance criteria

- [x] Agree on the configuration shape, supported path syntax/base, matching order, and rule-option inheritance before implementation.
- [x] Define consistent CLI/API filename behavior, including relative/default API filenames and exclusions.
- [x] A component implementation can disable selected rules without disabling independent vocabulary checks; consumer files retain their normal rules.
- [x] Validate override options and keep fatal parsing/unsupported-input behavior explicit even where ordinary rules are disabled.
- [x] Preserve current configuration behavior when overrides are omitted; do not introduce an adapter or alternate config format.
- [x] Include complete config/API/CLI regressions and update the [adoption recipe](../../../docs/adoption.md).

## Verification

After design approval, verify a small project containing component implementations and consumer SFCs, overlapping overrides, invalid settings, and excluded files. Test observable findings and exits as well as effective policy precedence.

Run `pnpm check` before reporting implementation complete. Append commands, outcomes, review findings, and completion evidence during implementation.

## Notes

- Final path-matching regression: trailing `**` failed to match line breaks in valid filenames. Enabled dotAll for the generated matcher; the regression also checks exact whole-filename matching. Focused tests and full `pnpm check` passed after the fix; independent delta re-reviews returned zero findings.

- Implemented validated `FileOverride[]`, a bounded lexical file-pattern matcher, and per-file selection of precompiled rule policies. No new dependency, adapter, config format, application evaluation, or per-file theme reload. CLI supplies its config directory via API `configBase`; source filenames and diagnostic positions remain unchanged.
- Red: implementation-file API regression failed with `Unknown config option: overrides`. Green: selected inline-style checks disabled while raw-color/unknown-class checks and consumer checks remained active. Red: CLI test from another cwd retained the wrong severities/style findings before `configBase: configDir` was wired. Green: config-relative matching, exclusions, warning limits, and invalid-pattern exit behavior passed.
- Focused API/config/CLI suite: 35 passed. Covers exact paths, star/question/globstar matching, nested and immediate files, boundary/case/outside-base behavior, absolute/relative/default filenames, overlapping overrides, severity-only inheritance, off/on restoration, tuple replacement including contracts/messages, no cross-file state leaks, preserved locations and notes, SFC style blocks, malformed/unsupported inputs with all rules disabled, and rejected configuration syntax.
- `pnpm check` passed: 466 tests across 12 files, TypeScript, Oxlint, Oxfmt, playground typecheck, selfix validation, and production build. `git diff --check` passed. Independent Standards and Spec reviewers both returned zero findings; they inspected the working diff and new test file, and did not claim independent full-suite execution. Network Nuxt/package smoke was not rerun for this rule-selection change; existing routine integration tests passed.
- README, configuration/API/CLI references, adoption recipe, and agent setup guidance now explain selective overrides, path bases, whole-object tuple replacement, and unchanged exclusions/parse failures. No unresolved implementation findings. User's earlier instruction to commit each completed ticket applies; pushing remains a separate action.

- User explicitly approved implementation and the proposed design: `overrides: [{ files: string[], rules: ... }]`, with exact paths and `*`, `**`, `?` patterns; config-relative CLI paths and API `configBase` defaulting to cwd; all matching entries in order, later entries win per rule; severity-only settings preserve prior options, tuples replace them. CLI exclusions still skip whole files; parse errors cannot be disabled. This decision supersedes the earlier draft-only notes below.
- Baseline `aba38c431922d07778d5638230703fef9078f8f9` on `main`, clean tracked/index/untracked state. Own config validation, file matching and effective rules, CLI integration, focused API/config/CLI tests, related docs, and this ticket. Use the ticket's existing real-parser/compiler and temporary-project testing boundaries. No active implementation owner overlaps this work.

The adoption guide currently recommends excluding component directories, which skips every rule. A bounded overrides mechanism was recommended, but glob semantics, inheritance, and API path handling remain undecided. Keep this draft until those choices are approved; do not copy an entire ESLint configuration model.

Approved for retention as draft work, not implementation-ready; resolve the listed design/testing decisions before promotion to ready.

Created from the approved v1-readiness audit discussion; no separate spec was supplied. Audit baseline: selfix 1ba8a7e99339b43eb91b503face00ec0e72f63c0; upstream comparison: shadcn-ui/lint bf89dcb7f66a306c7ac4943065298902afdbd969. Follow AGENTS.md: one standalone runner/config, Vue and Tailwind as the only consumer peers, no application-expression evaluation, deterministic original-SFC diagnostics, and no new runtime packages. Preserve attribution if adapting upstream code.
