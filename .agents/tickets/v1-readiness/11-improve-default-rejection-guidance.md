# 11: Improve default rejection guidance

Status: done
Blocked by: 08-complete-common-utility-categories.md

## Goal

Make built-in no-restyle diagnostics explain the rejected category and a correction compatible with the selected policy.

## Acceptance criteria

- [x] Color, typography, shape, effects, motion, and unknown rejections no longer unconditionally recommend margin or parent gap.
- [x] Spacing/layout guidance does not assert that a class or action is allowed when the effective contract forbids it.
- [x] Unknown-category findings explain the analysis/policy limitation without the phrase 'the component owns its unknown'.
- [x] Explicit deny findings remain clearly distinguishable from missing allowances.
- [x] Do not invent available component sizes, variants, theme tokens, or source definitions.
- [x] Custom messages, placeholders, notes, prop/slot context, locations, and ordering retain their documented behavior; update the root README and [rule examples](../../../docs/rules.md) as needed.

## Verification

Add public-rule tests for representative categories, mixed-category rejection, deny-only restrictions, narrowly allowed contracts, unknown declarations, and custom-message non-regressions. Assert useful behavior without overconstraining incidental prose.

Run `pnpm check` before reporting implementation complete. Append commands, outcomes, review findings, and completion evidence during implementation.

## Notes

- Completed in `6eae1a65aad775c49acb5e11664858f701b31c95`. Built-in messages now explain category restrictions, distinguish explicit bans, and describe unclassified effects without invented APIs or promised layout replacements. README/rules/tutorial updated; custom-message dispatch and diagnostic metadata unchanged.
- Red: 10 public guidance cases failed with old messages, covering five appearance categories, closed spacing/layout/mixed contracts, explicit deny, and unknown effects. Green: 110 rule/class-prop tests and typecheck passed. Existing custom messages/placeholders/notes/context/order tests remain passing. `pnpm check` passed (398 tests, typecheck, lint, formatting, playground checks/build); `git diff --check` passed.
- Independent Standards and Spec reviews: zero findings. No unresolved limitations within scope; component metadata discovery and spelling suggestions remain separate tickets.

- Baseline `b0e7a38da157ba402c0ea1f2dd9fa2bae376dc47` on `main`, clean worktree/index. Dependency 08 done. Owned scope: built-in no-restyle guidance, focused public-linter regressions, relevant README/rule/tutorial examples, and this ticket. Preserve custom-message precedence and diagnostic metadata; no discovery or invented replacement APIs. User authorized commits.

The existing default no-restyle message in packages/selfix/src/index.ts always suggests variants, margin, or parent gap. Ticket 08 first removes known category-mapping errors; this ticket improves the remaining true rejections. Structured spelling suggestions remain in the existing core-hardening draft.

Scope and dependencies approved for implementation.

Created from the approved v1-readiness audit discussion; no separate spec was supplied. Audit baseline: selfix 1ba8a7e99339b43eb91b503face00ec0e72f63c0; upstream comparison: shadcn-ui/lint bf89dcb7f66a306c7ac4943065298902afdbd969. Follow AGENTS.md: one standalone runner/config, Vue and Tailwind as the only consumer peers, no application-expression evaluation, deterministic original-SFC diagnostics, and no new runtime packages. Preserve attribution if adapting upstream code.

- The user selected this existing scope as recommendation 1 in the agent-support comparison with shadcn-ui/lint. Preserve its identity and existing dependency on ticket 08; no duplicate ticket or automatic variant discovery is needed.
