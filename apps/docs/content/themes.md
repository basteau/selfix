---
title: Themes
description: Let selfix check classes against the theme your app actually uses.
---

selfix checks classes against your app's Tailwind CSS entry. Point `css` at the stylesheet that imports Tailwind and defines your theme:

```ts
// In selfix.config.ts
css: "src/style.css",
```

A class defined only in a stylesheet that this entry doesn't import looks unknown to selfix. Import that stylesheet through the entry, so your app and the check use the same definitions.

## CSS import resolution

- Relative imports resolve from the stylesheet that contains them.
- Tailwind imports such as `@import "tailwindcss"` work directly.
- File targets must end in `.css`.

### CSS aliases

If your build tool resolves a special import name, map it to the CSS file:

```ts
cssAliases: {
  "@company/theme": "src/theme.css",
},
```

- Targets are local `.css` files, relative to the config directory (API: `root`).
- Imports inside a target resolve from that file.
- Names are exact. Wildcards and alias chains don't work.
- selfix doesn't read build-tool config. A missing target fails loading.

For Nuxt UI, map `#build/ui.css` to `.nuxt/ui.css` and run `nuxt prepare` before each check. See [Nuxt and Nuxt UI](nuxt.md).

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

Here `card` affects layout and color. selfix checks the literal `red` even though it applies only on hover. A nested selector must start with `&`. See [selector support](analysis.md#custom-css-selectors).

## Applied utilities

`@apply` adds the utilities' effects to the class that contains it:

```css
@import "tailwindcss";

.card {
  @apply p-4 bg-red-500;
}
```

Using `card` on a protected Button can report a padding override and a raw color. Put `@apply` inside a supported style rule. Unknown utilities, top-level `@apply`, and a standalone `!important` argument fail loading.
