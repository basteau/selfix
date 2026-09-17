# 14: Smoke-test the packed package

Status: ready
Blocked by: none

## Goal

Verify the publishable tarball in an isolated consumer, rather than relying only on workspace imports and executable symlinks. Exercise the exact artifact intended for release with Vue and Tailwind as its only consumer peer dependencies.

Current package tests execute workspace files. Packing and `npm publish --dry-run` do not prove that the installed archive can load configuration and produce a real diagnostic.

## Acceptance criteria

- [ ] Create or consume the release tarball and install it into a temporary consumer outside the workspace's resolution context.
- [ ] Verify the archive contains the executable, compiled public exports, and prepared root documentation required for publication.
- [ ] Load `selfix.config.ts` importing `defineConfig` from the installed package using supported native Node TypeScript loading.
- [ ] Execute the installed CLI on a real Vue fixture and assert a known diagnostic, original source location, and expected failure exit code.
- [ ] A valid fixture also completes successfully; `--help` alone is insufficient coverage.
- [ ] The isolated consumer needs no UI kit, class helper, ESLint, Oxlint, or undeclared runtime dependency.
- [ ] Release verification runs before publication and tests the artifact that will be published, avoiding an unrelated rebuild afterward.
- [ ] Temporary resources are cleaned up and installation failures remain distinguishable from lint failures.

## Verification

Add a bounded package smoke check and integrate it with the appropriate package/release verification path. Record Node, Vue, and Tailwind versions and the exact pack/install/run commands. Run the smoke check and `pnpm check`; append outcomes during implementation.

## Notes

Approved from the core-hardening discussion. Relevant paths: `packages/selfix/test/package.test.ts`, `packages/selfix/scripts/package.mjs`, and `.github/workflows/ci.yml`. Upstream reference: https://github.com/shadcn-ui/lint/blob/53de86f0e7dcc341a9cb45c383a9f2c454d1e958/packages/lint/scripts/smoke-install.mjs . Borrow the artifact-testing approach, not adapter dependencies or extensive release scaffolding; preserve attribution for adapted implementation. Network-dependent installation should be explicit rather than silently falling back to workspace dependencies. Completion requires review and passing checks.
