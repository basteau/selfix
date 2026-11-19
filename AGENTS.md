# selfix

selfix is a design-system linter for Nuxt UI. Keep this pnpm workspace small: one publishable package in `packages/selfix` and two private apps: the Nuxt UI playground in `apps/playground` and the Blume documentation site in `apps/docs`.
This file is the central contributor and agent guide; do not add nested AGENTS.md files.
Keep essential project and setup information in the root README.md, and detailed user guides, references, troubleshooting, and maintainer procedures in `apps/docs/content/`. Keep agent configuration in `docs/agents/` and domain decisions in `docs/adr/`, with a single root `CONTEXT.md` when needed. Present selfix as a standalone project, with a brief acknowledgment of shadcn/lint; do not add port or migration documents.

- Target Nuxt UI 4 applications: Vue 3 single-file components and Tailwind CSS 4, in Nuxt or in Vue with the `@nuxt/ui/vite` plugin. Prefer knowledge read from the installed `@nuxt/ui` package and its generated files over hardcoded lists, and prefer a working default over a new option.
- Use one integration path: the standalone runner. It works without configuration; an optional selfix.config.ts is loaded by Node's native TypeScript support. Keep ESLint/Oxlint adapters and alternate config formats out of scope unless explicitly requested.
- Keep Vue and Tailwind as the required consumer peer dependencies, and `@nuxt/ui` as the only optional one. Do not add runtime packages or require a class helper, ESLint, or Oxlint to use selfix.
- Use Vue's parser and Tailwind's compiler. Never evaluate application expressions; parse Nuxt UI's generated theme files instead of importing them.
- Keep diagnostics deterministic, actionable, and located in the original SFC.
- Unsupported syntax, failed theme loading, or a missing generated Nuxt UI theme must not silently produce a clean result.
- Preserve upstream attribution when adapting code from shadcn-ui/lint.
- Add focused Vitest regression tests for changes in behavior.
- Run `pnpm check` before reporting completion. Oxlint and Oxfmt own repository linting and formatting.
- Keep changes reviewable; prefer plain functions and Node built-ins over new layers.

## Commit guidelines

- Use Conventional Commits: `type(scope): description`, with an optional scope and `!` for breaking changes. Use types such as `feat`, `fix`, `test`, `docs`, `refactor`, `build`, and `chore`; keep each commit focused and explain its intent.
- Explain breaking changes in a `BREAKING CHANGE:` footer. Examples: `fix(vue): preserve slot scope` and `feat(config)!: rename the root option`.
- Preserve relevant Lore trailers in the commit body: Constraint, Rejected, Confidence, Scope-risk, Directive, Tested, and Not-tested. Conventional Commit subjects and Lore trailers work together.
- Commit only when requested or explicitly authorized; pushing requires separate explicit permission.

## Agent skills

### Issue tracker

Issues and specs live in GitHub Issues for `basteau/selfix`. See [issue tracker guidance](docs/agents/issue-tracker.md).

### Domain docs

Single-context layout. See [domain guidance](docs/agents/domain.md).
