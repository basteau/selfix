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

Input globs use Node’s glob syntax. Quote them to prevent shell expansion. Files are deduplicated and sorted; unmatched inputs, non-Vue file inputs, and empty scans fail.

Directories named `node_modules`, `.git`, `dist`, `coverage`, `.nuxt`, and `.output` are skipped. Directory traversal also skips symbolic links.

Use config-relative `exclude` globs to skip entire files:

```ts
exclude: ["**/generated/**", "src/legacy/**/*.vue"],
```

These use the same [patterns as overrides](configuration.md#per-file-rule-overrides). Exact `.vue` paths also work; bare directory names don't. Exclusions skip every rule. Use overrides to relax individual rules.

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

JSON returns a [diagnostic array](api.md#diagnostic-fields) with absolute paths and no summary; a clean check returns `[]`. Text paths are relative to the working directory.

Findings go to stdout. Loading, config, and input failures go to stderr as `selfix: ...`, even in JSON mode.

## Exit codes

| Code | Meaning                                                                     |
| ---- | --------------------------------------------------------------------------- |
| `0`  | No errors; warnings within the limit, if set. Also used for help/version.   |
| `1`  | Rule errors, parse errors, or too many warnings.                            |
| `2`  | Configuration, theme, discovery, or input failure, including an empty scan. |

For gradual rollout, see [warning limits](adoption.md#set-a-warning-limit).
