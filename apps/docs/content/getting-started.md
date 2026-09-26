---
title: Getting started
description: Add selfix to a Vue 3 and Tailwind CSS 4 app and fix your first finding.
---

This guide adds selfix to your app. You point selfix at the Tailwind CSS and components you already have, confirm which components it protects, and fix one finding. If you have no shared components yet, one optional step creates a Button to try it on.

## Install selfix

You need Node.js 22.18 or later, Vue 3 (3.2.13 or later), and Tailwind CSS 4.

```sh
pnpm add -D selfix
```

With npm, run `npm install -D selfix` and use `npx` wherever this guide says `pnpm exec`.

Node loads `selfix.config.ts` as an ES module. If `package.json` has no `"type"` or sets `"commonjs"`, add `"type": "module"` and check that your other `.js` config files still load.

## Point selfix at your theme and components

Create `selfix.config.ts` next to `package.json`:

```ts
import { defineConfig } from "selfix"

export default defineConfig({
  css: "src/style.css",
  ui: ["@/components/ui"],
})
```

- `css` is the stylesheet that imports Tailwind. To find it, run `grep -rl 'tailwindcss' --include='*.css' src`.
- `ui` is the start of the import path your pages use for shared components. For `import { Button } from "@/components/ui/button"`, use `@/components/ui`.

`ui` matches import paths only. If your components are auto-imported or registered globally, add name patterns to `components` instead. See [component recognition](configuration.md#component-recognition).

In a shadcn-vue project, you can leave out `css` and `ui`. selfix reads them from `components.json`, as described in [shadcn-vue](shadcn-vue.md). In Nuxt, run selfix on `app` instead of `src` and follow [Nuxt and Nuxt UI](nuxt.md).

## Optional: create a component to try

Skip this step if your app already has shared components.

Create `src/style.css` and import it from `src/main.ts` with `import "./style.css"`:

```css
@import "tailwindcss";
```

Create `src/components/ui/Button.vue`. The Button owns its padding:

```vue
<template>
  <button type="button" class="px-4 py-2"><slot /></button>
</template>
```

Create `src/Example.vue`, which overrides that padding:

```vue
<script setup lang="ts">
import Button from "@/components/ui/Button.vue"
</script>

<template>
  <Button class="p-4">Save</Button>
</template>
```

## Check which components selfix protects

```sh
pnpm exec selfix src --doctor
```

Doctor lists each component usage and the setting that recognizes it:

```text
Configuration: /app/selfix.config.ts
Tailwind CSS loaded: /app/src/style.css
src/Example.vue:6:3 <Button>: recognized by ui "@/components/ui"; no-restyle: error; active protection: yes; definition: unavailable
Scanned 2 Vue files; 1 component usage; 1 actively protected.
…
```

A usage that shows `unrecognized` or `active protection: no` is not protected. Add its import prefix to `ui` or its name to `components`, then run doctor again. `definition: unavailable` is fine. It only means selfix could not find the component's source file. See [doctor reports](cli.md#diagnose-component-protection).

## Fix one finding

Run selfix on a page that uses a protected component, such as `src/Example.vue`:

```sh
pnpm exec selfix src/Example.vue
```

A finding names the file, position, rule, and class:

```text
src/Example.vue:6:11 error no-restyle "p-4" is not allowed on <Button>: spacing changes are outside the component's contract. Remove this override. …
Checked 1 Vue file: 1 error, 0 warnings.
```

The default contract lets a page place a component but not change its padding, colors, or typography. Replace `p-4` with a component prop or a layout class such as `mt-4 w-full`, then run the command again. The `no-restyle` finding is gone.

If your page has no `no-restyle` finding, add `class="p-4"` to a protected component to see one, then remove it.

## Check the whole app

> **Existing app?** Every rule is an error by default, and `<style>` blocks count as inline styles. Start with warnings for one rule, as described in [Adopt in an existing project](adoption.md).

```sh
pnpm exec selfix src
```

To let a component accept more classes, [configure its contract](configuration.md#component-contracts).
