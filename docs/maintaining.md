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

The smoke check installs that archive with the workspace-tested Vue and Tailwind versions by default, loads native TypeScript configuration, and checks both failing and valid Vue fixtures through the CLI and public API, including script-setup constants and version-sensitive shorthand. It prints the versions and commands and removes its temporary consumer on success or failure. CI publishes the same verified archive without rebuilding it.

See [AGENTS.md](https://github.com/basteau/selfix/blob/main/AGENTS.md) for contribution conventions. [Bug reports](https://github.com/basteau/selfix/issues) should include a minimal Vue/CSS example, config, command, diagnostic, and dependency versions.

## Releases

Only `packages/selfix` is published. [Changelogen](https://github.com/unjs/changelogen) prepares the package version and root `CHANGELOG.md` from repository-wide Conventional Commits. The commands below only update files; do not pass Changelogen's `--release`, `--push`, or `--publish` flags.

Tag CI creates a [GitHub Release](https://github.com/basteau/selfix/releases) from that version's changelog section after checks and npm publication (or its bootstrap skip). Alpha and beta versions become GitHub prereleases, not Latest. Existing releases are left unchanged on reruns. Each version must have exactly one nonempty `## vVERSION` section.

### Routine releases

The historical changelog-base correction was applied in `0.1.0-alpha.1`. Future releases use the latest release tag automatically; do not repeat the old `--from` override.

With a clean working tree and full history:

```sh
git switch main
git pull --ff-only
pnpm release:prepare -r 0.1.0-alpha.2
pnpm format
pnpm check
```

Review the version and changelog, commit as `chore(release): v0.1.0-alpha.2`, push, and wait for green CI before creating and pushing an annotated `vVERSION` tag for that commit. After tag checks and environment approval, CI publishes the exact checked tarball with OIDC and provenance, without checkout, dependency installation, or package scripts in the publish job.

Release progression: `0.1.0-alpha.0` → `0.1.0-alpha.1` → `0.1.0-beta.0` → `0.1.0`. Use explicit `-r` versions; Changelogen's inferred `0.x` feature bumps are patches.

CI maps validated versions to [npm dist-tags](https://docs.npmjs.com/adding-dist-tags-to-packages/): `X.Y.Z-alpha.N` → `alpha`, `X.Y.Z-beta.N` → `beta`, and stable `X.Y.Z` → `latest`. Git tags add a `v` prefix. Other prereleases and build metadata are rejected. Users opt in with `selfix@alpha` or `selfix@beta`. Verify npm dist-tags after bootstrap with `npm view selfix dist-tags --json`; if `latest` points to the prerelease, remove it with `npm dist-tag rm selfix latest`.

For external configuration failures, fix the configuration and rerun the failed job. Never move a published tag or reuse a published version; content changes require a new release.

## Historical bootstrap

The following records the initial publication procedure. It is not part of routine releases; do not repeat publication of an existing version.

<details>
<summary>Initial setup and first release: 0.1.0-alpha.0</summary>

### One-time setup

- Keep package repository metadata and the Git remote pointing to `basteau/selfix`.
- Direct pushes to `main` are allowed; run `pnpm check` before pushing and wait for green CI before tagging. Protect `main` against deletion and force pushes, and restrict `v*` tags to admins.
- Use Conventional Commits and preserve relevant Lore trailers. Optional PRs use squash merging with the PR title as the commit subject; CI validates those titles.
- Create the `npm` GitHub environment, restrict it to release tags, and require reviewers where available. Leave repository Actions variable `NPM_PUBLISH_ENABLED` unset until bootstrap is complete.

### First release: 0.1.0-alpha.0

Start on `main` with a clean working tree and full Git history, including tags. Prepare each version once. If its version and notes are already committed, skip preparation; if only the version is set, add `--no-bump`:

```sh
pnpm install --frozen-lockfile
pnpm release:prepare -r 0.1.0-alpha.0
pnpm format
pnpm check
```

Review the package version and `CHANGELOG.md`, commit as `chore(release): v0.1.0-alpha.0`, and push `main`. After CI passes, tag that commit:

```sh
git tag -a v0.1.0-alpha.0 -m "v0.1.0-alpha.0"
git push origin refs/tags/v0.1.0-alpha.0
```

CI validates metadata and changelog, runs checks, then packs, installs, and smoke-tests the package in an isolated consumer before the publication dry-run. Every branch and PR also runs the package smoke test. Download `selfix-package` from the successful tag run and extract `selfix.tgz`. Inspect and publish that tarball once locally:

```sh
tar -tzf selfix.tgz
npm login
npm publish ./selfix.tgz --access public --tag alpha --ignore-scripts
```

Configure the package's [npm trusted publisher](https://docs.npmjs.com/trusted-publishers/): GitHub Actions, `basteau/selfix`, workflow **`ci.yml`**, environment **`npm`**. Permit direct `npm publish`, then set repository variable `NPM_PUBLISH_ENABLED=true`. Do not rerun publication of `v0.1.0-alpha.0`. Once published, users can install with `pnpm add -D selfix@alpha`.

Use a current npm CLI for bootstrap and trusted publishing. No npm tokens belong in GitHub secrets. After verifying trusted publishing, disallow token-based publishing in npm settings. A publish dry-run does not verify registry permissions or OIDC authentication.

</details>

See also: [contributor guide](../AGENTS.md), [CLI reference](cli.md), and [theme integration checks](themes.md).
