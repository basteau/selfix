# 01: Add selfix --doctor to explain component protection

Status: done
Blocked by: none

## Goal

Give developers a setup report that explains whether their intended components are recognized and have active no-restyle enforcement. A clean lint result alone does not establish this: ui matches import strings, component-source discovery is separate, and rules can be disabled by configuration or file overrides.

Add selfix --doctor as one complete CLI behavior, including collection, reporting, configuration suggestions, regression tests, and documentation. Reuse the existing Vue parser, recognition rules, effective rule settings, and project discovery rather than creating a second interpretation of protection.

## Acceptance criteria

- [x] Support --doctor with the existing file/directory/glob selection, config, CSS override, exclusion, and path-resolution behavior. Show the resolved configuration path, successfully loaded Tailwind CSS entry, and scanned Vue file count. Do not describe a theme as loaded until compilation/loading succeeds.
- [x] Report component usages in the selected Vue templates, including components without class attributes. Include original SFC locations and deterministic ordering. Preserve existing Vue identity semantics, including local import names and supported global/auto-imported names; native elements and type-only imports must not become component usages merely because their names resemble imports.
- [x] Explain recognition using the matching ui prefix, components pattern, or componentImports pattern. Show when ignoreImports prevents recognition and when no recognition setting matches. Preserve existing matching precedence and reuse matching logic with ordinary lint so the report cannot drift from enforcement.
- [x] Distinguish recognized components from usages with active no-restyle enforcement. Report the effective severity, including disabled rules and per-file overrides. A recognized component with no-restyle off must not count as actively protected. Active enforcement describes the configured policy, not proof that every possible class is forbidden.
- [x] Report component-definition discovery separately from recognition and enforcement: resolved with a verified source path, unavailable, or disabled. Unavailable optional definition metadata must not imply that an otherwise recognized component is unprotected. Report known limitations honestly rather than inventing a resolution reason.
- [x] Highlight zero actively protected matches as an advisory. Explain whether the selected files contain no component usages, usages are unrecognized/ignored, or no-restyle is disabled, as supported by the collected evidence.
- [x] Offer concrete, narrow configuration suggestions based on observed imports for unrecognized component usages. Present these as options for components the developer intends to protect, not evidence that every imported component belongs to the design system. Do not propose blanket patterns, override intentional ignore settings, or edit files automatically.
- [x] Keep this first version text-only. Explicitly reject --doctor combined with --format json or --max-warnings with an actionable message instead of silently ignoring those options. Existing normal-lint JSON output and warning limits remain unchanged.
- [x] Doctor reports setup rather than ordinary styling violations. A successfully completed report returns 0, including zero-match advisories and unavailable optional definitions. Parse/unsupported-enforcement-input failures remain visible and return 1; configuration, theme, discovery-loading, and input failures return 2, including empty scans. Do not turn failed loading or unsupported analysis into a successful setup report.
- [x] Preserve current recognition and source-resolution boundaries. Do not implement dynamic/namespace component support, wrapper tracing, broader package resolution, or richer prop discovery in this ticket. Make unsupported syntax visible without implying comprehensive component coverage or evaluating application expressions.
- [x] Document the command, report meanings, advisory/exit behavior, and limits in apps/docs/content/cli.md and the relevant troubleshooting/configuration guidance. Keep essential setup information in README.md and avoid duplicating detailed reference material there.

## Verification

Add focused Vitest regressions using real Vue parsing, Tailwind compilation, and temporary project fixtures. Verify observable CLI reports and exit codes rather than snapshots of internal implementation details.

Cover recognized and unrecognized imports, import-prefix segment boundaries, ignore precedence, component/import patterns, renamed imports and supported kebab-case usages, native/type-only near misses, global components, and usages without classes. Compare representative doctor recognition/enforcement results with ordinary no-restyle diagnostics for the same configured components.

Cover rule severity and file overrides; resolved, unavailable, and disabled discovery; zero usages and zero active protection; narrow suggestions based on observed imports; deterministic original locations; config-relative paths and file exclusions; invalid option combinations; parse/unsupported-input errors; broken themes and discovery metadata; and empty scans. Include application expressions that would throw if evaluated.

Run focused tests, pnpm check, and git diff --check during implementation. Record commands, outcomes, review findings, and any remaining limitations before marking this ticket done.

## Notes

- Created directly from the discussion; there is no separate spec. The user approved one complete ticket with no blockers, text output first, advisory zero-match behavior, preserved failure behavior, and no expansion of component resolution.
- Approval is to create this local ticket only. Implementation, commits, and external publication are not part of this request.
- Existing core component discovery is complete in ../component-discovery/01-resolve-component-sources.md. Reuse it; the broader discovery draft and ../v1-readiness/13-recognize-static-component-expressions.md are related work, not prerequisites or scope to absorb.
- Current implementation anchors are packages/selfix/src/cli.ts for input/loading/output, packages/selfix/src/index.ts for recognition and effective rule settings, packages/selfix/src/vue.ts for template collection, and packages/selfix/src/project.ts for definition discovery. Component usages without classes require collection beyond existing class findings; do not derive the inventory solely from violations.
- Preserve the standalone selfix.config.ts runner, one publishable package and two private apps, Vue/Tailwind-only consumer peers, deterministic original-SFC diagnostics, and no evaluation of application expressions. Prefer plain functions and Node built-ins; do not introduce a separate prefactor ticket or new runtime dependency.

## Implementation progress

- Baseline: `f6e22eae1b861c1df0377f562f0f543169d6761a` on `main`; no tracked changes, untracked `.agents/tickets/doctor/` and `.taste/`. User requested implementation of the next ready ticket. Preserve existing ticket content and unrelated `.taste/`.
- Owned scope: Vue usage collection, shared recognition/effective settings, CLI doctor output, focused tests, documentation, and this ticket. No commit requested.


## Completion evidence

- Implemented text-only `--doctor` using shared recognition and effective rule settings, Vue usage collection independent of class findings, and existing source discovery. Reports original locations, setup paths/counts, recognition reasons, severity/protection, separate definition state, advisories, and deduplicated exact-import suggestions. Preserves normal lint output and option behavior.
- Added CLI/configuration/troubleshooting documentation. Unsupported dynamic/namespace/`is="vue:…"` syntax and unreadable class inputs fail visibly without evaluating application expressions; no source-resolution expansion.
- User additionally requested global `.taste/` ignore: added to `/Users/sebas/.config/git/ignore` and verified with `git check-ignore -v .taste/`. Added `**/.taste/**` to `.oxfmtrc.json` because Oxfmt does not honor global Git ignores and the pre-existing `.taste/brand.json` blocked formatting. Its contents were left untouched.

### Verification

- Initial `pnpm exec vitest ... -t 'reports classless'` could not complete pnpm signature verification within the network sandbox; no red result claimed for that attempt. Direct installed Vitest subsequently verified the first report fixture.
- Red/green: `node_modules/.bin/vitest run packages/selfix/test/cli.test.ts -t 'doctor rejects dynamic'` reproduced incorrect exit 0, then passed after reporting unreadable class inputs.
- Review red/green: `node_modules/.bin/vitest run packages/selfix/test/cli.test.ts -t 'doctor rejects alternate'` reproduced two incorrect exit-0 cases (`Component` and `is="vue:…"`), then passed after unsupported detection was corrected.
- Final focused `node_modules/.bin/vitest run packages/selfix/test/cli.test.ts`: 42 tests passed. Includes shared lint/doctor recognition and severity, identity/native/type-only boundaries, classless usages, prepared auto-import discovery, exclusions/paths, exact escaped suggestions, failure states, deterministic locations, and no evaluation.
- `node_modules/.bin/tsc --noEmit`: passed during implementation and after review corrections.
- First full `pnpm check` failed formatting, including unrelated `.taste/brand.json`; owned formatting and the formatter exclusion resolved it. A subsequent complete check passed 508 tests before the final review fixes.
- Final `pnpm check`: passed after review fixes, 512 tests in 14 files, typecheck, Oxlint, Oxfmt, package build, playground checks/build, strict docs link validation and isolated docs build. Network-enabled execution was needed for pnpm's package-manager identity verification.
- `git diff --check`: passed. Final owned diff reviewed; index remains empty.

### Review

- Standards: independent subagent identified one P2 unsupported-syntax detection finding covering uppercase `Component` and `is="vue:…"`. Fixed with regression tests. Re-review: no remaining findings.
- Spec: independent subagent identified the same uppercase `Component` gap. Fixed; re-review confirms coverage and no remaining findings.
- Review scope: current tracked diff against `f6e22eae1b861c1df0377f562f0f543169d6761a`, staged/unstaged state, and this relevant untracked ticket. Reviewers inspected changes and focused reproductions; full-check results were supplied by the implementing agent.
- Remaining limits are the approved ones documented in the CLI guide: text only, unavailable optional definitions, no dynamic/namespace resolution or wrapper tracing, and no guarantee of comprehensive coverage. No unresolved review findings.
- User subsequently requested commit and push. Implementation committed successfully as `e6b217a36a28d2f6a564fb81e181f063312f39cf` (`feat(cli): explain component protection with doctor reports`). Ticket remains done; push requested to `origin/main`.
