# 18: Validate representative adoption workflows

Status: done
Blocked by: 14-add-per-file-rule-overrides.md

## Goal

Demonstrate realistic consumer and component-author adoption with bounded runnable fixtures and explicit intentional differences from upstream.

## Acceptance criteria

- [x] Agree on a small conventional Vue fixture, a Nuxt UI fixture, and a component-author workflow, including their execution and dependency-version scope.
- [x] Verify component-author overrides relax only selected rules while consumer policy and vocabulary checks remain active.
- [x] Reuse or extend existing playground and Nuxt smoke infrastructure; do not add another permanent application or publishable package.
- [x] Capture representative intentional policy differences from the pinned upstream reference through tests and [adoption guidance](../../../docs/adoption.md).
- [x] Define which checks run routinely and which require network preparation, with clear failure reporting and bounded CI cost.
- [x] Record commands, versions, outcomes, and remaining limits; do not equate successful fixtures with complete upstream parity.

## Verification

After fixture and execution-scope approval, run the chosen integration paths against built or packed selfix as appropriate. Assert both intended violations and corrected passing cases. Keep tests about consumer behavior rather than internal implementation.

Run `pnpm check` before reporting implementation complete. Append commands, outcomes, review findings, and completion evidence during implementation.

## Notes

- Completed in `92d6982` (`test(playground): verify component author adoption workflow`). All criteria and required checks passed; no unresolved review findings.

- Independent Standards and Spec reviews: zero findings. Both reviewed the four-file scope, fixture isolation, corrected cases, and pinned upstream policy evidence. Full checks and Nuxt execution were performed by the implementing agent, not the reviewers.

- Added one combined workflow regression in the playground's existing installed-CLI suite. It copies the real source/theme/config, verifies consumer no-restyle and inline-style failures alongside author raw-color/unknown-class failures, then corrects both files while retaining author styling and confirms exit 0. The actual playground config now demonstrates scoped author overrides and recognizes sibling Button imports. The existing valid-demo and six-rule tests remain; no new app, harness, production-linter change, or CI lane.
- Red: the new workflow reported author no-restyle and SFC-style findings before overrides were added. Green: exactly the four intended independent findings remained; corrected sources passed. Existing playground suite: eight tests passed. Test sources include a CSS-variable style binding to preserve selfix's deliberately whole-site style policy.
- Inspected clean local shadcn-ui/lint checkout at `bf89dcb7f66a306c7ac4943065298902afdbd969`, `packages/lint/src/rules/no-inline-styles.ts` (property matching and custom-property handling). Adoption guidance explains selfix's whole-site/file-level permissions and default rejection of CSS-variable style bindings versus that pinned reference, without promising parity or adding a migration guide.
- `pnpm check` passed: 467 tests across 12 files, TypeScript, Oxlint, Oxfmt, playground typecheck, CLI validation and Vite build. Local versions: Node 24.21.0, Vue 3.5.42, Tailwind 4.3.3. `git diff --check` passed.
- Reused unchanged `pnpm smoke:nuxt`, which passed with Node 24.21.0, Nuxt 4.5.2, Nuxt UI 4.11.1, Vue 3.5.42, Tailwind 4.3.3. It verifies application-owned preparation, custom generated theme versus package fallback, UButton and local typed-component discovery, configured ui-slot findings with original locations, corrected passing source, and missing-theme errors. Temporary app cleanup is built into the existing script. No new dependency matrix; routine playground tests use the workspace lockfile, network Nuxt integration remains separate from `pnpm check` and CI.
- These are bounded fixture workflows, not proof of complete upstream parity or real-world coverage for every app. Narrow-style exceptions, advanced discovery, and dynamic/namespace component support remain separate draft work.

- User approved ticket 18 and asked to extend the existing playground modestly. Bounded scope: one combined author/consumer workflow regression using the playground's actual config/theme and installed CLI, preserving existing six-rule coverage; reuse and run the existing pinned Nuxt smoke rather than create a new app/harness or matrix. Routine tests use locked workspace peers, Nuxt integration retains its pinned direct versions and separate network command. This supersedes draft-only approval below.
- Baseline `a8aa8c6e7143639af02d1acba6817c2951bb001a` on `main`, clean tracked/index/untracked state. Ticket 14 done. Own playground config/test changes, adoption/maintainer guidance, and this ticket; only adjust Nuxt smoke if evidence reveals a missing workflow requirement. No production-linter changes planned. Prior instruction to commit completed tickets applies; no push authorized for this new ticket.

Ticket 14 is the genuine prerequisite for the component-author workflow. Narrow-style exceptions are not an implicit dependency; only use features explicitly selected for these fixtures. Existing apps/playground and packages/selfix/scripts/smoke-nuxt.mjs provide starting points. No standalone parity/migration document is authorized.

Approved for retention as draft work, not implementation-ready; resolve the listed design/testing decisions before promotion to ready.

Created from the approved v1-readiness audit discussion; no separate spec was supplied. Audit baseline: selfix 1ba8a7e99339b43eb91b503face00ec0e72f63c0; upstream comparison: shadcn-ui/lint bf89dcb7f66a306c7ac4943065298902afdbd969. Follow AGENTS.md: one standalone runner/config, Vue and Tailwind as the only consumer peers, no application-expression evaluation, deterministic original-SFC diagnostics, and no new runtime packages. Preserve attribution if adapting upstream code.
