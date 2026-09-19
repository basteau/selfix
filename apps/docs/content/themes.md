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

### Package stylesheets

Package imports use Node's `node_modules` lookup, starting beside the importing stylesheet and then from selfix's installation. Scoped packages and exact subpaths are supported.

| Package metadata             | CSS file selected                                            |
| ---------------------------- | ------------------------------------------------------------ |
| `exports` with a string      | That target.                                                 |
| Conditional `exports`        | `style`, then `default`, including nested conditions.        |
| No `exports`, subpath import | The named file inside the package.                           |
| No `exports`, root import    | `style` if present, otherwise `main`, otherwise `index.css`. |

Export targets must start with `./` and stay inside the package. Export arrays, wildcard mappings, and JavaScript targets are unsupported. A missing selected file fails loading.

### CSS aliases

If your build tool resolves a special import name, tell selfix where that CSS lives. Add an exact mapping to your config:

```ts
cssAliases: {
  "@company/theme": "src/theme.css",
},
```

Targets resolve from the config directory in the CLI, or from `root` in the API. Imports inside the target file resolve from that file. Missing targets fail loading.

Aliases support exact names, not prefixes, wildcards, URLs, or chains. selfix doesn't load Vite or Nuxt config to discover them.

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

Verified with Nuxt 4.5.2, Nuxt UI 4.11.1, Tailwind CSS 4.3.3, and Vue 3.5.42. See [integration verification](maintaining.md#integration-verification) for the check.

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

`@apply` contributes effects too:

```css
@import "tailwindcss";

.card {
  @apply p-4 bg-red-500;
}
```

Using `card` on a protected Button can report both a padding override and a raw color. Moving utilities into custom CSS doesn't change their policy.

### Supported `@apply` forms

Use whitespace-separated utilities inside supported style rules, including nested and conditional rules. Unknown utilities fail loading. Top-level `@apply`, use inside standalone definition blocks such as `@property`, and the legacy standalone `!important` argument are unsupported.

### Theme functions and transparency

`--theme(--color-name)` preserves the color token's identity. Unknown color names and extra arguments fail loading.

In a functional utility, put authored `transparent` values in a separate unconditional declaration from `--value()` or `--modifier()`. This lets selfix distinguish them from Tailwind's generated opacity handling.
