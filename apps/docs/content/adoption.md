---
title: Adopt in an existing project
description: Start with one rule and tighten the check as you fix findings.
---

You don't need to fix every styling issue first. Start one rule at warnings, fix its findings, make it an error, then move to the next rule.

To install selfix, follow [Getting started](getting-started.md#install-selfix).

## Start with warnings

Create `selfix.config.ts` next to `package.json`:

```ts
import { defineConfig } from "selfix"

export default defineConfig({
  rules: {
    "no-restyle": "warn",
    "prefer-ui-components": "off",
    "no-raw-colors": "off",
    "no-arbitrary-values": "off",
    "no-inline-styles": "off",
    "no-unknown-classes": "off",
    "require-static-classes": "off",
  },
})
```

Omitted rules default to `"error"`, so keep the six `"off"` entries. If you already have a config, change only its `rules`.

Turning off `require-static-classes` also turns off findings for opaque spreads such as `v-bind="attrs"`. See [unsupported bindings](analysis.md#unsupported-bindings).

Add a script to `package.json`:

```json
{
  "scripts": {
    "lint:design": "selfix"
  }
}
```

Run `pnpm run lint:design` from the app directory and look for repeated overrides. They usually point to a prop to use, a default to set in `app.config.ts`, or a [contract](configuration.md#component-contracts) the component should have.

Warnings alone pass. Parse errors and loading failures still fail.

## Set a warning limit

If the check reports 12 warnings, set that count as the limit:

```json
{
  "scripts": {
    "lint:design": "selfix --max-warnings 12"
  }
}
```

Now 13 warnings fail the command. Lower the limit as you fix findings until it reaches zero. The limit counts the total, not which findings are new. To catch new findings, use a baseline.

When `no-restyle` is clean, set it to `"error"`. Then turn on another [rule](rules.md) at `"warn"` and repeat. `no-unknown-classes` and `no-raw-colors` are good next steps: they find typos and palette colors that Nuxt UI has a token for.

## Record existing findings in a baseline

With a warning limit, fixing five old findings and adding five new ones elsewhere still passes. A baseline counts findings per file and rule, so the new ones fail. It records errors too, so you can turn rules on at `"error"` right away.

Record the current findings and commit the file:

```sh
pnpm exec selfix --update-baseline selfix-baseline.json
```

Check against it in your script:

```json
{
  "scripts": {
    "lint:design": "selfix --baseline selfix-baseline.json"
  }
}
```

When you fix findings, the check fails with unused entries until you lower the counts:

```sh
pnpm exec selfix --prune-baseline selfix-baseline.json
```

Commit the smaller file. Don't rerun `--update-baseline` to make a failing check pass, because it records the new findings too. See [Baseline](cli.md#baseline) for the file format and output.

## Keep new code strict

To hold new directories to errors while older files still warn, add an override:

```ts
rules: { "no-restyle": "warn" },
overrides: [
  { files: ["app/pages/checkout/**/*.vue"], rules: { "no-restyle": "error" } },
],
```

## Allow styling inside component implementations

Your own components wrap Nuxt UI and native elements, and may need styles their callers can't add. Relax `no-restyle` and `prefer-ui-components` for those files with [file overrides](configuration.md#per-file-rule-overrides). Other rules stay active, while `exclude` would skip every check in the file.

## Workspaces

Each run uses one project: one theme, one prepared Nuxt UI, one config. Run selfix from each app:

```sh
pnpm --filter store exec selfix
pnpm --filter admin exec selfix
```

Or name each app's config from the workspace root:

```sh
pnpm exec selfix apps/store/app --config apps/store/selfix.config.ts
```

Keep these points in mind:

- The project root is the config's directory, or the working directory without a config. selfix looks there for the generated Nuxt UI theme.
- `css`, `buildDir`, `exclude`, and `overrides` paths are relative to the config.
- If each app owns its tooling, use app-local scripts.

## Share one policy across apps

The config is a module, so apps can import shared settings:

```ts
import { defineConfig } from "selfix"
import shared from "@acme/design-lint"

export default defineConfig({
  ...shared,
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
After UI changes, run pnpm run lint:design. Correct findings with component
props, theme classes, or app.config.ts, then rerun the check. Do not change
selfix.config.ts to make a finding pass.
```

To have an agent configure the project and prove enforcement, see [Agent setup](agent-setup.md).
