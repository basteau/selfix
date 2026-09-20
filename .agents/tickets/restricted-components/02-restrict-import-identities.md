# 02: Match restricted components by import identity

Status: draft
Blocked by: 01-restrict-component-names.md

## Goal

Extend component restrictions so renaming a local import does not evade a restriction on a particular imported component. For example, a restriction targeting an exported CustomButton should also catch its usage after `import { CustomButton as LegacyButton } from "some-ui"`.

Retain this as draft work until the matching API, supported import forms, and source-resolution boundary are agreed.

## Acceptance criteria

- [ ] Agree on an explicit configuration mode for matching import source and exported name, separate from local/global component-name restrictions. Decide default-import representation and exact versus pattern source matching with representative examples.
- [ ] Define whether source matching compares authored import strings or resolved module identity, and whether aliases, barrel re-exports, global/auto-imported components, and wrapper components are supported. Do not imply transitive identity tracking without evidence and tests.
- [ ] Define precedence and diagnostic deduplication when a usage matches both name and import restrictions or multiple import restrictions. Preserve optional replacement/message guidance, severity, and file overrides.
- [ ] Catch renamed runtime imports within the approved subset without mistaking type-only imports, unrelated exports, native elements, or shadowed bindings for the restricted component.
- [ ] Preserve deterministic diagnostics at the original usage, classless-component coverage, independence from styling recognition, and explicit unsupported-analysis reporting. Never evaluate application expressions.
- [ ] Include documentation and focused public-linter/CLI regressions for the agreed behavior. Split further only if the approved resolution boundary no longer fits one bounded implementation session.

## Verification

Before promotion, agree on a fixture matrix covering named/default imports, local renaming, unrelated exports from the same source, identical export names from different sources, and the selected alias/barrel/global boundaries. Use real Vue parsing and public diagnostics; add temporary filesystem fixtures only if resolved identity is in scope. Test exclusions, overrides, source locations, and overlap behavior.

Run `pnpm check` before reporting implementation complete. Record design decisions, commands, outcomes, and review findings here.

## Notes

- Created directly from the approved component-restriction discussion. Approval is for retaining this dependent draft, not implementation readiness. Matching semantics and barrel re-export scope remain unresolved.
- Ticket 01 establishes the restriction rule, replacement guidance, and configuration/reporting integration reused here.
- Existing [component discovery](../component-discovery/01-resolve-component-sources.md) may provide useful metadata but is not automatically the correct enforcement identity. Declare additional genuine prerequisites only after deciding the source-resolution boundary.
- Existing [dynamic/namespace recognition](../v1-readiness/13-recognize-static-component-expressions.md) and [broader discovery](../component-discovery/02-extend-component-discovery.md) retain their identities and scope. Do not absorb those drafts implicitly.
- Preserve the standalone runner/configuration path, Vue/Tailwind-only consumer peers, and no-expression-evaluation constraint. No external publication or implementation is authorized by creating this ticket.
