# 01: Restore minimum Vue compatibility

Status: done
Blocked by: none

## Goal

Make the published package load and lint with its declared minimum Vue version, without adding runtime dependencies or silently weakening analysis.

## Acceptance criteria

- [x] An isolated packed installation with Vue 3.2.13 and Tailwind CSS 4.0.0 imports the public API and runs the CLI successfully on valid and violating fixtures.
- [x] Read version/capability information through a source available across the declared supported Vue range; missing required compiler capabilities produce an actionable compatibility error.
- [x] Same-name binding shorthand remains supported only on Vue versions that support it; older versions continue to report missing expressions.
- [x] Current Vue behavior, original SFC locations, and Vue/Tailwind-only consumer peers remain unchanged.
- [x] Add focused regression coverage and document any relevant compatibility handling in the root README; do not raise the minimum version as an incidental workaround.

## Verification

Exercise the packed public API and executable with minimum and current peers. Include static classes, script-setup constants, and version-sensitive shorthand. Record dependency versions and commands. The general CI matrix is owned by ticket 12.

Run `pnpm check` before reporting implementation complete. Append commands, outcomes, review findings, and completion evidence during implementation.

## Notes

The audit reproduced an import-time TypeError at packages/selfix/src/vue.ts:105: vue/compiler-sfc in Vue 3.2.13 has no version export, so vueVersion.split fails. Inspect the compiler import and supportsSameNameBinding. If preserving the advertised minimum proves infeasible, resolve a support-policy change explicitly before proceeding.

Scope and dependencies approved for implementation.

Created from the approved v1-readiness audit discussion; no separate spec was supplied. Audit baseline: selfix 1ba8a7e99339b43eb91b503face00ec0e72f63c0; upstream comparison: shadcn-ui/lint bf89dcb7f66a306c7ac4943065298902afdbd969. Follow AGENTS.md: one standalone runner/config, Vue and Tailwind as the only consumer peers, no application-expression evaluation, deterministic original-SFC diagnostics, and no new runtime packages. Preserve attribution if adapting upstream code.

## Implementation baseline

- Starting HEAD: 571e595c2b6d58718a5f7c5fafb86deddb95cdd7 on main. Tracked and untracked worktree clean.
- Owned scope: Vue compiler compatibility, focused regression tests, packed compatibility verification, root README, and this ticket.

## Completion evidence

- Vue version now comes from `vue/package.json`, available at the declared minimum. Required `babelParse`, `compileTemplate`, and `parse` capabilities are checked with reinstall guidance; peer ranges and dependencies are unchanged.
- Extended packed smoke verification with optional explicit peer versions, public API import/lint, script-setup constants, original SFC locations, and version-sensitive shorthand. Root README documents compatibility handling and commands.
- Red: `pnpm exec vitest run packages/selfix/test/package.test.ts` failed the new missing-capability regression with the original undefined-version TypeError. The pre-fix packed minimum-peer smoke also failed before JSON diagnostics could be produced. Inspected the real Vue 3.2.13 compiler exports: required functions exist, version does not.
- Green: `pnpm build && pnpm exec vitest run packages/selfix/test/package.test.ts packages/selfix/test/vue.test.ts` passed 59 tests.
- Built archive: `pnpm --filter selfix pack --pack-destination /private/tmp`.
- `TMPDIR=/private/tmp node packages/selfix/scripts/smoke-install.mjs /private/tmp/selfix-0.1.0-alpha.1.tgz 3.2.13 4.0.0` passed isolated API/CLI checks with Vue 3.2.13 and Tailwind 4.0.0.
- `TMPDIR=/private/tmp node packages/selfix/scripts/smoke-install.mjs /private/tmp/selfix-0.1.0-alpha.1.tgz` passed the same checks with Vue 3.5.42 and Tailwind 4.3.3.
- Runtime: Node 24.21.0. Used the bundled pnpm fallback by prepending `/Users/sebas/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/fallback` to PATH because the host pnpm launcher points at a missing executable.
- `pnpm check` passed typechecking, Oxlint, Oxfmt, all 265 Vitest tests in 9 files, and playground typechecking/design lint/build. `git diff --check` passed.
- Standards: independent read-only reviewer found 0 actionable findings.
- Spec: independent read-only reviewer found 0 actionable findings; completion checks are recorded above.
- Existing macOS temporary-directory alias behavior remains owned by ticket 10; these smoke runs used canonical `/private/tmp`. The broader Node/peer CI matrix remains owned by ticket 12. No unresolved limitations within this ticket.
- Implementation commit: `ea314d12c9905bda461e8ebf039cce885741225c`. User requested commit and push after implementation review. Completion evidence is recorded in a separate ticket commit.
