---
title: shadcn-vue
description: Configure selfix for components added with shadcn-vue.
---

shadcn-vue records your Tailwind entry and component alias in `components.json`. When `selfix.config.ts` omits `css` or `ui`, the CLI reads `tailwind.css` and `aliases.ui` from `components.json` in the config directory. Pages import components as `import { Button } from "@/components/ui/button"`, so selfix protects them without extra settings.

## Configure selfix

The config only needs your rule choices and an override for the component files themselves:

```ts
import { defineConfig } from "selfix"

export default defineConfig({
  // css and ui come from components.json.
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

Run `pnpm exec selfix src --doctor`. It prints `From components.json: css, ui` and should show `active protection: yes` for your pages' components. When selfix needs `components.json`, a malformed file stops the check with exit code `2`.
