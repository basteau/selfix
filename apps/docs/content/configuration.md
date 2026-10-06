---
title: Configuration
description: Every selfix.config.ts setting, with contracts, overrides, and messages.
---

`selfix.config.ts` sets your theme, the components selfix protects, and the rules it applies:

```ts
import { defineConfig } from "selfix"

export default defineConfig({
  // Tailwind entry that selfix checks classes against.
  css: "src/style.css",
  // Import prefixes of the components to protect.
  ui: ["@/components/ui"],
  rules: {
    // Let CardContent accept padding. Other components keep the default.
    "no-restyle": [
      "error",
      {
        contracts: [{ pattern: "^CardContent$", allow: ["layout", "spacing"] }],
      },
    ],
    "no-raw-colors": "warn",
  },
  // Component files may use their own CSS.
  overrides: [{ files: ["src/components/ui/**/*.vue"], rules: { "no-inline-styles": "off" } }],
})
```

## All settings

| Field              | Default                                                                                          | Purpose                                                                         |
| ------------------ | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| `css`              | Required in the CLI unless `--css` or `components.json` `tailwind.css` provides it. `--css` wins | Tailwind entry, relative to the config directory                                |
| `ui`               | CLI: `aliases.ui` from `components.json`. Otherwise and in the API: `["@/components/ui"]`        | [Import prefixes](#component-recognition) of protected components               |
| `components`       | `[]`                                                                                             | Name regexes for global or auto-imported components                             |
| `componentImports` | `[]`                                                                                             | Extra import-path regexes                                                       |
| `ignoreImports`    | `[]`                                                                                             | Import-path regexes that are never protected                                    |
| `rules`            | Every rule at `"error"`                                                                          | [Rule settings](#rule-settings)                                                 |
| `overrides`        | `[]`                                                                                             | [Per-file rule settings](#per-file-rule-overrides)                              |
| `classHelpers`     | `[]`                                                                                             | Extra [class helpers](#class-helpers)                                           |
| `classProps`       | `[]`                                                                                             | [Props that carry classes](#configured-class-props)                             |
| `cssAliases`       | `{}`                                                                                             | Exact [CSS import mappings](themes.md#css-aliases)                              |
| `exclude`          | `[]`                                                                                             | Files the CLI skips entirely. See [file selection](cli.md#discovery-and-output) |
| `note`             | None                                                                                             | Text appended to every finding                                                  |
| `project`          | Enabled in the CLI, disabled in the API                                                          | [Component source discovery](#component-source-discovery)                       |
| `unusedExceptions` | `"error"`                                                                                        | Severity of [exception comments](#suppress-findings) that suppress nothing      |

## Configuration file

Node loads `selfix.config.ts` directly, without type-checking, so `package.json` needs `"type": "module"`. The config file cannot use enums or `tsconfig` path aliases. `defineConfig` rejects invalid settings. In the CLI, a `components.json` in the config directory can supply `css` and `ui` when the config omits them. See [shadcn-vue](shadcn-vue.md).

> **The config runs as code.** Only use config files you trust.

## Component recognition

Only recognized components get [no-restyle](no-restyle.md) protection. `ui` matches the import string, not a directory:

```ts
// Recognized by ui: ["@/components/ui"]
import { Button } from "@/components/ui/button"
```

- Prefixes match whole path segments. `@/components/ui` does not match `@/components/ui-extra`.
- For global or auto-imported components, add name patterns: `components: ["^U[A-Z]", "^GlobalButton$"]`. Unimported kebab-case tags need their own pattern.
- `componentImports` adds import regexes. `ignoreImports` wins over every other setting.
- Contracts use local names, so an imported `ActionButton` also covers `<action-button>`.

Run `pnpm exec selfix src --doctor` to see which setting recognized each usage and whether overrides leave `no-restyle` active. See [doctor reports](cli.md#diagnose-component-protection).

To ban components instead of protecting them, use [no-restricted-components](no-restricted-components.md).

## Rule settings

Set a rule to `"off"`, `"warn"`, or `"error"`. To add options, use `[severity, options]`:

```ts
rules: {
  "no-restyle": ["error", { allow: ["layout"], deny: ["fixed"] }],
  "no-raw-colors": "warn",
},
```

| Option      | Meaning                                                                                     |
| ----------- | ------------------------------------------------------------------------------------------- |
| `allow`     | Classes or categories to permit. Defaults to `["layout"]` for `no-restyle`, otherwise `[]`. |
| `deny`      | Classes or categories to ban. Wins over `allow`. Defaults to `[]`.                          |
| `contracts` | Per-component options. The first matching contract wins.                                    |
| `message`   | A [custom message](#custom-messages) string or category map.                                |

For `no-restyle`, `allow` lists what callers may add. For the color, arbitrary-value, and unknown-class rules, it lists exceptions. `no-inline-styles` matches the token `style`. `require-static-classes` takes `contracts` and `message` only.

### Class patterns and categories

A pattern is an exact class such as `w-full`, a wildcard such as `px-*`, or a category:

| Category     | Covers                                          | Examples               |
| ------------ | ----------------------------------------------- | ---------------------- |
| `layout`     | Margin, sizing, flex and grid placement, cursor | `mt-4`, `w-full`       |
| `color`      | Color declarations                              | `bg-primary`           |
| `typography` | Font, line height, alignment                    | `text-sm`, `font-bold` |
| `spacing`    | Padding, gap, scroll spacing                    | `p-4`, `gap-2`         |
| `shape`      | Border, outline, radius                         | `rounded-lg`           |
| `effects`    | Shadow, opacity, filters, transforms            | `opacity-50`           |
| `motion`     | Animation and transition                        | `duration-200`         |
| `unknown`    | CSS selfix cannot classify                      |                        |

- A pattern without `:` matches the base utility, so `mt-4` also matches `hover:-mt-4!`. A pattern with `:` matches the full token.
- Slash modifiers are part of the name, so `bg-primary` does not match `bg-primary/50`.
- Patterns are wildcards, not regexes. A misspelled category is treated as a class name.
- `no-restyle` passes a class only when every category it affects is allowed. Other rules pass it when any allowed pattern matches.

## Component contracts

A contract changes the options for components whose local name matches `pattern`. Each example below is one `no-restyle` setting.

**Allow margins and full width on Button, and nothing else.**

```ts
"no-restyle": ["error", {
  contracts: [{ pattern: "^Button$", allow: ["w-full", "mt-*", "mb-*"] }],
}],
```

`<Button class="mt-4 w-full">` passes. `<Button class="mx-2">` is reported.

**Let CardTitle change text size but not font weight.**

```ts
"no-restyle": ["error", {
  contracts: [{ pattern: "^CardTitle$", allow: ["layout", "typography"], deny: ["font-*"] }],
}],
```

`<CardTitle class="text-lg">` passes. `<CardTitle class="font-bold">` is reported.

**Let CardContent change padding.**

```ts
"no-restyle": ["error", {
  contracts: [{ pattern: "^CardContent$", allow: ["layout", "spacing"] }],
}],
```

`<CardContent class="p-6 md:p-8">` passes. `p-[13px]` passes `no-restyle` but is reported by [no-arbitrary-values](no-arbitrary-values.md).

Contracts follow these rules:

- The first matching contract wins, so put specific patterns first.
- A contract inherits the fields it omits from the rule and replaces the fields it sets. Contracts never inherit from each other.
- `allow: ["w-full"]` permits only that class. `deny: []` clears an inherited ban.

Prefer an existing prop such as `variant="secondary"` for appearance changes. Change a contract when callers need new control.

## Per-file rule overrides

Component implementations often need styles their callers cannot add. `overrides` changes rules for matching files:

```ts
overrides: [
  {
    files: ["src/components/ui/**/*.vue"],
    rules: { "no-inline-styles": "off", "no-restyle": "off" },
  },
],
```

| Pattern         | Matches                               |
| --------------- | ------------------------------------- |
| `src/Page.vue`  | One file                              |
| `src/*.vue`     | Files directly in `src`               |
| `src/Item?.vue` | One character after `Item`            |
| `src/**/*.vue`  | Files in `src` and all subdirectories |

- Patterns are case-sensitive, use `/`, and are relative to the config directory (API: `root`). Absolute paths and `..` are rejected.
- Only `*`, `**`, and `?` are wildcards. `**` matches zero or more directories, including dot directories, and must fill a whole path segment.
- Files outside the root never match.
- Every matching override applies, in order. A severity changes only the severity. Options update only the fields you set, and lists and message maps replace as a whole.
- Use `deny: []` or `contracts: []` to clear inherited values. `message: {}` clears the rule-level message, and contract messages still apply. Omitted fields and empty options keep the current settings.
- `exclude` skips whole files and cannot be undone by an override. Parse and loading failures cannot be turned off.

## Suppress findings

Fix the finding first. If a class is acceptable everywhere, add it to `allow`. If a component accepts it, give that component a [contract](#component-contracts), and if a group of files needs it, add an override. Each of these states the policy once, in the config.

For one deliberate, reviewed exception, put a comment on the line above the finding:

```vue
<template>
  <!-- selfix-disable-next-line no-raw-colors, no-arbitrary-values -- partner brand color -->
  <div class="bg-[#e30613]" />
</template>
```

- The comment suppresses findings of the named rules that start on the next line. Separate rule names with commas.
- The text after `--` is the reason, and it is required.
- Class findings start at their `class` attribute or binding. On an element that spans several lines, put that attribute on the line after the comment.
- A comment without a reason, or one that names an unknown rule or `parse-error`, is an `invalid-exception` error. It suppresses nothing.
- A comment rule that suppresses nothing is an `unused-exception` finding at the comment, so stale comments fail the check. Set `unusedExceptions` to `"warn"` or `"off"` to change that, or pass `--unused-exceptions` to the CLI.
- selfix supports only `selfix-disable-next-line`. Other `selfix-disable` and `selfix-enable` comments are invalid. Use an override for whole files.
- Only template comments work. Findings in `<script>` and `<style>`, such as a `<style>` block reported by `no-inline-styles`, cannot be suppressed inline. Use an override or a [baseline](cli.md#baseline).
- Parse errors and loading failures cannot be suppressed.

The CLI counts suppressed findings in its summary and applies comments before a baseline. API results from [`check`](api.md#lint-source) list each suppressed finding with its `reason`.

## Class helpers

selfix reads the arguments of `clsx` (named or default import) and of `twMerge` from `tailwind-merge`. Add other helpers by import:

```ts
classHelpers: [
  { from: "@/lib/utils", import: "cn" },
  { from: "my-classes", import: "default" },
],
```

- Entries match the import source and exported name, not the local alias. `import { cn as classes } from "@/lib/utils"` enables `classes("flex")`.
- selfix never loads the helper module. Only add helpers whose arguments follow [clsx-style class expressions](analysis.md#vue-class-bindings).
- Unshadowed `cn`, `clsx`, and `twMerge` stay recognized from any source. `[]` does not disable them.
- `cva` and `tv` build variants rather than merge classes. Do not add them here.

## Configured class props

`classProps` makes selfix check classes passed through component props:

```ts
classProps: [
  { pattern: "^U[A-Z]", props: { ui: "slot-map" } },
  { pattern: "^MyPanel$", props: { contentClass: "class" } },
],
```

```vue
<UButton :ui="{ base: 'p-4', label: 'font-bold' }" />
<MyPanel content-class="mt-4" />
```

- `"class"` reads an ordinary [class expression](analysis.md#vue-class-bindings). `"slot-map"` reads a literal object whose keys name component parts.
- The first matching entry wins. `pattern` matches the local component name, as in contracts. `contentClass` and `content-class` are the same prop.
- Findings name the prop and the known slot. selfix ignores props you don't configure.
- Slot maps must be literal. Computed keys, spreads, and variables are unreadable.
- `no-restyle` still needs a recognized component, and all slots share its contract. Native `class` and `style` cannot be configured.

## Custom messages

Set `message` on a rule or a contract:

```ts
message: "Use Button's variant prop instead of {{className}}.",
```

A map keyed by category also works, with `default` as the fallback.

| Placeholder     | Value                                                                                       |
| --------------- | ------------------------------------------------------------------------------------------- |
| `{{component}}` | Local component or tag name, or `style` for SFC blocks                                      |
| `{{className}}` | The class, or empty for static-class and inline-style findings                              |
| `{{category}}`  | The category, or `unknown` for static-class and inline-style findings                       |
| `{{file}}`      | Absolute in the CLI. In the API, the name as you passed it                                  |
| `{{prop}}`      | Configured prop name, or empty                                                              |
| `{{slot}}`      | Known slot name, or empty                                                                   |
| `{{rule}}`      | Rule name                                                                                   |
| `{{sizes}}`     | `no-restyle` only. The component's `size` values when its prop is a string-literal union    |
| `{{variants}}`  | `no-restyle` only. The component's `variant` values when its prop is a string-literal union |

Add `|` and fallback text to any placeholder to use when its value is empty, such as `{{sizes|none defined}}`. For a Button with `sm` and `lg` sizes, `"Use a {{component}} size: {{sizes|none defined}}."` starts the message with `Use a Button size: sm, lg.` selfix still appends the definition details.

A category message beats `default`, which beats built-in guidance. A contract's message replaces the rule's whole map. `note` appends text to every finding. Parse errors keep their own message.

## Component source discovery

The CLI finds each component's source file to add its path and its `size` and `variant` choices to findings. Discovery never changes which components are protected. Set `project: false` to turn it off, or set these fields in `project: { ... }`:

| Option                  | Purpose                                                                                              |
| ----------------------- | ---------------------------------------------------------------------------------------------------- |
| `root`                  | Source directory relative to the config directory. Defaults to that directory                        |
| `aliases`               | Import patterns mapped to paths relative to `root`, with at most one `*`                             |
| `components`            | Component names mapped to `.vue` files relative to `root`                                            |
| `tsconfig`              | Metadata file relative to `root`. Detected from tsconfig, jsconfig, or Nuxt                          |
| `nuxt`                  | Turns Nuxt mode on or off. Detected by default                                                       |
| `componentDeclarations` | Generated auto-import declarations relative to `root`. Nuxt mode defaults to `.nuxt/components.d.ts` |

- Explicit `aliases` and `components` win over discovered ones. For Nuxt, run `nuxt prepare` first. A custom Nuxt build directory needs a matching `componentDeclarations` path, `tsconfig`, and [CSS paths](nuxt.md).
- `componentDeclarations` replaces `nuxtComponents`, which is rejected. Rename the key and keep its path. The new key does not turn on Nuxt mode, so set `nuxt: true` if your Nuxt project is not detected.
- Missing explicit mappings, malformed metadata, and invalid resolved components fail loading.
- A component file that cannot be parsed still gives its path, without prop choices. Unresolved or unsupported definitions omit guidance the same way.
- Prop choices are suggestions. They do not promise the same visual result as the reported class.
- In the API, discovery is off by default. See [API reuse](api.md#component-discovery-and-reuse). For recovery steps, see [Troubleshooting](troubleshooting.md).

### Auto-imported components outside Nuxt

`unplugin-vue-components` writes a `components.d.ts` that declares each auto-imported component in `GlobalComponents`. Point discovery at it so findings for `<HelloWorld>` name `src/components/HelloWorld.vue`:

```ts
export default defineConfig({
  css: "src/style.css",
  project: { componentDeclarations: "components.d.ts" },
})
```

selfix reads entries typed `typeof import("./file.vue")["default"]` inside `declare module "vue"` or `declare module "@vue/runtime-core"`, and Nuxt-style `export const` entries. It skips package imports such as `typeof import("vue-router")["RouterLink"]`. Setting the path does not turn on Nuxt mode. A missing or unreadable file fails loading, and so does an entry whose `.vue` file was deleted. Regenerate the file with your dev server or build before the check.
