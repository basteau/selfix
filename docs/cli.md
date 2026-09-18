# CLI

[Documentation index](README.md)

```sh
pnpm exec selfix src
pnpm exec selfix "apps/**/*.vue" --config selfix.config.ts
pnpm exec selfix src --css src/style.css --format json
pnpm exec selfix src --max-warnings 0
pnpm exec selfix --help
```

| Flag                  | Default and behavior                                                                                                 |
| --------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `--config <file.ts>`  | `selfix.config.ts` in the current directory. No upward search; the file must exist and have a default config export. |
| `--css <file>`        | Overrides config `css`; path relative to the current directory.                                                      |
| `--format text\|json` | `text`. Selects diagnostic output format.                                                                            |
| `--max-warnings <n>`  | Unlimited. Non-negative integer; fails when the warning count exceeds it.                                            |
| `--help`, `-h`        | Prints usage without loading a project.                                                                              |
| `--version`           | Prints the installed version without loading a project.                                                              |
| `--`                  | Ends option parsing; all following arguments are inputs.                                                             |

### Discovery and output

Inputs are files, recursively scanned directories, or quoted globs. Quote globs so selfix receives the pattern instead of shell-expanded paths. Without inputs, it scans the current directory. Input paths, globs, `--config`, and `--css` resolve from the current directory. Config `css` and path exclusions resolve from the config directory. A config is required even with `--css`.

Component source discovery defaults to the config directory, even when scanning from another working directory. Override `project.root` or set `project: false`; see [supported metadata and lifecycle](configuration.md#component-source-discovery). Discovery failures exit `2`.

Only `.vue` files are checked. Repeated inputs are deduplicated and files are sorted. Directory traversal skips symbolic-link entries. A directly supplied non-Vue file, unmatched input, or final scan with no Vue files fails; an empty scan is not a clean result.

The CLI skips path segments named `node_modules`, `.git`, `dist`, `coverage`, `.nuxt`, and `.output`. Config `exclude` entries are not globs: a bare name such as `generated` matches a path segment; `src/components/ui` matches that config-relative path and descendants. Exclusions skip every rule for the whole file. `ignoreImports` affects component recognition only.

Text output contains one `file:line:column severity rule message` line per diagnostic, followed by the checked-file/error/warning summary. Text paths are relative to the current directory. JSON output is a diagnostic array with no summary; a clean scan prints `[]`. JSON `file` paths are absolute.

Each diagnostic has `file`, `rule`, `severity`, `message`, `line`, `column`, and `offset`, with optional `component`, `className`, `prop`, `slot`, and `definition`. Restyling findings can include `definition: { file, props?: { size?: string[], variant?: string[] } }`; this absolute definition path is separate from the offending SFC `file`. Text messages include the same verified guidance. These choices are not promised visual replacements. `rule` can be one of the six rules or `parse-error`; severity is `warn` or `error`. Lines and columns are one-based; offsets are zero-based JavaScript string positions in the original SFC. Class findings point to the containing attribute or binding, rather than each token's exact character. Within a file, diagnostics sort by offset and then rule name.

Diagnostic output goes to stdout. Configuration, loading, and input failures print `selfix: ...` to stderr, including when JSON format is requested.

| Exit | Meaning                                                                          |
| ---- | -------------------------------------------------------------------------------- |
| `0`  | No errors; warnings within `--max-warnings`, if set. Also used for help/version. |
| `1`  | Rule errors, parse errors, or too many warnings.                                 |
| `2`  | Configuration, theme-loading, or input failure, including an empty scan.         |

See also: [configuration](configuration.md), [adoption](adoption.md), and [API reference](api.md).
