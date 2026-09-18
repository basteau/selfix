# Quickstart

[Documentation index](README.md)

Create a Button, report a padding override, and correct it. Run these commands from your Vue project's root.

Requires **Node.js ≥22.18.0**, **Vue ≥3.2.13 <4**, and **Tailwind CSS ≥4 <5**. Vue and Tailwind are the only consumer peer dependencies. Install any missing peers before continuing. Same-name `v-bind` shorthand requires Vue ≥3.4; see [compiler troubleshooting](troubleshooting.md#vue-compiler-capabilities-are-missing) if startup fails.

```sh
pnpm add -D selfix
```

Use `"type": "module"` in your project's `package.json`. Node loads `selfix.config.ts` with native TypeScript support. Type annotations, `import type`, and `satisfies` work; enums and `tsconfig` path aliases do not. Node does not type-check this file. **Configuration executes as Node code; use trusted files.**

Create these files, or adapt the paths to your project. Keep existing application files when adding the example.

### Define the theme and component

Create `src/style.css`, the required Tailwind CSS entry that selfix reads:

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

Create `src/components/ui/Button.vue`:

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

### Configure and run the check

Create `selfix.config.ts` in the project root:

```ts
import { defineConfig } from "selfix"

export default defineConfig({
  css: "src/style.css",
  ui: ["./components/ui"],
})
```

The `ui` prefix matches the import in `src/Example.vue` below. Use import prefixes that match your application's source strings.

**All six rules default to `"error"`, including `no-inline-styles`, which reports SFC `<style>` blocks.** Omitted rules remain enabled. For a gradual rollout, use the [adoption configuration](adoption.md#adopt-in-an-existing-project).

Create `src/Example.vue`:

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

The command exits with code `1` and reports the class at line 6, column 31:

```text
src/Example.vue:6:31 error no-restyle "p-4" is not allowed on <Button>: spacing changes are outside the component's contract. Remove this override. Check the component's documented spacing props and its contract before changing surrounding layout.
Checked 1 Vue file: 1 error, 0 warnings.
```

Replace the Button line with:

```vue
<Button variant="secondary" class="mt-4 w-full">Save</Button>
```

Run `pnpm exec selfix src/Example.vue` again. It exits with code `0`:

```text
Checked 1 Vue file: 0 errors, 0 warnings.
```

selfix reports findings in the original `.vue` file and leaves source unchanged. Apply corrections yourself or through your coding agent; there is no automatic fix command.

Next: [adopt selfix gradually](adoption.md), [configure policies](configuration.md), or [troubleshoot a failure](troubleshooting.md).
