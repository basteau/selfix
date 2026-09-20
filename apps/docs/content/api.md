---
title: API
description: Check Vue source and consume findings from your own Node tool.
---

Use `createLinter` to load a theme once and check multiple Vue source strings. For terminal or CI checks, use the [CLI](cli.md).

## Create a linter

With selfix installed, save this as `check-design.mjs` in your project root. It reads your existing `src/style.css` and `src/Page.vue`:

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
| `config`  | [Policy settings](configuration.md); defaults to `{}`. CLI-only `css` and `exclude` fields are rejected. |

The API doesn't read `selfix.config.ts`. You load the CSS and choose the files.

## Lint source

`linter.lint(source, filename?)` synchronously returns diagnostics, or `[]` for no findings. The filename defaults to `component.vue` and is preserved in results. Files outside `root` receive top-level rules only.

For one source string, `await lintSource(source, { css, root?, cssBase?, config?, filename? })` loads the theme and checks it in one call.

## Component discovery and reuse

Discovery is opt-in: add `config: { project: {} }` for component definitions and readable prop choices. An explicit `project.root` resolves from the API `root`.

Reuse the linter until its theme, policy, or project sources change, then recreate it. Discovery captures a source snapshot; the current SFC uses the source passed to `lint`. Each CLI run creates a fresh linter.

## Errors

Parsing and unsupported-input problems return `parse-error` diagnostics. Invalid config, theme loading, and project-source loading failures throw or reject. Handle both: a failed load is not a clean result.

## Diagnostic fields

A diagnostic is one reported finding. API and JSON consumers receive these fields:

| Field            | Value                                     |
| ---------------- | ----------------------------------------- |
| `file`           | The affected Vue file.                    |
| `rule`           | One of the seven rules, or `parse-error`. |
| `severity`       | `warn` or `error`.                        |
| `message`        | Explanation and guidance.                 |
| `line`, `column` | One-based position in the original file.  |
| `offset`         | Zero-based JavaScript string position.    |

Optional fields are `component`, `className`, `prop`, `slot`, and `definition`. Class findings point to their containing attribute or binding. Findings within a file sort by offset, then rule name.

`definition` contains an absolute component `file` and optional `props.size` and `props.variant` string arrays. These come from [source discovery](configuration.md#component-source-discovery); they provide guidance without validating prop values.
