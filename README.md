# selfix

**Design-system linting for Vue 3 and Tailwind CSS 4.**

Define what your components allow. Get diagnostics that tell developers and coding agents what broke and what to use instead—without changing your component API.

```vue
<script setup lang="ts">
import { Button } from "@/components/ui/button"
</script>

<template>
  <!-- Allowed: the component controls size; the page controls placement. -->
  <Button size="lg" class="mt-4 w-full">Save</Button>

  <!-- Reported: padding belongs to the component. -->
  <Button class="p-4">Save</Button>
</template>
```

```text
"p-4" is not allowed on <Button>: the component owns its spacing. Use a component variant; use margin or a parent gap for surrounding space.
```

Works with your own components and theme. No UI kit, class helper, ESLint, or Oxlint required. selfix uses Vue's parser and Tailwind's compiler and never evaluates application expressions.

[Quickstart](#quickstart) · [Rules](#rules) · [Configuration](#configuration) · [CLI](#cli) · [API](#api) · [Development](#development)

## Quickstart

Requires **Node.js ≥22.18**, **Vue ≥3.2.13 <4**, and **Tailwind CSS 4**. Vue and Tailwind are the only consumer peer dependencies.

selfix is not published to npm yet. From this repository, build a package:

```sh
pnpm install --frozen-lockfile
pnpm --filter selfix pack --out selfix-0.1.0.tgz
```

Install it in your Vue/Tailwind project:

```sh
pnpm add -D /path/to/selfix-0.1.0.tgz
```

Create `selfix.config.ts` in your project root:

```ts
import { defineConfig } from "selfix"

export default defineConfig({
  css: "src/style.css", // Your app's Tailwind entry, including imports and theme.
  ui: ["@/components/ui"], // Import prefixes identifying your UI components.
})
```

Use `"type": "module"` in your project's `package.json`. The CSS entry should include `@import "tailwindcss";` and your theme definitions.

```sh
pnpm exec selfix src
```

Add `"lint:design": "selfix src"` to your package scripts for local and CI checks. Ask coding agents to run it after UI changes. Diagnostics point to the original `.vue` file; selfix leaves source unchanged.

**All six rules default to `"error"`, including the ban on SFC `<style>` blocks.** Disable or customize rules to fit your project.

## Rules

| Rule                     | Reports                                                                   |
| ------------------------ | ------------------------------------------------------------------------- |
| `no-restyle`             | Classes that violate a UI component's contract. Allows layout by default. |
| `no-raw-colors`          | Palette and literal colors instead of semantic theme tokens.              |
| `no-arbitrary-values`    | Arbitrary values: `p-[13px]`, `[color:red]`, `text-sm/[17px]`.            |
| `no-inline-styles`       | `style`, `:style`, and SFC `<style>` blocks, including scoped styles.     |
| `no-unknown-classes`     | Classes unrecognized by the configured Tailwind theme or loaded CSS.      |
| `require-static-classes` | Class expressions whose possible values cannot be read statically.        |

Only `no-restyle` is limited to recognized UI components. All other rules also check native elements. CSS-variable shorthand such as `p-(--space)` is not an arbitrary value.

### Vue class bindings

Use complete class names in strings, arrays, objects, and conditional branches:

```vue
<!-- Readable: conditions and object values are not treated as class names. -->
<Button :class="['w-full', { 'mt-4': needsSpace }]" />
<Button :class="compact ? 'mt-2' : 'mt-4'" />

<!-- Reported by require-static-classes. -->
<Button :class="`mt-${spacing}`" />
```

Local static string constants are supported. Unresolved expressions are reported rather than executed.

## Configuration

`selfix.config.ts` is the only configuration format. Node loads it natively: type annotations, `import type`, and `satisfies` work, but enums and `tsconfig` path aliases do not. Node does not type-check the file.

Rules accept `"off"`, `"warn"`, `"error"`, or `[severity, options]`. Omitted rules remain enabled.

### Component contracts

Keep Button's size and shape under component control while allowing CardContent to change spacing:

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
    "no-inline-styles": "off", // Allow Vue scoped styles if your project uses them.
  },
})
```

The first matching component-name regular expression wins. Omitted fields inherit rule settings; supplied lists replace them. Imported aliases use their local name; kebab-case tags resolve to that name.

<details>
<summary>Allow/deny matching reference</summary>

`allow` and `deny` accept exact classes, `*` wildcards, or categories: `layout`, `color`, `typography`, `spacing`, `shape`, `effects`, `motion`, and `unknown`. **Deny wins.**

- `no-restyle`: allow defines permitted classes. For color, arbitrary-value, and unknown-class rules, allow exempts classes; deny explicitly bans them.
- `p-*` matches base utilities, including `hover:p-4`. Patterns containing a colon match the full class. Base matching removes important markers and negative signs.
- Categories derive from generated CSS. Margin and sizing are layout; padding and gap are spacing. Multi-category utilities need every category allowed unless a class-name pattern permits them.
- `no-inline-styles`: `allow: ["style"]` exempts styles in a matching contract.
- `require-static-classes`: supports messages and message contracts, not allow/deny lists.

</details>

### Project settings

| Setting            | Purpose                                                                        |
| ------------------ | ------------------------------------------------------------------------------ |
| `css`              | Tailwind entry, relative to the config. Required unless `--css` is supplied.   |
| `ui`               | Import prefixes; default `["@/components/ui"]`. Matches whole path segments.   |
| `componentImports` | Additional import-source regular expressions.                                  |
| `ignoreImports`    | Import-source regular expressions excluded from recognition; takes precedence. |
| `components`       | Name regular expressions for globally registered components.                   |
| `exclude`          | Directory names or config-relative path prefixes to skip, not globs.           |
| `note`             | Guidance appended to every diagnostic.                                         |

`css` and `note` are strings; the other settings are arrays of strings. The CLI always skips `node_modules`, `.git`, `dist`, `coverage`, `.nuxt`, and `.output`.

For shared UI packages, use an import prefix such as `ui: ["@workspace/ui/components"]`. Use `exclude: ["src/components/ui"]` if component implementations intentionally need unrestricted styling. Excluded files are skipped by **every rule**.

### Custom messages

Rule and contract `message` options accept a string or a category map with an optional `default`:

```js
message: {
  spacing: "Use a {{component}} size prop instead of {{className}}.",
  default: "Use an approved {{component}} variant.",
}
```

Placeholders: `{{component}}`, `{{className}}`, `{{category}}`, `{{file}}` (the SFC filename), and `{{rule}}`. Use `note` for shared guidance, such as a link to your design-system docs.

## CLI

```sh
pnpm exec selfix src
pnpm exec selfix "apps/**/*.vue" --config selfix.config.ts
pnpm exec selfix src --css src/style.css --format json
pnpm exec selfix src --max-warnings 0
pnpm exec selfix --help
```

Without paths, selfix scans the current directory. It loads `selfix.config.ts` there unless `--config` is supplied. Configured CSS paths resolve from the config directory; CLI paths resolve from the current directory. `--css` overrides the config.

JSON output contains `file`, `rule`, `severity`, `message`, `line`, `column`, `offset`, and optional `component` and `className`. Lines and columns are one-based; offsets are zero-based.

| Exit | Meaning                                                                  |
| ---- | ------------------------------------------------------------------------ |
| `0`  | No errors; warnings within `--max-warnings`, if set.                     |
| `1`  | Rule errors, parse errors, or too many warnings.                         |
| `2`  | Configuration, theme-loading, or input failure, including an empty scan. |

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

`css` is source text; `base` is its directory for resolving imports (default: current directory). Reuse the linter for files sharing a theme; recreate it after theme changes. For one file, use `await lintSource(source, { css, base, config, filename })`. Both return the CLI's diagnostic shape.

## Limitations and trust

- Vue SFC templates only: no JSX/TSX, template preprocessors, external templates, or arbitrary script-only class calls.
- No cross-file wrapper tracing, automatic variant discovery, or autofixes. Run separately from ESLint or Oxlint.
- Malformed SFCs produce `parse-error` diagnostics even with rules disabled. Unsupported templates and failed theme loading do not silently pass.
- **Use trusted configuration:** config files and Tailwind `@plugin`/`@config` modules execute as Node modules. Application expressions do not.
- Tailwind validation uses `__unstable__loadDesignSystem`; API changes may require a selfix update.

## Development

The workspace contains `packages/selfix` (publishable) and `apps/playground` (private Vue + Vite app).

```sh
pnpm install --frozen-lockfile
pnpm dev          # Build selfix and start the playground
pnpm check        # Typecheck, lint, format check, test, and build
pnpm format       # Apply formatting
```

Try `class="p-8"` on a Button in `apps/playground/src/App.vue`, then run `pnpm --filter playground lint:design`. Remove it to restore a passing check; use the Button's `variant` prop to change appearance. `pnpm check` includes playground integration tests; run them alone after building with `pnpm --filter playground test`.

See [AGENTS.md](AGENTS.md) for contribution conventions. Keep documentation in this README and add regression tests for behavior changes. [Bug reports](https://github.com/basteau/selfix/issues) should include a minimal Vue/CSS example, config, command, diagnostic, and dependency versions.

## Releases

<details>
<summary>Maintainer setup and release checklist</summary>

Only `packages/selfix` is published. [Changelogen](https://github.com/unjs/changelogen) prepares the package version and root `CHANGELOG.md` from repository-wide Conventional Commits. Preparation never commits, tags, pushes, or publishes.

### One-time setup

- Keep package repository metadata and the Git remote pointing to `basteau/selfix`.
- Enable squash merging using PR titles, require the `check` job, and preserve relevant Lore trailers in commit bodies. CI validates Conventional Commit PR titles; direct commits must follow the same convention.
- Protect `main` and `v*` tags against unauthorized changes. Tag only reviewed commits on `main`.
- Create the `npm` GitHub environment, restrict it to release tags, and require reviewers where available. Leave repository Actions variable `NPM_PUBLISH_ENABLED` unset until bootstrap is complete.

### First release: 0.1.0

Start on `main` with a clean working tree and full Git history. The package is already `0.1.0`:

```sh
pnpm install --frozen-lockfile
pnpm release:prepare --no-bump -r 0.1.0
pnpm format
pnpm check
```

Review and commit `CHANGELOG.md` as `chore(release): v0.1.0` (through a PR when required). Tag the reviewed commit on `main`:

```sh
git tag -a v0.1.0 -m "v0.1.0"
git push origin main refs/tags/v0.1.0
```

CI validates metadata and changelog, runs checks, and packs and dry-runs the package. Download `selfix-package` from the successful tag run and extract `selfix.tgz`. Inspect and publish that tarball once locally:

```sh
tar -tzf selfix.tgz
npm login
npm publish ./selfix.tgz --access public --ignore-scripts
```

Configure the package's [npm trusted publisher](https://docs.npmjs.com/trusted-publishers/): GitHub Actions, `basteau/selfix`, workflow **`ci.yml`**, environment **`npm`**. Permit direct `npm publish`, then set repository variable `NPM_PUBLISH_ENABLED=true`. Do not rerun publication of `v0.1.0`.

No npm tokens belong in GitHub secrets. After verifying trusted publishing, disallow token-based publishing in npm settings.

### Later releases

With a clean working tree and full history:

```sh
git switch main
git pull --ff-only
pnpm release:prepare -r 0.2.0
pnpm format
pnpm check
```

Review the version and changelog, commit as `chore(release): v0.2.0`, then tag and push as above using `v0.2.0`. After checks and environment approval, CI publishes the exact checked tarball with OIDC and provenance, without checkout, dependency installation, or package scripts in the publish job.

Only stable `vX.Y.Z` tags are supported. Explicit versions are recommended: omitting `-r` lets the pinned Changelogen infer a version, where a feature at `0.1.0` becomes `0.1.1` and a breaking change becomes `0.2.0`.

For external configuration failures, fix the configuration and rerun the failed job. Never move a published tag or reuse a published version; content changes require a new release.

</details>

## License

MIT licensed. Inspired by [shadcn/lint](https://github.com/shadcn-ui/lint); attribution for adapted code is preserved in [LICENSE](LICENSE).
