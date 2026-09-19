---
title: How analysis works
description: Understand what selfix can read and what a clean check means.
---

selfix reads your code without running your app. Vue's parser finds classes in your components. Tailwind's compiler explains what those classes do. Your rules decide whether to allow them.

That distinction matters: `p-4` is a valid Tailwind class, but it can still break a Button's styling contract.

## Vue class bindings

A class can depend on state and still be readable:

```vue
<div :class="large ? 'mt-4' : 'mt-2'" />
```

selfix checks both `mt-4` and `mt-2`. It doesn't need to know the value of `large`.

These forms are supported:

| Form                                                | What gets checked                                     |
| --------------------------------------------------- | ----------------------------------------------------- |
| `class="mt-4 w-full"`                               | Both classes.                                         |
| `:class="['mt-4', { 'w-full': wide }]"`             | Array values and object keys.                         |
| `:class="wide ? 'w-full' : 'w-auto'"`               | Both branches.                                        |
| `:class="active && 'mt-4'"`                         | The right-hand value.                                 |
| `:class="choice \|\| 'mt-4'"` or `choice ?? 'mt-4'` | Both alternatives; an unreadable one remains dynamic. |
| `v-bind="{ class: 'mt-4' }"`                        | The class value.                                      |

Strings in backticks work when they contain no interpolation. TypeScript wrappers such as `as` and `satisfies` don't change the result. Booleans and `null` add no classes.

String construction, member access, computed keys, and spreads leave values unreadable. `require-static-classes` reports those values while other readable classes are still checked. Same-name `:class` shorthand is also dynamic; it requires Vue ≥3.4.

### Script constants

A string constant in `<script setup>` works:

```vue
<script setup>
const placement = "mt-4"
</script>

<template>
  <div :class="placement" />
</template>
```

Only top-level constants holding strings directly are resolved. Arrays, objects, imported values, references to other constants, `let`, and constants in normal `<script>` blocks are not.

### Helpers and scope

selfix reads arguments to `cn`, `clsx`, and `twMerge` using the same rules. Those local names are fixed; a renamed import such as `merge` isn't recognized. A local declaration, loop variable, or slot binding with the same name shadows the helper or constant in that scope.

Helpers are not executed. selfix checks their class arguments without trying to reproduce how they merge classes. `cva`, `tv`, and custom helper lists are unsupported.

### Unsupported bindings

Some syntax can hide entire attributes. For example, `v-bind="attrs"` might contain a class or style that selfix cannot see. It produces `parse-error`, even with all six rules off. Dynamic attribute names and unresolved spreads in `v-bind` objects do the same.

Invalid expressions, external templates, template preprocessors, and external `<script src>` blocks also produce `parse-error`. Put script content inside the SFC to make it available for analysis.

When possible, selfix continues checking readable parts of the file. Fatal parsing errors stop ordinary checks for that file.

## Custom CSS selectors

selfix also reads custom classes from your loaded CSS. It checks their possible effects without predicting the browser's cascade or current state. For `.card.active`, for example, both `card` and `active` receive the declarations.

### Supported selectors

| Selector                                      | Classes checked           |
| --------------------------------------------- | ------------------------- |
| `.card`, `.card-title`, `.card_title`         | The named class.          |
| `button.card.active:hover`                    | `card` and `active`.      |
| `.card, .panel`                               | Each class.               |
| `.card::before`                               | `card`.                   |
| `:is(.card, .panel)`, `:where(.card, .panel)` | The positive class names. |
| `.card:not(.ghost)`                           | `card` only.              |

Attribute text is not a class name. Class-free reset selectors don't create class associations.

### Nested selectors

Each nested branch must start with one `&`, such as `&:hover`. It inherits the outer class names. Multiple levels and `@media`, `@supports`, `@container`, and `@starting-style` blocks are supported. `@property` registrations are ignored.

See [Nested custom CSS](themes.md#nested-custom-css) for an example.

### Unsupported selectors

Theme loading fails for escaped class names, relationships involving classes such as `.card .child`, implicit nesting, and nested relationships such as `& > span`. Unsupported selector functions, nested negation, and parent references inside selector functions or other nested at-rules also fail.

The error includes the selector and reason. Change the CSS only if you can preserve its behavior; otherwise, treat it as an analysis limit to resolve.

## Limitations and trust

A clean result means the enabled rules found no violations in the selected files. Excluded files and unconfigured class props are not checked. Dynamic classes remain unchecked if you turn off `require-static-classes`.

selfix targets Vue SFC templates. It doesn't analyze JSX/TSX, arbitrary script-only class calls, or follow styling through wrappers. Configure wrapper components and [additional class props](configuration.md#configured-class-props) explicitly.

Application expressions are never evaluated. **Configuration is executable:** use trusted `selfix.config.ts` files and Tailwind `@plugin` or `@config` modules. They run with Node's permissions.

Unsupported input and failed theme loading produce failures, not clean results. See [Troubleshooting](troubleshooting.md) to investigate them.
