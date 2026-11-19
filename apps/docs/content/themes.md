---
title: Themes
description: How selfix loads the theme your app uses, and what counts as a theme color.
---

selfix checks classes against the same theme your app renders with. It needs your Tailwind CSS entry and the theme Nuxt UI generated for your app, and it finds both.

## The CSS entry

By default selfix uses the one stylesheet in your project that imports `tailwindcss`, or its parts such as `tailwindcss/theme.css`. In a Nuxt UI app that is usually `app/assets/css/main.css`:

```css
@import "tailwindcss";
@import "@nuxt/ui";
```

If the project has several such stylesheets, choose one:

```ts
// In selfix.config.ts
css: "app/assets/css/main.css",
```

A class defined only in a stylesheet that this entry doesn't import looks unknown to selfix. Import that stylesheet through the entry, so your app and the check use the same definitions.

- Relative imports resolve from the stylesheet that contains them.
- Package imports must point to a `.css` file the package exposes.
- selfix doesn't read build-tool config, so it doesn't resolve import aliases other than Nuxt UI's.

## The generated Nuxt UI theme

Nuxt UI writes part of its theme when your app is prepared: the colors from your config, and the variants of every component. selfix reads those files instead of the package defaults, so your own `theme.colors` are known.

| Project       | Generated in            | Written by                               |
| ------------- | ----------------------- | ---------------------------------------- |
| Nuxt          | `.nuxt`                 | `nuxt prepare`, `nuxt dev`, `nuxt build` |
| Vue with Vite | `node_modules/.nuxt-ui` | Starting or building with Vite           |

- If your project lists `@nuxt/ui` in `package.json`, or your stylesheet imports it, and the generated theme is missing, selfix stops with an error instead of checking against a fallback.
- A generated component theme that selfix cannot read is an error too, not an unprotected component.
- selfix cannot tell when the files are stale. Prepare again after you change colors or upgrade Nuxt UI.
- For a custom build directory, set `buildDir`. It is relative to the config file.

## Theme colors

[no-raw-colors](no-raw-colors.md) accepts the colors your theme declares:

- Nuxt UI's semantic tokens, such as `text-muted`, `bg-elevated`, and `border-default`.
- Nuxt UI's color aliases and their shades: `primary`, `secondary`, `success`, `info`, `warning`, `error`, `neutral`, and aliases you add. `bg-primary`, `text-error`, and `bg-neutral-100` pass.
- Colors you declare yourself:

  ```css
  @theme {
    --color-brand: #3456d1;
  }
  ```

Tailwind's palette is reported: `red-500`, `gray-900`, `white`, `black`. Redefining `--color-red-500` in your CSS leaves it a palette color.

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
.card {
  @apply p-4 bg-red-500;
}
```

Using `card` on a `UButton` can report a padding override and a raw color. Put `@apply` inside a supported style rule. Unknown utilities, top-level `@apply`, and a standalone `!important` argument fail loading.
