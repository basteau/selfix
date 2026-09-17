# 09: Load the application's Nuxt UI theme

Status: draft
Blocked by: 08-resolve-css-package-exports.md

## Goal

Provide a tested standalone integration that inspects the application's actual generated Nuxt UI theme rather than accidentally substituting the package's bundled static theme. Keep any mechanism inside `selfix.config.ts` and the existing runner.

Nuxt UI's `#build/ui.css` can resolve through package imports to a bundled static stylesheet. Successful import resolution alone therefore does not establish that application customizations were loaded.

## Acceptance criteria

- [ ] Agree on the resolution mechanism and public configuration before implementation; an explicit CSS-import alias map is a candidate, not an approved API.
- [ ] Agree on how the application generates the required theme file and how that preparation fits local and CI commands.
- [ ] An integration fixture distinguishes generated application tokens from the package fallback and proves the intended file is used.
- [ ] Missing generated targets fail clearly with actionable preparation guidance, without silently falling back to a different theme.
- [ ] Paths have documented bases and work independently of incidental working-directory differences.
- [ ] A root README example covers preparation, configuration, execution, and remaining limitations.
- [ ] No Nuxt/Vite runtime dependency, automatic framework-config execution, or extra publishable package is added.

## Verification

Testing approach remains unresolved: settle a reproducible Nuxt UI version and preparation workflow, then choose a representative isolated package fixture plus a real integration smoke check. Run `pnpm check` during implementation and record additional integration commands and versions here.

## Notes

Draft scope approved for retention, not implementation-ready. Resolve the mechanism, generated-file lifecycle, and test strategy before changing status to ready. Ticket 08 is a genuine prerequisite for standard package CSS imports. The earlier discussion's claim that `#build/ui.css` simply cannot resolve was incomplete; the important distinction is bundled static versus application-generated theme. Do not claim full Nuxt UI compatibility until tested. Completion requires review and passing checks.
