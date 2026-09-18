# selfix

**Design-system linting for Vue 3 and Tailwind CSS 4.**

Define what your components allow. selfix reports styling that breaks those contracts and gives developers and coding agents guidance for correcting it.

Works with your own components and theme. No UI kit, class helper, ESLint, or Oxlint required. selfix uses Vue's parser and Tailwind's compiler and never evaluates application expressions.

[Getting started](https://github.com/basteau/selfix/blob/main/docs/getting-started.md) · [Adoption](https://github.com/basteau/selfix/blob/main/docs/adoption.md) · [Documentation](https://github.com/basteau/selfix/blob/main/docs/README.md)

## What it catches

A component owns its appearance. Callers choose its props and use layout utilities to place it:

```vue
<!-- Reports no-restyle: padding overrides the Button's spacing. -->
<Button variant="secondary" class="p-4">Save</Button>

<!-- Passes the default policy: use a variant and surrounding layout. -->
<Button variant="secondary" class="mt-4 w-full">Save</Button>
```

This example assumes Button is recognized through your configuration and provides a `secondary` variant. selfix can report verified literal size/variant choices from supported component definitions; it does not validate prop values or infer visual equivalence. The [complete tutorial](https://github.com/basteau/selfix/blob/main/docs/getting-started.md) defines this Button and its theme.

## Install

Requires **Node.js ≥22.18.0**, **Vue ≥3.2.13 <4**, and **Tailwind CSS ≥4 <5**. Vue and Tailwind are the only consumer peer dependencies; install any missing peers first.

CI covers packed consumers on Linux and macOS using Node 22.18.0 with the minimum Vue/Tailwind peers, and Node 24 with workspace peers. Each run records exact versions; see the [compatibility checks](https://github.com/basteau/selfix/blob/main/docs/maintaining.md) for the matrix and local commands.

```sh
pnpm add -D selfix
```

Use `"type": "module"` in your project's `package.json`. selfix runs as a standalone command with `selfix.config.ts`, loaded by Node's native TypeScript support. Type annotations, `import type`, and `satisfies` work; enums and `tsconfig` path aliases do not. Node does not type-check this file.

**Configuration executes as Node code.** Use trusted `selfix.config.ts` files and Tailwind `@plugin`/`@config` modules. See [analysis and trust boundaries](https://github.com/basteau/selfix/blob/main/docs/analysis.md#limitations-and-trust).

## Configure and run

Run from your Vue project's root. Point selfix at the Tailwind CSS entry used by your application. For a minimal example, create `src/style.css`:

```css
@import "tailwindcss";
```

Create `selfix.config.ts`:

```ts
import { defineConfig } from "selfix"

export default defineConfig({
  css: "src/style.css",
  ui: ["./components/ui"],
})
```

`ui` matches import-source prefixes, not filesystem directories. This configuration recognizes `import Button from "./components/ui/Button.vue"` in a Vue SFC. Adjust the prefix to match your application's imports; use `components` for global or auto-imported components. See [component recognition](https://github.com/basteau/selfix/blob/main/docs/configuration.md#component-recognition).

Run the check on your source directory:

```sh
pnpm exec selfix src
```

**All six rules default to errors**, including `no-inline-styles`, which reports SFC `<style>` blocks. Omitted rules stay enabled. To start with warnings and enable rules gradually, follow [adoption](https://github.com/basteau/selfix/blob/main/docs/adoption.md).

Diagnostics point to the original `.vue` file. Errors fail the command; warnings fail only when they exceed a configured `--max-warnings` limit. Configuration, theme-loading, and empty-scan failures also fail the command. See [CLI output and exit codes](https://github.com/basteau/selfix/blob/main/docs/cli.md#discovery-and-output).

Default restyling messages explain the rejected category and point to the component's documented props or contract, without inventing available variants. selfix leaves source unchanged and provides no autofix. Correct findings using component props, theme tokens, and configured contracts, then rerun the check.

For a repeatable local and CI check, add this script to your existing `package.json`:

```json
{
  "scripts": {
    "lint:design": "selfix src"
  }
}
```

Run `pnpm run lint:design` after UI changes. The [adoption guide](https://github.com/basteau/selfix/blob/main/docs/adoption.md#run-locally-and-in-ci) includes CI commands and coding-agent instructions.

## Rules

| Rule                                                                                                       | Purpose                                                      |
| ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| [no-restyle](https://github.com/basteau/selfix/blob/main/docs/rules.md#no-restyle)                         | Keep component styling within its contract.                  |
| [no-raw-colors](https://github.com/basteau/selfix/blob/main/docs/rules.md#no-raw-colors)                   | Use semantic theme colors.                                   |
| [no-arbitrary-values](https://github.com/basteau/selfix/blob/main/docs/rules.md#no-arbitrary-values)       | Use named utilities instead of arbitrary values.             |
| [no-inline-styles](https://github.com/basteau/selfix/blob/main/docs/rules.md#no-inline-styles)             | Use classes instead of style attributes or SFC style blocks. |
| [no-unknown-classes](https://github.com/basteau/selfix/blob/main/docs/rules.md#no-unknown-classes)         | Check classes against the loaded Tailwind theme and CSS.     |
| [require-static-classes](https://github.com/basteau/selfix/blob/main/docs/rules.md#require-static-classes) | Keep possible class names statically readable.               |

Only `no-restyle` requires a recognized UI component; the other five also check native elements. An allowance in one rule does not bypass another. Find options, defaults, precedence, and worked contracts in [configuration](https://github.com/basteau/selfix/blob/main/docs/configuration.md).

## Scope

selfix analyzes Vue single-file component templates against your loaded Tailwind theme and explicit policies. It reads supported literal alternatives and limited script constants without rendering the app or evaluating application expressions.

Additional class props such as `ui` or `contentClass` require explicit [classProps configuration](https://github.com/basteau/selfix/blob/main/docs/configuration.md#configured-class-props). The CLI discovers supported component sources and literal size/variant choices for diagnostic guidance; there is no wrapper tracing. JSX/TSX, template preprocessors, and external templates are outside the supported input.

**Exclusions skip every rule for the entire file.** Use [per-file rule overrides](https://github.com/basteau/selfix/blob/main/docs/configuration.md#per-file-rule-overrides) to relax selected checks while keeping the others active. There are no inline suppressions. A clean result applies only to the selected source and enabled checks; it does not guarantee complete styling coverage.

Unsupported input and failed theme loading must not silently pass. Recoverable uncertainty can report `parse-error` alongside independent rule findings; fatal parser failures suppress ordinary findings for that file. See [analysis boundaries](https://github.com/basteau/selfix/blob/main/docs/analysis.md) for supported expressions and limits.

## Documentation and contributing

- [Getting started](https://github.com/basteau/selfix/blob/main/docs/getting-started.md): complete theme, Button, failing diagnostic, and correction.
- [Adoption](https://github.com/basteau/selfix/blob/main/docs/adoption.md): gradual rollout, warning limits, CI, and coding agents.
- [Agent setup](https://github.com/basteau/selfix/blob/main/docs/agent-setup.md): copyable setup prompt, workspace configuration, and verification.
- [Configuration](https://github.com/basteau/selfix/blob/main/docs/configuration.md), [CLI](https://github.com/basteau/selfix/blob/main/docs/cli.md), and [API](https://github.com/basteau/selfix/blob/main/docs/api.md): reference material.
- [Themes](https://github.com/basteau/selfix/blob/main/docs/themes.md): CSS resolution and Nuxt UI theme preparation.
- [Troubleshooting](https://github.com/basteau/selfix/blob/main/docs/troubleshooting.md): unexpected findings and loading failures.
- [Maintaining](https://github.com/basteau/selfix/blob/main/docs/maintaining.md): development, package verification, and releases.
- [Contributor guide](https://github.com/basteau/selfix/blob/main/AGENTS.md): project conventions.

[Bug reports](https://github.com/basteau/selfix/issues) should include a minimal Vue/CSS example, config, command, diagnostic, and dependency versions. Browse all guides in the [documentation index](https://github.com/basteau/selfix/blob/main/docs/README.md).

## Acknowledgments

Inspired by [shadcn/lint](https://github.com/shadcn-ui/lint), with thanks to shadcn and its contributors. selfix is an independent Vue-focused project; MIT-licensed adaptations retain upstream attribution in [LICENSE](LICENSE).

## License

MIT licensed. See [LICENSE](LICENSE).
