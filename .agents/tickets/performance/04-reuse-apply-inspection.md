# 04: Reuse repeated @apply inspection during theme loading

Status: draft
Blocked by: none

## Goal

Reduce repeated generation and parsing of identical applied utilities while collecting custom classes from a loaded theme. Retain this as deferred work until representative stylesheet evidence justifies prioritizing it; draft approval is not implementation approval.

`collectCustomClasses` in `packages/selfix/src/tailwind.ts` invokes generated-declaration inspection for every applied candidate, before the normal final token-result cache can help. The proposed bounded change is reuse scoped to custom-class collection, with no second long-lived token cache.

## Acceptance criteria

- [ ] Before promotion to ready, record a representative custom stylesheet or concrete consumer workload with repeated applied candidates and confirm that its startup cost warrants this optimization. Obtain approval to promote the draft; synthetic stress results alone do not settle prioritization.
- [ ] Inspect each identical applied candidate at most once within custom-class collection for one loaded theme, including across imported stylesheet chunks. Keep retained declarations limited to their necessary ownership; temporary lookup state must not persist across linter creation or become an additional lifetime-wide token cache.
- [ ] Preserve complete declaration attribution for direct/applied mixtures, multiple classes, imported stylesheets, and supported nesting. Reused declarations must not leak mutable selector ownership or provenance between classes.
- [ ] Preserve semantic versus stock/literal color classification, inline/reference themes, functional utilities, opacity/transparency behavior, generated declaration selection, and ordinary-versus-applied inspection consistency.
- [ ] Invalid utilities, unsupported selectors/contexts, missing theme inputs, and unsupported provenance syntax retain actionable failures rather than producing a clean result.
- [ ] Add focused Tailwind inspection and public-linter regressions proving equivalent categories, raw-color decisions, diagnostic content/order, and failures across repeated applies and separate themes.
- [ ] Record representative and stress before/after measurements with equivalent inspection results and public diagnostics. Avoid wall-clock assertions and report whether the representative benefit still justifies the change.
- [ ] Use the existing compiler/scanner and a plain collection-local map. Add no dependency, alternate utility grammar, new API/configuration, global cache, or general memoization abstraction.

## Verification

Before promotion, document the representative workload, agreed scope, and approval in Notes. During implementation, run focused Tailwind and rules tests, then `pnpm check` and `git diff --check`. Review color provenance, declaration ownership, cache lifetime, and failure equivalence. Record commands, outcomes, review findings, and remaining limitations.

For continuity with the audit, supplement the representative workload with 1,000 and 5,000 custom rules of the form `.cN { @apply p-4 bg-primary rounded-md; }`, using a Tailwind import and a semantic `--color-primary` theme value. Alternate baseline/modified construction runs, exclude fixture generation, discard warmups, and report medians/ranges from at least seven measurements. Compare all relevant inspection results and public findings; expand beyond the audit prototype's spot checks. Include a small theme to detect unnecessary overhead and distinct theme instances to detect contamination. Do not require a permanent benchmark framework.

## Notes

- Created directly from the performance discussion on 2026-09-20; no separate spec exists. The user approved retaining this ticket as draft. There is no ticket dependency; unresolved prioritization and representative workload evidence prevent ready status.
- Temporary audit prototype on macOS with Node 24.21.0 reduced construction from approximately 15.97 ms to 9.42 ms for 1,000 repetitive rules, and 59.27 ms to 30.71 ms for 5,000. That prototype cached generated results for the linter lifetime and checked selected outputs; the proposed final scope deliberately limits reuse to custom-class collection and requires broader equivalence coverage. Remeasure the actual implementation instead of assuming identical results.
- Temporary audit reproducer: `/tmp/selfix-ab.mjs`. The fixture description above is the durable basis if it disappears. Measurements are synthetic evidence, not performance promises or completed acceptance criteria.
- Preserve completed [applied-declaration inspection and color provenance](../v1-readiness/07-inspect-apply-declarations.md). Its notes document subtle transparency and functional-utility regressions; read them before implementation. Existing declaration scanning and theme failure behavior remain authoritative.
- Ordinary token inspection is already cached. Do not expand this ticket into global stock-color/design-system caching, parser replacement, or optimization of every rule loop.
- Ticket creation does not authorize implementation, commits, or external publication.
