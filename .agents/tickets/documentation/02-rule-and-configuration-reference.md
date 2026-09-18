# 02: Complete rule and configuration reference

Status: done
Blocked by: none

## Commit follow-up (2026-09-18)

Integrated documentation committed as `96ba599` (`docs: document setup policies and analysis boundaries`). Release review corrected the ClassProps export list and clarified that Nuxt UI map inspection requires explicit classProps configuration. Independent Standards and Spec re-reviews have no remaining findings.

## Goal

Make the root README sufficient to look up each rule, configure component policies, understand supported Vue syntax, and use the CLI or public API. This ticket owns rule, configuration, Vue syntax, CLI, and API reference sections and a worked component-policy example.

## Acceptance criteria

- [x] Each of the six rules has a linked reference with purpose, scope, defaults, failing and passing examples, supported exceptions, and limits. Label whether an example passes one rule or the complete configured policy.
- [x] no-restyle examples cover margin versus padding, multi-category utilities, contract ordering, and deny precedence. An allowance in one rule does not bypass another rule.
- [x] Color, arbitrary-value, and unknown-class examples cover semantic tokens, raw palette and literal colors, custom CSS, bracket values, arbitrary properties, slash modifiers, CSS-variable shorthand, typos, and external-class allowances as supported by current code.
- [x] Inline-style reference distinguishes style attributes, bound attributes, and SFC style blocks, with actual whole-style exceptions rather than upstream property-level behavior.
- [x] Static-class reference covers native elements and components, supported template expressions, the narrower script-constant boundary, fixed recognized helpers, and local/template shadowing.
- [x] Vue syntax reference covers arrays, object keys, conditional and logical branches, v-for, slot scopes, supported same-name shorthand, static v-bind objects, unresolved spreads, and dynamic arguments. Distinguish ordinary rule findings from unsupported-input diagnostics.
- [x] Configuration reference lists supported fields, types, defaults, and path bases. Explain import-prefix/regex recognition, local component names and aliases, global patterns, ignore precedence, and whole-file exclusions.
- [x] Shared policy reference explains first-match contracts, replacement versus inheritance, explicit deny behavior, wildcards, variant/marker normalization, categories, and multi-category allowances. Verify these against current code.
- [x] Document the five message placeholders, including the SFC meaning of file, category/default messages, contract message replacement, shared notes, and validation errors.
- [x] A worked policy example explains choosing a component variant or a contract and proves the outcome with Vue examples. Do not imply automatic variant discovery.
- [x] CLI reference covers every supported flag, discovery and quoted globs, exclusions, path bases, text/JSON output, position conventions, empty scans, and exit codes.
- [x] API reference covers public exports, CSS source versus paths, resolution base, asynchronous creation and synchronous linting, diagnostics versus thrown errors, and linter reuse/recreation after theme changes.
- [x] Preserve and accurately place the CSS-import resolution guidance owned by core-hardening ticket 08. Verify its current status and implementation instead of relying on an earlier working-tree snapshot.
- [x] Give shared facts one primary reference location with working links. Apply technical-writing and unslop guidance without duplicating option tables.

## Verification

Map claims to packages/selfix/src/config.ts, index.ts, vue.ts, tailwind.ts, and cli.ts and their regression tests. Execute representative examples with the exact documented CSS and policy. Verify contract order/replacement, deny precedence, overlapping rule findings, syntax boundaries, helper shadowing, and CLI/API claims using existing test boundaries.

Add focused Vitest regressions only where a meaningful documented boundary lacks coverage. Check anchors, public exports, option completeness, and formatting. Run pnpm check before completion. Record commands, outcomes, and review findings here. Report runtime discrepancies explicitly instead of silently expanding documentation work into features.

## Notes

- Upstream references: https://github.com/shadcn-ui/lint/blob/main/docs/README.md , https://github.com/shadcn-ui/lint/blob/main/docs/rules.md , and https://github.com/shadcn-ui/lint/blob/main/docs/design-systems.md . Follow the index to the six rule guides. Adapt structure, not upstream-specific behavior.
- Observed differences to recheck: enabled defaults, first-match contracts, explicit deny bans, native-element static checks, whole-style exceptions, fixed helper names, five message placeholders, and theme-loading failure behavior.
- Coordinate README edits with ticket 01 without an artificial dependency. Preserve completed or ongoing CSS-loader documentation rather than replacing it with stale assumptions.

- Approved by the user from the documentation discussion; no separate spec exists.
- Keep all user documentation in the root README, with the standalone runner and `selfix.config.ts`. Do not add a docs site, alternate integrations, or runtime features.
- Apply the technical-writing skill at https://github.com/backnotprop/pstack/blob/main/skills/technical-writing/SKILL.md and unslop at https://github.com/poteto/noodle/blob/main/.agents/skills/unslop/SKILL.md . Use separate writing modes within README sections while honoring repository formatting conventions.
- Recheck current implementation and existing ticket status before making claims. Core-hardening tickets retain ownership of generated Nuxt UI themes (09), configured class props (10), diagnostic recovery (11), spelling suggestions (12), and isolated packed-package smoke testing (14). Do not document draft features as available.

## Implementation progress

- Baseline: `573f92dbcef89fc877415db5f73f57e861ab2b75` on `main`. Existing tracked change: README quickstart/adoption from completed documentation ticket 01. Existing untracked input: `.agents/tickets/documentation/`. Index empty.
- Owned scope: README reference sections from Rules through API, and this ticket metadata. Preserve the existing opening/quickstart/adoption and limitations/maintainer sections. Baseline README saved to `/tmp/selfix-readme-ticket02-baseline.md` for isolated review. No commit requested.
- Documentation-only validation: use current source/tests and execute representative documented examples through the real API/CLI; no artificial red tests.

## Completion evidence

- Expanded README Rules through API with six linked rule references, supported Vue expression/scope boundaries, complete configuration and shared-policy tables, five message placeholders, a worked variant/contract policy, every CLI flag and output/exit behavior, public exports, and API error/reuse semantics. Preserved the completed CSS-import guidance after checking ticket 08 and its resolver implementation.
- Consulted the linked technical-writing and unslop skills, upstream documentation index, shared rules/design-system guides, and six rule guides. Wrote selfix behavior from current code rather than upstream semantics. Preserved the existing quickstart/adoption and Limitations/maintainer sections byte-for-byte.
- Claim sources: `config.ts` validation/types/defaults; `index.ts` independent rule policies, contract selection/messages/diagnostics/API exports; `vue.ts` class/style collection and scope handling; `tailwind.ts` categories, raw colors, custom declarations, and CSS loading; `cli.ts` flags, discovery, exclusions, output, and exits. Existing rules/vue/tailwind/cli regression suites cover these boundaries.
- `pnpm build` passed. `node /tmp/verify-selfix-reference.mjs` passed 38 real API/CLI checks using CSS and worked config extracted from README. Covered complete policy results, replacement/first-match contracts, inherited deny, overlapping findings, multi-category allowances, slash matching, raw custom colors, whole-style exceptions, message replacement and all five placeholders, helper/slot/loop shadowing, static constants, shorthand, recoverable uncertainty, JSON paths/deduplication/clean output, empty scans, and help/version. Also checked runtime export completeness, all README fragment links, and exact preservation of unrelated sections. Temporary consumer cleaned up automatically.
- No production behavior changed or meaningful uncovered runtime boundary was found, so no new Vitest tests were added. The temporary harness verifies current built workspace code, not the published alpha or browser rendering.
- `pnpm check` initially passed typecheck/lint/format but encountered 13 sandbox subprocess EPERM failures. Rerun with subprocess permission passed typecheck, Oxlint, Oxfmt, package build, all 224 tests in 7 files, and playground typecheck/design lint/build.
- Independent Standards and Spec reviewers each found the same P2 Markdown table defect: unescaped logical-OR pipes split a row. Restored two cells with escaped pipes, reran formatting and the 38-check harness, and both reviewers re-reviewed the fix. Final Standards: 0 remaining findings. Final Spec: 0 remaining findings. No unresolved limitations beyond documented runtime boundaries.
- Final diff checked against HEAD and the saved pre-task README; index empty, only owned reference sections and this ticket changed during this task. `git diff --check` passed. No commit requested or created. Documentation ticket 03 remains ready; parent/spec status unchanged.
