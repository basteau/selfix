# API

[Documentation index](README.md)

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

`createLinter({ css, base?, configBase?, config? })` is asynchronous. `css` is required CSS **source text**, not a path; `base` is the directory for resolving imports and defaults to the current directory. `config` defaults to `{}`. API creation does not read `config.css` or apply `config.exclude`; the caller loads CSS, selects files, and supplies source text.

The returned `lint(source, filename?)` method is synchronous and returns `Diagnostic[]`. The default filename is `component.vue`; supplied filenames are preserved without path resolution. `await lintSource(source, { css, base?, configBase?, config?, filename? })` creates a linter for a single call and returns the same diagnostic shape. Reuse a linter for files sharing the loaded theme and policy; recreate it after theme or configuration changes. There is no file watcher or theme reload.

`configBase` sets the base for file-override patterns and relative lint filenames; it defaults to the current directory when the linter is created. It does not change CSS `base`, component discovery `project.root`, or the original diagnostic filename. The default `component.vue` filename also participates in matching. Files outside this base receive only top-level rules. All matching overrides apply in order; see [file matching and rule inheritance](configuration.md#per-file-rule-overrides).

Source-only API calls do not read project metadata or component files. Opt in with `config: { project: { root: "/path/to/app" } }`. Relative lint filenames resolve against that root for discovery only; diagnostic `file` and `{{file}}` still use the supplied filename. Recreate the linter after project metadata, component, barrel, or dependency changes. Supplied source takes precedence for the current SFC; other definitions use the creation-time snapshot. See [discovery options and limits](configuration.md#component-source-discovery).

Vue parsing and unsupported-input issues return `parse-error` diagnostics. Invalid configuration, project metadata/source loading, CSS/theme loading, and CSS inspection failures throw or reject; callers must handle errors as well as diagnostics. A failure does not become an empty result.

Public runtime exports are `createLinter`, `lintSource`, `defineConfig`, and `ruleNames` (the six names in the rule table's order). Public type exports are `Config`, `FileOverride`, `ProjectOptions`, `ComponentDefinition`, `ComponentProps`, `ClassProps`, `Contract`, `Message`, `RuleName`, `RuleOptions`, `RuleSetting`, `Severity`, `Category`, `Diagnostic`, and `LinterOptions`. `defineConfig(config)` validates and returns the config. Internal collectors, validators, and compiler helpers are not package exports.

See also: [theme loading](themes.md), [configuration](configuration.md), and [analysis boundaries](analysis.md).
