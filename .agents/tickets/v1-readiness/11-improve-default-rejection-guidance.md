# 11: Improve default rejection guidance

Status: ready
Blocked by: 08-complete-common-utility-categories.md

## Goal

Make built-in no-restyle diagnostics explain the rejected category and a correction compatible with the selected policy.

## Acceptance criteria

- [ ] Color, typography, shape, effects, motion, and unknown rejections no longer unconditionally recommend margin or parent gap.
- [ ] Spacing/layout guidance does not assert that a class or action is allowed when the effective contract forbids it.
- [ ] Unknown-category findings explain the analysis/policy limitation without the phrase 'the component owns its unknown'.
- [ ] Explicit deny findings remain clearly distinguishable from missing allowances.
- [ ] Do not invent available component sizes, variants, theme tokens, or source definitions.
- [ ] Custom messages, placeholders, notes, prop/slot context, locations, and ordering retain their documented behavior; update the root README and [rule examples](../../../docs/rules.md) as needed.

## Verification

Add public-rule tests for representative categories, mixed-category rejection, deny-only restrictions, narrowly allowed contracts, unknown declarations, and custom-message non-regressions. Assert useful behavior without overconstraining incidental prose.

Run `pnpm check` before reporting implementation complete. Append commands, outcomes, review findings, and completion evidence during implementation.

## Notes

The existing default no-restyle message in packages/selfix/src/index.ts always suggests variants, margin, or parent gap. Ticket 08 first removes known category-mapping errors; this ticket improves the remaining true rejections. Structured spelling suggestions remain in the existing core-hardening draft.

Scope and dependencies approved for implementation.

Created from the approved v1-readiness audit discussion; no separate spec was supplied. Audit baseline: selfix 1ba8a7e99339b43eb91b503face00ec0e72f63c0; upstream comparison: shadcn-ui/lint bf89dcb7f66a306c7ac4943065298902afdbd969. Follow AGENTS.md: one standalone runner/config, Vue and Tailwind as the only consumer peers, no application-expression evaluation, deterministic original-SFC diagnostics, and no new runtime packages. Preserve attribution if adapting upstream code.

- The user selected this existing scope as recommendation 1 in the agent-support comparison with shadcn-ui/lint. Preserve its identity and existing dependency on ticket 08; no duplicate ticket or automatic variant discovery is needed.
