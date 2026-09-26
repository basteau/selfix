---
title: shadcn-vue
description: Configure selfix for components added with shadcn-vue.
---

shadcn-vue copies components into `@/components/ui`, which is selfix's default `ui` prefix. Pages import them as `import { Button } from "@/components/ui/button"`, so selfix protects them without extra recognition settings.

## Configure selfix

Set `css` to the `tailwind.css` path from `components.json`, and relax the rules for the component files themselves:

```ts
import { defineConfig } from "selfix"

export default defineConfig({
  css: "src/style.css",
  // Omitted rules default to "error". See Adoption to start with warnings.
  rules: { "no-restyle": "warn" },
  overrides: [
    {
      // The components style their own internals.
      files: ["src/components/ui/**/*.vue"],
      rules: { "no-restyle": "off", "no-inline-styles": "off" },
    },
  ],
})
```

## What to expect

- The theme's `@theme inline` block defines tokens such as `--color-primary`, so `bg-primary` passes `no-raw-colors` and `bg-blue-500` is reported.
- selfix reads the arguments of `cn()` from `@/lib/utils`.
- Findings on a protected component name its source file. The props are typed from `cva`, not as string unions, so findings list no `size` or `variant` choices.
- selfix does not read `cva` definitions in `index.ts`, so classes built by a variant function are not checked.

Run `pnpm exec selfix src --doctor` to confirm that pages' components show `active protection: yes`.
