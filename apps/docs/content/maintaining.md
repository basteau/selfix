---
title: Development
description: Develop and test selfix, and edit the documentation website.
---

From the repository root:

```sh
pnpm install --frozen-lockfile
pnpm dev          # Build selfix and start the playground
pnpm check        # Typecheck, lint, format check, test, and build
pnpm format       # Apply formatting
```

The workspace has three parts. `packages/selfix` is published, `apps/playground` is the Vue demo, and `apps/docs` is the documentation website. Follow [AGENTS.md](https://github.com/basteau/selfix/blob/main/AGENTS.md) for contribution conventions, and run `pnpm check` before you submit a change.

To see a finding, add `class="p-8"` to a Button in `apps/playground/src/App.vue` and run `pnpm --filter playground lint:design`. Remove the class to restore the passing check.

## Compatibility checks

CI runs these environments:

| Job             | OS    | Node    | Vue / Tailwind            |
| --------------- | ----- | ------- | ------------------------- |
| Workspace check | Linux | 24      | Locked workspace versions |
| Packed consumer | Linux | 22.18.0 | 3.2.13 / 4.0.0            |
| Packed consumer | macOS | 22.18.0 | 3.2.13 / 4.0.0            |
| Packed consumer | macOS | 24      | Locked workspace versions |

CI tests the same package archive it later publishes. The matrix does not cover Windows or every supported version combination.

To check the packed package locally, with registry access:

```sh
pnpm --filter selfix pack --out /tmp/selfix.tgz
pnpm smoke:package /tmp/selfix.tgz
```

Append `3.2.13 4.0.0` to the smoke command to test the minimum peers. It installs a temporary consumer, checks the CLI and API against failing and corrected examples, prints the tested versions, and cleans up.

## Integration verification

`pnpm check` includes the playground's CLI tests, which check component contracts and file overrides against the app's real theme. After a build, run them alone with `pnpm --filter playground test`.

The Nuxt integration needs registry access and runs outside `pnpm check` and CI:

```sh
pnpm smoke:nuxt
```

The fixture pins Nuxt 4.5.2, Nuxt UI 4.11.1, Tailwind CSS 4.3.3, and Vue 3.5.42. It prepares a temporary app, then checks generated colors, component discovery, `ui` props, and failure cases.

## Documentation website

Edit pages in `apps/docs/content` and add new pages to the sidebar in `apps/docs/blume.config.ts`. From the repository root:

```sh
pnpm docs:dev      # Start the development server
pnpm docs:build    # Generate apps/docs/dist
pnpm docs:preview  # Serve the production build
pnpm docs:check    # Validate links and build the site
```

- Link pages as siblings, such as `configuration.md#component-recognition`. These links work on GitHub and become routes on the site. Root-relative `.md` links download the raw file. Use GitHub URLs for repository files outside `content`.
- Blockquotes render as callouts through `apps/docs/theme.css`.
- The landing page is `apps/docs/pages/index.astro`, with its components, styles, and script beside it. Its examples come from `apps/docs/landing-examples.ts`, and tests lint every example.
- The docs mount at `/docs` through `basePath`, so the landing page stays at the root. Builds include search and Markdown and LLM exports.
- `pnpm check` builds an isolated copy in `.blume-verify/dist`, so it can run beside the dev server. Stop the dev server before `pnpm docs:build`.

Write for the reader's next action. Show a concrete example, say what to do, and show the expected result. Keep each paragraph to one idea, put matching details in reference pages, and check examples against the implementation.

For visual changes to the landing page, check desktop, 390px and 320px widths, light and dark themes, 200% zoom, keyboard focus, copy success and failure, navigation to the docs and back, and the page with JavaScript off. Code blocks should scroll inside their panels without page overflow.

To publish a release or deploy the website, see [Releases and deployment](releasing.md).
