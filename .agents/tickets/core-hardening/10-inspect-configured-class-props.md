# 10: Inspect configured class-value and slot-map props

Status: draft
Blocked by: none

## Goal

Allow explicitly configured component props containing classes to participate in existing rules. Cover ordinary class-value props and slot-class maps such as Nuxt UI's `ui`, without introducing a UI-kit dependency or interpreting arbitrary component data as classes.

Currently `<UButton :ui="{ base: 'p-[13px] bg-red-500' }" />` produces no class sites. Native `:class="{ active: condition }"` uses keys as classes, whereas a slot map uses values; these semantics must stay distinct.

## Acceptance criteria

- [ ] Agree on a component-scoped configuration shape distinguishing class-value props from slot-map props before implementation.
- [ ] Decide whether slots initially inherit the component contract; per-slot contracts are deferred unless explicitly approved.
- [ ] Configured static class props and literal map values are inspected by existing applicable rules.
- [ ] CamelCase/kebab-case prop names and supported literal `v-bind` objects behave consistently.
- [ ] Unresolved values/spreads remain visibly dynamic or unsupported, never silently clean.
- [ ] Native class-object key semantics remain unchanged; unconfigured props are not scanned heuristically.
- [ ] Diagnostics identify the original prop location and relevant slot, using an agreed metadata/message shape.
- [ ] Root README guidance explains configuration and the supported literal-map boundary.

## Verification

After API agreement, add collector, configuration-validation, and public-rule regressions. Include native conditional objects versus slot maps, name normalization, spreads, and throwing expressions to prove non-evaluation. Run `pnpm check` and record outcomes during implementation.

## Notes

Draft scope approved for retention, not implementation-ready. Configuration, contract inheritance, and diagnostic metadata need decisions. Start with literal maps and existing expression support; no cross-file slot discovery, variant-factory schemas, or unconditional prop-name heuristics. Upstream reference: https://github.com/shadcn-ui/lint/blob/53de86f0e7dcc341a9cb45c383a9f2c454d1e958/packages/lint/src/sites/collect.ts#L832-L852 . Preserve attribution for adapted code. No dependency on Nuxt UI theme loading: synthetic configured components can independently verify this behavior. Completion requires review and passing checks.
