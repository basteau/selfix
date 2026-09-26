---
title: API
description: Check Vue source and consume findings from your own Node tool.
---

`createLinter` loads a theme once and checks many Vue source strings. For terminal or CI checks, use the [CLI](cli.md).

## Create a linter

Save this as `check-design.mjs` in your project root. It reads `src/style.css` and `src/Page.vue`:

```js
import { readFile } from "node:fs/promises"
import { createLinter } from "selfix"

const linter = await createLinter({
  css: await readFile("src/style.css", "utf8"),
  cssBase: "src",
  config: { ui: ["./components/ui"] },
})

const source = await readFile("src/Page.vue", "utf8")
console.log(linter.lint(source, "src/Page.vue"))
```

Match `ui` to your component imports, then run `node check-design.mjs` from the project root.

| Option    | Meaning                                                                                                  |
| --------- | -------------------------------------------------------------------------------------------------------- |
| `css`     | Required CSS source text.                                                                                |
| `root`    | Base for overrides, CSS alias targets, discovery, and relative lint filenames. Defaults to cwd.          |
| `cssBase` | Origin for stylesheet imports, relative to `root`. Defaults to `root`.                                   |
| `config`  | [Policy settings](configuration.md). Defaults to `{}`. CLI-only `css` and `exclude` fields are rejected. |

The API doesn't read `selfix.config.ts`. You load the CSS and choose the files.

## Lint source

`linter.lint(source, filename?)` returns diagnostics synchronously, or `[]` when there are none.

- `filename` defaults to `component.vue` and appears as-is in results.
- Files outside `root` get top-level rules only, because overrides never match them.

To load the theme and check one string in a single call, use `await lintSource(source, { css, root?, cssBase?, config?, filename? })`.

## Component discovery and reuse

Discovery is off in the API. To add component definitions and readable prop choices to findings, pass `config: { project: {} }`. An explicit `project.root` resolves from the API `root`.

Reuse a linter until its theme, policy, or project sources change, then create a new one. Discovery keeps a snapshot of project sources, while the file you lint always uses the source you pass to `lint`. Each CLI run creates a fresh linter.

## Errors

- Parse errors and unsupported input return `parse-error` diagnostics.
- Invalid config and failures to load the theme or project sources throw or reject.

Handle both. A failed load is not a clean result.

## Diagnostic fields

A diagnostic is one finding. API and JSON consumers receive these fields:

| Field            | Value                                    |
| ---------------- | ---------------------------------------- |
| `file`           | The affected Vue file.                   |
| `rule`           | A rule name, or `parse-error`.           |
| `severity`       | `warn` or `error`.                       |
| `message`        | Explanation and guidance.                |
| `line`, `column` | One-based position in the original file. |
| `offset`         | Zero-based JavaScript string position.   |

Optional fields:

| Field         | Value                                                                                                                                                               |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `component`   | The component or tag name.                                                                                                                                          |
| `className`   | The reported class.                                                                                                                                                 |
| `prop`        | The configured class prop or SVG paint attribute.                                                                                                                   |
| `slot`        | The literal key in a slot-map prop object.                                                                                                                          |
| `definition`  | The component's absolute source `file`, plus optional `props.size` and `props.variant` string arrays from [discovery](configuration.md#component-source-discovery). |
| `suggestions` | Complete replacement class strings.                                                                                                                                 |

- Class findings point to their containing attribute or binding.
- Findings in a file sort by offset, then rule name.
- `definition` prop choices are guidance. selfix doesn't validate prop values against them.

`suggestions` is advisory. It holds at most one replacement, for a spelling mistake or for an arbitrary value that matches a theme utility. The compiler validates it and your policy permits it. The field is omitted when no single correction is clear. It has no edit ranges, and selfix never changes source. Text output appends `Did you mean "flex-col"?` to the message. The API `message`, including a custom message, stays unchanged.
