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

`v-bind="$attrs"` forwards the caller's attributes. selfix checks the caller's `class` and `style` where the caller writes them, so the spread itself is not reported. Only Vue's template `$attrs` counts. A loop variable, slot prop, or script binding named `$attrs` is treated like any other spread.

Other spreads can hide `class` or `style`, so [require-static-classes](require-static-classes.md) reports them:

- `v-bind="attrs"`, `v-bind="getProps()"`, and other values selfix can't read.
- Spreads, computed keys, and methods in a binding object. Readable properties in the same object are still checked.

Each spread is one finding at its `v-bind`. Set its severity per file with [overrides](configuration.md#per-file-rule-overrides), or turn the rule off.

These produce `parse-error`, even with every rule off:

- A `v-bind` with a missing or malformed expression.
- Dynamic attribute names.
- Malformed Vue, external templates, template preprocessors, and external script blocks.

Use explicit attributes or literal objects, and keep the template and script inside the SFC. selfix still checks the readable parts where it can.

## SVG paint attributes

[no-raw-colors](no-raw-colors.md#svg-paint-attributes) checks native SVG `fill` and `stroke`. selfix keeps each value whole, so `rgb(1 2 3)` is not split into classes. An unresolved paint binding produces `parse-error` while that rule is on. An opaque `v-bind` spread on a native SVG element counts as an unresolved `fill` and `stroke`. `v-bind="$attrs"` is not reported, and `fill` or `stroke` that a caller passes to a component is not checked. Other SVG presentation attributes are not checked. Class checks on SVG elements run as usual.

## Custom CSS selectors

Loaded custom classes add their CSS effects, including supported nesting and `@apply`. selfix counts every possible effect, not the browser's current state or cascade.

selfix supports direct class selectors such as `.card` and nested states such as `&:hover`.

selfix checks each selector in a list that targets classes: one with a class token such as `.card`, a parent reference `&`, a `[class…]` attribute selector, or `:scope`. These count anywhere in the selector, even inside a function. Such a selector fails theme loading if it uses a relationship such as `.card .child` or `& > span`, an escaped class name, or a selector function other than `:is()`, `:where()`, and `:not()`. So `body:has(.open)`, `.card:has(.child)`, and `[class~="card"]:has(img)` fail. The error names the selector and the reason.

A selector without any of these can't target a class, so selfix skips it. Examples are `body:has([role="dialog"])`, `#app > [data-x]`, and `:root:lang(de)`. In a list such as `.card, body:has(dialog)`, selfix checks `.card` and skips the other branch. A skipped selector must still be well formed: a name follows each `#` and `:`, functions aren't empty, and quoted strings appear only in attributes and functions.

Nested rules inside a skipped selector follow the usual nesting rules. `&.panel` adds its effects to `panel`, and `@apply` utilities are still validated. `&:has(dialog)` still fails because `&` counts as a class, so write it as one selector, such as `body:has(dialog)`.

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
