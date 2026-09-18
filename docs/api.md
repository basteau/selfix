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

`createLinter({ css, base?, config? })` is asynchronous. `css` is required CSS **source text**, not a path; `base` is the directory for resolving imports and defaults to the current directory. `config` defaults to `{}`. API creation does not read `config.css` or apply `config.exclude`; the caller loads CSS, selects files, and supplies source text.

The returned `lint(source, filename?)` method is synchronous and returns `Diagnostic[]`. The default filename is `component.vue`; supplied filenames are preserved without path resolution. `await lintSource(source, { css, base?, config?, filename? })` creates a linter for a single call and returns the same diagnostic shape. Reuse a linter for files sharing the loaded theme and policy; recreate it after theme or configuration changes. There is no file watcher or theme reload.

Vue parsing and unsupported-input issues return `parse-error` diagnostics. Invalid configuration, CSS/theme loading, and CSS inspection failures throw or reject; callers must handle errors as well as diagnostics. A failure does not become an empty result.

Public runtime exports are `createLinter`, `lintSource`, `defineConfig`, and `ruleNames` (the six names in the rule table's order). Public type exports are `Config`, `ClassProps`, `Contract`, `Message`, `RuleName`, `RuleOptions`, `RuleSetting`, `Severity`, `Category`, `Diagnostic`, and `LinterOptions`. `defineConfig(config)` validates and returns the config. Internal collectors, validators, and compiler helpers are not package exports.

See also: [theme loading](themes.md), [configuration](configuration.md), and [analysis boundaries](analysis.md).
