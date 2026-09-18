# 14: Add per-file rule overrides

Status: draft
Blocked by: none

## Goal

Let component authors relax selected rules for implementation files while retaining raw-color and unknown-class validation through the existing standalone runner.

## Acceptance criteria

- [ ] Agree on the configuration shape, supported path syntax/base, matching order, and rule-option inheritance before implementation.
- [ ] Define consistent CLI/API filename behavior, including relative/default API filenames and exclusions.
- [ ] A component implementation can disable selected rules without disabling independent vocabulary checks; consumer files retain their normal rules.
- [ ] Validate override options and keep fatal parsing/unsupported-input behavior explicit even where ordinary rules are disabled.
- [ ] Preserve current configuration behavior when overrides are omitted; do not introduce an adapter or alternate config format.
- [ ] Include complete config/API/CLI regressions and update the root README adoption recipe.

## Verification

After design approval, verify a small project containing component implementations and consumer SFCs, overlapping overrides, invalid settings, and excluded files. Test observable findings and exits as well as effective policy precedence.

Run `pnpm check` before reporting implementation complete. Append commands, outcomes, review findings, and completion evidence during implementation.

## Notes

README adoption currently recommends excluding component directories, which skips every rule. A bounded overrides mechanism was recommended, but glob semantics, inheritance, and API path handling remain undecided. Keep this draft until those choices are approved; do not copy an entire ESLint configuration model.

Approved for retention as draft work, not implementation-ready; resolve the listed design/testing decisions before promotion to ready.

Created from the approved v1-readiness audit discussion; no separate spec was supplied. Audit baseline: selfix 1ba8a7e99339b43eb91b503face00ec0e72f63c0; upstream comparison: shadcn-ui/lint bf89dcb7f66a306c7ac4943065298902afdbd969. Follow AGENTS.md: one standalone runner/config, Vue and Tailwind as the only consumer peers, no application-expression evaluation, deterministic original-SFC diagnostics, and no new runtime packages. Preserve attribution if adapting upstream code.
