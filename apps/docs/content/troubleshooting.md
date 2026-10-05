---
title: Troubleshooting
description: Find the cause of an unexpected result and get the check working.
---

Start with the rule name or error in the output. Exit `1` means selfix found a violation or too many warnings. Exit `2` means it couldn't complete the check.

To narrow a problem down, check one file:

```sh
pnpm exec selfix src/Page.vue
```

## A component does not receive no-restyle findings

Run doctor on the file:

```sh
pnpm exec selfix src/Page.vue --doctor
```

It reports recognition, the effective `no-restyle` severity, and definition discovery for every usage, including components without classes. See [doctor output and exits](cli.md#diagnose-component-protection). Doctor exits `0` even when it prints a zero-protection advisory, so a passing exit doesn't prove your components are protected. Unsupported analysis still fails.

If the component is unrecognized, check these settings:

- `ui` matches the import string, not a filesystem path.
- Global or auto-imported components have a `components` name pattern.
- `ignoreImports` doesn't match the import.
- The file isn't excluded, and `no-restyle` is on.

For renamed or kebab-case components, see [component recognition](configuration.md#component-recognition).

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
2. Check that your `css` entry imports the stylesheet that defines the class. CSS loaded only by a component or a build tool isn't part of selfix's theme. See [CSS import resolution](themes.md#css-import-resolution).
3. For generated Nuxt UI colors, follow [Nuxt and Nuxt UI](nuxt.md).
4. If another system supplies a class you can't load, add a [rule exception](no-unknown-classes.md).

## The CLI finds no Vue files

Work through these checks:

- Check your working directory, input paths, and exclusions.
- Quote globs so the shell doesn't expand them.
- Pass an existing `.vue` file directly.

Generated directories are skipped, and an empty scan exits `2`. See [file selection](cli.md#discovery-and-output).

## CSS or theme loading fails

The error names the import and where selfix tried to resolve it. Check that file first, then work through these causes:

- Config `css` paths are relative to the config directory. `--css` paths are relative to your working directory.
- For a package import, check that the package exposes a local `.css` entry. If the import needs an explicit file, add an exact [CSS alias](themes.md#css-aliases).
- For a generated theme, run the app's preparation step.
- For an unsupported selector, compare it with [selector support](analysis.md#custom-css-selectors) before you change its behavior. selfix skips well-formed selectors that target no class, so the error involves a class, `&`, `[class…]`, `:scope`, or malformed syntax.

Failed theme loading stops the check. Fix it before you read any results.

## API results do not reflect a theme edit

A linter keeps the files it loaded at creation and doesn't watch for edits. Create a new linter after theme, config, or project-source changes. See [API reuse](api.md#component-discovery-and-reuse).

## Vue compiler capabilities are missing

selfix checks the Vue compiler's capabilities at startup. Reinstall a supported Vue version with matching compiler packages. Same-name `v-bind` shorthand needs Vue 3.4 or later. See the [version requirements](getting-started.md#install-selfix).

## Report an issue

If you're still blocked, [open an issue](https://github.com/basteau/selfix/issues) with:

- The smallest Vue and CSS example that reproduces the problem.
- Your config, command, and output.
- Your dependency versions.
