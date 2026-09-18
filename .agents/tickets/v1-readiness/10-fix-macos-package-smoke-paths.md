# 10: Fix macOS package smoke paths

Status: ready
Blocked by: none

## Goal

Allow normal temporary-directory aliases while still detecting workspace-linked installations in the packed-package smoke test.

## Acceptance criteria

- [ ] Canonicalize the temporary consumer path before comparing its installed package location with realpath.
- [ ] The smoke test works with the normal macOS /var/folders to /private/var/folders alias without requiring a TMPDIR workaround.
- [ ] A genuine symlink to an external/workspace package remains rejected.
- [ ] The test continues verifying the packed API, CLI, configuration loading, diagnostics, and clean fixture using the same archive.
- [ ] Temporary consumers are cleaned up after both successful and failed runs.

## Verification

Add a focused filesystem regression for an aliased parent directory versus an actual package symlink. Run the real packed-package smoke with the normal macOS temporary directory and a canonical directory where available; record platform and peer versions.

Run `pnpm check` before reporting implementation complete. Append commands, outcomes, review findings, and completion evidence during implementation.

## Notes

packages/selfix/scripts/smoke-install.mjs:48 compares realpathSync(installed) to a noncanonical installed path. The audit's normal macOS smoke failed this assertion; the same artifact passed with TMPDIR=/private/tmp. Preserve completed core-hardening/14-smoke-test-packed-package.md.

Scope and dependencies approved for implementation.

Created from the approved v1-readiness audit discussion; no separate spec was supplied. Audit baseline: selfix 1ba8a7e99339b43eb91b503face00ec0e72f63c0; upstream comparison: shadcn-ui/lint bf89dcb7f66a306c7ac4943065298902afdbd969. Follow AGENTS.md: one standalone runner/config, Vue and Tailwind as the only consumer peers, no application-expression evaluation, deterministic original-SFC diagnostics, and no new runtime packages. Preserve attribution if adapting upstream code.
