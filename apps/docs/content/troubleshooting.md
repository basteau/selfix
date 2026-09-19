---
title: Troubleshooting
description: Find the cause of an unexpected result and get the check working.
---

Start with the rule name or error in your output. Exit `1` means selfix found a violation or too many warnings. Exit `2` means it couldn't complete the check.

To narrow a problem down, run one file:

```sh
pnpm exec selfix src/Page.vue
```

## A component does not receive no-restyle findings

Run `pnpm exec selfix src/Page.vue --doctor` to see recognition, effective `no-restyle` severity, and definition discovery separately, including for components without classes. A zero-protection advisory is a successful setup report, not proof that your intended components are protected. Unsupported analysis still fails. See [doctor output and exits](cli.md#diagnose-component-protection).

selfix must recognize the component before it protects it. Check that `ui` matches the **import string**, not a filesystem path. For global or auto-imported components, add a `components` name pattern.

Also check that `ignoreImports` doesn't exclude the import, the file isn't excluded, and `no-restyle` is enabled. Follow [component recognition](configuration.md#component-recognition) for renamed or kebab-case components.

## A dynamic class still fails after an allowance

An allowance can't help selfix read a class assembled at runtime. Replace incomplete names with full alternatives:

```vue
<!-- Unreadable. -->
<div :class="'mt-' + spacing" />

<!-- Both choices can be checked. -->
<div :class="large ? 'mt-4' : 'mt-2'" />
```

If a constant or helper still fails, check the [supported bindings](analysis.md#vue-class-bindings). `require-static-classes` has no allow/deny lists. Disabling it leaves unreadable values unchecked; it doesn't suppress `parse-error` for unsupported syntax.

## A scoped style block is reported

`no-inline-styles` includes SFC `<style>` blocks. `scoped` controls where CSS applies; it doesn't exempt the block from this rule.

Use theme classes, or add a [file override](configuration.md#per-file-rule-overrides) where component implementations need their own styles. This keeps other checks active. Excluding the file would skip all of them.

## A custom class is unknown

Check the spelling, then check whether your configured CSS entry imports the class's stylesheet. CSS loaded only by a component or build tool may not be part of selfix's theme.

Follow [CSS import resolution](themes.md#css-import-resolution). For generated Nuxt UI colors, use the [preparation and alias setup](themes.md#nuxt-ui-application-themes). If another system supplies a class you can't load, add a [rule exception](rules.md#no-unknown-classes).

## The CLI finds no Vue files

Check your working directory, input paths, and exclusions. Quote globs so the shell doesn't expand them first. Try an existing `.vue` file directly.

Generated directories are skipped. An empty scan exits with code `2`; see [file selection](cli.md#discovery-and-output).

## CSS or theme loading fails

The error names the import and where selfix tried to resolve it. Check that file first. Config `css` paths are relative to the config directory; `--css` paths are relative to your working directory.

For package imports, check that the package exposes a local `.css` entry. Use an exact [CSS alias](themes.md#css-aliases) if the import needs an explicit file target. For generated themes, run the app's preparation step. For an unsupported selector, compare it with [selector support](analysis.md#custom-css-selectors) before changing its behavior.

Failed theme loading stops the check. Fix the loading problem before interpreting results.

## API results do not reflect a theme edit

Create a new linter after theme, config, or project-source changes. A linter keeps the files it loaded at creation; it doesn't watch for edits. See [API reuse](api.md#component-discovery-and-reuse).

## Vue compiler capabilities are missing

Reinstall a supported Vue version with matching compiler packages. selfix checks required compiler capabilities at startup. Same-name `v-bind` shorthand needs Vue ≥3.4; see the [version requirements](getting-started.md#install-selfix).

If you're still blocked, [report an issue](https://github.com/basteau/selfix/issues) with the smallest Vue/CSS example that reproduces it, your config, command, output, and dependency versions.
