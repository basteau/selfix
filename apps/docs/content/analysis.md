---
title: Analysis limits
description: Know what selfix checks and when it needs more explicit source.
---

selfix checks Vue classes against your Tailwind theme without running your app. A class can exist in Tailwind and still break a component's contract: `p-4` is valid, but changes a protected Button's padding.

## Vue class bindings

State-dependent classes work when each possible class name is written out:

```vue
<div :class="large ? 'mt-4' : 'mt-2'" />
<div :class="['mt-4', { 'w-full': wide }]" />
```

selfix checks both branches, array values, and class-object keys. It also reads literal `v-bind` objects and top-level string constants in `<script setup>`.

Constructed strings such as `` `mt-${size}` ``, imported values, and computed keys remain unreadable. `require-static-classes` reports them; readable classes in the same binding still get checked. Write complete alternatives instead of assembling names.

### Helpers and scope

`cn`, `clsx`, and `twMerge` arguments use the same class-expression rules. Aliased named/default imports from `clsx` and named `twMerge` imports from `tailwind-merge` are also recognized. Add custom imported helpers with [`classHelpers`](configuration.md#class-helpers). Local variables, loops, and slot bindings can shadow helpers or constants. Namespace calls, local function aliases, and variant factories (`cva`/`tv`) remain unsupported; helper bodies are never executed.

Helpers aren't executed, and selfix doesn't simulate how they merge classes.

### Unsupported bindings

`v-bind="attrs"` could hide entire attributes, so it produces `parse-error` even with every rule off. Dynamic attribute names and unresolved spreads in binding objects do the same. Use explicit attributes or literal objects.

Malformed Vue, external templates, template preprocessors, and external script blocks also fail. Keep the template and script inside the SFC. Where possible, readable parts are still checked.

## Custom CSS selectors

Loaded custom classes contribute their CSS effects, including supported nesting and `@apply`. The check considers possible effects, not the browser's current state or cascade.

Use direct class selectors such as `.card` and nested states such as `&:hover`. Relationships such as `.card .child` or `& > span`, escaped class names, and unsupported selector functions fail theme loading. The error names the selector and reason. Only rewrite it if you can preserve its behavior; otherwise treat it as an analysis limit.

## Limitations and trust

A clean result covers only selected files and enabled rules. Excluded files, unconfigured class props, and dynamic values with `require-static-classes` disabled remain unchecked.

selfix targets Vue SFC templates, not JSX/TSX or script-only class calls. It doesn't follow styles through wrappers. Configure wrapper recognition and [class props](configuration.md#configured-class-props) explicitly.

Static `<component :is="Imported">` bindings and single-member namespace tags such as `<UI.Button>` use the resolved component described in [no-restricted-components](rules.md#no-restricted-components). Other dynamic expressions and `is="vue:…"` do not inherit an imported component's contract.

Application expressions are never evaluated. **Configuration is executable:** use trusted `selfix.config.ts` files and Tailwind `@plugin` or `@config` modules. They run with Node's permissions.

Unsupported input and failed theme loading produce failures, not clean results. See [Troubleshooting](troubleshooting.md) for recovery.
