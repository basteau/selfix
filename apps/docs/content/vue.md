---
title: Vue with Vite
description: Run selfix in a Vue app that uses the Nuxt UI Vite plugin.
---

Nuxt UI works in a plain Vue app through its Vite plugin. selfix needs no config there either. The differences from Nuxt are where the theme is generated and where you theme components.

## Run the check

The `@nuxt/ui/vite` plugin writes the generated theme to `node_modules/.nuxt-ui` when Vite starts. Build or start the app once, then check:

```sh
pnpm exec vite build && pnpm exec selfix src
```

Use the same order in CI. A fresh install has no generated theme until Vite has run.

## What differs from Nuxt

- Findings point to `vite.config.ts` for app-wide changes. The plugin takes the same `ui` options there that Nuxt reads from `app.config.ts`:

  ```ts
  ui({ ui: { button: { slots: { base: "font-semibold" } } } })
  ```

- A custom `prefix` in the plugin options needs the same `prefix` in `selfix.config.ts`.
- Components are auto-imported by the plugin. A direct import from `@nuxt/ui/components/…` is recognized too.
