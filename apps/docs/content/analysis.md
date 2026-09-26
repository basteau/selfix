---
title: What selfix can read
description: The Vue syntax, CSS, and SVG attributes selfix checks, and what it cannot see.
---

selfix reads your templates and CSS without running your app. For the overall flow, see [How selfix works](how-it-works.md).

## Vue class bindings

selfix reads a state-dependent class when each possible class name is written out:

```vue
<div :class="large ? 'mt-4' : 'mt-2'" />
<div :class="['mt-4', { 'w-full': wide }]" />
```

selfix reads these forms:

- Both branches of a condition, array items, and class-object keys.
- Literal `v-bind` objects.
- Top-level string constants in `<script setup>`.

It can't read constructed strings such as `` `mt-${size}` ``, imported values, or computed keys. [require-static-classes](require-static-classes.md) reports them, and readable classes in the same binding are still checked. Write complete alternatives instead of assembling names.

### Helpers and scope

- `cn`, `clsx`, and `twMerge` arguments follow the same rules as class bindings. See [class helpers](configuration.md#class-helpers) for recognized imports and how to add your own.
- Local variables, loops, and slot bindings can shadow a helper or constant.
- Namespace calls, local function aliases, and variant factories such as `cva` and `tv` are unsupported.
- selfix never runs helper code and doesn't simulate how helpers merge classes.

### Unsupported bindings

These produce `parse-error`, even with every rule off:

- `v-bind="attrs"`, because it can hide entire attributes.
- Dynamic attribute names and unresolved spreads in binding objects.
- Malformed Vue, external templates, template preprocessors, and external script blocks.

Use explicit attributes or literal objects, and keep the template and script inside the SFC. selfix still checks the readable parts where it can.

## SVG paint attributes

[no-raw-colors](no-raw-colors.md#svg-paint-attributes) checks native SVG `fill` and `stroke`. selfix keeps each value whole, so `rgb(1 2 3)` is not split into classes. An unresolved paint binding produces `parse-error` while that rule is on. Other SVG presentation attributes are not checked. Class checks on SVG elements run as usual.

## Custom CSS selectors

Loaded custom classes add their CSS effects, including supported nesting and `@apply`. selfix counts every possible effect, not the browser's current state or cascade.

selfix supports direct class selectors such as `.card` and nested states such as `&:hover`. Relationships such as `.card .child` or `& > span`, escaped class names, and unsupported selector functions fail theme loading. The error names the selector and the reason.

Rewrite an unsupported selector only if you can keep its behavior. Otherwise treat it as an analysis limit.

## Limitations and trust

A clean result covers only the selected files and enabled rules. selfix doesn't check:

- Excluded files.
- Component props you haven't configured as [class props](configuration.md#configured-class-props).
- Dynamic values when `require-static-classes` is off.
- JSX, TSX, or class calls that appear only in script.
- Styles passed through wrappers deeper than one level, or through wrappers with several roots or `inheritAttrs: false`. See [wrapper components](no-restyle.md#wrapper-components).

Static `<component :is="Imported">` bindings and single-member namespace tags such as `<UI.Button>` use the resolved component, as described in [no-restricted-components](no-restricted-components.md). Other dynamic expressions and `is="vue:…"` don't inherit an imported component's contract.

selfix never evaluates application expressions. Unsupported input and failed theme loading fail the check instead of returning a clean result. See [Troubleshooting](troubleshooting.md).

> **Configuration runs as code.** `selfix.config.ts` and Tailwind `@plugin` or `@config` modules run with Node's permissions. Use only files you trust.
