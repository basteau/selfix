# 01: Restore minimum Vue compatibility

Status: ready
Blocked by: none

## Goal

Make the published package load and lint with its declared minimum Vue version, without adding runtime dependencies or silently weakening analysis.

## Acceptance criteria

- [ ] An isolated packed installation with Vue 3.2.13 and Tailwind CSS 4.0.0 imports the public API and runs the CLI successfully on valid and violating fixtures.
- [ ] Read version/capability information through a source available across the declared supported Vue range; missing required compiler capabilities produce an actionable compatibility error.
- [ ] Same-name binding shorthand remains supported only on Vue versions that support it; older versions continue to report missing expressions.
- [ ] Current Vue behavior, original SFC locations, and Vue/Tailwind-only consumer peers remain unchanged.
- [ ] Add focused regression coverage and document any relevant compatibility handling in the root README; do not raise the minimum version as an incidental workaround.

## Verification

Exercise the packed public API and executable with minimum and current peers. Include static classes, script-setup constants, and version-sensitive shorthand. Record dependency versions and commands. The general CI matrix is owned by ticket 12.

Run `pnpm check` before reporting implementation complete. Append commands, outcomes, review findings, and completion evidence during implementation.

## Notes

The audit reproduced an import-time TypeError at packages/selfix/src/vue.ts:105: vue/compiler-sfc in Vue 3.2.13 has no version export, so vueVersion.split fails. Inspect the compiler import and supportsSameNameBinding. If preserving the advertised minimum proves infeasible, resolve a support-policy change explicitly before proceeding.

Scope and dependencies approved for implementation.

Created from the approved v1-readiness audit discussion; no separate spec was supplied. Audit baseline: selfix 1ba8a7e99339b43eb91b503face00ec0e72f63c0; upstream comparison: shadcn-ui/lint bf89dcb7f66a306c7ac4943065298902afdbd969. Follow AGENTS.md: one standalone runner/config, Vue and Tailwind as the only consumer peers, no application-expression evaluation, deterministic original-SFC diagnostics, and no new runtime packages. Preserve attribution if adapting upstream code.
