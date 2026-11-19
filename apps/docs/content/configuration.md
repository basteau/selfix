---
title: Configuration
description: Every selfix.config.ts setting, with contracts, overrides, and messages.
---

selfix runs without a config. Add `selfix.config.ts` next to `package.json` to change a rule, give a component more freedom, or protect your own components:

```ts
import { defineConfig } from "selfix"

export default defineConfig({
  // Protect your own components next to Nuxt UI's.
  components: ["^App[A-Z]"],
  rules: {
    // Let UCard accept padding. Other components keep the default.
    "no-restyle": [
      "error",
      {
        contracts: [{ pattern: "^UCard$", allow: ["layout", "spacing"] }],
      },
    ],
    "no-raw-colors": "warn",
  },
  // Your component files style themselves and forward what they receive.
  overrides: [
    {
      files: ["app/components/app/**/*.vue"],
      rules: {
        "no-restyle": "off",
        "prefer-ui-components": "off",
        "require-static-classes": "off",
      },
    },
  ],
})
```

## All settings

| Field              | Default                                                      | Purpose                                                                     |
| ------------------ | ------------------------------------------------------------ | --------------------------------------------------------------------------- |
| `css`              | The one stylesheet in the project that imports `tailwindcss` | [Tailwind entry](themes.md#the-css-entry), relative to the config directory |
| `buildDir`         | `.nuxt`, then `node_modules/.nuxt-ui`                        | Where Nuxt UI [generated its theme](themes.md#the-generated-nuxt-ui-theme)  |
| `prefix`           | `"U"`                                                        | The Nuxt UI component prefix                                                |
| `components`       | `[]`                                                         | Name regexes for [your own components](#protected-components) to protect    |
| `rules`            | Every rule at `"error"`                                      | [Rule settings](#rule-settings)                                             |
| `overrides`        | `[]`                                                         | [Per-file rule settings](#per-file-rule-overrides)                          |
| `classHelpers`     | `[]`                                                         | Extra [class helpers](#class-helpers)                                       |
| `exclude`          | `[]`                                                         | Files the CLI skips entirely. See [file selection](cli.md#file-selection)   |
| `note`             | None                                                         | Text appended to every finding                                              |
| `unusedExceptions` | `"error"`                                                    | Severity of [exception comments](#suppress-findings) that suppress nothing  |

## Configuration file

Node loads `selfix.config.ts` directly, without type-checking, so `package.json` needs `"type": "module"`. The config file cannot use enums or `tsconfig` path aliases. `defineConfig` rejects invalid settings. A config with another extension, such as `selfix.config.js`, is an error.

> **The config runs as code.** Only use config files you trust.

## Protected components

[no-restyle](no-restyle.md) protects two groups of components.

**Nuxt UI components** are recognized by name: the prefix plus a themed component your installed version ships.

- `<UButton>`, `<u-button>`, and `<LazyUButton>` are the same component.
- An import from `#components`, `#ui/components/…`, or `@nuxt/ui/components/…` is recognized under any local name.
- Components without a theme are not protected. `UIcon` and `UApp` have no appearance of their own, so `class` is how you style them. The same goes for thin wrappers such as `UColorModeButton`. Name those in `components` if you want them protected.

**Your own components** are the ones whose name matches a `components` pattern:

```ts
components: ["^App[A-Z]", "^PageHeader$"],
```

- Patterns match the PascalCase name, so `^AppCard$` also covers `<app-card>`, `<appCard>`, and Nuxt's `<LazyAppCard>`. An imported component matches under its local name.
- Patterns never match native elements such as `<button>`.
- A component from a local import is never treated as Nuxt UI's, even when it is named `UButton`.
- On protected components, `class` and `ui` are read. Classes passed through other props are not checked.

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

For `no-restyle`, `allow` lists what callers may add. For the color, arbitrary-value, and unknown-class rules, it lists exceptions. `no-inline-styles` matches the token `style`. `require-static-classes` takes `contracts` and `message` only. [prefer-ui-components](prefer-ui-components.md) and [no-restricted-components](no-restricted-components.md) have their own options.

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

A contract changes the options for components whose name matches `pattern`. Each example below is one `no-restyle` setting.

**Allow margins and full width on UButton, and nothing else.**

```ts
"no-restyle": ["error", {
  contracts: [{ pattern: "^UButton$", allow: ["w-full", "mt-*", "mb-*"] }],
}],
```

`<UButton class="mt-4 w-full">` passes. `<UButton class="mx-2">` is reported.

**Let UFormField change text size but not font weight.**

```ts
"no-restyle": ["error", {
  contracts: [{ pattern: "^UFormField$", allow: ["layout", "typography"], deny: ["font-*"] }],
}],
```

`<UFormField class="text-lg">` passes. `<UFormField class="font-bold">` is reported.

**Let UCard change padding.**

```ts
"no-restyle": ["error", {
  contracts: [{ pattern: "^UCard$", allow: ["layout", "spacing"] }],
}],
```

`<UCard class="p-6 md:p-8">` passes, and so does `:ui="{ body: 'p-0' }"`. `p-[13px]` passes `no-restyle` but is reported by [no-arbitrary-values](no-arbitrary-values.md).

Contracts follow these rules:

- `pattern` is a regular expression on the component name. However the tag is written, a Nuxt UI component matches under its registered name: `<u-card>` and `<LazyUCard>` use the `UCard` contract.
- A contract covers `class` and every slot of `ui`.
- The first matching contract wins, so put specific patterns first.
- A contract inherits the fields it omits from the rule and replaces the fields it sets. Contracts never inherit from each other.
- `allow: ["w-full"]` permits only that class. `deny: []` clears an inherited ban.

Prefer an existing prop such as `variant="outline"`, or `app.config.ts` when every instance should change. Change a contract when callers need new control.

## Per-file rule overrides

Your own component files often need styles their callers cannot add. `overrides` changes rules for matching files:

```ts
overrides: [
  {
    files: ["app/components/app/**/*.vue"],
    rules: { "no-restyle": "off", "prefer-ui-components": "off" },
  },
],
```

A component that forwards the classes it receives, such as `:class="props.class"` or `:ui="props.ui"`, also needs `"require-static-classes": "off"` there, because selfix cannot read a forwarded value.

| Pattern         | Matches                               |
| --------------- | ------------------------------------- |
| `app/Page.vue`  | One file                              |
| `app/*.vue`     | Files directly in `app`               |
| `app/Item?.vue` | One character after `Item`            |
| `app/**/*.vue`  | Files in `app` and all subdirectories |

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

## Custom messages

Set `message` on a rule or a contract:

```ts
message: "Use a {{component}} size instead of {{className}}: {{sizes|none defined}}.",
```

A map keyed by category also works, with `default` as the fallback.

| Placeholder     | Value                                                                  |
| --------------- | ---------------------------------------------------------------------- |
| `{{component}}` | Component or tag name as written, or `style` for SFC blocks            |
| `{{className}}` | The class, or empty for static-class and inline-style findings         |
| `{{category}}`  | The category, or `unknown` for static-class and inline-style findings  |
| `{{file}}`      | Absolute in the CLI. In the API, the name as you passed it             |
| `{{prop}}`      | `ui` for a finding in the `ui` prop, an SVG paint attribute, or empty  |
| `{{slot}}`      | The slot inside `ui`, or empty                                         |
| `{{rule}}`      | Rule name                                                              |
| `{{sizes}}`     | `no-restyle` only. The `size` values of a Nuxt UI component's theme    |
| `{{variants}}`  | `no-restyle` only. The `variant` values of a Nuxt UI component's theme |

Add `|` and fallback text to any placeholder to use when its value is empty, such as `{{sizes|none defined}}`. For `<UButton class="p-4">`, the message above reads `Use a UButton size instead of p-4: xs, sm, md, lg, xl.`

A category message beats `default`, which beats built-in guidance. A contract's message replaces the rule's whole map. A custom message replaces the built-in guidance, so name the fix you want. `note` appends text to every finding and keeps the built-in text. Parse errors keep their own message.
