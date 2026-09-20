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

The custom landing page is `apps/docs/pages/index.astro`; it uses Blume’s `PageLayout` for the header, fonts, theme, and metadata. The setup component, page styles, and copy interaction live beside it in `components`, `styles`, and `scripts`. Blume owns the framework and static build. `basePath: "/docs"` mounts documentation without moving the landing page or public assets.

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

To publish the site, run `pnpm docs:build` and host `apps/docs/dist`. Set `SITE_URL` to the production URL for canonical URLs and sitemaps. For a subdirectory deployment, also set `deployment.base` in the Blume config. Search and Markdown/LLM exports are included in the build.

## Website operations on exe.dev

The Website workflow runs on pushed `v*` tags, matching the package publishing trigger. Manual runs must also select a `v*` tag. Before building, it fails if the `website` environment is missing `EXE_SSH_KEY`, `EXE_HOST`, `EXE_KNOWN_HOSTS`, or `SITE_URL`, and verifies that the tagged commit belongs to `main`’s history. It then installs the pinned workspace dependencies, runs `pnpm check`, builds with the configured `SITE_URL`, saves the checked static artifact, and deploys it. No deployment toggle is required. Website deployment and npm publishing run independently; neither waits for the other to succeed.

### Prepare the serving environment

Use a dedicated exe.dev VM. The provider supports [SSH file transfer](https://exe.dev/docs/faq/copy-files), a [configurable HTTP proxy with public access](https://exe.dev/docs/proxy), and [custom domains with automatic TLS](https://exe.dev/docs/cnames). These capabilities were checked against provider documentation during implementation; no VM or DNS changes were made.

Run a persistent static web server on the VM with its document root set to the deployment user's `~/selfix-site/current`. For example, configure an existing nginx service to listen on port 8000, use that absolute document root, and resolve `try_files $uri $uri/ =404;`. Preserve correct JavaScript, CSS, font and PNG MIME types. Ensure `/.well-known/selfix-release.txt` is served. Enable the service on boot and test it locally before enabling deployment. This service setup is a maintainer prerequisite, not something the upload script installs.

Select port 8000 with `ssh exe.dev share port <vm> 8000`. Make the site public with `ssh exe.dev share set-public <vm>` once it is ready. Both commands and their visibility behavior are documented under [share](https://exe.dev/docs/cli-share).

Point `selfix.dev` at the chosen `vmname.exe.xyz` using the apex DNS method supported by your DNS provider, then register it with `ssh exe.dev domain add <vm> selfix.dev`. Follow the provider's custom-domain instructions for apex records and certificate validation. When using a custom domain, set `SITE_URL` to its HTTPS origin. You can use `https://selfix.exe.xyz` without custom-domain setup. Verify HTTPS and the hostname before enabling automation; an unregistered hostname is rejected by exe.dev.

### Deployment credentials and activation

Create a dedicated SSH key and register its public half using exe.dev's [SSH key management](https://exe.dev/docs/cli-ssh-key). Use a VM-scoped tag where configured, and verify that the key can reach only the intended deployment VM. Store these values in the GitHub `website` environment:

- Variable `SITE_URL`: the public HTTPS origin, currently `https://selfix.exe.xyz`. Both the build (canonical URLs and sitemaps) and post-deployment checks use this value. It is separate from the SSH destination.
- Variable `EXE_HOST`: the tested SSH destination, such as `vmname.exe.xyz` or `exedev@vmname.exe.xyz`.
- Secret `EXE_SSH_KEY`: the private deployment key, never committed.
- Secret `EXE_KNOWN_HOSTS`: independently verified host-key entries for that destination. Do not disable host-key checking or trust an unauthenticated scan on every run.

Configure the `website` environment to allow `v*` tags instead of restricting it to the `main` branch; the workflow checks commit ancestry itself. Complete the private serving check and domain setup before pushing a release tag. The obsolete `EXE_DEPLOY_ENABLED` repository variable can be removed. The workflow uploads the exact build artifact over SCP, extracts it into `~/selfix-site/releases/<commit>.<suffix>`, preserves the previous symlink, and atomically switches `current` on the Linux VM. Repeating the active commit preserves both the live files and the previous rollback target. It verifies the deployed commit marker, landing page, docs index, and getting-started route over HTTPS.

A failed upload leaves the active release untouched. A failed post-switch HTTP check fails the workflow and requires investigation or rollback. No live authentication, domain, or deployment smoke test has been performed without the target account configuration.

### Recovery and rollback

On the VM, inspect the previous target with `readlink ~/selfix-site/previous`. If it is the desired release, switch back atomically:

```sh
cd ~/selfix-site
ln -s "$(readlink previous)" rollback.next
mv -Tf rollback.next current
```

Verify the HTTPS landing page, `/docs/`, `/docs/getting-started`, and release marker again. Keep at least the current and previous release directories. Remove older releases only after confirming neither symlink refers to them. If the VM is lost, restore the static server configuration and redeploy a retained workflow artifact. Rotate compromised keys through exe.dev and GitHub before rerunning deployment.

### Landing-page verification

The landing page shares Blume’s typography and neutral theme, with restrained Vue green accents. Content and navigation remain available without JavaScript. The only custom browser behavior copies commands and configuration; it initializes after Astro navigation as well as a direct visit.

The code example demonstrates documented selfix behavior. `landing-example.test.ts` checks its diagnostic location and correction against the linter. Deployment tests cover rejected inputs, repeat deployments, and incomplete releases without contacting a VM.

For visual review, check desktop, 390px and 320px widths, light and dark themes, and 200% zoom. Verify keyboard focus, copy success and failure, and navigation from the landing page to docs and back. Check that code blocks scroll within their panels without causing page overflow.

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
