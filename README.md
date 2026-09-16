# selfix

Design-system linting for Vue and Tailwind CSS.

Define which classes your components allow, keep styling on your theme, and get diagnostics that explain how to fix violations. Run selfix from the command line or use its typed Node API.

```vue
<!-- Let the page control placement. -->
<Button size="lg" class="mt-4 w-full">Save</Button>

<!-- Report padding that belongs to the component. -->
<Button class="p-4">Save</Button>
```

With the default component policy, the second example reports:

```text
"p-4" is not allowed on <Button>: the component owns its spacing. Use a component variant; use margin or a parent gap for surrounding space.
```

## Requirements

- Node.js 22.18 or later.
- Vue 3.2.13 or later within Vue 3.
- Tailwind CSS 4.

Vue and Tailwind are the only peer packages. selfix works with your own components and theme; it runs as a standalone command.

## Install

selfix is not published to npm yet. Build a package from this repository:

```sh
pnpm install
pnpm --filter selfix pack --out selfix-0.1.0.tgz
```

Then install it in your Vue/Tailwind project:

```sh
pnpm add -D /path/to/selfix-0.1.0.tgz
```

## Quickstart

Create `selfix.config.ts` in your project root. Point `css` at the Tailwind entry your app uses and `ui` at your component import prefix:

```ts
import { defineConfig } from "selfix"

export default defineConfig({
  css: "src/style.css",
  ui: ["@/components/ui"],
})
```

The CSS entry must include your Tailwind imports and theme. For example:

```css
@import "tailwindcss";

@theme {
  --color-primary: #2563eb;
}
```

Run the checks:

```sh
pnpm exec selfix src
```

Add `"lint:design": "selfix src"` to your app's package scripts to run the same checks locally and in CI. selfix reports file positions and leaves your source unchanged.

All six rules are enabled by default, including the rule against SFC `<style>` blocks. Customize them below to match your project.

## Rules

| Rule                     | Reports                                                                                      |
| ------------------------ | -------------------------------------------------------------------------------------------- |
| `no-restyle`             | Classes that violate a design-system component's contract. Allows layout classes by default. |
| `no-raw-colors`          | Palette and literal colors that should use semantic theme tokens.                            |
| `no-arbitrary-values`    | Arbitrary values such as `p-[13px]`, `[color:red]`, and `text-sm/[17px]`.                    |
| `no-inline-styles`       | `style`, `:style`, and SFC style blocks, including scoped styles.                            |
| `no-unknown-classes`     | Classes unrecognized by the configured Tailwind theme or loaded CSS.                         |
| `require-static-classes` | Class expressions whose possible values cannot be read statically.                           |

Only `no-restyle` is limited to recognized design-system components. The other rules also check native elements.

Vue class arrays, object keys, and conditional alternatives can contain complete class names. Conditions and object values are not class names. Interpolated names such as `` `bg-${color}` `` are reported as dynamic. CSS-variable shorthand such as `p-(--space)` is allowed by `no-arbitrary-values`.

## Configuration

`selfix.config.ts` is the single configuration format. Export a config object with `defineConfig` for editor completion. Node loads the file directly; no TypeScript loader package is needed. Use ESM syntax with `"type": "module"` in your project’s `package.json`. Type annotations, `import type`, and `satisfies` work; Node does not type-check the config or resolve `tsconfig` path aliases, and syntax requiring transformation, such as enums, is unsupported.

Rules accept `"off"`, `"warn"`, `"error"`, or `[severity, options]`. Omitted rules default to `"error"`.

### Component contracts

Give each component a policy. This example keeps Button's size and shape under component control while allowing CardContent to change spacing:

```ts
import { defineConfig } from "selfix"

export default defineConfig({
  css: "src/style.css",
  ui: ["@/components/ui"],
  rules: {
    "no-restyle": [
      "error",
      {
        allow: ["layout"],
        contracts: [
          { pattern: "^Button$", allow: ["w-full", "mt-*", "mb-*"] },
          { pattern: "^CardContent$", allow: ["layout", "spacing"] },
        ],
      },
    ],
    "no-inline-styles": "off",
  },
})
```

The first matching component-name regular expression wins. Omitted contract fields inherit the rule's settings; supplied lists replace them. Imported aliases use their local name, and kebab-case tags resolve to that name.

`allow` and `deny` accept exact class names, `*` wildcards, or categories: `layout`, `color`, `typography`, `spacing`, `shape`, `effects`, `motion`, and `unknown`. Deny wins.

- For `no-restyle`, allow defines permitted classes. For color, arbitrary-value, and unknown-class rules, allow exempts classes and deny explicitly bans them.
- `p-*` matches the base utility, including `hover:p-4`. A pattern containing a colon matches the full class. Base matching removes important markers and negative signs.
- Categories derive from generated CSS. Margin and sizing are layout; padding and gap are spacing. A utility affecting several categories must have each allowed, unless a class-name pattern permits it.
- For `no-inline-styles`, `allow: ["style"]` exempts styles in a matching contract.
- `require-static-classes` supports messages and message contracts, but rejects allow/deny lists: unknown values cannot be matched safely.

### Project settings

| Setting            | Purpose                                                                                          |
| ------------------ | ------------------------------------------------------------------------------------------------ |
| `css`              | Tailwind CSS entry, relative to the config file. Required by the CLI unless `--css` is supplied. |
| `ui`               | Component import prefixes; defaults to `["@/components/ui"]`. Matches whole path segments.       |
| `componentImports` | Additional regular expressions matching component import sources.                                |
| `ignoreImports`    | Import-source regular expressions excluded from component recognition. Takes precedence.         |
| `components`       | Name regular expressions for globally registered components.                                     |
| `exclude`          | Directory names or config-relative path prefixes to skip; not glob patterns.                     |
| `note`             | Text appended to every diagnostic.                                                               |

All recognition settings and `exclude` take arrays of strings. `css` and `note` take strings. The CLI always skips `node_modules`, `.git`, `dist`, `coverage`, `.nuxt`, and `.output`.

For a workspace UI package, use its import prefix, such as `ui: ["@workspace/ui/components"]`. Exclude component implementation directories if those files intentionally need unrestricted styling; an excluded file is skipped by every rule.

### Diagnostic messages

Rule and contract `message` options accept a string or a category map with an optional `default`:

```js
message: {
  spacing: "Use a {{component}} size prop instead of {{className}}.",
  default: "Use an approved {{component}} variant.",
}
```

Available placeholders: `{{component}}`, `{{className}}`, `{{category}}`, `{{file}}`, and `{{rule}}`. Use the root `note` setting for shared guidance.

## CLI

```sh
pnpm exec selfix src
pnpm exec selfix "apps/**/*.vue" --config selfix.config.ts
pnpm exec selfix src --css src/style.css --format json
pnpm exec selfix src --max-warnings 0
pnpm exec selfix --help
```

Without input paths, selfix scans the current directory. It requires `selfix.config.ts` there, or a TypeScript config supplied with `--config`. Configured CSS paths resolve relative to the config file; command-line paths resolve from the current directory. `--css` overrides the config value.

JSON output is an array of diagnostics: `file`, `rule`, `severity`, `message`, `line`, `column`, `offset`, and optional `component` and `className`. Lines and columns are one-based; offsets are zero-based.

| Exit code | Meaning                                                                  |
| --------- | ------------------------------------------------------------------------ |
| `0`       | No errors; warnings are at or below `--max-warnings`, if set.            |
| `1`       | Rule errors, parse errors, or too many warnings.                         |
| `2`       | Configuration, theme-loading, or input failure, including an empty scan. |

## API

```ts
import { readFile } from "node:fs/promises"
import { createLinter } from "selfix"

const linter = await createLinter({
  css: await readFile("src/style.css", "utf8"),
  base: `${process.cwd()}/src`,
  config: { ui: ["@/components/ui"] },
})

const diagnostics = linter.lint(await readFile("src/Page.vue", "utf8"), "src/Page.vue")
```

`css` is CSS source; `base` is its directory for resolving imports and defaults to the current directory. Reuse the linter across files sharing a theme. Create a new instance after theme changes.

For one source string, use `await lintSource(source, { css, base, config, filename })`. Both APIs return the same diagnostic shape as the CLI's JSON output.

## Supported inputs

selfix checks Vue SFC templates and local static string constants referenced by their class bindings. Unresolved expressions are reported by `require-static-classes`; application expressions are never evaluated. Malformed SFCs produce `parse-error` diagnostics even when rules are disabled.

Template preprocessors and external template sources are unsupported. JSX/TSX, arbitrary script-only class calls, cross-file wrapper tracing, automatic variant discovery, and autofixes are not currently supported. Run selfix separately from ESLint or Oxlint.

Config files and Tailwind `@plugin`/`@config` modules execute as Node modules. Tailwind validation uses its `__unstable__loadDesignSystem` API; changes to that API may require a selfix update.

## Playground

`apps/playground` is a minimal Vue + Vite app using the local `selfix` package, Tailwind 4, and `selfix.config.ts`.

```sh
pnpm install
pnpm dev
```

To run its design checks after building selfix:

```sh
pnpm build
pnpm --filter playground lint:design
```

Try adding `class="p-8"` to a `<Button>` in `apps/playground/src/App.vue` to see the component contract report a violation. Remove it to restore a passing check. Change the button's `variant` prop to switch its appearance through its public API.

`pnpm check` also tests, type-checks, lints, and builds the playground. Its integration tests run the installed CLI with the real config and theme, verifying valid usage and a violation of each of the six enabled rules. Run them alone with `pnpm --filter playground test`.

## Development and help

This is a pnpm workspace with one publishable package in `packages/selfix`, a private Vue app in `apps/playground` and a central `AGENTS.md` for contributor guidance. Keep user documentation in this README.

```sh
pnpm install
pnpm check        # Type checking, Oxlint, Oxfmt, build, and Vitest
pnpm format       # Apply formatting
```

For a bug report, include the command, diagnostic, relevant config, a minimal Vue/CSS example, and your Node, Vue, and Tailwind versions. Add focused regression tests when changing rule behavior.

## Acknowledgment and license

Inspired by [shadcn/lint](https://github.com/shadcn-ui/lint). MIT licensed; attribution for adapted code is preserved in [LICENSE](LICENSE).
