# 10: Fix macOS package smoke paths

Status: done
Blocked by: none

## Goal

Allow normal temporary-directory aliases while still detecting workspace-linked installations in the packed-package smoke test.

## Acceptance criteria

- [x] Canonicalize the temporary consumer path before comparing its installed package location with realpath.
- [x] The smoke test works with the normal macOS /var/folders to /private/var/folders alias without requiring a TMPDIR workaround.
- [x] A genuine symlink to an external/workspace package remains rejected.
- [x] The test continues verifying the packed API, CLI, configuration loading, diagnostics, and clean fixture using the same archive.
- [x] Temporary consumers are cleaned up after both successful and failed runs.

## Verification

Add a focused filesystem regression for an aliased parent directory versus an actual package symlink. Run the real packed-package smoke with the normal macOS temporary directory and a canonical directory where available; record platform and peer versions.

Run `pnpm check` before reporting implementation complete. Append commands, outcomes, review findings, and completion evidence during implementation.

## Notes

- Completed in `b413752a01e8b62c399fc46df0724c55646cca30`. Red: alias regression failed at the linked-package assertion; actual symlink rejection passed. Green: all 7 package tests and typecheck passed after canonicalizing the consumer directory. No new abstraction or dependency.
- `pnpm --filter selfix pack --out /tmp/selfix-readiness-10.tgz`, then `pnpm smoke:package /tmp/selfix-readiness-10.tgz` and `TMPDIR=/private/tmp pnpm smoke:package /tmp/selfix-readiness-10.tgz` passed using the same archive on macOS, Node 24.21.0, Vue 3.5.42, Tailwind 4.3.3. Both successful consumer directories were confirmed removed; focused tests verify failure cleanup.
- `pnpm check` passed (365 tests, typecheck, lint, format, playground checks/build); `git diff --check` passed. Independent Standards and Spec reviews: zero findings, no unresolved limitations within scope. Ticket 07 was completed by its owning task during this work; its commit and content were preserved.

- Baseline: `79a5f0e` on `main`; only pre-existing change is the actively owned ticket 07 completion record, preserved. Owned scope: smoke-install script, focused filesystem regression, and this ticket. User authorized one commit per completed ticket. Order: 10 → 12, then 08 → 11, 09, and core component discovery; drafts with unresolved design decisions remain pending.

packages/selfix/scripts/smoke-install.mjs:48 compares realpathSync(installed) to a noncanonical installed path. The audit's normal macOS smoke failed this assertion; the same artifact passed with TMPDIR=/private/tmp. Preserve completed core-hardening/14-smoke-test-packed-package.md.

Scope and dependencies approved for implementation.

Created from the approved v1-readiness audit discussion; no separate spec was supplied. Audit baseline: selfix 1ba8a7e99339b43eb91b503face00ec0e72f63c0; upstream comparison: shadcn-ui/lint bf89dcb7f66a306c7ac4943065298902afdbd969. Follow AGENTS.md: one standalone runner/config, Vue and Tailwind as the only consumer peers, no application-expression evaluation, deterministic original-SFC diagnostics, and no new runtime packages. Preserve attribution if adapting upstream code.
