# 08: Resolve CSS package exports

Status: ready
Blocked by: none

## Goal

Load supported package stylesheet exports using CSS-aware resolution instead of relying exclusively on Node's JavaScript resolution conditions. Keep the standalone runner and fail explicitly when the intended stylesheet cannot be loaded.

The inspected Nuxt UI package exposes its main stylesheet through a `style` condition that the current `require.resolve` approach does not select.

## Acceptance criteria

- [ ] A fixture package exposing a root `style` export loads through its normal package-name CSS import.
- [ ] When a package has separate JavaScript and stylesheet targets, CSS loading selects the stylesheet and never reads the JavaScript target as CSS.
- [ ] Documented supported scoped/subpath exports and nested relative stylesheet imports resolve from the importing stylesheet.
- [ ] Missing targets and unsupported export forms fail with useful import and origin context rather than silently inspecting a partial theme.
- [ ] Existing Tailwind imports and module loading for trusted `@plugin`/`@config` directives remain working; CSS conditions do not alter module semantics.
- [ ] Supported resolution forms and limitations are documented in the root README where needed.
- [ ] No runtime dependency, automatic Vite/Nuxt configuration loading, or alternate config format is introduced.

## Verification

Use temporary local package fixtures in `packages/selfix/test/tailwind.test.ts`; cover both a style-only export and competing style/JavaScript targets. Add CLI theme-loading coverage if needed. Run `pnpm check`; append commands and outcomes during implementation.

## Notes

Approved from the core-hardening discussion. Start in `packages/selfix/src/tailwind.ts` at the stylesheet/module resolver boundary. Upstream reference: https://github.com/shadcn-ui/lint/blob/53de86f0e7dcc341a9cb45c383a9f2c454d1e958/packages/lint/src/tailwind/oracle.ts#L118-L196 . Adapt only bounded resolver behavior, preserve MIT attribution for adapted code, and do not copy remote-import suppression or workers. Loading the application's generated Nuxt UI theme is ticket 09, not promised by this ticket. Completion requires review and passing checks.
