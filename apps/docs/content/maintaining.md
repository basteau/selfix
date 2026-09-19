---
title: Development
description: Develop, verify, and release selfix and maintain its documentation website.
---

Use the playground to try a change, then run the repository checks before submitting it. From the repository root:

```sh
pnpm install --frozen-lockfile
pnpm dev          # Build selfix and start the playground
pnpm check        # Typecheck, lint, format check, test, and build
pnpm format       # Apply formatting
```

The workspace has three parts: `packages/selfix` is published, `apps/playground` is the Vue demo, and `apps/docs` is the Blume documentation site.

To see a finding, add `class="p-8"` to a Button in `apps/playground/src/App.vue` and run `pnpm --filter playground lint:design`. Remove the override to restore the passing check.

Follow [AGENTS.md](https://github.com/basteau/selfix/blob/main/AGENTS.md) for contribution conventions.

## Compatibility checks

CI runs these environments:

| Job             | OS    | Node    | Vue / Tailwind            |
| --------------- | ----- | ------- | ------------------------- |
| Workspace check | Linux | 24      | Locked workspace versions |
| Packed consumer | Linux | 22.18.0 | 3.2.13 / 4.0.0            |
| Packed consumer | macOS | 22.18.0 | 3.2.13 / 4.0.0            |
| Packed consumer | macOS | 24      | Locked workspace versions |

CI tests the same package archive it later publishes. The matrix doesn't cover Windows or every supported version combination.

To check the packed package locally, with registry access:

```sh
pnpm --filter selfix pack --out /tmp/selfix.tgz
pnpm smoke:package /tmp/selfix.tgz
```

To test the minimum peers, append `3.2.13 4.0.0` to the smoke command. It installs a temporary consumer, checks the CLI and API against failing and corrected examples, prints tested versions, and cleans up.

## Integration verification

`pnpm check` includes the playground's CLI tests. They verify component contracts and file overrides against the app's real theme. After building, run them separately with `pnpm --filter playground test`.

The Nuxt integration needs registry access and runs separately:

```sh
pnpm smoke:nuxt
```

The fixture pins Nuxt 4.5.2, Nuxt UI 4.11.1, Tailwind CSS 4.3.3, and Vue 3.5.42. It prepares a temporary app, then checks generated colors, component discovery, `ui` props, and failure cases. It is outside `pnpm check` and the CI matrix.

## Documentation website

Edit pages in `apps/docs/content`. Add new pages to the sidebar in `apps/docs/blume.config.ts`.

Write for the reader's next action. Introduce the problem with a concrete example, explain what to do, and show the expected result. Keep each paragraph to one idea. Put detailed matching rules in reference sections rather than interrupting tutorials with exceptions. Preserve limits that affect the reader's decision, and verify examples against the implementation.

Run these commands from the repository root:

```sh
pnpm docs:dev      # Start the documentation development server
pnpm docs:build    # Generate apps/docs/dist
pnpm docs:preview  # Serve the production build locally
pnpm docs:check    # Validate links and build the site
```

`pnpm check` includes docs validation and an isolated build in `.blume-verify/dist`, which can run beside the dev server. Stop the dev server before `pnpm docs:build` creates the deployable `dist` directory. Generated directories are ignored.

Use sibling links such as `configuration.md#component-recognition`. They work on GitHub and become page routes on the site. Root-relative `.md` links are raw downloads. Use GitHub URLs for repository files outside the content directory.

To publish the site, run `pnpm docs:build` and host `apps/docs/dist`. Set `DOCS_SITE_URL` to the production URL for canonical URLs and sitemaps. For a subdirectory deployment, also set `deployment.base` in the Blume config. Search and Markdown/LLM exports are included in the build.

## Releases

Only `packages/selfix` is published. Changelogen prepares its version and the root `CHANGELOG.md` from Conventional Commits. Start on `main` with a clean working tree and full history, including tags:

```sh
git pull --ff-only
pnpm install --frozen-lockfile
pnpm release:prepare -r 1.0.0
pnpm format
pnpm check
```

Replace `1.0.0` with the next version. Review the public API, package version, and changelog, then commit as `chore(release): vVERSION`. Preparation only edits files; do not pass Changelogen's `--release`, `--push`, or `--publish` flags. Each version must have exactly one nonempty `## vVERSION` changelog section.

Push the commit and wait for green CI, then create and push an annotated tag for that commit:

```sh
git push origin main
git tag -a v1.0.0 -m "v1.0.0"
git push origin refs/tags/v1.0.0
```

Tag CI validates the release and publishes the checked archive through npm trusted publishing with provenance. It then creates a [GitHub Release](https://github.com/basteau/selfix/releases) from the changelog. It does not rebuild the package or replace an existing GitHub release.

Release versions must use `X.Y.Z`, `X.Y.Z-alpha.N`, or `X.Y.Z-beta.N`. Other prerelease suffixes, including `rc`, fail validation. Stable versions publish to npm's `latest` tag and become the latest GitHub release. Alpha and beta versions publish to their matching npm tags and become GitHub prereleases. Verify the completed tag run, GitHub release, and registry metadata:

```sh
npm view selfix version dist-tags --json
```

For external configuration failures, fix the configuration and rerun the failed job. Never move a published tag or reuse a published version; content changes require a new release.

### Publishing configuration

The npm trusted publisher must match GitHub repository **`basteau/selfix`**, workflow **`ci.yml`**, and environment **`npm`**. Keep the GitHub `npm` environment restricted to release tags, with reviewers where available. No npm tokens belong in GitHub secrets. A publish dry-run does not verify registry permissions or OIDC authentication.

Protect `main` against deletion and force pushes, and restrict `v*` tags to maintainers. Direct pushes are supported; run `pnpm check` before pushing and wait for green CI before tagging. Optional PRs use squash merging with a Conventional Commit title, which CI validates.
