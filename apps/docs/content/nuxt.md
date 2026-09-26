---
title: Nuxt and Nuxt UI
description: Configure selfix for auto-imported components and Nuxt UI's generated theme.
---

Nuxt differs from a plain Vite app in three ways that matter to selfix: sources live in `app`, components are auto-imported, and Nuxt UI generates part of its theme during `nuxt prepare`.

## Configure selfix

```ts
import { defineConfig } from "selfix"

export default defineConfig({
  css: "app/assets/css/main.css",
  // Nuxt UI writes its theme to .nuxt/ui.css during `nuxt prepare`.
  cssAliases: { "#build/ui.css": ".nuxt/ui.css" },
  // Auto-imported components have no import path, so match them by name.
  components: ["^U[A-Z]"],
  // Check the classes passed through Nuxt UI's `ui` prop.
  classProps: [{ pattern: "^U[A-Z]", props: { ui: "slot-map" } }],
  // Omitted rules default to "error". See Adoption to start with warnings.
  rules: { "no-restyle": "warn" },
})
```

- Keep `@import "tailwindcss";` and `@import "@nuxt/ui";` in `app/assets/css/main.css`.
- Add a name pattern for each group of your own auto-imported components, such as `"^Local[A-Z]"` for a `Local` prefix.
- For a custom Nuxt build directory, change the alias target.

## Run the check

From the app root, prepare Nuxt, then check `app`:

```sh
pnpm exec nuxt prepare && pnpm exec selfix app
```

Use `selfix app` in your `lint:design` script and the same order in CI. Prepare again after theme changes. selfix cannot generate the Nuxt UI theme or notice that it is stale.

## Verify

Run `pnpm exec selfix app --doctor`. `<UButton>` usages should show `recognized by components "^U[A-Z]"` and `active protection: yes`.

Discovery reads `.nuxt/components.d.ts` to add each component's source file to findings, plus its `size` and `variant` choices when they are typed as string unions. See [component source discovery](configuration.md#component-source-discovery).

The [integration check](maintaining.md#integration-verification) tests a similar setup against pinned Nuxt and Nuxt UI versions.
