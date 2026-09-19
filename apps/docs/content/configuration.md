---
title: Configuration
description: Tell selfix which components to protect and what callers can change.
---

Tell selfix which theme to load, which components to protect, and what callers can change.

Create `selfix.config.ts` in the project root:

```ts
import { defineConfig } from "selfix"

export default defineConfig({
  css: "src/style.css",
  ui: ["./components/ui"],
})
```

This protects imports such as `./components/ui/Button.vue` using all six default rules. The sections below show how to adjust that policy.

## Configuration file

Use `"type": "module"` in `package.json` and a default export. Node loads the TypeScript directly without type-checking; enums and `tsconfig` import aliases are unsupported.

`defineConfig` validates the settings. Unknown fields, invalid rule options, and malformed patterns fail with an error. Use trusted config files: they execute as Node code.

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

For renamed imports, use the local name in contracts. `import { Button as ActionButton }` makes both `<ActionButton>` and `<action-button>` match `ActionButton`.

`componentImports` adds import-source regular expressions. `ignoreImports` overrides all recognition for matching imports. Recognition affects only `no-restyle`; other rules still check the file.

## Shared policy

Set a rule to `"off"`, `"warn"`, or `"error"`. To add options, use `[severity, options]`:

```ts
// Add this field to your config.
rules: {
  "no-restyle": ["error", { allow: ["layout"], deny: ["fixed"] }],
  "no-raw-colors": "warn",
},
```

Omitted rules stay at `"error"`. In this example, callers can use layout utilities, but `fixed` is explicitly banned.

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

A class can affect several categories. `no-restyle` needs all of them allowed, or an allowance for the class by name. Other class rules accept any matching allowed category as an exception.

Patterns without `:` match the base utility: `mt-4` also matches `hover:-mt-4!`. Slash modifiers remain part of the name, so `bg-primary` doesn't match `bg-primary/50`. Patterns containing `:` match the full token, including variants and `!` markers.

Class patterns are not regular expressions. Unknown category names are treated as literal class names, so check their spelling.

## Component contracts

A contract gives one component different permissions. This config lets CardContent accept padding while other recognized components keep the default layout-only allowance:

```ts
import { defineConfig } from "selfix"

export default defineConfig({
  css: "src/style.css",
  ui: ["./components/ui"],
  rules: {
    "no-restyle": [
      "error",
      {
        contracts: [{ pattern: "^CardContent$", allow: ["layout", "spacing"] }],
      },
    ],
  },
})
```

For components imported from `./components/ui`, this produces:

```vue
<CardContent class="p-4">Content</CardContent>
<!-- Allowed. -->
<Button class="p-4">Save</Button>
<!-- Rejected. -->
```

The first matching contract wins; put specific patterns first. It inherits omitted fields from the rule and replaces supplied fields. Contracts do not inherit from each other. For example, `allow: ["w-full"]` permits only that class, while `deny: []` clears an inherited ban.

Use a prop when your component already offers the appearance you need—for example, `<Button variant="secondary">`. Change the contract when callers need new control. Discovered prop choices are suggestions to inspect, not promises of an equivalent visual result.

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

Other rules keep their current settings. Patterns are relative to the config directory in the CLI, or `root` in the API.

| Pattern         | Matches                                |
| --------------- | -------------------------------------- |
| `src/Page.vue`  | One file.                              |
| `src/*.vue`     | Files directly inside `src`.           |
| `src/Item?.vue` | One character after `Item`.            |
| `src/**/*.vue`  | Files in `src` and all subdirectories. |

Use case-sensitive `/` paths. `**` spans zero or more directories, including dot directories, and must occupy a whole segment. Only `*`, `**`, and `?` wildcards are supported; absolute paths and `..` are rejected. Files outside the root don't match.

All matching overrides apply in order. Severity changes only severity; options update only the fields supplied. Lists and message maps replace as a whole. Use `deny: []` to clear bans, `contracts: []` to remove contracts, or `message: {}` to clear the rule-level message. Omitted fields and empty options preserve current settings; contracts can still supply their own messages.

Use `exclude` only to skip a whole file. Overrides cannot bring an excluded file back. There are no inline suppressions, and disabling rules does not suppress parse or loading failures.

## Configured class props

Some components accept classes through props such as `contentClass` or `ui`. Tell selfix which props to inspect by adding `classProps`:

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

Unconfigured props are ignored. Configuring a prop does not itself protect the component with `no-restyle`; set up recognition too. All parts use the component's contract, with no per-slot policies.

Use literal slot maps: computed keys, spreads, and variables holding the map are unreadable. Findings identify the prop and known slot.

## Custom messages

Give developers a useful next action by setting `message` on a rule or contract:

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

The CLI looks up component definitions to enrich `no-restyle` messages with source paths and readable prop choices. This is separate from recognition: finding a source file doesn't decide whether its component is protected.

Usually no extra config is needed. Use `project: false` to disable discovery. Add these `project` options only when automatic lookup needs help:

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

Use this table to look up top-level fields:

| Field              | Default and purpose                                                                      |
| ------------------ | ---------------------------------------------------------------------------------------- |
| `css`              | Required CLI CSS path unless supplied by `--css`. Relative to the config directory.      |
| `ui`               | `["@/components/ui"]`. Protected import prefixes.                                        |
| `components`       | `[]`. Component-name regular expressions.                                                |
| `componentImports` | `[]`. Additional import-source regular expressions.                                      |
| `ignoreImports`    | `[]`. Imports excluded from recognition.                                                 |
| `rules`            | All six rules at `"error"`.                                                              |
| `overrides`        | `[]`. Per-file rule settings.                                                            |
| `classProps`       | `[]`. Additional props containing classes.                                               |
| `cssAliases`       | `{}`. Exact CSS import mappings.                                                         |
| `exclude`          | `[]`. CLI-only whole-file exclusions; see [file selection](cli.md#discovery-and-output). |
| `note`             | No appended note.                                                                        |
| `project`          | CLI discovery enabled; API discovery disabled.                                           |
