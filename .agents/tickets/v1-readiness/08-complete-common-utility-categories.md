# 08: Complete common utility categories

Status: done
Blocked by: none

## Goal

Make category allowances usable for common Tailwind utilities without letting unknown declarations disappear.

## Acceptance criteria

- [x] tracking-wide is classified through typography, scale-105 through effects, and border-solid through shape without spurious unknown bookkeeping categories.
- [x] truncate includes its legitimate layout/typography effects without an unknown category caused by text-overflow.
- [x] Appropriate category allowances accept these utilities on recognized components; missing necessary allowances and explicit denies still reject them.
- [x] Use generated declaration properties, including narrowly identified Tailwind bookkeeping properties, rather than utility-name heuristics.
- [x] Retain unknown for genuinely unmapped properties and unknown --tw-* variables.
- [x] Include a bounded representative utility corpus across existing categories and category-appropriate rejection assertions.

## Verification

Extend table-driven compiler-backed tests and public policy tests. Cover modifiers, mixed-category utilities, custom unknown declarations, and deny precedence. Avoid blanket expected-output snapshots that simply mirror the mapping implementation.

Run `pnpm check` before reporting implementation complete. Append commands, outcomes, review findings, and completion evidence during implementation.

## Notes

- Completed in `d078b1264482199e75711dcbc0aa7cd7a07637b2`. The four compiler-backed regressions initially failed with spurious unknown categories. Inspected emitted Tailwind CSS and added exact tracking/scale/border-style properties plus text-overflow; all four then passed. Added modifier/3D and unknown-property inspection cases plus a bounded public-policy corpus across all categories, checking every necessary allowance and category deny precedence.
- `node_modules/.bin/vitest run packages/selfix/test/tailwind.test.ts packages/selfix/test/rules.test.ts`: 226 passed. Typecheck passed. `pnpm check`: 389 tests plus typecheck, lint, format, playground checks/build passed. `git diff --check` passed. Independent Standards and Spec reviews: zero findings; no unresolved limitations within this bounded ticket.

- Baseline `ba053ea053c3fa0103d695999aca30cdc6e4631e` on `main`; clean worktree/index. Owned scope: Tailwind property categorization, compiler-backed inspection/public policy tests, this ticket. Use the approved existing test boundaries; narrow property mappings only, preserving unknown declarations and deny precedence. User authorized commits per completed ticket.

The audit reproduced unknown categories for tracking-wide, scale-105, border-solid, and truncate even with relevant categories allowed. Start at categoryFor in packages/selfix/src/tailwind.ts. Completed core-hardening/03-correct-utility-categories.md covered leading/easing/rotation only; preserve its identity and regression coverage.

Scope and dependencies approved for implementation.

Created from the approved v1-readiness audit discussion; no separate spec was supplied. Audit baseline: selfix 1ba8a7e99339b43eb91b503face00ec0e72f63c0; upstream comparison: shadcn-ui/lint bf89dcb7f66a306c7ac4943065298902afdbd969. Follow AGENTS.md: one standalone runner/config, Vue and Tailwind as the only consumer peers, no application-expression evaluation, deterministic original-SFC diagnostics, and no new runtime packages. Preserve attribution if adapting upstream code.
