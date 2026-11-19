---
title: Getting started
description: Add selfix to a Nuxt UI app and fix your first finding.
---

This guide adds selfix to an app that uses Nuxt UI and fixes one finding. There is no config to write. selfix finds your stylesheet, the theme Nuxt UI generated for your app, and the components of the version you installed.

## Install selfix

You need Node.js 22.18 or later, Nuxt UI 4, Vue 3 (3.2.13 or later), and Tailwind CSS 4.

```sh
pnpm add -D selfix
```

With npm, run `npm install -D selfix` and use `npx` wherever this guide says `pnpm exec`.

## Prepare the app

selfix reads the theme Nuxt UI generates for your app, so the colors and sizes it knows are yours. In a Nuxt project, `nuxt prepare` writes it. Most projects run that on install. Run it yourself after you change colors in `nuxt.config.ts`:

```sh
pnpm exec nuxt prepare
```

In a Vue project with the `@nuxt/ui/vite` plugin, start or build the app once. See [Vue with Vite](vue.md).

## Fix one finding

Create `app/pages/example.vue` with a padding override:

```vue
<template>
  <UButton class="p-4">Save</UButton>
</template>
```

Run selfix on it:

```sh
pnpm exec selfix app/pages/example.vue
```

A finding names the file, position, rule, and class:

```text
app/pages/example.vue:2:12 error no-restyle "p-4" is not allowed on <UButton>: the component owns its spacing. Use size (xs, sm, md, lg, xl), or restyle it for the whole app under ui.button in app.config.ts.
Checked 1 Vue file: 1 error, 0 warnings.
```

The default contract lets a page place a component but not change its padding, colors, or typography. The sizes in the message come from your theme. Use one of them and keep the layout classes:

```vue
<UButton size="lg" class="mt-4 w-full">Save</UButton>
```

Run the command again. The finding is gone:

```text
Checked 1 Vue file: 0 errors, 0 warnings.
```

When every button should change, theme it once in `app.config.ts` instead:

```ts
export default defineAppConfig({
  ui: {
    button: { slots: { base: "font-semibold" } },
  },
})
```

## Check the whole app

> **Existing app?** Every rule is an error by default, and `<style>` blocks count as inline styles. Start with warnings for one rule, as described in [Adopt in an existing project](adoption.md).

```sh
pnpm exec selfix
```

Add it to your scripts as `"lint:design": "selfix"`. To let a component accept more classes, [configure its contract](configuration.md#component-contracts). To protect your own components too, [name them](configuration.md#protected-components).
