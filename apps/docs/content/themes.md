---
title: Themes
description: Let selfix check classes against the theme your app actually uses.
---

selfix needs your application's Tailwind CSS entry to know which classes exist. Point `css` at the stylesheet that imports Tailwind and defines your theme:

```ts
// In selfix.config.ts
css: "src/style.css",
```

A class defined only in an unrelated stylesheet will look unknown to selfix. Import that stylesheet through this entry so both your app and the check use the same definitions.

## CSS import resolution

Relative imports resolve from the stylesheet containing them. Tailwind imports such as `@import "tailwindcss"` work directly. File targets must end in `.css`.

### CSS aliases

If your build tool resolves a special import name, tell selfix where that CSS lives. Add an exact mapping to your config:

```ts
cssAliases: {
  "@company/theme": "src/theme.css",
},
```

Alias targets are local `.css` files, relative to the config directory (API: `root`). Imports inside them resolve from that file. Use exact names, not wildcards or alias chains. selfix does not read build-tool config; missing targets fail loading.

## Nuxt UI application themes

Nuxt UI generates part of its theme during preparation. Load that generated CSS so selfix sees your application's colors:

```ts
import { defineConfig } from "selfix"

export default defineConfig({
  css: "app/assets/css/main.css",
  cssAliases: {
    "#build/ui.css": ".nuxt/ui.css",
  },
})
```

Keep `@import "tailwindcss";` and `@import "@nuxt/ui";` in your app's CSS entry. From the app root, run:

```sh
pnpm exec nuxt prepare && pnpm exec selfix app
```

Use this order locally and in CI. Rerun preparation after theme changes. For a custom Nuxt build directory, update the alias target. selfix cannot generate or detect stale CSS for you.

This sets up the theme. To protect auto-imported components or check their `:ui` classes, also configure [component recognition](configuration.md#component-recognition) and [class props](configuration.md#configured-class-props).

See [integration verification](maintaining.md#integration-verification) for tested versions and the smoke check.

## Nested custom CSS

Nested rules count toward a class's effects:

```css
.card {
  margin: 1rem;
  &:hover {
    color: red;
  }
}
```

Here `card` affects both layout and color. Its literal `red` is checked even when the element isn't hovered. Use supported nesting that starts with `&`; see [selector support](analysis.md#custom-css-selectors).

## Applied utilities

`@apply` contributes the utilities' effects to the containing class:

```css
@import "tailwindcss";

.card {
  @apply p-4 bg-red-500;
}
```

Using `card` on a protected Button can report both a padding override and a raw color. Use `@apply` inside supported style rules; unknown utilities, top-level `@apply`, and a standalone `!important` argument fail loading.
