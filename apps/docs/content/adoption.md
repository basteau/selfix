---
title: Adopt in an existing project
description: Start with one rule and tighten the check as you fix findings.
---

You don't need to fix every styling issue first. Start one rule at warnings, fix its findings, make it an error, then move to the next rule.

To install selfix, follow [Getting started](getting-started.md#install-selfix).

## Start with warnings

In `selfix.config.ts`, set `css` to your Tailwind entry and `ui` to your component import strings:

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

Omitted rules default to `"error"`, so keep the five `"off"` entries. If you already have a config, change only its `rules`.

Turning off `require-static-classes` also turns off findings for opaque spreads such as `v-bind="attrs"`. See [unsupported bindings](analysis.md#unsupported-bindings).

Add a script to `package.json`:

```json
{
  "scripts": {
    "lint:design": "selfix src"
  }
}
```

Run `pnpm run lint:design` from the app directory and look for repeated overrides. Use existing component props where they fit, or [change the contract](configuration.md#component-contracts) if callers need more control.

Warnings alone pass. Parse errors and loading failures still fail.

## Set a warning limit

If the check reports 12 warnings, set that count as the limit:

```json
{
  "scripts": {
    "lint:design": "selfix src --max-warnings 12"
  }
}
```

Now 13 warnings fail the command. Lower the limit as you fix findings until it reaches zero. The limit counts the total, not which findings are new.

When `no-restyle` is clean, set it to `"error"`. Then turn on another [rule](rules.md) at `"warn"` and repeat.

## Keep new code strict

To hold new directories to errors while older files still warn, add an override:

```ts
rules: { "no-restyle": "warn" },
overrides: [
  { files: ["src/features/checkout/**/*.vue"], rules: { "no-restyle": "error" } },
],
```

## Allow styling inside component implementations

A Button's own file may need styles its callers can't add. Relax rules for component files with [file overrides](configuration.md#per-file-rule-overrides). Other rules stay active, while `exclude` would skip every check in the file.

## Workspaces

Each run uses one config and one theme, so give apps with different themes separate configs. With tooling installed at the workspace root, run:

```sh
pnpm exec selfix apps/store/src --config apps/store/selfix.config.ts
pnpm exec selfix apps/admin/src --config apps/admin/selfix.config.ts
```

Keep these points in mind:

- `css`, `exclude`, and `overrides` paths are relative to the config. In the store config, `css: "src/style.css"` resolves to `apps/store/src/style.css`.
- Check shared packages against the theme of the app that uses them.
- If each app owns its tooling, use app-local scripts.

## Share one policy across apps

The config is a module, so apps can import shared settings:

```ts
import { defineConfig } from "selfix"
import shared from "@acme/design-lint"

export default defineConfig({
  ...shared,
  css: "src/style.css",
  rules: { ...shared.rules, "no-raw-colors": "warn" },
})
```

Two points apply to shared settings:

- Spread `shared.rules` when an app changes rules. Otherwise the app's `rules` object replaces the shared one.
- A pnpm workspace package can stay TypeScript. If you install the shared config from a registry, publish it as JavaScript, because Node doesn't strip types from files under `node_modules`.

## Run the same check in CI and coding agents

Run the same `lint:design` script locally and in CI, so both enforce the same warning limit. For GitHub Actions and GitLab CI examples, see [Run in CI](ci.md).

Add this to your coding-agent instructions:

```text
After UI changes, run pnpm run lint:design. Correct findings using component
props, theme classes, or agreed contracts, then rerun the check.
```

To have an agent configure the project and prove enforcement, see [Agent setup](agent-setup.md).
