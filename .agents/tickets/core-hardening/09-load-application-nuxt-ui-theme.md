# 09: Load the application's Nuxt UI theme

Status: done
Blocked by: 08-resolve-css-package-exports.md

## Commit follow-up (2026-09-18)

Implementation committed as `65907ab` (`feat(css): support application stylesheet aliases`); integrated README committed as `96ba599`. Publication authorized by the user after implementation.

## Goal

Provide a tested standalone integration that inspects the application's actual generated Nuxt UI theme rather than accidentally substituting the package's bundled static theme. Keep any mechanism inside `selfix.config.ts` and the existing runner.

Nuxt UI's `#build/ui.css` can resolve through package imports to a bundled static stylesheet. Successful import resolution alone therefore does not establish that application customizations were loaded.

## Acceptance criteria

- [x] Agree on the resolution mechanism and public configuration before implementation: the user approved an explicit exact `cssAliases` map.
- [x] Agree on how the application generates the required theme file and how that preparation fits local and CI commands.
- [x] An integration fixture distinguishes generated application tokens from the package fallback and proves the intended file is used.
- [x] Missing generated targets fail clearly with actionable preparation guidance, without silently falling back to a different theme.
- [x] Paths have documented bases and work independently of incidental working-directory differences.
- [x] A root README example covers preparation, configuration, execution, and remaining limitations.
- [x] No Nuxt/Vite runtime dependency, automatic framework-config execution, or extra publishable package is added.

## Verification

Approved and completed: real Tailwind compilation with isolated package and generated-file fixtures, API and CLI regressions, configuration validation, and a real Nuxt preparation smoke test. See verification results below.

## Notes

Originally retained as a draft. The user approved the exact alias API, application-owned preparation lifecycle, and testing approach before implementation (see approved design below). Ticket 08 is a genuine prerequisite for standard package CSS imports. The earlier discussion's claim that `#build/ui.css` simply cannot resolve was incomplete; the important distinction is bundled static versus application-generated theme. Do not claim full Nuxt UI compatibility until tested. Completion requires review and passing checks.

## Approved design and implementation progress

- User approved exact `cssAliases: Record<string, string>` mappings in `selfix.config.ts`, with no wildcard, prefix, or chained matching. Local CSS targets override normal resolution; missing targets fail without fallback.
- CLI targets resolve from the config directory. API targets resolve from `base`. Nested imports resolve from the target file.
- Preparation is owned by the application; verify `nuxt prepare` using pinned Nuxt/UI versions before documenting the command. Stale generated files cannot be detected by selfix.
- Approved tests: real Tailwind compiler with isolated package/generated-file fixtures; precedence, missing files, nested imports, config validation, API and CLI path bases; pinned real Nuxt preparation smoke test with an application-only semantic color.
- Baseline: `573f92dbcef89fc877415db5f73f57e861ab2b75` on `main`. Pre-existing changes: modified README.md and untracked `.agents/tickets/documentation/`. Preserve all existing work. User approved additive edits to the current README.
- Owned scope: config, CLI, linter and Tailwind loading code; focused tests; integration smoke script if needed; additive README guidance; this ticket. No commit requested.

## Verification results

- Red: `pnpm exec vitest run packages/selfix/test/css-aliases.test.ts` failed with `Unknown config option: cssAliases` before implementation. Green after configuration and stylesheet-loader changes.
- Red: the focused CLI alias test failed because `.nuxt/ui.css` was resolved relative to the CSS entry instead of the config. Green after converting CLI alias targets to config-relative absolute paths.
- `pnpm exec vitest run packages/selfix/test/css-aliases.test.ts packages/selfix/test/cli.test.ts packages/selfix/test/tailwind.test.ts`: 97 tests passed, including validation, exact matching, non-chaining, nested imports, fallback exclusion, missing targets, and config paths with a different cwd and `--css`.
- Development `pnpm typecheck`: passed after both behavior changes.
- Initial `pnpm check`: existing subprocess tests hit sandbox `EPERM` (13 failures). Rerun with subprocess permission passed typecheck, Oxlint, Oxfmt, build, all 238 tests, and playground typecheck/design lint/build.
- `pnpm smoke:nuxt`: passed. Installs Nuxt 4.5.2, Nuxt UI 4.11.1, Tailwind CSS 4.3.3, and Vue 3.5.42 into a temporary application on Node 24.21.0; runs `nuxt prepare`; checks a generated `selfixbrand` color absent from the static fallback; compares public API diagnostics; checks CLI config-relative targets from a different cwd; removes the generated file and verifies exit 2 with preparation guidance. Temporary fixture cleaned up.
- `git diff --check`: passed. Existing README material was preserved; only the alias reference, verified Nuxt workflow, troubleshooting link, and table formatting were added.

## Review outcomes

- Independent Standards review: zero actionable findings; reviewer also ran all 13 alias tests successfully.
- Independent Spec review: zero findings against the approved API and ticket acceptance criteria.
- No unresolved blocking findings. Limitations: preparation remains application-owned, generated-file staleness cannot be detected, and this does not inspect runtime app config values or component slot maps. Smoke tests pin direct dependencies; transitive resolutions may change.

## Completion

- Ticket done after passing required checks and independent reviews. No commit was requested or created. No parent spec was closed.
