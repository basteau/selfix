# 03: Correct utility categories and rejection messages

Status: in-progress
Blocked by: none

## Goal

Make category-based permissions work for ordinary Tailwind utilities and explain the category that actually caused rejection.

Observed gaps include `leading-6` receiving typography plus unknown, `ease-in` receiving motion plus unknown, and `rotate-45` receiving unknown. An allowed typography utility can consequently be rejected with a misleading typography message.

## Acceptance criteria

- [x] `leading-6` is classified as typography without spurious unknown bookkeeping declarations.
- [x] `ease-in` is classified as motion without spurious unknown bookkeeping declarations.
- [x] Rotation utilities are classified consistently with the existing effects treatment of transforms.
- [x] Appropriate category permissions allow these utilities on recognized UI components.
- [x] Mixed-category rejection identifies a genuinely disallowed category, preserving deny precedence and deterministic category selection.
- [x] Unknown declarations remain conservative; do not blanket-ignore custom properties or all `--tw-*` properties.

## Verification

Add table-driven compiler-backed regressions in `packages/selfix/test/tailwind.test.ts` and policy/message assertions in `packages/selfix/test/rules.test.ts`. Cover a mixed allowed/disallowed case and an explicit deny. Run `pnpm check`; append commands and outcomes during implementation.

## Notes

Approved from the core-hardening discussion. Relevant boundaries are `categoryFor` in `packages/selfix/src/tailwind.ts` and category selection for reporting in `packages/selfix/src/index.ts`. Keep mappings focused on generated CSS, not a second utility-name grammar. Completion requires review and passing checks.

## Implementation progress

- Baseline: `f8285edb547581e267ad0edf401714f9cb4a1068` on `main`; clean tracked and untracked worktree.
- Owned scope: `packages/selfix/src/tailwind.ts`, `packages/selfix/src/index.ts`, their `tailwind.test.ts` and `rules.test.ts` tests, and this ticket.
- Using the approved compiler and public-linter regression boundaries.

## Verification results

- Red: `pnpm exec vitest run packages/selfix/test/tailwind.test.ts` reproduced six category failures for leading, easing, and rotation utilities. Green: all 42 compiler tests passed after focused property mappings; `pnpm typecheck` passed.
- Red: `pnpm exec vitest run packages/selfix/test/rules.test.ts` reproduced five message failures for mixed categories and explicit deny. Green: all 31 tests then passed; an additional default-message/custom-property regression brings the rule suite to 32 tests.
- Final `pnpm check`: passed all 170 tests, TypeScript, Oxlint, Oxfmt, and playground typecheck/design lint/build. Initial sandbox run failed on subprocess EPERM; the full rerun outside the sandbox passed.
- `git diff --check`: passed.

## Review outcomes

- Standards: independent read-only review found no actionable findings and independently passed all 74 focused compiler/rule tests.
- Spec: independent read-only review confirmed all six acceptance criteria with no findings.
- Unknown declarations remain conservative; only the evidenced leading, easing, and rotation properties were added. No remaining limitations specific to this ticket.
- Implementation and review are complete; ticket remains in-progress until the requested commit succeeds.
