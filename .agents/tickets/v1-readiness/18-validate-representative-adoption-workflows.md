# 18: Validate representative adoption workflows

Status: draft
Blocked by: 14-add-per-file-rule-overrides.md

## Goal

Demonstrate realistic consumer and component-author adoption with bounded runnable fixtures and explicit intentional differences from upstream.

## Acceptance criteria

- [ ] Agree on a small conventional Vue fixture, a Nuxt UI fixture, and a component-author workflow, including their execution and dependency-version scope.
- [ ] Verify component-author overrides relax only selected rules while consumer policy and vocabulary checks remain active.
- [ ] Reuse or extend existing playground and Nuxt smoke infrastructure; do not add another permanent application or publishable package.
- [ ] Capture representative intentional policy differences from the pinned upstream reference through tests and root README guidance.
- [ ] Define which checks run routinely and which require network preparation, with clear failure reporting and bounded CI cost.
- [ ] Record commands, versions, outcomes, and remaining limits; do not equate successful fixtures with complete upstream parity.

## Verification

After fixture and execution-scope approval, run the chosen integration paths against built or packed selfix as appropriate. Assert both intended violations and corrected passing cases. Keep tests about consumer behavior rather than internal implementation.

Run `pnpm check` before reporting implementation complete. Append commands, outcomes, review findings, and completion evidence during implementation.

## Notes

Ticket 14 is the genuine prerequisite for the component-author workflow. Narrow-style exceptions are not an implicit dependency; only use features explicitly selected for these fixtures. Existing apps/playground and packages/selfix/scripts/smoke-nuxt.mjs provide starting points. No standalone parity/migration document is authorized.

Approved for retention as draft work, not implementation-ready; resolve the listed design/testing decisions before promotion to ready.

Created from the approved v1-readiness audit discussion; no separate spec was supplied. Audit baseline: selfix 1ba8a7e99339b43eb91b503face00ec0e72f63c0; upstream comparison: shadcn-ui/lint bf89dcb7f66a306c7ac4943065298902afdbd969. Follow AGENTS.md: one standalone runner/config, Vue and Tailwind as the only consumer peers, no application-expression evaluation, deterministic original-SFC diagnostics, and no new runtime packages. Preserve attribution if adapting upstream code.
