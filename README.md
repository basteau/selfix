# <img src="https://raw.githubusercontent.com/basteau/selfix/main/apps/docs/public/logo.svg" alt="" width="32" height="32" /> selfix

[![npm](https://img.shields.io/npm/v/selfix)](https://www.npmjs.com/package/selfix) [![CI](https://github.com/basteau/selfix/actions/workflows/ci.yml/badge.svg)](https://github.com/basteau/selfix/actions/workflows/ci.yml) [![License: MIT](https://img.shields.io/npm/l/selfix)](https://github.com/basteau/selfix/blob/main/LICENSE)

**Catch the classes that break your Nuxt UI design system.**

selfix lints Vue templates against Nuxt UI's components and the theme your app generated. It reports restyled components, raw colors, native elements, typos, and other styling drift. Each finding says which prop or token to use instead.

```vue
<template>
  <UButton class="p-4">Save</UButton>
</template>
```

```text
$ pnpm exec selfix
app/pages/example.vue:2:12 error no-restyle "p-4" is not allowed on <UButton>: the component owns its spacing. Use size (xs, sm, md, lg, xl), or restyle it for the whole app under ui.button in app.config.ts.
Checked 1 Vue file: 1 error, 0 warnings.
```

Change it to `size="lg" class="mt-4 w-full"` and the check passes. The page places the button, and Nuxt UI keeps its look. The sizes in the message come from your own theme. selfix never edits your files.

## Quick start

You need Node.js 22.18 or later, Nuxt UI 4, Vue 3 (3.2.13 or later), and Tailwind CSS 4. selfix works in Nuxt apps and in Vue apps that use the `@nuxt/ui/vite` plugin.

```sh
pnpm add -D selfix
pnpm exec nuxt prepare
pnpm exec selfix
```

There is no config to write. selfix finds your stylesheet, reads the theme Nuxt UI generated for your app, and knows the components of the version you installed. It checks `class` and the `ui` prop of every themed Nuxt UI component.

selfix reads your templates and CSS without running your app. A `selfix.config.ts` and Tailwind `@plugin` and `@config` modules do run, so only use configs you trust.

Every rule is an error by default. In an existing app, [start with warnings](https://selfix.exe.xyz/docs/adoption/) and turn on one rule at a time.

To let a coding agent do the setup, give it this prompt:

```text
Set up selfix in this project. Follow
https://github.com/basteau/selfix/blob/main/apps/docs/content/agent-setup.md
```

## Flexible where you decide

Add `selfix.config.ts` when your design system allows more, or covers more:

```ts
import { defineConfig } from "selfix"

export default defineConfig({
  // Protect your own components next to Nuxt UI's.
  components: ["^App[A-Z]"],
  rules: {
    // Callers may set padding and gap on cards.
    "no-restyle": ["error", { contracts: [{ pattern: "^UCard$", allow: ["layout", "spacing"] }] }],
  },
})
```

For the rest, there are [file overrides](https://selfix.exe.xyz/docs/configuration/#per-file-rule-overrides), [exception comments](https://selfix.exe.xyz/docs/configuration/#suppress-findings) with a required reason, and a [baseline](https://selfix.exe.xyz/docs/adoption/#record-existing-findings-in-a-baseline) for existing findings.

## Rules

| Rule                                                                              | Reports                                              |
| --------------------------------------------------------------------------------- | ---------------------------------------------------- |
| [no-restyle](https://selfix.exe.xyz/docs/no-restyle/)                             | Classes in `class` or `ui` that change a component   |
| [prefer-ui-components](https://selfix.exe.xyz/docs/prefer-ui-components/)         | Native elements Nuxt UI has a component for          |
| [no-raw-colors](https://selfix.exe.xyz/docs/no-raw-colors/)                       | Palette colors, literal colors, and raw SVG paints   |
| [no-unknown-classes](https://selfix.exe.xyz/docs/no-unknown-classes/)             | Classes your Tailwind CSS cannot generate            |
| [no-arbitrary-values](https://selfix.exe.xyz/docs/no-arbitrary-values/)           | Bracket values such as `p-[13px]`                    |
| [no-inline-styles](https://selfix.exe.xyz/docs/no-inline-styles/)                 | `style` attributes and SFC `<style>` blocks          |
| [require-static-classes](https://selfix.exe.xyz/docs/require-static-classes/)     | Class values selfix cannot read without running code |
| [no-restricted-components](https://selfix.exe.xyz/docs/no-restricted-components/) | Components or imports you ban                        |

## Documentation

- [Getting started](https://selfix.exe.xyz/docs/getting-started/) and [adoption in an existing app](https://selfix.exe.xyz/docs/adoption/)
- [Rules and exceptions](https://selfix.exe.xyz/docs/rules/) and [what selfix can read](https://selfix.exe.xyz/docs/analysis/)
- Recipes for [Nuxt](https://selfix.exe.xyz/docs/nuxt/), [Vue with Vite](https://selfix.exe.xyz/docs/vue/), and [CI](https://selfix.exe.xyz/docs/ci/)
- [Configuration](https://selfix.exe.xyz/docs/configuration/), [CLI](https://selfix.exe.xyz/docs/cli/), and [API](https://selfix.exe.xyz/docs/api/) reference
- [How selfix works](https://selfix.exe.xyz/docs/how-it-works/), [Troubleshooting](https://selfix.exe.xyz/docs/troubleshooting/), and [FAQ](https://selfix.exe.xyz/docs/faq/)

## Contributing

```sh
pnpm install --frozen-lockfile
pnpm dev          # Build selfix and start the Nuxt UI playground
pnpm docs:dev     # Start the documentation site
pnpm check        # Run all repository checks
```

Read [AGENTS.md](https://github.com/basteau/selfix/blob/main/AGENTS.md) for project conventions and [Development](https://selfix.exe.xyz/docs/maintaining/) for testing and docs. Maintainers publish with [Releases and deployment](https://selfix.exe.xyz/docs/releasing/).

To report a bug, [open an issue](https://github.com/basteau/selfix/issues) with a small Vue and CSS example, your config, the command, and your dependency versions.

## License

[MIT](https://github.com/basteau/selfix/blob/main/LICENSE). selfix is an independent project inspired by [shadcn/lint](https://github.com/shadcn-ui/lint), the better choice for a Tailwind project without Nuxt UI. Adapted code keeps its upstream attribution.
