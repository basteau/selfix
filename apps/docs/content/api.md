---
title: API
description: Check Vue source and consume findings from your own Node tool.
---

`createLinter` loads a project once and checks many Vue source strings. For terminal or CI checks, use the [CLI](cli.md).

## Create a linter

Save this as `check-design.mjs` in your project root and run `node check-design.mjs`:

```js
import { readFile } from "node:fs/promises"
import { createLinter } from "selfix"

const linter = await createLinter()

const source = await readFile("app/pages/index.vue", "utf8")
console.log(linter.lint(source, "app/pages/index.vue"))
```

Like the CLI, the linter finds your stylesheet, the generated Nuxt UI theme, and the installed components.

| Option    | Meaning                                                                              |
| --------- | ------------------------------------------------------------------------------------ |
| `root`    | Project root: where Nuxt UI is installed and config paths start. Defaults to cwd.    |
| `config`  | The same [settings](configuration.md) as `selfix.config.ts`. Defaults to `{}`.       |
| `css`     | CSS source text to check against, instead of the file from `config.css`.             |
| `cssBase` | Directory the imports in `css` resolve from, relative to `root`. Defaults to `root`. |

The API doesn't read `selfix.config.ts` and ignores `exclude`. You pass the config and choose the files.

`linter.nuxtUi` is `true` when Nuxt UI and its generated theme were found. Without them, only the components named in `config.components` are protected.

## Lint source

`linter.lint(source, filename?)` returns diagnostics synchronously, or `[]` when there are none.

- `filename` defaults to `component.vue` and appears as-is in results.
- Files outside `root` get top-level rules only, because overrides never match them.

`linter.check(source, filename?)` returns `{ diagnostics, suppressed }`. `diagnostics` is the `lint` result. `suppressed` lists the findings that [exception comments](configuration.md#suppress-findings) hid, each with the comment's `reason`. The CLI uses `check`, so both report the same findings.

To create a linter and check one string in a single call, use `await lintSource(source, { root?, config?, css?, cssBase?, filename? })`.

A linter keeps the theme and components it loaded. Create a new one after the stylesheet, the generated theme, or the config changes. Each CLI run creates a fresh linter.

## Helpers

`ruleNames` lists every rule name, for example to build a `rules` object:

```js
import { ruleNames } from "selfix"

const rules = Object.fromEntries(ruleNames.map((name) => [name, "warn"]))
```

`defineConfig` checks a `selfix.config.ts` object, throws on invalid settings, and returns it unchanged. You can pass the same object as the API's `config`.

## Errors

- Parse errors and unsupported input return `parse-error` diagnostics.
- Malformed exception comments return `invalid-exception` diagnostics.
- Invalid config and failures to load the theme throw or reject.

Handle both. A failed load is not a clean result.

## Diagnostic fields

A diagnostic is one finding. API and JSON consumers receive these fields:

| Field            | Value                                                                   |
| ---------------- | ----------------------------------------------------------------------- |
| `file`           | The affected Vue file.                                                  |
| `rule`           | A rule name, `parse-error`, `invalid-exception`, or `unused-exception`. |
| `severity`       | `warn` or `error`.                                                      |
| `message`        | Explanation and guidance.                                               |
| `line`, `column` | One-based position in the original file.                                |
| `offset`         | Zero-based JavaScript string position.                                  |

Optional fields:

| Field         | Value                                                           |
| ------------- | --------------------------------------------------------------- |
| `component`   | The component or tag name as written.                           |
| `className`   | The reported class.                                             |
| `prop`        | `ui` for a finding in the `ui` prop, or an SVG paint attribute. |
| `slot`        | The slot key inside `ui`.                                       |
| `suggestions` | Complete replacement class strings.                             |

- Class findings point to their containing attribute or binding.
- Findings in a file sort by offset, then rule name.

`suggestions` is advisory. It holds at most one replacement, for a spelling mistake or for an arbitrary value that matches a theme utility. The compiler validates it and your policy permits it. The field is omitted when no single correction is clear. It has no edit ranges, and selfix never changes source. Text output appends `Did you mean "flex-col"?` to the message. The API `message`, including a custom message, stays unchanged.
