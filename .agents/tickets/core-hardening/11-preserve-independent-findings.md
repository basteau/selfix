# 11: Preserve independent findings after recoverable collection issues

Status: ready
Blocked by: none

## Goal

Keep unsupported expressions visible while continuing to lint independent, trustworthy sites in the same SFC. Consolidate repeated uncertainty reports from one binding. Preserve conservative behavior for genuinely fatal parsing failures.

Currently collection of `v-bind="{ ...a, ...b, [key]: value }"` can emit several identical errors at one offset, and any collection error prevents reporting an unrelated `class="p-[13px]"` elsewhere in the file.

## Acceptance criteria

- [ ] Distinguish fatal parse failures from recoverable collection uncertainty using the smallest explicit representation needed.
- [ ] Multiple equivalent unsupported-property reports from one binding are consolidated without hiding distinct actionable issues.
- [ ] Trustworthy independent sites still receive rule diagnostics when another site has recoverable unsupported syntax.
- [ ] Unsupported or invalid input still produces errors even when ordinary rules are disabled.
- [ ] Findings are not emitted from AST regions whose validity cannot be established after a fatal failure.
- [ ] Normal and fallback collection preserve original locations and deterministic ordering.
- [ ] The public diagnostic behavior and any changed limitations are documented in the root README as needed.

## Verification

Add collector and public-linter regressions for mixed supported/unsupported sites, repeated uncertainty in one attribute, separate issues at different attributes, and fatal malformed input. Update tests that currently assert duplicate errors intentionally. Run `pnpm check`; append commands and outcomes during implementation.

## Notes

Approved from the core-hardening discussion. Relevant code: error collection in `packages/selfix/src/vue.ts` and the early return in `packages/selfix/src/index.ts`. Keep this separate from cross-use vocabulary ownership/provenance; no generic diagnostic framework is needed. Completion requires review and passing checks.
