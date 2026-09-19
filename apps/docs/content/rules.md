---
title: Rules
description: Choose which styling habits to catch and how to correct them.
---

selfix has six rules. All start at `"error"`; you can turn each off, make it a warning, or configure exceptions. Use the [adoption guide](adoption.md) to start with one rule.

The color examples use the theme below. `Button` is a [recognized component](configuration.md#component-recognition). Each section describes one rule; passing it does not bypass the others.

## no-restyle

Keep a component's appearance under its control. By default, callers can add layout classes such as margin and width, but cannot change padding, colors, or typography.

```vue
<!-- Rejected: changes the Button's padding. -->
<Button class="p-4">Save</Button>

<!-- Allowed: controls placement and width. -->
<Button class="mt-4 w-full">Save</Button>
```

Use the component's existing props to choose its appearance. If callers need more control, [give the component a contract](configuration.md#component-contracts) that allows it.

This is the only rule that requires a recognized component. A native `<div class="p-4">` is outside its scope.

A class that changes several things needs permission for all of them. For example, a custom class that sets margin and color needs both `layout` and `color` allowed, or an allowance for that class by name. An explicit `deny` always wins.

## no-raw-colors

Use colors named for their purpose so the theme controls their values.

```vue
<!-- Rejected: a palette color and a literal color. -->
<div class="bg-red-500 text-[#fff]" />

<!-- Allowed: colors from the theme. -->
<div class="bg-primary text-on-primary" />
```

Add purpose-based colors to your Tailwind entry:

```css
@import "tailwindcss";

@theme {
  --color-primary: #3456d1;
  --color-on-primary: #ffffff;
}
```

The class must use the named token. Redefining `red-500` still leaves it a palette color.

Custom CSS is checked too: replace `.alert { color: red; }` with a theme variable such as `var(--color-primary)`.

`currentColor` and the built-in `bg-transparent` utility pass. Authored `transparent` in arbitrary values or custom CSS is reported. This rule checks class CSS, not SVG color attributes or inline style properties.

For a deliberate exception, add a rule option such as `allow: ["bg-red-500"]`.

## no-arbitrary-values

Use the theme's spacing and sizing choices instead of introducing a value at each call site.

```vue
<!-- Rejected. -->
<div class="p-[13px]" />

<!-- Allowed. -->
<div class="p-4" />
```

Choose a named utility that fits the design. If the design needs a new value, add it to the theme or allow that class explicitly with `allow: ["p-[13px]"]`.

Arbitrary properties and bracket modifiers also fail. CSS-variable shorthand and arbitrary variants pass; the rule checks values, not variants.

## no-inline-styles

Keep styling in classes that selfix can check against your theme.

```vue
<!-- Rejected. -->
<div style="padding: 1rem" />

<!-- Allowed. -->
<div class="p-4" />
```

The rule reports style attributes, bindings, and all SFC `<style>` blocks.

For component implementations that need these styles, use a [file override](configuration.md#per-file-rule-overrides). For a component-specific exception, configure this rule with a contract:

```ts
contracts: [{ pattern: "^ProgressBar$", allow: ["style"] }],
```

This allows the whole style attribute, not selected properties. Rule-level `allow: ["style"]` also allows SFC blocks; `deny: ["style"]` wins over allowances.

A `<style>` tag inside the template is unsupported input, regardless of this rule's settings.

## no-unknown-classes

Catch class names that your loaded theme doesn't define.

```vue
<!-- Rejected: misspelled primary. -->
<div class="bg-prmary" />

<!-- Allowed. -->
<div class="bg-primary" />
```

Check the spelling first. If the class exists in another stylesheet, make sure your configured CSS entry imports it. See [Themes](themes.md).

Tailwind markers such as `group`, `peer`, `dark`, and `group/card` are accepted. Loaded custom classes are accepted too, but don't automatically gain Tailwind variants such as `hover:notice`.

If an external system supplies a class that selfix cannot load, use an explicit exception such as `allow: ["external-widget"]`. That skips this rule only.

## require-static-classes

Write complete class names so selfix can check every possible choice.

```vue
<!-- Rejected: the class is assembled at runtime. -->
<div :class="`mt-${spacing}`" />

<!-- Allowed: both choices can be checked. -->
<div :class="large ? 'mt-4' : 'mt-2'" />
```

selfix reads both alternatives without running the condition. Arrays and class objects work too; see [supported bindings](analysis.md#vue-class-bindings).

This rule accepts custom messages, but no `allow` or `deny` list: it cannot match a class name it cannot read. Turning it off leaves those dynamic values unchecked. Unsupported syntax can still produce `parse-error`.

For severity settings, exceptions, and matching order, see [Shared policy](configuration.md#shared-policy).
