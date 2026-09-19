# 03: Simplify policy precedence

Status: ready
Blocked by: none

## Goal

Reduce the rules a user must learn to predict an effective policy. Resolve override option preservation/replacement and evaluate ordering inconsistencies without broadening permissions accidentally.

## Acceptance criteria

- [ ] Before implementation, approve a before/after decision table for severity-only settings, option-bearing settings, missing fields, empty lists, and multiple matches. Include compatibility costs and concrete examples of changed enforcement.
- [ ] Choose one explainable option-update model. Recommended direction to evaluate: severity changes only severity; explicitly supplied option fields replace those fields, with clear reset behavior. Compare this with the current whole-options replacement before selecting it.
- [ ] Assess first-match contracts/classProps versus ordered file overrides. Record which distinctions earn their complexity; do not force a universal merge rule without evidence from actual callers.
- [ ] Implement only the approved simplifications and update config validation/types, callers, messages, examples, and documentation in the same change.
- [ ] Preserve explicit deny precedence, independent rules, original locations, component recognition boundaries, and failure behavior. Demonstrate that changes do not silently weaken policies.

## Verification

Use table-driven focused Vitest cases through createLinter and the existing collector boundary. Cover preserved/replaced options, off/on sequences, contract selection, empty-list resets, message maps, classProps matching, and warning/error outcomes. Start from test/overrides.test.ts (severity-only versus tuples), test/rules.test.ts (contracts), and test/class-props.test.ts (first match). Run pnpm check and git diff --check.

## Notes

Current severity-only overrides preserve options; tuples replace them. Contracts and classProps take the first match; overrides apply all matches. These behaviors are intentional and tested, so deletion of their prose cannot substitute for a design decision. This ticket is draft until semantics and compatibility are approved. Avoid changing useful recognition/discovery separation or absorbing unrelated draft features.

Created from the product/docs clarity discussion. The user approved the eight-ticket breakdown and dependencies, with 01–03 retained as drafts pending interface decisions. No separate spec exists. Approval here is to create local tickets, not to implement, commit, push, release, or publish externally.

Keep one publishable package, two private apps, standalone selfix.config.ts, Vue/Tailwind-only consumer peers, and no evaluation of application expressions. Preserve deterministic actionable original-SFC diagnostics. Prefer plain functions and Node built-ins. Keep essential setup in README and detailed docs in apps/docs/content; no port/migration documents or nested AGENTS.md files. Preserve existing working-tree changes and completed ticket identities.

## Approved design

The user approved both the baseline commits and the proposed breaking designs, then authorized sequential implementation with clean per-ticket commits. This supersedes the earlier creation-only authorization and unresolved draft notes.

Approved replacement: severity-only overrides change severity only; option-bearing overrides preserve omitted fields and replace explicitly supplied fields. Arrays and message maps replace as units, never deep-merge; [] clears lists, {} clears a message map, and empty options preserve prior fields. Existing all-matching file override order stays. Contracts and classProps keep first-match selection because they select one component policy; explicit deny still wins. Removing inherited options now requires explicit replacement/reset rather than omission. Record the breaking change and regression outcomes without releasing.
