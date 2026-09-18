# 03: Reject unsupported external scripts

Status: done
Blocked by: none

## Goal

Report unsupported external SFC scripts explicitly instead of silently losing the imports and registrations needed for component recognition.

## Acceptance criteria

- [x] A normal script block with src produces an actionable parse-error at the original external-script block, explaining that external scripts are unsupported.
- [x] The unsupported-input diagnostic remains an error when ordinary rules are disabled.
- [x] Independent trustworthy template sites retain findings where safe under existing recoverable-error behavior.
- [x] Inline scripts and script setup remain unchanged; no external application module is imported, executed, or followed.
- [x] The [analysis documentation](../../../docs/analysis.md) describes the external-script boundary and a supported alternative.

## Verification

Add collector and public-linter regressions for external scripts, all rules disabled, independent literal findings, and inline-script non-regressions. Assert source locations and that an external-script fixture cannot return a misleading empty result.

Run `pnpm check` before reporting implementation complete. Append commands, outcomes, review findings, and completion evidence during implementation.

## Notes

packages/selfix/src/vue.ts currently reads inline script content but neither loads nor rejects descriptor.script.src. The audit's external script plus Button class p-4 returned no diagnostics. Preserve the existing distinction between fatal parser failure and recoverable collection uncertainty.

Scope and dependencies approved for implementation.

Created from the approved v1-readiness audit discussion; no separate spec was supplied. Audit baseline: selfix 1ba8a7e99339b43eb91b503face00ec0e72f63c0; upstream comparison: shadcn-ui/lint bf89dcb7f66a306c7ac4943065298902afdbd969. Follow AGENTS.md: one standalone runner/config, Vue and Tailwind as the only consumer peers, no application-expression evaluation, deterministic original-SFC diagnostics, and no new runtime packages. Preserve attribution if adapting upstream code.

## Implementation progress

- Baseline: `f2e1d22e991381c253c5dea288cdc9e651df8a09`, branch `main`; tracked and untracked worktree clean.
- Owned scope: external-script handling in `packages/selfix/src/vue.ts`, collector/public-linter regressions, `docs/analysis.md`, and this ticket. No linked spec or dependencies.
- Following the approved test boundaries with the tdd skill. No commit was requested during implementation; the user subsequently requested commit and push.

- Implemented recoverable external-script diagnostics with an inline-script alternative, preserving trustworthy template sites without loading application modules. Opening-tag locations account for comments and quoted tag-like attributes.
- Red: `pnpm exec vitest run packages/selfix/test/vue.test.ts` reproduced missing diagnostics in both collector paths (2 failures). Green: same command passed all 62 tests after implementation; `pnpm typecheck` passed.
- Public-linter fixtures cover disabled rules, independent arbitrary-value findings with exact locations, and normal/setup inline component recognition. Initial validation exposed and corrected fixture mistakes (column 36 instead of 38 and an import outside default recognition paths); these were not production defects.
- Independent Standards review: no findings. Independent Spec review: one P3 opening-tag location issue with quoted `<script` attribute text; addressed with a focused regression. Its red run failed at offset 56 versus 17; green passed all 63 collector tests. Both reviewers re-reviewed the fix and reported no remaining findings.
- Final `pnpm check` passed: typecheck, Oxlint, Oxfmt, build, 9 Vitest files / 279 tests, and playground typecheck/design lint/build. `git diff --check` passed. Used bundled Node/pnpm because the ambient pnpm launcher failed registry-based identity verification; no hosted CI or compatibility matrix was run for this ticket.
- Final review scope: owned changes against the recorded baseline, empty staged diff, no untracked files. No remaining nonblocking limitations within scope. Ticket done; no parent spec closed.

- Implementation commit: `3ca61188bf1c3de61d22d8180fb39b29baecc6be` (`fix(vue): reject unsupported external scripts`), created following the user's explicit commit-and-push request.
