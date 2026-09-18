# 10: Inspect configured class-value and slot-map props

Status: done
Blocked by: none

## Commit follow-up (2026-09-18)

Implementation committed as `0c024c8` (`feat(vue): inspect configured class props and slot maps`); integrated README committed as `96ba599`. Publication authorized by the user after implementation.

## Goal

Allow explicitly configured component props containing classes to participate in existing rules. Cover ordinary class-value props and slot-class maps such as Nuxt UI's `ui`, without introducing a UI-kit dependency or interpreting arbitrary component data as classes.

Currently `<UButton :ui="{ base: 'p-[13px] bg-red-500' }" />` produces no class sites. Native `:class="{ active: condition }"` uses keys as classes, whereas a slot map uses values; these semantics must stay distinct.

## Acceptance criteria

- [x] Agree on a component-scoped configuration shape distinguishing class-value props from slot-map props before implementation.
- [x] Decide whether slots initially inherit the component contract; per-slot contracts are deferred unless explicitly approved.
- [x] Configured static class props and literal map values are inspected by existing applicable rules.
- [x] CamelCase/kebab-case prop names and supported literal `v-bind` objects behave consistently.
- [x] Unresolved values/spreads remain visibly dynamic or unsupported, never silently clean.
- [x] Native class-object key semantics remain unchanged; unconfigured props are not scanned heuristically.
- [x] Diagnostics identify the original prop location and relevant slot, using an agreed metadata/message shape.
- [x] Root README guidance explains configuration and the supported literal-map boundary.

## Verification

After API agreement, add collector, configuration-validation, and public-rule regressions. Include native conditional objects versus slot maps, name normalization, spreads, and throwing expressions to prove non-evaluation. Run `pnpm check` and record outcomes during implementation.

## Notes

### Completion evidence (2026-09-18)

- User explicitly authorized extending already-edited configuration/diagnostic/README files while preserving prior changes.
- Implemented validated first-match `classProps` configuration, normalized names, literal class/slot-map collection, scope preservation, and original-location diagnostics with `prop`/`slot` metadata and text context. Root README documents configuration and limits.
- Test-first evidence: `pnpm exec vitest run packages/selfix/test/class-props.test.ts` failed on unknown config, then passed validation; collector regressions failed on missing sites then passed; public-rule regression failed on absent findings then passed after wiring diagnostics.
- Standards review found one P2: compiled AST `.prop`/`.attr` names were skipped. Added a failing two-path regression, fixed matching through the original argument source, then passed 120 focused class-props/vue/rules tests.
- Initial full check encountered sandbox child-process `EPERM`. Final post-fix `pnpm check` with execution permission passed: 264 tests across 9 files, TypeScript, Oxlint, Oxfmt, package build, and playground typecheck/design lint/production build.
- Independent Standards reviewer re-reviewed the fix: zero remaining findings. Independent Spec reviewer: zero findings. Both inspected the pinned owned diff and supplied baseline snapshots; tests were run by the implementing agent.
- `git diff --check` passed. Unrelated pre-existing tracked diffs match the initial snapshot. Prior CSS alias work is retained; README additions include formatter changes. Index remains empty. No commit requested or created.
- Intended limits: no per-slot contracts, whole-map variable resolution, cross-file discovery, or automatic prop-name inference. Unresolved configured values use the existing `require-static-classes` severity. No unresolved review findings.

### Approved design and implementation baseline (2026-09-18)

User approved `classProps: [{ pattern, props: { ui: "slot-map", contentClass: "class" } }]` after the design explanation. First matching component entry wins; prop names normalize camelCase/kebab-case. Class props use existing class-expression semantics; slot maps read literal object values with the owning component's contracts. No per-slot contracts or whole-map variable resolution. Configuring props does not imply design-system recognition. Diagnostics add optional `prop`/`slot` metadata and readable text context, with original SFC locations. Existing native class semantics remain intact.

Baseline: branch `main`, HEAD `573f92dbcef89fc877415db5f73f57e861ab2b75`. Pre-existing tracked changes: ticket 09, README.md, package.json, src/{cli,config,index,tailwind}.ts, test/cli.test.ts. Pre-existing untracked work: documentation tickets, scripts/smoke-nuxt.mjs, test/css-aliases.test.ts. Snapshot saved at `/tmp/selfix-ticket10-baseline`. Owned scope: this ticket, collector/configuration/diagnostic additions, focused class-prop tests, and README additions. Preserve all prior changes; permission requested before extending overlapping edited files. No commit requested.

Draft scope approved for retention, not implementation-ready. Configuration, contract inheritance, and diagnostic metadata need decisions. Start with literal maps and existing expression support; no cross-file slot discovery, variant-factory schemas, or unconditional prop-name heuristics. Upstream reference: https://github.com/shadcn-ui/lint/blob/53de86f0e7dcc341a9cb45c383a9f2c454d1e958/packages/lint/src/sites/collect.ts#L832-L852 . Preserve attribution for adapted code. No dependency on Nuxt UI theme loading: synthetic configured components can independently verify this behavior. Completion requires review and passing checks.
