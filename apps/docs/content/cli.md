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

Doctor uses the same input selection, exclusions, configuration, CSS override, and path rules as ordinary lint. Its text report shows the resolved config, successfully loaded Tailwind CSS entry, scanned Vue file count, and each component usage at its original SFC line and column, including usages without classes.

Each usage reports:

- **Recognition:** the matching `components` pattern, `ui` prefix, or `componentImports` pattern. `ignoreImports` wins over all of these. Otherwise the report says no recognition setting matches.
- **Enforcement:** the effective `no-restyle` severity after file overrides. Recognized usages with `warn` or `error` count as actively protected; `off` does not. The component's contract still determines which classes are allowed.
- **Definition:** a verified source path, `unavailable`, or `disabled` by `project: false`. Discovery is separate from recognition: unavailable optional metadata does not disable protection.

Zero actively protected matches produce an advisory explaining the observed cause: no collected component usages, unrecognized or ignored usages, or disabled enforcement. Exact import-pattern suggestions are options for components you intend to protect. They do not establish that an import belongs to your design system, and doctor never edits your config.

Doctor reports setup, so ordinary styling violations are omitted. A completed report exits `0`, including zero-match advisories and unavailable definitions. Parse errors, unsupported analysis, and unreadable class inputs remain visible and exit `1`. Configuration, theme, discovery-loading, and input failures exit `2`, including empty scans. Errors mean the inventory may be incomplete.

This first version supports text only. Remove `--format json` and `--max-warnings` when using `--doctor`; those combinations fail with exit `2`. Ordinary lint retains both options.

Doctor preserves existing Vue identity and source-resolution limits. Imported kebab-case usages use the local import name; globals use their template name. Dynamic (`<component>` or `<Component>`), namespace, and `is="vue:…"` component syntax are reported as unsupported. Wrapper tracing, broader package resolution, and richer prop discovery are not supported. Application expressions are never evaluated, and the report does not prove comprehensive component coverage.
