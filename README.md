# <img src="https://raw.githubusercontent.com/basteau/selfix/main/apps/docs/public/logo.svg" alt="" width="32" height="32" /> selfix

**selfix - a linter for your design system**

A shared Button shouldn't need its padding and colors redefined on every page. selfix checks the classes added to your components and reports styling that breaks their rules.

```vue
<!-- Changes the Button's padding: reported by selfix. -->
<Button class="p-4">Save</Button>

<!-- Controls its placement: allowed by default. -->
<Button class="mt-4 w-full">Save</Button>
```

Tell selfix which components to protect and which Tailwind theme to use. It points to the offending class in your `.vue` file and explains what to change. It also checks raw colors, arbitrary values, inline styles, unknown classes, and unreadable class expressions.

Built for **Vue 3 and Tailwind CSS 4**. Works with your own components. No UI kit, class helper, ESLint, or Oxlint required.

## Try it

Requires **Node.js ≥22.18.0**, **Vue ≥3.2.13 <4**, and **Tailwind CSS ≥4 <5**. Install any missing Vue or Tailwind peers, then add selfix:

```sh
pnpm add -D selfix
```

Use `"type": "module"` in your project's `package.json`. Create `selfix.config.ts` in the project root:

```ts
import { defineConfig } from "selfix"

export default defineConfig({
  css: "src/style.css",
  ui: ["./components/ui"],
})
```

Set `css` to your application's Tailwind entry. Set `ui` to match your component imports: this example recognizes `import Button from "./components/ui/Button.vue"`.

Run from the project root:

```sh
pnpm exec selfix src
```

All seven rules start as errors (component restrictions require a configured list), including the rule against SFC `<style>` blocks. For an existing app, [start with warnings](https://github.com/basteau/selfix/blob/main/apps/docs/content/adoption.md). For a complete example with a theme, Button, and first correction, follow [Getting started](https://github.com/basteau/selfix/blob/main/apps/docs/content/getting-started.md).

selfix leaves your source unchanged. Fix a finding using component props, theme classes, or an explicit exception, then rerun the check.

Add `"lint:design": "selfix src"` to your existing package scripts. Run it after UI changes and in CI. See [Adoption](https://github.com/basteau/selfix/blob/main/apps/docs/content/adoption.md) for warning limits, workspaces, and agent instructions.

## Documentation

- [Getting started](https://github.com/basteau/selfix/blob/main/apps/docs/content/getting-started.md): catch your first styling override.
- [Rules and exceptions](https://github.com/basteau/selfix/blob/main/apps/docs/content/rules.md): choose what to enforce.
- [Configuration](https://github.com/basteau/selfix/blob/main/apps/docs/content/configuration.md): protect components and define their contracts.
- [Agent setup](https://github.com/basteau/selfix/blob/main/apps/docs/content/agent-setup.md): let a coding agent configure and verify the check.

selfix reads Vue source and Tailwind CSS without evaluating application expressions. A clean result covers the selected files and enabled checks. See [Analysis limits](https://github.com/basteau/selfix/blob/main/apps/docs/content/analysis.md) for supported syntax and configuration trust.

## Contributing

Clone this repository and run from its root:

```sh
pnpm install --frozen-lockfile
pnpm dev          # Build selfix and start the Vue playground
pnpm docs:dev     # Start the Blume documentation site
pnpm check        # Run all repository checks
```

Edit docs in `apps/docs/content`. Read [AGENTS.md](AGENTS.md) for project conventions and [Development](https://github.com/basteau/selfix/blob/main/apps/docs/content/maintaining.md) for testing and releases.

[Report a bug](https://github.com/basteau/selfix/issues) with your Vue/CSS example, config, command, and dependency versions.

## Acknowledgments and license

Inspired by [shadcn/lint](https://github.com/shadcn-ui/lint). selfix is an independent project; adapted code retains upstream attribution. [MIT licensed](LICENSE).
