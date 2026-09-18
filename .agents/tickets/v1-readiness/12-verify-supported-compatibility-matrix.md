# 12: Verify supported dependency and platform combinations

Status: ready
Blocked by: 01-restore-minimum-vue-compatibility.md, 10-fix-macos-package-smoke-paths.md

## Goal

Continuously verify the packed package at supported dependency boundaries and on macOS alongside existing Linux checks.

## Acceptance criteria

- [ ] Exercise the declared minimum Node 22.18.0 and current supported Node 24 lanes with explicit recorded versions.
- [ ] Exercise minimum Vue/Tailwind peers and the workspace-current peers in isolated packed consumers rather than accidentally resolving workspace dependencies.
- [ ] Include Linux and macOS artifact smoke coverage with a bounded matrix; avoid an unnecessary full Cartesian product.
- [ ] Each relevant lane runs real API/CLI/configuration and clean/violating fixtures, including source locations and exit codes.
- [ ] Parameterize the existing smoke verification only as needed; Vue and Tailwind remain the only consumer peers.
- [ ] Release publication still consumes the exact checked artifact, and the README accurately states tested support.

## Verification

Validate workflow structure and execute available matrix combinations locally or in CI, recording unavailable platforms explicitly. Run the package smoke and full checks. Do not claim hosted matrix success from static workflow inspection.

Run `pnpm check` before reporting implementation complete. Append commands, outcomes, review findings, and completion evidence during implementation.

## Notes

Current CI uses Node 24 and smoke-install.mjs selects locked workspace peer versions. Ticket 01 fixes the demonstrated minimum-Vue import failure, and ticket 10 fixes macOS path handling. Windows and scheduled latest-peer monitoring are not added implicitly by this bounded matrix ticket.

Scope and dependencies approved for implementation.

Created from the approved v1-readiness audit discussion; no separate spec was supplied. Audit baseline: selfix 1ba8a7e99339b43eb91b503face00ec0e72f63c0; upstream comparison: shadcn-ui/lint bf89dcb7f66a306c7ac4943065298902afdbd969. Follow AGENTS.md: one standalone runner/config, Vue and Tailwind as the only consumer peers, no application-expression evaluation, deterministic original-SFC diagnostics, and no new runtime packages. Preserve attribution if adapting upstream code.
