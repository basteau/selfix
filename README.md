# <img src="https://raw.githubusercontent.com/basteau/selfix/main/apps/docs/public/logo.svg" alt="" width="32" height="32" /> selfix

[![npm](https://img.shields.io/npm/v/selfix)](https://www.npmjs.com/package/selfix) [![CI](https://github.com/basteau/selfix/actions/workflows/ci.yml/badge.svg)](https://github.com/basteau/selfix/actions/workflows/ci.yml) [![License: MIT](https://img.shields.io/npm/l/selfix)](https://github.com/basteau/selfix/blob/main/LICENSE)

**Catch Tailwind classes that break your design system.**

selfix lints Vue 3 templates against your own components and Tailwind CSS 4 theme. It reports component overrides, raw colors, typos, and other styling drift. Each finding says how to fix it.

```vue
<script setup lang="ts">
import { Button } from "@/components/ui/button"
</script>

<template>
  <Button class="p-4">Save</Button>
</template>
```

```text
$ pnpm exec selfix src
src/Page.vue:6:11 error no-restyle "p-4" is not allowed on <Button>: spacing changes are outside the component's contract. Remove this override. Check the component's documented spacing props and its contract before changing surrounding layout.
Checked 1 Vue file: 1 error, 0 warnings.
```

Change the class to `mt-4 w-full` and the check passes. The page places the Button, and the Button keeps its own padding. selfix never edits your files.

## Quick start

You need Node.js 22.18 or later, Vue 3 (3.2.13 or later), and Tailwind CSS 4.

```sh
pnpm add -D selfix
```

Add `"type": "module"` to `package.json` and create `selfix.config.ts` next to it:

```ts
import { defineConfig } from "selfix"

export default defineConfig({
  css: "src/style.css", // your Tailwind entry
  ui: ["@/components/ui"], // import prefix of your shared components
})
```

Check which components selfix protects, then run the check:

```sh
pnpm exec selfix src --doctor
pnpm exec selfix src
```

selfix reads your templates and CSS without running your app. Your `selfix.config.ts` and Tailwind `@plugin` and `@config` modules do run, so only use configs you trust.

Every rule is an error by default. In an existing app, [start with warnings](https://selfix.exe.xyz/docs/adoption/) and turn on one rule at a time.

To let a coding agent do the setup, give it this prompt:

```text
Set up selfix in this project. Follow
https://github.com/basteau/selfix/blob/main/apps/docs/content/agent-setup.md
```

## Rules

| Rule                                                                              | Reports                                                |
| --------------------------------------------------------------------------------- | ------------------------------------------------------ |
| [no-restyle](https://selfix.exe.xyz/docs/no-restyle/)                             | Classes that change a protected component's appearance |
| [no-raw-colors](https://selfix.exe.xyz/docs/no-raw-colors/)                       | Palette colors, literal colors, and raw SVG paints     |
| [no-unknown-classes](https://selfix.exe.xyz/docs/no-unknown-classes/)             | Classes your Tailwind CSS cannot generate              |
| [no-arbitrary-values](https://selfix.exe.xyz/docs/no-arbitrary-values/)           | Bracket values such as `p-[13px]`                      |
| [no-inline-styles](https://selfix.exe.xyz/docs/no-inline-styles/)                 | `style` attributes and SFC `<style>` blocks            |
| [require-static-classes](https://selfix.exe.xyz/docs/require-static-classes/)     | Class values selfix cannot read without running code   |
| [no-restricted-components](https://selfix.exe.xyz/docs/no-restricted-components/) | Components or imports you ban                          |

## Documentation

- [Getting started](https://selfix.exe.xyz/docs/getting-started/) and [adoption in an existing app](https://selfix.exe.xyz/docs/adoption/)
- [Rules and exceptions](https://selfix.exe.xyz/docs/rules/) and [what selfix can read](https://selfix.exe.xyz/docs/analysis/)
- Recipes for [shadcn-vue](https://selfix.exe.xyz/docs/shadcn-vue/), [Nuxt](https://selfix.exe.xyz/docs/nuxt/), and [CI](https://selfix.exe.xyz/docs/ci/)
- [Configuration](https://selfix.exe.xyz/docs/configuration/), [CLI](https://selfix.exe.xyz/docs/cli/), and [API](https://selfix.exe.xyz/docs/api/) reference
- [How selfix works](https://selfix.exe.xyz/docs/how-it-works/), [Troubleshooting](https://selfix.exe.xyz/docs/troubleshooting/), and [FAQ](https://selfix.exe.xyz/docs/faq/)

## Contributing

```sh
pnpm install --frozen-lockfile
pnpm dev          # Build selfix and start the Vue playground
pnpm docs:dev     # Start the documentation site
pnpm check        # Run all repository checks
```

Read [AGENTS.md](https://github.com/basteau/selfix/blob/main/AGENTS.md) for project conventions and [Development](https://selfix.exe.xyz/docs/maintaining/) for testing and docs. Maintainers publish with [Releases and deployment](https://selfix.exe.xyz/docs/releasing/).

To report a bug, [open an issue](https://github.com/basteau/selfix/issues) with a small Vue and CSS example, your config, the command, and your dependency versions.

## License

[MIT](https://github.com/basteau/selfix/blob/main/LICENSE). selfix is an independent project inspired by [shadcn/lint](https://github.com/shadcn-ui/lint). Adapted code keeps its upstream attribution.
