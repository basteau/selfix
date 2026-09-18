# selfix

**Design-system linting for Vue 3 and Tailwind CSS 4.**

Define what your components allow. Get diagnostics that tell developers and coding agents what broke and what to use instead—without changing your component API.

Inspired by [shadcn/lint](https://github.com/shadcn-ui/lint), with thanks to shadcn and its contributors. selfix is an independent Vue-focused project; MIT-licensed adaptations retain upstream attribution in [LICENSE](LICENSE).

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

**Experimental alpha:** APIs and rules may change during prerelease. Install in your Vue/Tailwind project:

```sh
pnpm add -D selfix@alpha
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

Stylesheet imports resolve from the importing stylesheet. Relative and absolute paths must name
`.css` files. Packages are searched in Node's `node_modules` lookup paths from that directory,
then from selfix's installation. Scoped packages and exact subpath exports are supported.
For `exports`, selfix selects `style` before `default` (including nested conditions), or a
string CSS target. A selected target must start with `./`, stay inside the package, and end
in `.css`. Without `exports`, a subpath names a file directly; root imports use `style`,
then `main`, then `index.css`. Missing selected targets fail instead of falling back.
Export arrays, wildcard mappings, and conditions other than `style`/`default` are unsupported;
JavaScript targets are never loaded as CSS. Errors identify the import and its origin directory.
Tailwind's standard stylesheet imports remain supported. Trusted `@plugin`/`@config` modules
keep Node module resolution and are unaffected by CSS conditions. Vite/Nuxt configuration
and generated application themes are not loaded automatically.

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

Only `packages/selfix` is published. [Changelogen](https://github.com/unjs/changelogen) prepares the package version and root `CHANGELOG.md` from repository-wide Conventional Commits. The commands below only update files; do not pass Changelogen's `--release`, `--push`, or `--publish` flags.

Tag CI creates a [GitHub Release](https://github.com/basteau/selfix/releases) from that version's changelog section after checks and npm publication (or its bootstrap skip). Alpha and beta versions become GitHub prereleases, not Latest. Existing releases are left unchanged on reruns. Each version must have exactly one nonempty `## vVERSION` section.

### One-time setup

- Keep package repository metadata and the Git remote pointing to `basteau/selfix`.
- Direct pushes to `main` are allowed; run `pnpm check` before pushing and wait for green CI before tagging. Protect `main` against deletion and force pushes, and restrict `v*` tags to admins.
- Use Conventional Commits and preserve relevant Lore trailers. Optional PRs use squash merging with the PR title as the commit subject; CI validates those titles.
- Create the `npm` GitHub environment, restrict it to release tags, and require reviewers where available. Leave repository Actions variable `NPM_PUBLISH_ENABLED` unset until bootstrap is complete.

### First release: 0.1.0-alpha.0

Start on `main` with a clean working tree and full Git history, including tags. Prepare each version once. If its version and notes are already committed, skip preparation; if only the version is set, add `--no-bump`:

```sh
pnpm install --frozen-lockfile
pnpm release:prepare -r 0.1.0-alpha.0
pnpm format
pnpm check
```

Review the package version and `CHANGELOG.md`, commit as `chore(release): v0.1.0-alpha.0`, and push `main`. After CI passes, tag that commit:

```sh
git tag -a v0.1.0-alpha.0 -m "v0.1.0-alpha.0"
git push origin refs/tags/v0.1.0-alpha.0
```

CI validates metadata and changelog, runs checks, and packs and dry-runs the package. Download `selfix-package` from the successful tag run and extract `selfix.tgz`. Inspect and publish that tarball once locally:

```sh
tar -tzf selfix.tgz
npm login
npm publish ./selfix.tgz --access public --tag alpha --ignore-scripts
```

Configure the package's [npm trusted publisher](https://docs.npmjs.com/trusted-publishers/): GitHub Actions, `basteau/selfix`, workflow **`ci.yml`**, environment **`npm`**. Permit direct `npm publish`, then set repository variable `NPM_PUBLISH_ENABLED=true`. Do not rerun publication of `v0.1.0-alpha.0`. Once published, users can install with `pnpm add -D selfix@alpha`.

Use a current npm CLI for bootstrap and trusted publishing. No npm tokens belong in GitHub secrets. After verifying trusted publishing, disallow token-based publishing in npm settings. A publish dry-run does not verify registry permissions or OIDC authentication.

### Later releases

For the next release only, use `--from e6f33ce`, the rewritten equivalent of the published alpha commit, to avoid repeating old notes. Leave the published tag unchanged. Once the next release is tagged on `main`, omit `--from`.

With a clean working tree and full history:

```sh
git switch main
git pull --ff-only
pnpm release:prepare -r 0.1.0-alpha.1 --from e6f33ce
pnpm format
pnpm check
```

Review the version and changelog, commit as `chore(release): v0.1.0-alpha.1`, push, and wait for green CI before tagging as above. After tag checks and environment approval, CI publishes the exact checked tarball with OIDC and provenance, without checkout, dependency installation, or package scripts in the publish job.

Release progression: `0.1.0-alpha.0` → `0.1.0-alpha.1` → `0.1.0-beta.0` → `0.1.0`. Use explicit `-r` versions; Changelogen's inferred `0.x` feature bumps are patches.

CI maps validated versions to [npm dist-tags](https://docs.npmjs.com/adding-dist-tags-to-packages/): `X.Y.Z-alpha.N` → `alpha`, `X.Y.Z-beta.N` → `beta`, and stable `X.Y.Z` → `latest`. Git tags add a `v` prefix. Other prereleases and build metadata are rejected. Users opt in with `selfix@alpha` or `selfix@beta`. Verify npm dist-tags after bootstrap with `npm view selfix dist-tags --json`; if `latest` points to the prerelease, remove it with `npm dist-tag rm selfix latest`.

For external configuration failures, fix the configuration and rerun the failed job. Never move a published tag or reuse a published version; content changes require a new release.

</details>

## License

MIT licensed. See [LICENSE](LICENSE).
