# 04: Reduce the first-use example

Status: done
Blocked by: none

## Goal

Give a new reader one short, runnable experience: protect a Button, catch a padding override, and correct it. Keep the introduction and README focused on why to try selfix.

## Acceptance criteria

- [x] Reduce Getting started to one small Button, minimum Tailwind setup, one rejection, and one correction. Remove four-color/two-variant setup that the padding lesson does not need.
- [x] Keep prerequisites, exact file paths/imports/config, executable commands, and expected outcomes sufficient for a reader with an existing Vue/Tailwind project. Do not overwrite existing app files implicitly.
- [x] Explain component-owned appearance and page-owned placement with one concrete example. Teach variants in the contract discussion only when useful.
- [x] Keep essential install/config/run information in README and detailed instructions in apps/docs/content. Preserve brief attribution and the standalone selfix identity.
- [x] Keep all-six-rule defaults and the style-block implication visible before expanding to a whole-project scan. Link gradual adoption without inserting reference detours.

## Verification

Execute the exact documented files in a temporary consumer: confirm the stated no-restyle location and failure, the correction and clean exit, and the final directory scan. Check README/package links and every changed anchor. No artificial runtime tests for prose-only edits. Run pnpm check and git diff --check.

## Notes

Own README.md, content/index.md, and content/getting-started.md, with necessary incoming-link fixes. No dependency on 01–03: use the current working CLI contract and coordinate if those land first. Preserve essential source-unchanged and trust guidance through the canonical reference. Keep completed documentation/01 intact; this is an approved simplification of its teaching scope.

Created from the product/docs clarity discussion. The user approved the eight-ticket breakdown and dependencies, with 01–03 retained as drafts pending interface decisions. No separate spec exists. Approval here is to create local tickets, not to implement, commit, push, release, or publish externally.

Keep one publishable package, two private apps, standalone selfix.config.ts, Vue/Tailwind-only consumer peers, and no evaluation of application expressions. Preserve deterministic actionable original-SFC diagnostics. Prefer plain functions and Node built-ins. Keep essential setup in README and detailed docs in apps/docs/content; no port/migration documents or nested AGENTS.md files. Preserve existing working-tree changes and completed ticket identities.

## Implementation baseline

Starting revision: b9d5aaa on main; clean worktree. Own README, introduction, tutorial and one incoming tutorial-variant reference. Documentation validation replaces artificial regression tests.

## Completion

Implementation: b44de7d. Executed exact tutorial in a temporary consumer: no-restyle at 6:11, exit1; correction and full source scan exit0. Local/repository links and anchors passed; pnpm check passed (489 tests, docs/build/playground). Both reviewers found the incoming rules-theme prerequisite; fixed and re-reviewed with no remaining findings. Removed unrelated theme colors and variants from first use.
