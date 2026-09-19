---
title: Adopt in an existing project
description: Start with one rule and tighten the check as you fix findings.
---

You don't need to fix every styling issue before using selfix. Start with warnings for one rule. Once you've fixed the findings, make that rule an error and move to the next.

Install selfix with the [setup instructions](getting-started.md#install-selfix). Use your app's existing theme and components for the steps below.

## Start with warnings

Create `selfix.config.ts`. Set `css` to your Tailwind entry and `ui` to match your component import strings:

```ts
import { defineConfig } from "selfix"

export default defineConfig({
  css: "src/style.css",
  ui: ["./components/ui"],
  rules: {
    "no-restyle": "warn",
    "no-raw-colors": "off",
    "no-arbitrary-values": "off",
    "no-inline-styles": "off",
    "no-unknown-classes": "off",
    "require-static-classes": "off",
  },
})
```

The five `"off"` entries matter: omitted rules default to `"error"`. If you already have a config, update its rules without replacing the other settings.

Add this script to your existing `package.json`:

```json
{
  "scripts": {
    "lint:design": "selfix src"
  }
}
```

Run `pnpm run lint:design` from the app directory. Read the findings and look for repeated overrides. Use existing component props where they fit, or [change the contract](configuration.md#component-contracts) if callers need more control.

Warnings alone pass at this stage. Parse errors and loading failures still fail.

## Set a warning limit

Suppose the check reports 12 warnings. Set that count as the limit:

```json
{
  "scripts": {
    "lint:design": "selfix src --max-warnings 12"
  }
}
```

Now 13 warnings fail the command. As you fix findings, lower the limit until it reaches zero. This limits the total count; it doesn't track which findings are new.

When `no-restyle` is clean, change it to `"error"`. Pick another [rule](rules.md), enable it at `"warn"`, and repeat.

## Allow styling inside component implementations

A Button's implementation may need styling that its callers must not override. Add this field to your config to allow it inside `src/components/ui`:

```ts
overrides: [
  {
    files: ["src/components/ui/**/*.vue"],
    rules: {
      "no-inline-styles": "off",
      "no-restyle": "off",
    },
  },
],
```

Other enabled rules still apply to those files. Callers elsewhere keep the original policy. Use [file overrides](configuration.md#per-file-rule-overrides) for these exceptions; `exclude` would skip every check in the file.

## Run the same check in CI and coding agents

Use the same script locally and in CI so they enforce the same warning limit. With a supported Node version and your project's pnpm version, run:

```sh
pnpm install --frozen-lockfile
pnpm run lint:design
```

Add this to your existing coding-agent instructions:

```text
After UI changes, run pnpm run lint:design. Correct findings using component
props, theme classes, or agreed contracts, then rerun the check.
```

For apps with separate themes or help verifying the setup, see [Agent setup](agent-setup.md).
