# 03: Correct utility categories and rejection messages

Status: ready
Blocked by: none

## Goal

Make category-based permissions work for ordinary Tailwind utilities and explain the category that actually caused rejection.

Observed gaps include `leading-6` receiving typography plus unknown, `ease-in` receiving motion plus unknown, and `rotate-45` receiving unknown. An allowed typography utility can consequently be rejected with a misleading typography message.

## Acceptance criteria

- [ ] `leading-6` is classified as typography without spurious unknown bookkeeping declarations.
- [ ] `ease-in` is classified as motion without spurious unknown bookkeeping declarations.
- [ ] Rotation utilities are classified consistently with the existing effects treatment of transforms.
- [ ] Appropriate category permissions allow these utilities on recognized UI components.
- [ ] Mixed-category rejection identifies a genuinely disallowed category, preserving deny precedence and deterministic category selection.
- [ ] Unknown declarations remain conservative; do not blanket-ignore custom properties or all `--tw-*` properties.

## Verification

Add table-driven compiler-backed regressions in `packages/selfix/test/tailwind.test.ts` and policy/message assertions in `packages/selfix/test/rules.test.ts`. Cover a mixed allowed/disallowed case and an explicit deny. Run `pnpm check`; append commands and outcomes during implementation.

## Notes

Approved from the core-hardening discussion. Relevant boundaries are `categoryFor` in `packages/selfix/src/tailwind.ts` and category selection for reporting in `packages/selfix/src/index.ts`. Keep mappings focused on generated CSS, not a second utility-name grammar. Completion requires review and passing checks.
