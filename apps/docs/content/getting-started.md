---
title: Getting started
description: Configure selfix, reproduce your first diagnostic, and correct it.
---

A Button defines its own padding. A page adds `p-4` and changes it. In this tutorial, you'll catch that override with selfix and correct it.

Use an existing Vue project with Tailwind CSS. Run the commands from its root, and keep any existing files when adding the examples.

## Install selfix

You need **Node.js ≥22.18.0**, **Vue ≥3.2.13 <4**, and **Tailwind CSS ≥4 <5**. Install any missing peers, then add selfix:

```sh
pnpm add -D selfix
```

Use `"type": "module"` in your project's `package.json` so Node can load the configuration below.

## Define the theme and component

Create `src/style.css` with four named colors:

```css
@import "tailwindcss";

@theme {
  --color-primary: #3456d1;
  --color-on-primary: #ffffff;
  --color-canvas: #f6f7f9;
  --color-ink: #172033;
}
```

Use this stylesheet in your app too, for example with `import "./style.css"` in `src/main.ts`.

Create `src/components/ui/Button.vue`. Its `variant` prop selects one of two color combinations:

```vue
<script setup lang="ts">
withDefaults(defineProps<{ variant?: "primary" | "secondary" }>(), { variant: "primary" })
</script>

<template>
  <button
    type="button"
    class="rounded-lg px-4 py-2 text-sm font-medium"
    :class="variant === 'primary' ? 'bg-primary text-on-primary' : 'bg-canvas text-ink'"
  >
    <slot />
  </button>
</template>
```

The Button owns its padding and colors. Callers choose a `variant` and use layout classes for placement.

## Configure and run the check

Create `selfix.config.ts` in the project root:

```ts
import { defineConfig } from "selfix"

export default defineConfig({
  css: "src/style.css",
  ui: ["./components/ui"],
})
```

`css` tells selfix where to read your theme. `ui` tells it which component imports to protect. Here, it matches the Button import in the next step.

## Reproduce a finding

Create `src/Example.vue` with a padding override:

```vue
<script setup lang="ts">
import Button from "./components/ui/Button.vue"
</script>

<template>
  <Button variant="secondary" class="p-4">Save</Button>
</template>
```

Run the check on this file:

```sh
pnpm exec selfix src/Example.vue
```

The check fails with `no-restyle` at line 6, column 31. The message starts with this excerpt:

```text
src/Example.vue:6:31 error no-restyle "p-4" is not allowed on <Button>
```

`p-4` changes the Button's padding. The default contract lets the page control layout, but keeps padding inside the component.

## Correct the override

Replace the Button line with:

```vue
<Button variant="secondary" class="mt-4 w-full">Save</Button>
```

Run `pnpm exec selfix src/Example.vue` again. It exits with code `0`:

```text
Checked 1 Vue file: 0 errors, 0 warnings.
```

The Button keeps its padding. The page can still give it a top margin and full width. That is the boundary selfix checks.

## Next steps

Add `"lint:design": "selfix src"` to your existing `package.json` scripts. Run `pnpm run lint:design` to check the whole source directory after UI changes.

All six rules are enabled by default, including the rule against `<style>` blocks. Follow [Adoption](adoption.md) to introduce them gradually in an existing app, or [configure a contract](configuration.md#component-contracts) when a component needs more freedom.
