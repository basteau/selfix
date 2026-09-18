# 12: Verify supported dependency and platform combinations

Status: done
Blocked by: 01-restore-minimum-vue-compatibility.md, 10-fix-macos-package-smoke-paths.md

## Goal

Continuously verify the packed package at supported dependency boundaries and on macOS alongside existing Linux checks.

## Acceptance criteria

- [x] Exercise the declared minimum Node 22.18.0 and current supported Node 24 lanes with explicit recorded versions.
- [x] Exercise minimum Vue/Tailwind peers and the workspace-current peers in isolated packed consumers rather than accidentally resolving workspace dependencies.
- [x] Include Linux and macOS artifact smoke coverage with a bounded matrix; avoid an unnecessary full Cartesian product.
- [x] Each relevant lane runs real API/CLI/configuration and clean/violating fixtures, including source locations and exit codes.
- [x] Parameterize the existing smoke verification only as needed; Vue and Tailwind remain the only consumer peers.
- [x] Release publication still consumes the exact checked artifact, and the README accurately states tested support.

## Verification

Validate workflow structure and execute available matrix combinations locally or in CI, recording unavailable platforms explicitly. Run the package smoke and full checks. Do not claim hosted matrix success from static workflow inspection.

Run `pnpm check` before reporting implementation complete. Append commands, outcomes, review findings, and completion evidence during implementation.

## Notes

- Implementation commit: `c11e2ad6453572f2cd730109f4d62d056c123d31`. Same artifact now serves the existing Linux Node 24/workspace check and three extra lanes: Linux/macOS Node 22.18.0/minimum peers; macOS Node 24/workspace peers. Release and publish jobs require compatibility success.
- Simplified after the user's smoke-complexity question: compatibility jobs install no workspace tooling. Explicit version arguments avoid local peer resolution; locked peer versions come from check-job outputs. Red: copied standalone script failed resolving vue/package.json despite explicit versions. Green: all 8 package tests pass; no extra dependency or harness introduced.
- Packed `/tmp/selfix-readiness-12.tgz` once and verified on macOS Node 24.21.0 with Vue 3.5.42/Tailwind 4.3.3 and Vue 3.2.13/Tailwind 4.0.0; Node 22.18.0 passed with minimum peers. After simplification, copied only script plus root docs into a dependency-free temporary tree and reran Node 24/current and Node 22/minimum against the same archive successfully, including API/CLI/config/original locations/failing and corrected cases. Fixture cleanup completed.
- `pnpm check` passed (366 tests, types, lint, formatting, playground checks/build). Ruby YAML parsing and structural assertions verified lane selection, no compatibility workspace installation/repacking, peer outputs, artifact upload and release gates. `git diff --check` passed. Independent Standards and Spec reviews and re-reviews: zero findings.
- Limitation: hosted GitHub Actions and Linux lanes were not executed locally; workflow inspection is not claimed as hosted success. No push or release was performed. Optional CLI arguments are existing supported smoke parameters, now usable without workspace dependencies.

- Baseline: `238f65e` on `main`, clean tracked/index/untracked state. Dependencies 01 and 10 are done. Owned scope: CI workflow, smoke script if needed, support documentation, and this ticket. Preserve the checked tarball across matrix and publication; use existing packed-consumer verification rather than artificial unit tests for workflow text. User requested commits for completed tickets.

Current CI uses Node 24 and smoke-install.mjs selects locked workspace peer versions. Ticket 01 fixes the demonstrated minimum-Vue import failure, and ticket 10 fixes macOS path handling. Windows and scheduled latest-peer monitoring are not added implicitly by this bounded matrix ticket.

Scope and dependencies approved for implementation.

Created from the approved v1-readiness audit discussion; no separate spec was supplied. Audit baseline: selfix 1ba8a7e99339b43eb91b503face00ec0e72f63c0; upstream comparison: shadcn-ui/lint bf89dcb7f66a306c7ac4943065298902afdbd969. Follow AGENTS.md: one standalone runner/config, Vue and Tailwind as the only consumer peers, no application-expression evaluation, deterministic original-SFC diagnostics, and no new runtime packages. Preserve attribution if adapting upstream code.
