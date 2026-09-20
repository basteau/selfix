---
title: Configuration
description: Tell selfix which components to protect and what callers can change.
---

Create `selfix.config.ts` to select your theme and protected components:

```ts
import { defineConfig } from "selfix"

export default defineConfig({
  css: "src/style.css",
  ui: ["./components/ui"],
})
```

This protects imports such as `./components/ui/Button.vue`. All seven rules default to errors.

## Configuration file

Use `"type": "module"` in `package.json` and a default export. Node loads the TypeScript directly without type-checking; enums and `tsconfig` import aliases are unsupported.

`defineConfig` rejects invalid settings. Use trusted configs: they execute as Node code.

## Component recognition

`ui` matches the strings in your imports. It is not a list of directories to scan:

```ts
// Recognized by ui: ["./components/ui"]
import Button from "./components/ui/Button.vue"
```

Prefixes match whole path segments: `@/components/ui` does not match `@/components/ui-extra`.

For global or auto-imported components, add name patterns to your config:

```ts
components: ["^U[A-Z]", "^GlobalButton$"],
```

These regular expressions match `<UButton>` and `<GlobalButton>`. Unimported kebab-case tags need their own matching pattern.

Contracts use local import names: an imported `ActionButton` also covers `<action-button>`.

`componentImports` adds import regexes; `ignoreImports` takes precedence. Recognition affects only `no-restyle`.

Use `pnpm exec selfix src --doctor` to verify which setting recognizes each usage and whether file overrides leave `no-restyle` active. Definition discovery is reported separately; see [doctor reports](cli.md#diagnose-component-protection).

## Component restrictions

Configure exact banned names and optional replacement guidance with [`no-restricted-components`](rules.md#no-restricted-components). Its `components` option is a list of `{ name, replacement?, message? }` entries, distinct from top-level recognition regexes. The list defaults to empty. Severity-only overrides preserve the list; a supplied list replaces it, including `[]` to clear it.

## Shared policy

Set a rule to `"off"`, `"warn"`, or `"error"`. To add options, use `[severity, options]`:

```ts
// Add this field to your config.
rules: {
  "no-restyle": ["error", { allow: ["layout"], deny: ["fixed"] }],
  "no-raw-colors": "warn",
},
```

This allows layout utilities but bans `fixed`. The following shared options apply to styling rules; component restrictions use their separate options above.

| Option      | Meaning                                                                                     |
| ----------- | ------------------------------------------------------------------------------------------- |
| `allow`     | Permitted classes or categories. Defaults to `["layout"]` for `no-restyle`, otherwise `[]`. |
| `deny`      | Explicit bans. These win over allowances. Defaults to `[]`.                                 |
| `contracts` | Per-component options. The first matching contract wins.                                    |
| `message`   | A custom message string or category map.                                                    |

For `no-restyle`, `allow` defines what callers may add. For color, arbitrary-value, and unknown-class rules, it exempts matching classes. `no-inline-styles` matches the token `style`. `require-static-classes` accepts messages and contracts, but no allow/deny lists.

### Class patterns and categories

Use exact names such as `w-full`, wildcards such as `px-*`, or one of these categories:

| Category     | Examples                                                       |
| ------------ | -------------------------------------------------------------- |
| `layout`     | Margin, sizing, flex/grid placement, cursor: `mt-4`, `w-full`. |
| `color`      | Color declarations: `bg-primary`, `text-primary`.              |
| `typography` | Font, line height, alignment: `text-sm`, `font-bold`.          |
| `spacing`    | Padding, gap, scroll spacing: `p-4`, `gap-2`.                  |
| `shape`      | Border, outline, radius: `rounded-lg`.                         |
| `effects`    | Shadow, opacity, filters, transforms: `opacity-50`.            |
| `motion`     | Animation and transition: `duration-200`.                      |
| `unknown`    | Classes or declarations selfix cannot classify.                |

`no-restyle` requires every category a class affects to be allowed, or an allowance by class name. Other class rules accept any allowed category.

Patterns without `:` match the base utility: `mt-4` also matches `hover:-mt-4!`. Slash modifiers remain part of the name, so `bg-primary` doesn't match `bg-primary/50`. Patterns containing `:` match the full token, including variants and `!` markers.

These are wildcards, not regexes. Misspelled categories become literal class names.

## Component contracts

To let CardContent accept padding, add this rule setting. Other protected components keep the default layout allowance:

```ts
// In config.rules
"no-restyle": ["error", {
  contracts: [{ pattern: "^CardContent$", allow: ["layout", "spacing"] }],
}],
```

For recognized components:

```vue
<CardContent class="p-4">Content</CardContent>
<!-- Allowed. -->
<Button class="p-4">Save</Button>
<!-- Rejected. -->
```

The first matching contract wins; put specific patterns first. It inherits omitted fields from the rule and replaces supplied fields. Contracts do not inherit from each other. For example, `allow: ["w-full"]` permits only that class, while `deny: []` clears an inherited ban.

Prefer an existing prop such as `variant="secondary"` for appearance changes. Change contracts to give callers new control. Discovered prop choices don’t promise an equivalent visual result.

## Per-file rule overrides

Component implementations may need styles that callers cannot add. Use `overrides` to change selected rules for those files:

```ts
// Add this field to your config.
overrides: [
  {
    files: ["src/components/ui/**/*.vue"],
    rules: { "no-inline-styles": "off", "no-restyle": "off" },
  },
],
```

Patterns are relative to the config directory (API: `root`):

| Pattern         | Matches                                |
| --------------- | -------------------------------------- |
| `src/Page.vue`  | One file.                              |
| `src/*.vue`     | Files directly inside `src`.           |
| `src/Item?.vue` | One character after `Item`.            |
| `src/**/*.vue`  | Files in `src` and all subdirectories. |

Use case-sensitive `/` paths. `**` spans zero or more directories, including dot directories, and must occupy a whole segment. Only `*`, `**`, and `?` wildcards are supported; absolute paths and `..` are rejected. Files outside the root don't match.

All matching overrides apply in order. Severity changes only severity; options update only the fields supplied. Lists and message maps replace as a whole. Use `deny: []` to clear bans, `contracts: []` to remove contracts, or `message: {}` to clear the rule-level message. Omitted fields and empty options preserve current settings; contracts can still supply their own messages.

Exclusions skip whole files and cannot be undone by overrides. There are no inline suppressions. Parse and loading failures cannot be disabled.

## Configured class props

Add `classProps` to inspect classes passed through component props:

```ts
classProps: [
  { pattern: "^U[A-Z]", props: { ui: "slot-map" } },
  { pattern: "^MyPanel$", props: { contentClass: "class" } },
],
```

`"class"` reads ordinary [class expressions](analysis.md#vue-class-bindings). `"slot-map"` reads a literal object whose keys name component parts:

```vue
<UButton :ui="{ base: 'p-4', label: 'font-bold' }" />
<MyPanel content-class="mt-4" />
```

The first matching entry wins. Names match as in contracts; `contentClass` and `content-class` refer to the same prop. Native `class` and `style` cannot be reconfigured.

Unconfigured props are ignored. `no-restyle` still needs component recognition. All slots share the component’s contract.

Use literal slot maps: computed keys, spreads, and variables holding the map are unreadable. Findings identify the prop and known slot.

## Custom messages

Set `message` on a rule or contract:

```ts
message: "Use Button's variant prop instead of {{className}}.",
```

You can also supply a map keyed by category, with `default` as a fallback.

| Placeholder     | Value                                                                    |
| --------------- | ------------------------------------------------------------------------ |
| `{{component}}` | Local component or native tag name; `style` for SFC blocks.              |
| `{{className}}` | Original class token; empty for static-class and inline-style findings.  |
| `{{category}}`  | Selected category; `unknown` for static-class and inline-style findings. |
| `{{file}}`      | Linted filename: absolute in the CLI, as supplied in the API.            |
| `{{prop}}`      | Configured prop name, or empty.                                          |
| `{{slot}}`      | Known slot name, or empty.                                               |
| `{{rule}}`      | Rule name.                                                               |

A matching category message takes priority over `default`, then built-in guidance. A contract's message replaces the rule's whole message map. Top-level `note` appends plain text to every finding. Custom messages cannot replace parse errors.

## Component source discovery

The CLI finds definitions to add source paths and prop choices to findings. Discovery does not decide which components are protected; recognition does.

Use `project: false` to disable discovery, or these options to guide it:

| Option           | Purpose                                                                                             |
| ---------------- | --------------------------------------------------------------------------------------------------- |
| `root`           | Source directory, relative to the config directory (API: `root`). Defaults to that directory.       |
| `aliases`        | Import patterns mapped to local paths relative to root; at most one `*`.                            |
| `components`     | Exact component names mapped to local `.vue` files relative to root.                                |
| `tsconfig`       | Metadata file relative to root; normally detected from tsconfig/jsconfig or prepared Nuxt metadata. |
| `nuxt`           | Enable or disable prepared Nuxt discovery; auto-detected by default.                                |
| `nuxtComponents` | Generated declarations relative to root; defaults to `.nuxt/components.d.ts`.                       |

Explicit aliases and component mappings take priority over discovered ones. For Nuxt, run `nuxt prepare` first; custom build directories need matching metadata and [CSS paths](themes.md#nuxt-ui-application-themes).

Missing explicit mappings, malformed metadata, and invalid resolved components fail loading. Unresolved or unsupported definitions omit guidance; they don't change which components are protected. See [Troubleshooting](troubleshooting.md) for recovery and [API reuse](api.md#component-discovery-and-reuse) for source updates.

## Project settings

| Field              | Default and purpose                                                                      |
| ------------------ | ---------------------------------------------------------------------------------------- |
| `css`              | Required CLI CSS path unless supplied by `--css`. Relative to the config directory.      |
| `ui`               | `["@/components/ui"]`. Protected import prefixes.                                        |
| `components`       | `[]`. Component-name regular expressions.                                                |
| `componentImports` | `[]`. Additional import-source regular expressions.                                      |
| `ignoreImports`    | `[]`. Imports excluded from recognition.                                                 |
| `rules`            | All seven rules at `"error"`; component restrictions default to an empty list.           |
| `overrides`        | `[]`. Per-file rule settings.                                                            |
| `classProps`       | `[]`. Additional props containing classes.                                               |
| `cssAliases`       | `{}`. Exact CSS import mappings.                                                         |
| `exclude`          | `[]`. CLI-only whole-file exclusions; see [file selection](cli.md#discovery-and-output). |
| `note`             | No appended note.                                                                        |
| `project`          | CLI discovery enabled; API discovery disabled.                                           |
