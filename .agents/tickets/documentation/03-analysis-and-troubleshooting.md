# 03: Explain analysis limits and troubleshoot failures

Status: done
Blocked by: 01-runnable-quickstart-and-adoption.md, 02-rule-and-configuration-reference.md

## Commit follow-up (2026-09-18)

Integrated documentation committed as `96ba599` (`docs: document setup policies and analysis boundaries`). Release review corrected the ClassProps export list and clarified that Nuxt UI map inspection requires explicit classProps configuration. Independent Standards and Spec re-reviews have no remaining findings.

## Goal

Help readers understand what a selfix result establishes and resolve failures using the completed onboarding and reference sections. This ticket owns explanation, troubleshooting, limitations/trust sections, and final navigation and link integration in the root README.

Tickets 01 and 02 are prerequisites because remedies and reader routes must link to their completed examples and reference material.

## Acceptance criteria

- [x] Explain Vue source collection, Tailwind compilation/inspection, policy evaluation, and original-SFC diagnostic locations. Explain non-evaluation of application expressions without implying configuration modules are inert.
- [x] State actual analysis limits, including Vue template scope, unreadable values, recognition, wrapper tracing, variant discovery, and autofixes. Verify current behavior rather than preserving stale limitations.
- [x] Distinguish recognized classes, policy-approved classes, and coverage of application styling. A clean result must not be presented as proof that every styling path was checked.
- [x] Troubleshooting covers unrecognized components, dynamic classes despite allowances, scoped-style findings, unknown custom classes, empty scans, CSS import failures, and stale results when programmatic callers reuse a linter.
- [x] Each entry provides a symptom, concrete checks, supported remedy, and working links to completed guides/reference. Do not copy upstream adapter, cache timer, theme-discovery, or fallback claims.
- [x] CSS/theme guidance preserves core-hardening ticket 08's package-export behavior and distinguishes package CSS from generated application themes. Do not promise automatic Vite/Nuxt configuration loading.
- [x] Trust guidance distinguishes unevaluated application expressions from executed selfix.config.ts and trusted Tailwind plugin/config modules. Describe malformed/unsupported input and theme-loading failures accurately.
- [x] Navigation connects quickstart, adoption, policies/rules, CLI/API, explanation, troubleshooting, and limits. Check duplicate/broken anchors, keep common workflows visible, and keep maintainer details secondary.
- [x] Preserve development, release, license, and attribution material. Do not add migration/port documents or a separate docs tree.
- [x] Inspect the packaged README and repair links that break outside the repository, using verified repository URLs where appropriate. Do not duplicate core-hardening ticket 14's isolated package smoke-test infrastructure.
- [x] Review the integrated README with technical-writing and unslop guidance for consistent terminology, explicit conditions, direct procedures, and evidence-backed examples.

## Verification

Reproduce troubleshooting scenarios using temporary fixtures or existing tests and record diagnostics, exit behavior, and remedies. Check consistency with the linked tutorial/reference examples. Reuse tests; add focused Vitest coverage only for meaningful uncovered behavior.

Check internal anchors and repository-relative links. Inspect GitHub-compatible rendering of code blocks, tables, and collapsed sections. Prepare an artifact with the existing packaging workflow, inspect its README and links, and clean temporary artifacts without publishing or modifying release versions. Reuse any completed packed-package verification from core-hardening ticket 14.

Run pnpm check before completion. Record commands, outcomes, review findings, and remaining limitations here.

## Notes

- Upstream references: https://github.com/shadcn-ui/lint/blob/main/docs/how-it-works.md and https://github.com/shadcn-ui/lint/blob/main/docs/troubleshooting.md . Selfix's recognition and loading model differ; explanations must follow its source.
- packages/selfix/scripts/package.mjs copies the root README and license into the publishable package. Keep the root README authoritative.
- Do not repeat upstream evaluation results, agent-effectiveness claims, or performance claims without selfix-specific evidence.

- Approved by the user from the documentation discussion; no separate spec exists.
- Keep all user documentation in the root README, with the standalone runner and `selfix.config.ts`. Do not add a docs site, alternate integrations, or runtime features.
- Apply the technical-writing skill at https://github.com/backnotprop/pstack/blob/main/skills/technical-writing/SKILL.md and unslop at https://github.com/poteto/noodle/blob/main/.agents/skills/unslop/SKILL.md . Use separate writing modes within README sections while honoring repository formatting conventions.
- Recheck current implementation and existing ticket status before making claims. Core-hardening tickets retain ownership of generated Nuxt UI themes (09), configured class props (10), diagnostic recovery (11), spelling suggestions (12), and isolated packed-package smoke testing (14). Do not document draft features as available.

## Implementation baseline

- HEAD: `573f92dbcef89fc877415db5f73f57e861ab2b75`, branch `main`; index empty. Existing README edits belong to completed documentation tickets 01 and 02; documentation tickets are untracked input.
- Owned scope: explanation/troubleshooting, limitations, navigation additions and packaged-link repair, plus this ticket. Baseline saved to `/tmp/selfix-readme-ticket03-baseline.md`; preserve other prose. No commit requested.
- Documentation-only validation uses real API/CLI fixtures, existing regressions, package inspection, and Markdown checks; no artificial red tests.

## Completion evidence

- Added analysis explanation, coverage distinctions, seven troubleshooting entries with supported remedies and reference links, current limits, and explicit configuration execution/trust guidance. Extended top navigation. Preserved onboarding/reference, CSS export guidance, attribution, and maintainer material; repaired the packaged README's AGENTS.md link to the repository URL verified against Git remote and tracked path.
- Consulted the linked technical-writing and unslop skills and upstream explanation/troubleshooting references. Claims follow current selfix source, not upstream alias resolution, wrapper analysis, fallback, or theme-generation behavior. No runtime changes or artificial regression tests.
- `node /tmp/verify-selfix-doc03.mjs` passed against the real built API/CLI: unrecognized/recognized Button, dynamic classes despite allowances and literal-alternative remedy, scoped-style finding and whole-style exception, unknown custom class and CSS/allowance remedies, retained versus recreated theme, empty scan exit 2 and explicit-file exit 0, missing CSS exit 2 and import repair exit 0. Temporary fixture removed automatically.
- `pnpm check` initially encountered 13 sandbox subprocess EPERM failures. Execution-permitted rerun passed with exit 0: typecheck, Oxlint, Oxfmt, package build, 224 tests in 7 files, playground typecheck/design lint/build.
- `pnpm --filter selfix pack --out /tmp/selfix-doc03.tgz` passed with exit 0. `python3 /tmp/verify-selfix-doc03-markdown.py` verified packed/root README byte equality, every relative package link, 41 unique heading anchors and all fragment links, CommonMark HTML with table support, consistent rendered table cell counts, code fences and collapsed maintainer section. Confirmed unrelated reference/onboarding and maintainer prose preserved byte-for-byte except the intended AGENTS URL. Archive removed; no publication or version changes.
- Reused ticket 14's completed isolated-install smoke evidence; did not rerun registry installation for this prose-only change. Markdown was rendered and structurally inspected locally, not rendered on hosted GitHub/npm. No hosted rendering or publication was performed.
- Independent Standards reviewer: 0 findings. Independent Spec reviewer: 0 findings. Both reviewed actual owned working-tree changes against `/tmp/selfix-readme-ticket03-baseline.md`, the baseline HEAD, ticket and current source; execution evidence belongs to the implementer. No unresolved findings.
- Final `git diff --check` passed; index empty. Only task-owned README sections/navigation/link and this ticket changed during the task. No commit requested or created. Parent status unchanged.
