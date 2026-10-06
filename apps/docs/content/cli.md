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

| Path                                                                           | Relative to                                         |
| ------------------------------------------------------------------------------ | --------------------------------------------------- |
| Inputs, `--config`, `--css`, baseline files                                    | Current working directory.                          |
| Config `css`, `components.json`, `cssAliases`, path exclusions, file overrides | Config directory.                                   |
| Paths inside a baseline file                                                   | Config directory.                                   |
| Component discovery                                                            | Config directory, unless `project.root` changes it. |

The CLI doesn't search parent directories for a config. A config is required even with `--css`.

## Options

| Option                        | Behavior                                                                   |
| ----------------------------- | -------------------------------------------------------------------------- |
| `--doctor`                    | Explain component recognition, enforcement, and definition discovery.      |
| `--config <file.ts>`          | Use this config. Defaults to `selfix.config.ts`.                           |
| `--css <file>`                | Override the config's CSS entry.                                           |
| `--format text\|json\|gitlab` | Choose output format. Defaults to `text`.                                  |
| `--max-warnings <n>`          | Fail when warnings exceed this non-negative integer. Unlimited by default. |
| `--baseline <file>`           | Suppress known findings. See [Baseline](#baseline).                        |
| `--update-baseline <file>`    | Record current findings in a baseline file.                                |
| `--prune-baseline <file>`     | Lower baseline counts to current findings, then check.                     |
| `--help`, `-h`                | Print usage.                                                               |
| `--version`                   | Print the installed version.                                               |
| `--`                          | Treat all remaining arguments as inputs.                                   |

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

JSON returns a [diagnostic array](api.md#diagnostic-fields) with absolute paths and no summary; a clean check returns `[]`. With a [baseline](#baseline), it returns an object instead. Text paths are relative to the working directory.

Findings go to stdout. Loading, config, and input failures go to stderr as `selfix: ...`, even in JSON and GitLab mode, and print no partial report.

### GitLab Code Quality

Use `gitlab` to write a [GitLab Code Quality](https://docs.gitlab.com/ci/testing/code_quality/) report. Merge requests show its findings in the Code Quality widget, and GitLab Ultimate also marks them in the diff:

```sh
pnpm exec selfix src --format gitlab > gl-code-quality-report.json
```

The report is a JSON array with one issue per finding; a clean check returns `[]`:

```json
[
  {
    "description": "…",
    "check_name": "no-arbitrary-values",
    "fingerprint": "3f1c…",
    "severity": "major",
    "location": { "path": "src/Page.vue", "lines": { "begin": 2 } }
  }
]
```

| Field                  | Value                                                                                  |
| ---------------------- | -------------------------------------------------------------------------------------- |
| `description`          | The finding's message, with spelling suggestions as in text output.                    |
| `check_name`           | The rule, or `parse-error`.                                                            |
| `severity`             | `major` for errors and `minor` for warnings.                                           |
| `location.path`        | The file relative to the working directory, with `/` separators.                       |
| `location.lines.begin` | The line in the original SFC.                                                          |
| `fingerprint`          | A SHA-256 hash of the rule, path, message, and occurrence of that message in the file. |

GitLab expects paths relative to the repository root, so run selfix from the root. That's GitLab's default job directory. In a monorepo, pass the app's config and inputs instead of changing directories:

```sh
pnpm exec selfix apps/web/src --config apps/web/selfix.config.ts --format gitlab
```

Fingerprints don't include line numbers, including the parser position in a script parse error, so a finding keeps its fingerprint when unrelated edits move it. Identical findings in one file are numbered in source order. Moving or renaming the file, or changing the rule's message, gives the finding a new fingerprint.

## Baseline

A baseline file records existing findings as counts per file and rule. A check against it suppresses up to that many findings and reports the rest, so new findings fail while old ones remain. See [adoption](adoption.md#record-existing-findings-in-a-baseline) for the workflow.

```sh
pnpm exec selfix src --update-baseline selfix-baseline.json
pnpm exec selfix src --baseline selfix-baseline.json
```

Keys are config-relative paths with `/` separators:

```json
{
  "src/Page.vue": {
    "no-raw-colors": { "count": 3 }
  }
}
```

| Option                     | Behavior                                                                                                            |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `--baseline <file>`        | Suppress the first `count` findings of each file and rule in source order. Report the rest and unused entries.      |
| `--update-baseline <file>` | Replace the file with the current errors and warnings, and exit `0`. With parse errors, write nothing and exit `1`. |
| `--prune-baseline <file>`  | Lower counts above the current findings and remove entries that reach zero, then check like `--baseline`.           |

selfix can't tell which finding in a file is new. With 3 recorded and 4 current findings, it reports the last one.

An entry is unused when its file has fewer findings than its count. selfix lists unused entries and exits `1`, so a fixed finding can't make room for a new one. Run `--prune-baseline` to lower the counts. Renaming a file leaves its old entry unused and reports its findings as new.

selfix checks an entry only when its file is an input, lies in an input directory, or no longer exists. A run on `src/checkout` ignores entries for other files, while entries for excluded files under `src/checkout` become unused. `--update-baseline` replaces the whole file with findings from the current inputs, so run it with the same inputs as your check.

Parse errors are never recorded or suppressed. `--baseline` and `--prune-baseline` leave the entries of a file that fails to parse untouched. Config, theme, and input failures still exit `2` and never write the file. A missing or malformed baseline file is an input failure.

Text output adds a summary line:

```text
Checked 3 Vue files: 1 error, 0 warnings.
Baseline: 4 suppressed, 0 unused.
```

JSON output becomes an object with the unsuppressed diagnostics:

```json
{
  "diagnostics": [],
  "suppressed": 4,
  "unused": [{ "file": "/app/src/Page.vue", "rule": "no-raw-colors", "count": 3, "found": 1 }]
}
```

GitLab output lists only unsuppressed findings and writes unused entries to stderr. `--max-warnings` counts only unsuppressed warnings.

Use one baseline option per run. `--doctor` rejects all three, and `--update-baseline` rejects `--format json|gitlab` and `--max-warnings`.

## Exit codes

| Code | Meaning                                                                     |
| ---- | --------------------------------------------------------------------------- |
| `0`  | No errors; warnings within the limit, if set. Also used for help/version.   |
| `1`  | Rule errors, parse errors, too many warnings, or unused baseline entries.   |
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

Doctor prints text only. `--format json`, `--format gitlab`, and `--max-warnings` fail with exit `2` when combined with `--doctor`.

Doctor uses the same component identity rules as a normal run. Imported kebab-case tags use the local import name, and globals use their template name. `<component :is="Button">` reports the `Button` import. `<UI.Button>` reports the written name and is recognized through the namespace import's module. Unresolved dynamic components, unresolved dotted tags, bare namespace imports, and `is="vue:…"` are reported as unsupported. A traced wrapper shows `wraps <Button>, which is recognized by …`. Doctor does not trace deeper wrappers, resolve packages beyond the configured patterns, or discover richer props, so no report proves every component is covered.
