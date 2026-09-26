---
title: Releases and deployment
description: Publish selfix to npm and deploy the documentation website.
---

Only `packages/selfix` is published. A pushed `v*` tag starts two independent workflows. CI publishes the package after its checks pass, and Website deploys the site. Neither waits for the other.

## Prepare a release

Start on `main` with a clean working tree and full history, including tags:

```sh
git pull --ff-only
pnpm install --frozen-lockfile
pnpm release:prepare -r 1.0.0
pnpm format
pnpm check
```

Replace `1.0.0` with the next version. Changelogen sets the package version and writes the root `CHANGELOG.md` from Conventional Commits. Do not pass its `--release`, `--push`, or `--publish` flags.

Review the public API, the version, and the changelog. Each version needs exactly one nonempty `## vVERSION` section. Commit as `chore(release): vVERSION`.

## Publish

Push the commit and wait for green CI. Then tag that commit:

```sh
git push origin main
git tag -a v1.0.0 -m "v1.0.0"
git push origin refs/tags/v1.0.0
```

Tag CI validates the release, publishes the checked archive through npm trusted publishing with provenance, and creates a [GitHub Release](https://github.com/basteau/selfix/releases) from the changelog. It never rebuilds the package or replaces an existing GitHub release.

- Versions use `X.Y.Z`, `X.Y.Z-alpha.N`, or `X.Y.Z-beta.N`. Other suffixes, including `rc`, fail validation.
- Stable versions publish to npm's `latest` tag and become the latest GitHub release. Alpha and beta versions publish to matching tags and become GitHub prereleases.
- Never move a published tag or reuse a version. A content change needs a new release.

Verify the tag run, the GitHub release, and the registry:

```sh
npm view selfix version dist-tags --json
```

If a job fails because of external configuration, fix the configuration and rerun the failed job.

## Publishing configuration

- The npm trusted publisher must match repository `basteau/selfix`, workflow `ci.yml`, and environment `npm`. No npm tokens belong in GitHub secrets.
- Restrict the GitHub `npm` environment to release tags, with reviewers where available.
- Protect `main` against deletion and force pushes, and restrict `v*` tags to maintainers.
- Direct pushes to `main` are supported. Pull requests use squash merging with a Conventional Commit title, which CI validates.

A publish dry-run does not verify registry permissions or OIDC authentication, so only the first tag run confirms them.

## Website deployment

The Website workflow runs on pushed `v*` tags, and manual runs must also select a `v*` tag. It fails before building if the `website` environment is missing any value below. It then checks that the tagged commit belongs to `main`, installs the pinned dependencies, runs `pnpm check`, builds with `SITE_URL`, saves the build as a workflow artifact, and deploys that artifact to an exe.dev VM. The public site is [selfix.exe.xyz](https://selfix.exe.xyz).

| Name              | Kind     | Value                                                                                 |
| ----------------- | -------- | ------------------------------------------------------------------------------------- |
| `SITE_URL`        | Variable | Public HTTPS origin, used for canonical URLs, sitemaps, and post-deploy checks        |
| `EXE_HOST`        | Variable | SSH destination, `vmname.exe.xyz` or `user@vmname.exe.xyz`, even with a custom domain |
| `EXE_SSH_KEY`     | Secret   | Private deployment key                                                                |
| `EXE_KNOWN_HOSTS` | Secret   | Independently verified host-key entries for `EXE_HOST`                                |

Never disable host-key checking or trust an unauthenticated scan on each run. Allow `v*` tags in the environment instead of restricting it to `main`, because the workflow checks that the commit is on `main`.

A local `pnpm docs:build` uses `SITE_URL`, or `https://selfix.exe.xyz` when it is unset.

### Prepare the VM

Set up the VM before the first release tag. `scripts/deploy-website.sh` uploads files but does not configure the server.

1. Create a dedicated exe.dev VM and run a static web server on port 8000, such as nginx, that:
   - serves the deployment user's `~/selfix-site/current` as its document root
   - resolves `try_files $uri $uri/ =404;`
   - sends correct MIME types for JavaScript, CSS, fonts, and PNG
   - serves `/.well-known/selfix-release.txt`
   - starts on boot
2. Test the server on the VM.
3. Share the port with `ssh exe.dev share port <vm> 8000`. Once the site serves correctly, make it public with `ssh exe.dev share set-public <vm>`. See [exe.dev share](https://exe.dev/docs/cli-share).
4. Create a dedicated SSH key and register it with [exe.dev SSH key management](https://exe.dev/docs/cli-ssh-key). Scope it to this VM where possible, and check that it reaches only this VM.

To use a custom domain, point it at the VM and register it with `ssh exe.dev domain add <vm> <domain>`. exe.dev rejects an unregistered hostname, so verify the domain and its TLS before you change `SITE_URL`. See [exe.dev custom domains](https://exe.dev/docs/cnames).

### How a deployment switches

The workflow uploads the artifact over SCP, extracts it into `~/selfix-site/releases/<commit>.<suffix>`, keeps the previous symlink, and atomically switches `current`. It then checks the release marker, the landing page, `/docs/`, and `/docs/getting-started` over HTTPS.

- A failed upload leaves the live release untouched.
- A failed check after the switch fails the workflow. Investigate or roll back.
- Deploying the live commit again keeps both the live files and the rollback target.

### Roll back

On the VM, check the previous target with `readlink ~/selfix-site/previous`. If it is the release you want, switch back:

```sh
cd ~/selfix-site
ln -s "$(readlink previous)" rollback.next
mv -Tf rollback.next current
```

Check the landing page, `/docs/`, `/docs/getting-started`, and the release marker again. Keep the current and previous release directories, and remove older ones only when neither symlink points to them.

If the VM is lost, restore the server configuration, then rerun the deploy job of a Website run whose artifact GitHub still retains. Rotate compromised keys in exe.dev and GitHub before you deploy again.
