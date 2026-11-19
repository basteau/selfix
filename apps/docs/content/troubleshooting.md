---
title: Troubleshooting
description: Find the cause of an unexpected result and get the check working.
---

Start with the rule name or error in the output. Exit `1` means selfix found a violation or too many warnings. Exit `2` means it couldn't complete the check.

To narrow a problem down, check one file:

```sh
pnpm exec selfix app/pages/index.vue
```

## The generated theme is missing

```text
selfix: Nuxt UI's generated theme (ui.css) is missing from .nuxt and node_modules/.nuxt-ui in /repo. Run "nuxt prepare" (Nuxt) or build once with Vite (Vue), or set buildDir.
```

Nuxt UI hasn't written its theme for this project yet. Run `pnpm exec nuxt prepare` in a Nuxt app, or start Vite once in a Vue app. In CI, prepare before the check.

If the theme is in another directory, set [`buildDir`](configuration.md#all-settings). If selfix ran in a workspace root, run it from the app or pass the app's `--config`. See [workspaces](adoption.md#workspaces).

## Nuxt UI was not found

selfix looks for `@nuxt/ui` in `node_modules` of the project root and its parent directories, and for the generated theme in the project root. Run it from the app that uses Nuxt UI, after preparing it. The check still runs without Nuxt UI, but none of its components is protected.

A workspace can hoist `@nuxt/ui` above an app that doesn't use it. selfix treats the package as that app's only when the app's `package.json` lists it or the generated theme is there.

## A component does not receive no-restyle findings

Check these in order:

1. The tag uses your Nuxt UI prefix. With a custom prefix, set [`prefix`](configuration.md#all-settings).
2. The component has a theme. `UIcon`, `UApp`, and thin wrappers such as `UColorModeButton` are [not protected](configuration.md#protected-components).
3. For your own component, a `components` pattern matches its PascalCase name.
4. The class is not layout. `mt-4` and `w-full` pass by default.
5. No [contract](configuration.md#component-contracts) or [file override](configuration.md#per-file-rule-overrides) allows the class, the file isn't excluded, and `no-restyle` is on.

## A color from my theme is reported as raw

After you change `theme.colors` or `ui.colors`, prepare the app again so the generated theme has the new aliases. A color you define under a Tailwind palette name such as `--color-gray-500` stays a palette color. Give it its own name.

## A dynamic class still fails after an allowance

An allowance can't make a class assembled at runtime readable. Write each full class instead:

```vue
<!-- Unreadable. -->
<div :class="'mt-' + spacing" />

<!-- Both choices can be checked. -->
<div :class="large ? 'mt-4' : 'mt-2'" />
```

If a constant or helper still fails, compare it with the [supported bindings](analysis.md#vue-class-bindings). `require-static-classes` has no `allow` or `deny` lists. Turning it off leaves unreadable values unchecked and doesn't suppress `parse-error`.

## A scoped style block is reported

`no-inline-styles` reports every SFC `<style>` block. `scoped` only controls where the CSS applies, so scoped blocks are reported too. Use theme classes instead. Where a component implementation needs its own styles, add a [file override](configuration.md#per-file-rule-overrides). An override keeps the other rules active, while `exclude` skips them all.

## A custom class is unknown

1. Check the spelling.
2. Check that your CSS entry imports the stylesheet that defines the class. CSS loaded only by a component or a build tool isn't part of selfix's theme. See [the CSS entry](themes.md#the-css-entry).
3. For a Nuxt UI color alias you added, prepare the app again.
4. If another system supplies a class you can't load, add a [rule exception](no-unknown-classes.md).

## The CLI finds no Vue files

Work through these checks:

- Check your working directory, input paths, and exclusions.
- Quote globs so the shell doesn't expand them.
- Pass an existing `.vue` file directly.

Generated directories are skipped, and an empty scan exits `2`. See [file selection](cli.md#file-selection).

## CSS or theme loading fails

The error names the import and where selfix tried to resolve it. Check that file first, then work through these causes:

- When several stylesheets import `tailwindcss`, set `css` in the config. Its path is relative to the config directory.
- For a package import, check that the package exposes a local `.css` entry.
- For the generated Nuxt UI theme, prepare the app.
- For an unsupported selector, compare it with [selector support](analysis.md#custom-css-selectors) before you change its behavior. selfix skips well-formed selectors that target no class, so the error involves a class, `&`, `[class…]`, `:scope`, or malformed syntax.

Failed theme loading stops the check. Fix it before you read any results.

## API results do not reflect a theme edit

A linter keeps the theme and components it loaded at creation and doesn't watch for edits. Create a new linter after the stylesheet, the generated theme, or the config changes.

## Vue compiler capabilities are missing

selfix checks the Vue compiler's capabilities at startup. Reinstall a supported Vue version with matching compiler packages. Same-name `v-bind` shorthand needs Vue 3.4 or later. See the [version requirements](getting-started.md#install-selfix).

## Report an issue

If you're still blocked, [open an issue](https://github.com/basteau/selfix/issues) with:

- The smallest Vue and CSS example that reproduces the problem.
- Your config, command, and output.
- Your dependency versions.
