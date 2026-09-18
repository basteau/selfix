# Troubleshooting

[Documentation index](README.md)

### A component does not receive no-restyle findings

Check the import string in the SFC against `ui` or `componentImports`, and check `ignoreImports` first because it overrides recognition. These settings match source strings; selfix does not resolve an alias or follow a barrel to find the component implementation. For auto-imported or global components, add a `components` pattern matching the template's component name. For renamed imports, contracts use the local name.

Follow [component recognition](configuration.md#component-recognition), then rerun the file explicitly with `pnpm exec selfix src/Page.vue`. Confirm the file is not [excluded](cli.md#discovery-and-output) and `no-restyle` is enabled. Use the [quickstart](getting-started.md#quickstart) to compare a known failing case.

### A dynamic class still fails after an allowance

If the rule is `require-static-classes`, a class allowance cannot resolve the expression. Replace construction such as `:class="'p-' + size"` with complete alternatives such as `:class="large ? 'p-4' : 'p-2'"`. Both alternatives are checked; each must satisfy the enabled policies.

Check the [supported bindings and helper-shadowing rules](analysis.md#vue-class-bindings) if a constant or helper remains dynamic. `require-static-classes` accepts no `allow` or `deny` list. To defer that check during adoption, [disable the rule explicitly](adoption.md#adopt-in-an-existing-project), accepting that unreadable values remain unchecked. A `parse-error` for unsupported binding syntax is separate and is not suppressed by a rule allowance.

### A scoped style block is reported

`<style scoped>` still produces a `no-inline-styles` finding. Scoping does not exempt SFC style blocks, and component-import ignores do not exempt styles. Move the styling to the configured theme and use its utilities, or grant the whole-style exception described in [no-inline-styles](rules.md#no-inline-styles). Property-level exceptions are not supported. Excluding the SFC skips every rule, so use an exclusion only when that is the intended scope.

### A custom class is unknown

Check spelling and confirm the CLI's `css` entry imports the stylesheet or defines the theme token or utility. CSS loaded only by a component, a browser, or a build-tool configuration is not automatically part of selfix's theme. Follow [CSS import resolution](themes.md#css-import-resolution) to make the definition reachable, then rerun selfix.

If another system supplies the class and selfix cannot inspect its CSS, add an explicit [no-unknown-classes allowance](rules.md#no-unknown-classes). This suppresses that rule's finding; it does not prove the class exists or exempt it from other policies. Importing package CSS also does not generate an application's Nuxt UI theme; use the [preparation and alias workflow](themes.md#nuxt-ui-application-themes).

### The CLI finds no Vue files

For `No Vue files found` or `No files match`, check the working directory, input paths, and exclusions. Run `pnpm exec selfix src/Page.vue` with an existing, non-excluded SFC to isolate discovery. Quote glob inputs as shown in [CLI discovery](cli.md#discovery-and-output). Generated directories are skipped, and config exclusions apply to the whole file. An empty scan exits with code `2`; it is not a passing check.

### CSS or theme loading fails

Read the import and origin directory in the error. Verify the configured CSS file exists, and check each imported path from its importing stylesheet. Config `css` resolves from the config directory; `--css` resolves from the current directory.

For a package import, inspect its installed `package.json` and selected CSS target against [CSS import resolution](themes.md#css-import-resolution). Use a supported exact CSS export; a JavaScript export or wildcard mapping is not a stylesheet target. If your app relies on a generated theme, supply CSS containing those definitions. selfix does not run Vite or Nuxt configuration to generate it. Failed loading stops the CLI with code `2` and rejects [API creation](api.md#api); there is no fallback clean result.

### API results do not reflect a theme edit

A linter retains its loaded theme. Read the updated CSS and call `createLinter` again, passing the stylesheet directory as `base` for relative imports. Recreate it after configuration changes too. The [API example](api.md#api) shows the loading boundary; there is no watcher or timed refresh. A fresh CLI invocation creates a new linter.

### Vue compiler capabilities are missing

selfix reads the Vue version from its package metadata and checks required compiler capabilities at startup. If capabilities are missing, reinstall a supported Vue version with matching compiler packages. Same-name `v-bind` shorthand requires Vue ≥3.4. See the [supported versions and setup](getting-started.md#quickstart).

See also: [getting started](getting-started.md), [CLI reference](cli.md), and [analysis boundaries](analysis.md).
