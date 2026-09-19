---
title: CLI
description: Choose files to check and read the results.
---

Run selfix from the directory containing `selfix.config.ts`:

```sh
pnpm exec selfix src
```

This checks the Vue files in `src` and its subdirectories. If you haven't created a config yet, follow [Getting started](getting-started.md).

## Discovery and output

Pass files, directories, or quoted globs. With no input, selfix scans the current directory:

```sh
pnpm exec selfix src/Page.vue
pnpm exec selfix "apps/**/*.vue" --config selfix.config.ts
```

Quote globs so selfix receives the pattern itself. Duplicate files are checked once, in sorted order. An unmatched input, directly supplied non-Vue file, or empty scan fails.

Directories named `node_modules`, `.git`, `dist`, `coverage`, `.nuxt`, and `.output` are skipped. Directory traversal also skips symbolic links.

To skip more files, add `exclude` entries to the config. These aren't globs: `generated` matches a path segment; `src/generated` matches that config-relative path and its descendants. Exclusions skip all rules. Use [file overrides](configuration.md#per-file-rule-overrides) to relax individual rules instead.

### Paths

| Path                                                        | Relative to                                         |
| ----------------------------------------------------------- | --------------------------------------------------- |
| Inputs, `--config`, `--css`                                 | Current working directory.                          |
| Config `css`, `cssAliases`, path exclusions, file overrides | Config directory.                                   |
| Component discovery                                         | Config directory, unless `project.root` changes it. |

The CLI doesn't search parent directories for a config. A config is required even with `--css`.

## Options

| Option                | Behavior                                                                   |
| --------------------- | -------------------------------------------------------------------------- |
| `--config <file.ts>`  | Use this config. Defaults to `selfix.config.ts`.                           |
| `--css <file>`        | Override the config's CSS entry.                                           |
| `--format text\|json` | Choose output format. Defaults to `text`.                                  |
| `--max-warnings <n>`  | Fail when warnings exceed this non-negative integer. Unlimited by default. |
| `--help`, `-h`        | Print usage.                                                               |
| `--version`           | Print the installed version.                                               |
| `--`                  | Treat all remaining arguments as inputs.                                   |

Help and version commands don't load your project.

## Output formats

Text output points to the file, line, and column of each finding, followed by a summary:

```text
Checked 3 Vue files: 1 error, 0 warnings.
```

Use JSON when another tool needs the findings:

```sh
pnpm exec selfix src --format json
```

JSON output is an array with no summary. A clean check returns `[]`. File paths are absolute in JSON and relative to the working directory in text output.

Findings go to stdout. Loading, config, and input failures go to stderr as `selfix: ...`, even in JSON mode.

## Exit codes

| Code | Meaning                                                                     |
| ---- | --------------------------------------------------------------------------- |
| `0`  | No errors; warnings within the limit, if set. Also used for help/version.   |
| `1`  | Rule errors, parse errors, or too many warnings.                            |
| `2`  | Configuration, theme, discovery, or input failure, including an empty scan. |

For gradual rollout, see [warning limits](adoption.md#set-a-warning-limit).

## Diagnostic fields

A diagnostic is one reported finding. API and JSON consumers receive these fields:

| Field            | Value                                    |
| ---------------- | ---------------------------------------- |
| `file`           | The affected Vue file.                   |
| `rule`           | One of the six rules, or `parse-error`.  |
| `severity`       | `warn` or `error`.                       |
| `message`        | Explanation and guidance.                |
| `line`, `column` | One-based position in the original file. |
| `offset`         | Zero-based JavaScript string position.   |

Optional fields are `component`, `className`, `prop`, `slot`, and `definition`. Class findings point to their containing attribute or binding. Findings within a file sort by offset, then rule name.

`definition` contains an absolute component `file` and optional `props.size` and `props.variant` string arrays. These come from [source discovery](configuration.md#component-source-discovery); they provide guidance without validating prop values.
