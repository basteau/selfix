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
| `--doctor`            | Explain component recognition, enforcement, and definition discovery.      |
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

## Diagnose component protection

```sh
pnpm exec selfix src --doctor
```

Doctor lists every component usage, including those without classes, and whether `no-restyle` protects it. It uses the same inputs, exclusions, config, and `--css` as a normal run, and it omits styling findings. In this example, `Card` is registered globally:

```text
Configuration: /app/selfix.config.ts
Tailwind CSS loaded: /app/src/style.css
src/App.vue:17:9 <Button>: recognized by ui "@/components/ui"; no-restyle: error; active protection: yes; definition: /app/src/components/ui/Button.vue
src/App.vue:21:3 <Card>: unrecognized (no recognition setting matches); no-restyle: error; active protection: no; definition: unavailable
Scanned 2 Vue files; 2 component usages; 1 actively protected.
…
```

Each usage shows:

- **Recognition.** The matching `components` pattern, `ui` prefix, or `componentImports` pattern, or `unrecognized`. `ignoreImports` wins over all three.
- **Enforcement.** The `no-restyle` severity after file overrides. For recognized usages, `warn` and `error` count as active protection, and `off` does not. The contract still decides which classes pass.
- **Definition.** The component's source path, `unavailable`, or `disabled` when `project: false`. A missing definition never turns off protection.

For each unrecognized imported component, doctor suggests an exact `componentImports` pattern. Add it only if that component belongs to your design system. When nothing is actively protected, doctor prints an advisory with the cause, such as no usages, unrecognized or ignored usages, or `no-restyle` turned off. Doctor never edits your config.

| Exit | Meaning                                                                                             |
| ---- | --------------------------------------------------------------------------------------------------- |
| `0`  | The report completed, including advisories and unavailable definitions.                             |
| `1`  | Parse errors, unsupported analysis, or class inputs selfix cannot read. The list may be incomplete. |
| `2`  | Configuration, theme, discovery, or input failure, including an empty scan.                         |

Doctor prints text only. `--format json` and `--max-warnings` fail with exit `2` when combined with `--doctor`.

Doctor uses the same component identity rules as a normal run. Imported kebab-case tags use the local import name, and globals use their template name. `<component :is="Button">` reports the `Button` import. `<UI.Button>` reports the written name and is recognized through the namespace import's module. Unresolved dynamic components, unresolved dotted tags, bare namespace imports, and `is="vue:…"` are reported as unsupported. Doctor does not trace wrappers, resolve packages beyond the configured patterns, or discover richer props, so no report proves every component is covered.
