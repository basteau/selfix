---
title: no-raw-colors
description: Reports palette colors, literal colors, and raw SVG paints.
---

Reports Tailwind palette colors, literal colors, and raw colors in custom CSS and SVG paint attributes.

```vue
<!-- Reported: a palette color and a literal color. -->
<div class="bg-red-500 text-[#fff]" />

<!-- Allowed: colors from your theme. -->
<div class="bg-default text-muted" />
```

## Fix a finding

The message lists theme colors that work for that utility:

```text
Replace "text-gray-500" with a theme color such as text-dimmed, text-muted, text-toned, text-default, text-highlighted, text-inverted, text-primary, text-secondary.
```

Use one of Nuxt UI's semantic colors. They follow your theme, in light and dark mode. If the design needs a color Nuxt UI doesn't have, add an alias to `theme.colors` or declare it in your Tailwind entry:

```css
@theme {
  --color-brand: #3456d1;
}
```

The class must use a named token. Redefining `red-500` still leaves `bg-red-500` a palette color.

In custom CSS, replace a literal such as `.alert { color: red; }` with a theme variable such as `var(--color-primary)`.

For a deliberate exception, allow the class: `allow: ["bg-red-500"]`.

## What passes

- Nuxt UI's semantic colors such as `text-muted`, `bg-elevated`, and `border-default`.
- Nuxt UI's color aliases and their shades, such as `bg-primary`, `text-error`, and `bg-neutral-100`. `neutral` passes because it follows the gray you chose.
- Colors you declare in `@theme`, `currentColor`, and the `bg-transparent` utility.
- In SVG `fill` and `stroke`: `currentColor`, `none`, semantic variables such as `var(--color-primary)`, and paint servers such as `url(#gradient)`.

Stock palette variables such as `var(--color-red-500)` and raw fallbacks such as `var(--color-primary, #fff)` are reported.

Authored `transparent` in arbitrary values or custom CSS is reported.

## SVG paint attributes

The rule checks native SVG `fill` and `stroke`, including literal string bindings and literal `v-bind` objects:

```vue
<!-- Reported -->
<svg><path fill="#fff" :stroke="'red'" /></svg>

<!-- Allowed -->
<svg><path fill="currentColor" stroke="var(--color-primary)" /></svg>
```

- selfix reads literal strings, template literals without substitutions, and `null`, which removes the attribute. Any other binding produces `parse-error` while this rule is on. Use `currentColor`, a semantic variable, or an exception.
- SVG exceptions use the same `allow` and `deny` lists. Match `fill`, `stroke`, or the `color` category.
- SVG findings point to the attribute and carry `prop` instead of `className`.

## Options

`allow`, `deny`, `contracts`, and `message`. See [rule settings](configuration.md#rule-settings).

## Limits

- Inline `style` properties are not color-checked. [no-inline-styles](no-inline-styles.md) reports them.
- Colors in component props such as `color="red"` and HTML inside SVG `foreignObject` are not checked.
- Paint servers are allowed without following their targets.
