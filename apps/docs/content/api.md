---
title: API
description: Check Vue source from your own Node tool.
---

Use `createLinter` when you want to choose files and handle findings in your own code. It loads a theme once, then checks as many Vue source strings as you need.

For terminal and CI checks, use the [CLI](cli.md).

## Create a linter

With selfix installed, save this as `check-design.mjs` in a project containing `src/style.css` and `src/Page.vue`. Run it with `node check-design.mjs`:

```js
import { readFile } from "node:fs/promises"
import { resolve } from "node:path"
import { createLinter } from "selfix"

const linter = await createLinter({
  css: await readFile("src/style.css", "utf8"),
  base: resolve("src"),
  config: { ui: ["@/components/ui"] },
})

const source = await readFile("src/Page.vue", "utf8")
console.log(linter.lint(source, "src/Page.vue"))
```

Set `ui` to match your component imports. The result is an array of [diagnostics](cli.md#diagnostic-fields), or `[]` when there are no findings.

| Option       | Meaning                                                                              |
| ------------ | ------------------------------------------------------------------------------------ |
| `css`        | Required CSS source text, including imports and theme definitions.                   |
| `base`       | Directory for CSS imports and alias targets. Defaults to the current directory.      |
| `configBase` | Directory for file-override matching. Defaults to the current directory at creation. |
| `config`     | A [configuration object](configuration.md). Defaults to `{}`.                        |

You load the CSS and select the files. The API doesn't read `selfix.config.ts`, use `config.css`, or apply `config.exclude`.

## Lint source

`linter.lint(source, filename?)` runs synchronously and returns `Diagnostic[]`. The default filename is `component.vue`; results preserve the supplied name.

For a one-off check, `await lintSource(source, { css, base?, configBase?, config?, filename? })` creates the linter and checks the source in one call.

File overrides match filenames relative to `configBase`. Absolute filenames are made relative to that directory; files outside it receive only top-level rules. This matching doesn't change the filename in diagnostics.

## Component discovery and reuse

Discovery is off by default in the API. Enable it with `config: { project: { root: "/path/to/app" } }` to include component definitions and readable prop choices in findings. Relative filenames resolve against that root for discovery only.

Reuse a linter while its theme, policy, and project sources stay the same. Recreate it after any of those change. There is no automatic reload. See [source snapshots](configuration.md#source-snapshot) for editor integrations.

## Errors

Parsing and unsupported-input problems return `parse-error` diagnostics. Invalid config, failed theme loading, and project-source loading failures throw or reject. Handle both errors and diagnostics; a failed load is not an empty result.

## Exports

| Runtime export | Purpose                                            |
| -------------- | -------------------------------------------------- |
| `createLinter` | Create a reusable linter.                          |
| `lintSource`   | Create a linter and check one source string.       |
| `defineConfig` | Validate and return a config.                      |
| `ruleNames`    | The six names in [rule-reference order](rules.md). |

Exported types are `Config`, `FileOverride`, `ProjectOptions`, `ClassProps`, `Contract`, `Message`, `RuleName`, `RuleOptions`, `RuleSetting`, `Severity`, `Category`, `LinterOptions`, `Diagnostic`, `ComponentDefinition`, and `ComponentProps`.
