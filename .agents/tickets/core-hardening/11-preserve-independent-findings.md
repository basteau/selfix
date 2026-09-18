# 11: Preserve independent findings after recoverable collection issues

Status: done
Blocked by: none

## Goal

Keep unsupported expressions visible while continuing to lint independent, trustworthy sites in the same SFC. Consolidate repeated uncertainty reports from one binding. Preserve conservative behavior for genuinely fatal parsing failures.

Currently collection of `v-bind="{ ...a, ...b, [key]: value }"` can emit several identical errors at one offset, and any collection error prevents reporting an unrelated `class="p-[13px]"` elsewhere in the file.

## Acceptance criteria

- [x] Distinguish fatal parse failures from recoverable collection uncertainty using the smallest explicit representation needed.
- [x] Multiple equivalent unsupported-property reports from one binding are consolidated without hiding distinct actionable issues.
- [x] Trustworthy independent sites still receive rule diagnostics when another site has recoverable unsupported syntax.
- [x] Unsupported or invalid input still produces errors even when ordinary rules are disabled.
- [x] Findings are not emitted from AST regions whose validity cannot be established after a fatal failure.
- [x] Normal and fallback collection preserve original locations and deterministic ordering.
- [x] The public diagnostic behavior and any changed limitations are documented in the root README as needed.

## Verification

Add collector and public-linter regressions for mixed supported/unsupported sites, repeated uncertainty in one attribute, separate issues at different attributes, and fatal malformed input. Update tests that currently assert duplicate errors intentionally. Run `pnpm check`; append commands and outcomes during implementation.

## Notes

Approved from the core-hardening discussion. Relevant code: error collection in `packages/selfix/src/vue.ts` and the early return in `packages/selfix/src/index.ts`. Keep this separate from cross-use vocabulary ownership/provenance; no generic diagnostic framework is needed. Completion requires review and passing checks.

## Implementation baseline

- Starting revision: `ad9ca68e2f3414fea068b29b0fed3f7554b07092`, branch `main`.
- Initial tracked/index changes: none. Pre-existing untracked `.agents/tickets/documentation/` is outside scope.
- Owned scope: collector, linter, their focused tests, README behavior note, and this ticket.

## Verification and review

- Red: `pnpm exec vitest run packages/selfix/test/rules.test.ts -t 'preserves independent diagnostics and consolidates'` failed with three duplicate errors and the missing independent arbitrary-value finding.
- Green: the same command passed after the collector/linter change. `pnpm typecheck` passed.
- `pnpm exec vitest run packages/selfix/test/vue.test.ts packages/selfix/test/rules.test.ts`: 93 tests passed, including normal/fallback collection, distinct attributes, original locations, disabled rules, and fatal parsing.
- Initial sandboxed `pnpm check` hit child-process `EPERM` in package/release/playground tests. The permitted rerun passed: 223 tests, typechecking, lint, formatting, package build, and playground typecheck/design lint/build.
- Independent Standards review: zero findings. Independent Spec review: zero findings. Scope: owned working-tree changes against the recorded starting revision; unrelated documentation tickets excluded.
- Final cleanup simplified singleton expectations and made the disabled-rules malformed-input assertion non-vacuous. No design changes or unresolved nonblocking findings.
- Completed implementation commit: `547c4ff5821e689c73206e1760d87641e62f6453`. Final `pnpm check` passed after cleanup (223 tests and all playground checks); both reviewers rechecked the final changes with zero findings.
