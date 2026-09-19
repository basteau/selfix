# selfix

Keep this pnpm workspace small: one publishable package in `packages/selfix` and two private apps: the Vue playground in `apps/playground` and the Blume documentation site in `apps/docs`.
This file is the central contributor and agent guide; do not add nested AGENTS.md files.
Keep essential project and setup information in the root README.md, and detailed guides, references, troubleshooting, and maintainer procedures in `apps/docs/content/`. Present selfix as a standalone project, with a brief acknowledgment of shadcn/lint; do not add port or migration documents.

- Target Vue 3 single-file components and Tailwind CSS 4.
- Use one integration path: the standalone runner with selfix.config.ts, loaded by Node's native TypeScript support. Keep ESLint/Oxlint adapters and alternate config formats out of scope unless explicitly requested.
- Keep Vue and Tailwind as the only consumer peer dependencies. Do not add runtime packages or require a UI kit, class helper, ESLint, or Oxlint to use selfix.
- Use Vue's parser and Tailwind's compiler. Never evaluate application expressions.
- Keep diagnostics deterministic, actionable, and located in the original SFC.
- Unsupported syntax or failed theme loading must not silently produce a clean result.
- Preserve upstream attribution when adapting code from shadcn-ui/lint.
- Add focused Vitest regression tests for changes in behavior.
- Run `pnpm check` before reporting completion. Oxlint and Oxfmt own repository linting and formatting.
- Keep changes reviewable; prefer plain functions and Node built-ins over new layers.
- Use Conventional Commits: `type(scope): description`, with an optional scope and `!` for breaking changes. Use types such as `feat`, `fix`, `test`, `docs`, `refactor`, `build`, and `chore`; keep each commit focused and explain its intent.
- Preserve relevant Lore trailers in the commit body: Constraint, Rejected, Confidence, Scope-risk, Directive, Tested, and Not-tested. Conventional Commit subjects and Lore trailers work together.
