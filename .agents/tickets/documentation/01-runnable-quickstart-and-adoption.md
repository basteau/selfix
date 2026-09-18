# 01: Create a runnable quickstart and adoption guide

Status: done
Blocked by: none

## Commit follow-up (2026-09-18)

Integrated documentation committed as `96ba599` (`docs: document setup policies and analysis boundaries`). Release review corrected the ClassProps export list and clarified that Nuxt UI map inspection requires explicit classProps configuration. Independent Standards and Spec re-reviews have no remaining findings.

## Goal

Help a Vue 3 and Tailwind CSS 4 user install selfix, reproduce a diagnostic, correct the example, and introduce checks into an existing project. This ticket owns the opening, quickstart, and adoption sections of the root README.

Use the official shadcn-ui/lint guides as structural references, but verify every example against selfix. Preserve existing reference and maintainer material and unrelated edits.

## Acceptance criteria

- [x] The opening presents selfix as a standalone project and retains a brief upstream acknowledgment and attribution.
- [x] The quickstart states supported Node, Vue, and Tailwind versions, prerelease installation, native TypeScript configuration requirements, and the required CSS entry. Verify version and installation claims against current metadata and availability.
- [x] A complete example supplies consistent imports, actual component props, theme tokens, configuration, and paths. Reuse the playground vocabulary where practical; do not assume an unimplemented Button size prop or an unexplained alias.
- [x] The reader can reproduce one diagnostic, apply the correction, and obtain the documented successful CLI result.
- [x] State before the first lint command that all six rules default to error, including the SFC style-block rule. Omitted rules remain enabled.
- [x] A complete adoption configuration enables no-restyle at warn and explicitly disables the other five rules. Explain adding rules and promoting warnings to errors.
- [x] Explain measuring and lowering --max-warnings. A total-count threshold does not track individual existing violations or prevent a new finding from replacing a resolved one.
- [x] Package-script, local, CI, and coding-agent instructions use consistent executable commands and do not imply automatic fixes.
- [x] Any exclusion example states that every rule skips excluded files. Do not imply per-file rule overrides or inline suppressions.
- [x] New sections have working anchors and navigation. Apply technical-writing and unslop guidance and review examples against current code.

## Verification

Run the complete quickstart through the actual CLI using a temporary fixture or the existing playground integration boundary. Verify the failing diagnostic and original location, the corrected output and exit code, and the adoption configuration with exactly one enabled rule. Check a warning threshold both below and above its limit.

Reuse existing tests when they establish a claim. Add focused Vitest coverage only for meaningful uncovered behavior, not prose snapshots. Check package metadata, installation availability when needed, README anchors, and formatting. Run pnpm check before completion. Record commands, outcomes, review findings, and environmental limitations here.

## Notes

- Related files: packages/selfix/src/cli.ts, config.ts, index.ts, apps/playground/selfix.config.ts, apps/playground/src/components/ui/Button.vue, and apps/playground/test/usage.test.ts.
- Upstream references: https://github.com/shadcn-ui/lint/blob/main/README.md and https://github.com/shadcn-ui/lint/blob/main/docs/adoption.md . These are references, not instructions to configure upstream adapters in selfix.
- Tickets 01 and 02 are independently eligible but both edit README.md. Coordinate their edits; a shared file alone is not a prerequisite.

- Approved by the user from the documentation discussion; no separate spec exists.
- Keep all user documentation in the root README, with the standalone runner and `selfix.config.ts`. Do not add a docs site, alternate integrations, or runtime features.
- Apply the technical-writing skill at https://github.com/backnotprop/pstack/blob/main/skills/technical-writing/SKILL.md and unslop at https://github.com/poteto/noodle/blob/main/.agents/skills/unslop/SKILL.md . Use separate writing modes within README sections while honoring repository formatting conventions.
- Recheck current implementation and existing ticket status before making claims. Core-hardening tickets retain ownership of generated Nuxt UI themes (09), configured class props (10), diagnostic recovery (11), spelling suggestions (12), and isolated packed-package smoke testing (14). Do not document draft features as available.

## Implementation progress

- Baseline: `573f92dbcef89fc877415db5f73f57e861ab2b75` on `main`. No tracked changes; `.agents/tickets/documentation/` was untracked input.
- Owned scope: README opening, quickstart, adoption sections, and this ticket metadata. Preserve other tickets and reference/maintainer content. No commit requested.
- Documentation-only verification: execute README examples with the real built CLI in a temporary consumer; no artificial red tests.

## Completion evidence

- Added a complete theme, Button with the real `variant` prop, relative import, config, failing example, correction, CLI output, local/CI script, and coding-agent instructions. Added gradual adoption with exactly one warning rule, five disabled rules, warning-count limits, promotion, and whole-file exclusions. Preserved reference and maintainer sections.
- Applied the linked technical-writing and unslop skills and consulted both upstream guides. Used tutorial, how-to, and reference modes by README section, as requested.
- `npm view selfix dist-tags version engines peerDependencies --json --fetch-retries=0 --fetch-timeout=15000` passed with registry access: alpha resolves to `0.1.0-alpha.0`; Node >=22.18.0, Vue >=3.2.13 <4, Tailwind >=4.0.0 <5 agree with local metadata.
- `pnpm build` passed. `python3 -u /tmp/verify-selfix-docs.py` extracted the README code blocks into a temporary consumer linked to the built workspace package and real Vue/Tailwind peers. With pnpm 11.23.0, the exact diagnostic was at 6:31, exit 1; correction produced the documented clean output, exit 0. `pnpm run lint:design` checked both files cleanly. One adoption warning failed at max 0 and passed at max 1 and 2. Inputs violating the other five rules still returned only the no-restyle warning. All README fragment links resolved. Fixture directories were removed automatically.
- Initial output comparison caught an incorrect documented column (38); corrected it to the observed original attribute location (31). The pinned-pnpm harness allows pnpm's initial setup banner before the exact selfix output.
- `pnpm check` initially hit sandbox subprocess EPERM failures. Rerun with execution permission passed: typecheck, Oxlint, Oxfmt, all 224 tests in 7 files, package build, playground typecheck/design lint/build.
- Review scope: README working-tree diff against `573f92dbcef89fc877415db5f73f57e861ab2b75`, empty index, and this relevant pre-existing untracked ticket. Independent standards reviewer: 0 findings. Independent spec reviewer: 0 findings. Both reviewed current code and docs; execution evidence above belongs to the implementing agent.
- Limitations: the fixture verifies current workspace code, not a fresh install of the published alpha. Registry availability and metadata were checked separately. No runtime behavior changed, so no new Vitest tests were added. No unresolved review findings.
- No commit requested or created. Other documentation tickets remain unchanged.
