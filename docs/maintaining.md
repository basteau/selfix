# Development

[Documentation index](README.md)

The workspace contains `packages/selfix` (publishable) and `apps/playground` (private Vue + Vite app).

```sh
pnpm install --frozen-lockfile
pnpm dev          # Build selfix and start the playground
pnpm check        # Typecheck, lint, format check, test, and build
pnpm format       # Apply formatting
```

Try `class="p-8"` on a Button in `apps/playground/src/App.vue`, then run `pnpm --filter playground lint:design`. Remove it to restore a passing check; use the Button's `variant` prop to change appearance. `pnpm check` includes playground integration tests; run them alone after building with `pnpm --filter playground test`.

To verify a release artifact locally (requires registry access):

```sh
pnpm --filter selfix pack --out /tmp/selfix.tgz
pnpm smoke:package /tmp/selfix.tgz
```

Pass explicit peer versions to verify the minimum supported pair: `pnpm smoke:package /absolute/path/selfix.tgz 3.2.13 4.0.0`.

The smoke check installs that archive with the workspace-tested Vue and Tailwind versions by default, loads native TypeScript configuration, and checks both failing and valid Vue fixtures through the CLI and public API, including script-setup constants and version-sensitive shorthand. It prints the versions and commands and removes its temporary consumer on success or failure. CI publishes the same verified archive without rebuilding it. The main Linux check uses Node 24 and the locked workspace peers. Three additional packed-consumer lanes test Linux and macOS with Node 22.18.0 / Vue 3.2.13 / Tailwind 4.0.0, and macOS with Node 24 / locked workspace peers. Each smoke run prints the exact Node and peer versions and checks the API, CLI, native TypeScript config, original source locations, error exit, and corrected clean fixture.

The check job uploads its tarball on branches and pull requests as well as release tags. Compatibility jobs download that artifact and do not repack it. Both npm publication and GitHub release creation require the compatibility jobs to pass. Compatibility jobs install no workspace tooling: the check job records its exact peer versions, and the standalone smoke script installs only the tarball and selected peers in a temporary consumer under the target Node version. Windows and every cross-product of supported versions are outside this bounded matrix.

See [AGENTS.md](https://github.com/basteau/selfix/blob/main/AGENTS.md) for contribution conventions. [Bug reports](https://github.com/basteau/selfix/issues) should include a minimal Vue/CSS example, config, command, diagnostic, and dependency versions.

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

Tag CI validates the version and changelog, runs checks and packed-consumer compatibility tests, then publishes the exact checked archive through npm trusted publishing with provenance. The publish job does not rebuild the package or run package scripts. After npm publication succeeds, CI creates a [GitHub Release](https://github.com/basteau/selfix/releases) from the changelog. Existing GitHub releases are left unchanged on reruns.

Stable versions publish to npm's `latest` tag and become the latest GitHub release. Verify the completed tag run, GitHub release, and registry metadata:

```sh
npm view selfix version dist-tags --json
```

For external configuration failures, fix the configuration and rerun the failed job. Never move a published tag or reuse a published version; content changes require a new release.

### Publishing configuration

The npm trusted publisher must match GitHub repository **`basteau/selfix`**, workflow **`ci.yml`**, and environment **`npm`**. Keep the GitHub `npm` environment restricted to release tags, with reviewers where available. No npm tokens belong in GitHub secrets. A publish dry-run does not verify registry permissions or OIDC authentication.

Protect `main` against deletion and force pushes, and restrict `v*` tags to maintainers. Direct pushes are supported; run `pnpm check` before pushing and wait for green CI before tagging. Optional PRs use squash merging with a Conventional Commit title, which CI validates.

See also: [contributor guide](../AGENTS.md), [CLI reference](cli.md), and [theme integration checks](themes.md).
