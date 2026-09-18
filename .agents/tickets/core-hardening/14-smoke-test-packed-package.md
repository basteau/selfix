# 14: Smoke-test the packed package

Status: done
Blocked by: none

## Goal

Verify the publishable tarball in an isolated consumer, rather than relying only on workspace imports and executable symlinks. Exercise the exact artifact intended for release with Vue and Tailwind as its only consumer peer dependencies.

Current package tests execute workspace files. Packing and `npm publish --dry-run` do not prove that the installed archive can load configuration and produce a real diagnostic.

## Acceptance criteria

- [x] Create or consume the release tarball and install it into a temporary consumer outside the workspace's resolution context.
- [x] Verify the archive contains the executable, compiled public exports, and prepared root documentation required for publication.
- [x] Load `selfix.config.ts` importing `defineConfig` from the installed package using supported native Node TypeScript loading.
- [x] Execute the installed CLI on a real Vue fixture and assert a known diagnostic, original source location, and expected failure exit code.
- [x] A valid fixture also completes successfully; `--help` alone is insufficient coverage.
- [x] The isolated consumer needs no UI kit, class helper, ESLint, Oxlint, or undeclared runtime dependency.
- [x] Release verification runs before publication and tests the artifact that will be published, avoiding an unrelated rebuild afterward.
- [x] Temporary resources are cleaned up and installation failures remain distinguishable from lint failures.

## Verification

Add a bounded package smoke check and integrate it with the appropriate package/release verification path. Record Node, Vue, and Tailwind versions and the exact pack/install/run commands. Run the smoke check and `pnpm check`; append outcomes during implementation.

## Notes

Approved from the core-hardening discussion. Relevant paths: `packages/selfix/test/package.test.ts`, `packages/selfix/scripts/package.mjs`, and `.github/workflows/ci.yml`. Upstream reference: https://github.com/shadcn-ui/lint/blob/53de86f0e7dcc341a9cb45c383a9f2c454d1e958/packages/lint/scripts/smoke-install.mjs . Borrow the artifact-testing approach, not adapter dependencies or extensive release scaffolding; preserve attribution for adapted implementation. Network-dependent installation should be explicit rather than silently falling back to workspace dependencies. Completion requires review and passing checks.

## Implementation progress

- Baseline: `9740ad24150fc20b1818e5fe2e0ebc96bb7f82b6` on `main`; no tracked edits, only unrelated untracked `.agents/tickets/documentation/`.
- Owned scope: package smoke script, root package command, CI artifact verification, root README release instructions, and this ticket. No linked spec or dependencies.
- Testing boundary: real packed archive installed by npm in an OS temporary consumer; explicit network-dependent smoke command, separate from ordinary unit tests. This adds release verification without changing linter behavior; use executable artifact assertions rather than an artificial failing linter regression.

## Verification and review outcomes

- Added `pnpm smoke:package <archive>` using Node built-ins and a real npm install in an OS temporary consumer. No linter/runtime behavior changed, so no artificial red linter test was added. The smoke script itself is the new executable artifact test.
- Pack: `pnpm --filter selfix pack --out /tmp/selfix-smoke-ticket14.tgz` passed, including build and root documentation preparation.
- Smoke: `pnpm smoke:package /tmp/selfix-smoke-ticket14.tgz` passed with Node `v24.21.0`, npm `11.19.0`, Vue `3.5.42`, and Tailwind `4.3.3`.
- Exact consumer commands (temporary prefix varies): `npm install --ignore-scripts --no-audit --no-fund /tmp/selfix-smoke-ticket14.tgz`; `/tmp/selfix-smoke-7CfsaL/node_modules/.bin/selfix Page.vue --format json` executed twice, expecting exits 1 and 0. Typed configuration loaded; error at line 2, column 8, offset 18 points to the original class attribute. Initial assertion used the class value position; corrected against the existing collector contract and source fixture.
- Failure probe: a temporary `invalid.tgz` containing non-archive text caused an explicitly identified npm installation failure; its temporary consumer was removed. Successful consumer cleanup also verified.
- Initial sandbox smoke/full-check runs encountered subprocess `EPERM`; execution-permitted runs passed. `pnpm check`: 224 tests, typecheck, Oxlint, Oxfmt, package build, and playground typecheck/design lint/build.
- Independent Standards review: zero findings. Independent Spec review: zero findings. Both reviewed the actual owned working-tree changes against the recorded baseline; execution evidence supplied by implementer.
- CI now smoke-tests each packed branch/PR/tag artifact and passes that same archive to dry-run/upload/publication. No rebuild occurs after smoke verification.
- Limitations: registry access is intentionally required for smoke verification. This run tested Node 24, not the minimum Node 22.18; hosted CI/publication were not executed locally. The upstream reference could not be fetched; implementation is original Node built-in code with attribution for the artifact-testing approach.

## Completion

Implementation committed as `612e559` (`test(package): verify packed artifact in isolated consumer`). All acceptance criteria, independent reviews, and required checks passed. Final implementation and staged diffs reviewed; unrelated documentation tickets preserved.
