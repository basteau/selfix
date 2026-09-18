# 04: Inspect custom CSS on marker classes

Status: done
Blocked by: none

## Goal

Keep Tailwind marker classes known while inspecting custom declarations associated with those same tokens.

## Acceptance criteria

- [x] Custom padding and literal color on group contribute spacing/color categories and raw-color detection rather than being bypassed.
- [x] Recognized components report no-restyle and no-raw-colors independently when the marker's custom declarations violate policy.
- [x] Markers without associated custom declarations retain their documented known/layout behavior.
- [x] Named and prefixed marker forms preserve existing recognition semantics; supported matching custom declarations are included.
- [x] Imported CSS, cached repeated inspection, and semantic-color provenance remain correct.

## Verification

Add compiler-inspection and public-linter tests for group, peer, and dark, with and without overlapping custom CSS. Include an imported stylesheet and repeated inspection.

Run `pnpm check` before reporting implementation complete. Append commands, outcomes, review findings, and completion evidence during implementation.

## Notes

The early return in inspectToken in packages/selfix/src/tailwind.ts bypasses all custom declarations for markers. Reproduced with .group { padding: 1rem; color: red; } and Button class group. This extends completed core-hardening/02-inspect-overlapping-custom-css.md without reopening or modifying that completed ticket.

Scope and dependencies approved for implementation.

Created from the approved v1-readiness audit discussion; no separate spec was supplied. Audit baseline: selfix 1ba8a7e99339b43eb91b503face00ec0e72f63c0; upstream comparison: shadcn-ui/lint bf89dcb7f66a306c7ac4943065298902afdbd969. Follow AGENTS.md: one standalone runner/config, Vue and Tailwind as the only consumer peers, no application-expression evaluation, deterministic original-SFC diagnostics, and no new runtime packages. Preserve attribution if adapting upstream code.

## Implementation progress

- Baseline: `595e543f720a827a4128eba44cfe2348d1ad9ed8` on `main`.
- Pre-existing changes preserved: modified `core-hardening/12-suggest-spelling-corrections.md` and `v1-readiness/11-improve-default-rejection-guidance.md`; untracked `documentation/05-agent-setup-guide.md` (all under `.agents/tickets/`).
- Owned scope: this ticket, `packages/selfix/src/tailwind.ts`, `packages/selfix/test/tailwind.test.ts`, and `packages/selfix/test/rules.test.ts`.
- Using approved compiler-inspection and public-linter tests; selector support remains within the existing collector boundary (selector corrections belong to ticket 05).

## Verification results

- Red: `pnpm exec vitest run packages/selfix/test/tailwind.test.ts -t 'inspects custom declarations on marker'` failed for all three markers, reproducing missing color/spacing categories and raw-color detection.
- Green: `node_modules/.bin/vitest run packages/selfix/test/tailwind.test.ts packages/selfix/test/rules.test.ts` passed all 126 tests; `node_modules/.bin/tsc --noEmit` passed.
- Regression coverage includes imported declarations, repeated cached inspection, semantic and stock color references, inline semantic utility provenance, independent rule diagnostics at the original SFC location, and named/prefixed marker recognition.
- `pnpm check` passed: 286 tests in 9 files, TypeScript, Oxlint, Oxfmt, and playground typecheck/design lint/build.
- Sandboxed pnpm attempts stalled on registry identity verification; the focused red run and full check succeeded outside the sandbox. No package-manager verification bypass was used.
- `git diff --check` passed; final owned diff inspected, index empty, unrelated changes preserved.

## Review outcomes

- Standards: independent read-only reviewer found no actionable findings.
- Spec: separate independent read-only reviewer confirmed all five acceptance criteria with no actionable findings.
- Existing escaped-selector attribution limitations remain assigned to ticket 05. This change preserves recognition of named/prefixed markers and uses existing exact-token custom declaration matching; it does not expand the selector parser.

## Completion

- Ticket marked done after required checks and both reviews passed.
- Implementation commit: `5cf473e99a38dde9a88ad8c3eae33908764ba221` (`fix(tailwind): inspect custom CSS on marker classes`).
- User subsequently requested committing and pushing only related changes; this ticket records the successful implementation commit.
