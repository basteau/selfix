---
title: Configuration
description: Tell selfix which components to protect and what callers can change.
---

Your config connects three things: the theme your app uses, the components you want to protect, and the styling rules to enforce.

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

Node loads the file using native TypeScript support. Use `"type": "module"` in `package.json` and a default export. Type annotations, `import type`, and `satisfies` work; enums and `tsconfig` import aliases do not. Node does not type-check the file.

`defineConfig` validates the settings. Unknown fields, invalid rule options, and malformed patterns fail with an error. Use trusted config files: they execute as Node code.

## Component recognition

`ui` matches the strings in your imports. It is not a list of directories to scan:

```ts
// Recognized by ui: ["./components/ui"]
import Button from "./components/ui/Button.vue"
```

Prefixes match whole path segments. `@/components/ui` matches `@/components/ui/Button.vue`, but not `@/components/ui-extra`. The default is `["@/components/ui"]`; `ui: []` disables that prefix.

For global or auto-imported components, add name patterns to your config:

```ts
components: ["^U[A-Z]", "^GlobalButton$"],
```

These are regular expressions. `^U[A-Z]` matches `<UButton>`. Unimported kebab-case tags keep their spelling, so `<u-button>` needs a matching pattern too.

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

The first matching contract wins. Put specific patterns before broad ones. Omitted fields inherit the rule's options; supplied fields replace them. For example, `allow: ["w-full"]` replaces the layout allowance, and `deny: []` clears an inherited ban. Contracts do not inherit from each other.

### Choose a variant or a contract

Use a prop when the component already provides the appearance you need. For example, the [tutorial Button](getting-started.md) has a `secondary` variant. Change the contract when callers need a new kind of control, such as CardContent's padding above.

selfix may list declared `size` or `variant` choices in a finding. Check the component before choosing one: those choices don't promise the same visual result as the rejected class.

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

Other rules keep their current settings. Patterns are relative to the config directory in the CLI, or `configBase` in the API.

| Pattern         | Matches                                |
| --------------- | -------------------------------------- |
| `src/Page.vue`  | One file.                              |
| `src/*.vue`     | Files directly inside `src`.           |
| `src/Item?.vue` | One character after `Item`.            |
| `src/**/*.vue`  | Files in `src` and all subdirectories. |

Use `/` separators. Patterns are case-sensitive; `**` must occupy a whole segment. Absolute paths, `..`, backslashes, negation, braces, character classes, and extglobs are unsupported. Files outside the base don't match.

All matching overrides apply in order; later settings win per rule. A severity string preserves current options. A `[severity, options]` pair replaces them, with omitted options returning to built-in defaults.

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

The first matching entry wins. Component names follow the same matching rules as contracts. Prop names normalize to kebab-case, so `contentClass` and `content-class` are the same prop; don't declare both. Native `class` and `style` cannot be reconfigured.

Unconfigured props are ignored. Configuring a prop does not itself protect the component with `no-restyle`; set up recognition too. All parts use the component's contract, with no per-slot policies.

For slot maps, variables holding the whole map, computed keys, methods, and spreads remain unreadable. Known entries are still checked. Findings identify the prop and, when known, the slot.

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

A contract's message replaces the rule's entire message, including a map. A matching category wins over `default`, then built-in guidance. For `no-restyle`, the category is the first disallowed one unless a deny matched. Other class findings prefer a denied category, then the first non-layout category, then the first category in the table above.

Use top-level `note` to append plain text to every finding, including `parse-error`. Notes don't substitute placeholders. Custom rule messages don't replace parse errors.

## Component source discovery

The CLI looks up component definitions to enrich `no-restyle` messages with source paths and readable prop choices. This is separate from recognition: finding a source file doesn't decide whether its component is protected.

Usually no extra config is needed. Set `project: false` to disable discovery, or add `project` options when your paths need help:

| Option           | Meaning                                                                                                                         |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `root`           | Project directory. CLI: relative to the config directory. API: relative to the current directory. Defaults to that directory.   |
| `aliases`        | Import patterns mapped to local paths relative to root; zero or one `*` per pattern. Overrides discovered mappings.             |
| `components`     | Exact names mapped to existing `.vue` files relative to root. Overrides discovered definitions.                                 |
| `tsconfig`       | Metadata file relative to root. Default search: `tsconfig.json`, `jsconfig.json`, then prepared `.nuxt/tsconfig.json` for Nuxt. |
| `nuxt`           | Force prepared Nuxt discovery on or off; otherwise auto-detected.                                                               |
| `nuxtComponents` | Prepared declarations relative to root; defaults to `.nuxt/components.d.ts`. Enables Nuxt discovery unless `nuxt: false`.       |

API callers opt in with `config: { project: {} }`. CSS aliases and `ui` prefixes are separate from these filesystem mappings.

### TypeScript path metadata

Discovery reads JSONC `paths`, their `baseUrl`, and `extends` chains. Child paths replace inherited paths; later entries in an `extends` array win. Exact patterns win over wildcards, which prefer the longest prefix then suffix. Fallback targets are tried in order.

A bare import needs a matching path entry; `baseUrl` alone isn't enough. Discovery doesn't execute build-tool configuration.

### Component imports and re-exports

Relative, absolute, and mapped imports can reach Vue files through explicit named or default re-exports. An exact file wins; extensionless imports need a unique candidate. Ambiguous or unsupported sources omit definition guidance. Explicit missing mappings and malformed metadata fail loading.

### Prop choices

Discovery reads literal `size` and `variant` unions in typed `defineProps`, including `withDefaults` and same-file aliases. Imported types, generics, inherited or merged interfaces, whole-object unions/intersections, runtime declarations, and shadowed macros omit choices. A malformed resolved SFC fails loading.

### Prepared Nuxt components

Run `nuxt prepare` first. Discovery reads direct component declarations from the generated file; wrapped lazy declarations are omitted. Missing artifacts report preparation guidance. With custom build paths, set `nuxtComponents`, `tsconfig`, and the [CSS alias](themes.md#nuxt-ui-application-themes).

### Source snapshot

A linter captures source and metadata when created. Recreate it after component, dependency, or metadata changes. Each CLI run does this automatically. In the API, supplied source takes precedence for the current SFC; other definitions use the captured files.

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
