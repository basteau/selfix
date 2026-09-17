# 12: Suggest compiler-validated spelling corrections

Status: draft
Blocked by: none

## Goal

Make unknown-class diagnostics actionable with deterministic spelling suggestions for utilities and variants, validated against the loaded Tailwind compiler and applicable policy. Suggestions are advisory; source files remain unchanged.

Initial examples are `flex-cols` to `flex-col` and `hovr:flex` to `hover:flex`. Approximate color matching and arbitrary-value scale conversion are outside this ticket.

## Acceptance criteria

- [ ] Agree on the optional public Diagnostic suggestion structure and text/JSON presentation before implementation.
- [ ] Candidate vocabulary comes from the loaded compiler/theme rather than a duplicated stock Tailwind grammar.
- [ ] Reconstructed suggestions compile successfully as complete classes and respect applicable enabled policies/contracts.
- [ ] Prefixes, variants, important markers, and negative modifiers are preserved appropriately.
- [ ] Tie-breaking and output bounds are deterministic; ambiguous or invalid candidates can produce no suggestion.
- [ ] Existing diagnostics remain available when suggestion generation yields nothing.
- [ ] No autofix, application expression evaluation, runtime package, or cross-file analysis is introduced.
- [ ] The agreed API and examples are documented in the root README.

## Verification

After API agreement, add inspection/rule/API or CLI tests covering utility versus variant errors, custom theme vocabulary, prefixes/modifiers, ties, invalid reconstructed candidates, and forbidden replacements. Run `pnpm check`; append commands and outcomes during implementation.

## Notes

Draft scope approved for retention, not implementation-ready. Resolve diagnostic shape and policy-checking semantics before changing status to ready. Upstream reference: https://github.com/shadcn-ui/lint/blob/53de86f0e7dcc341a9cb45c383a9f2c454d1e958/packages/lint/src/tailwind/oracle.ts#L279-L340 . Preserve attribution for adapted code. Keep suggestions separate from source-edit ranges and ownership/provenance tracking. Completion requires review and passing checks.
