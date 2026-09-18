# 03: Reject unsupported external scripts

Status: ready
Blocked by: none

## Goal

Report unsupported external SFC scripts explicitly instead of silently losing the imports and registrations needed for component recognition.

## Acceptance criteria

- [ ] A normal script block with src produces an actionable parse-error at the original external-script block, explaining that external scripts are unsupported.
- [ ] The unsupported-input diagnostic remains an error when ordinary rules are disabled.
- [ ] Independent trustworthy template sites retain findings where safe under existing recoverable-error behavior.
- [ ] Inline scripts and script setup remain unchanged; no external application module is imported, executed, or followed.
- [ ] The [analysis documentation](../../../docs/analysis.md) describes the external-script boundary and a supported alternative.

## Verification

Add collector and public-linter regressions for external scripts, all rules disabled, independent literal findings, and inline-script non-regressions. Assert source locations and that an external-script fixture cannot return a misleading empty result.

Run `pnpm check` before reporting implementation complete. Append commands, outcomes, review findings, and completion evidence during implementation.

## Notes

packages/selfix/src/vue.ts currently reads inline script content but neither loads nor rejects descriptor.script.src. The audit's external script plus Button class p-4 returned no diagnostics. Preserve the existing distinction between fatal parser failure and recoverable collection uncertainty.

Scope and dependencies approved for implementation.

Created from the approved v1-readiness audit discussion; no separate spec was supplied. Audit baseline: selfix 1ba8a7e99339b43eb91b503face00ec0e72f63c0; upstream comparison: shadcn-ui/lint bf89dcb7f66a306c7ac4943065298902afdbd969. Follow AGENTS.md: one standalone runner/config, Vue and Tailwind as the only consumer peers, no application-expression evaluation, deterministic original-SFC diagnostics, and no new runtime packages. Preserve attribution if adapting upstream code.
