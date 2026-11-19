---
title: CLI
description: Choose files to check and read the results.
---

Run selfix from your project root, where Nuxt UI is installed and prepared:

```sh
pnpm exec selfix
```

This checks every Vue file in the project. No config is needed. If the generated Nuxt UI theme is missing, [prepare the app first](themes.md#the-generated-nuxt-ui-theme).

## File selection

Pass files, directories, or quoted globs. With no input, selfix scans the current directory:

```sh
pnpm exec selfix app/pages/index.vue
pnpm exec selfix app "layers/**/*.vue"
```

Input globs use Node’s glob syntax. Quote them to prevent shell expansion. Files are deduplicated and sorted. Unmatched inputs, non-Vue file inputs, and empty scans fail.

Directories named `node_modules`, `.git`, `dist`, `coverage`, `.nuxt`, and `.output` are skipped. Directory traversal also skips symbolic links.

Use config-relative `exclude` globs to skip entire files:

```ts
exclude: ["**/generated/**", "app/legacy/**/*.vue"],
```

These use the same [patterns as overrides](configuration.md#per-file-rule-overrides). Exact `.vue` paths also work. Bare directory names don't. Exclusions skip every rule. Use overrides to relax individual rules.

### Paths

| Path                                                    | Relative to                |
| ------------------------------------------------------- | -------------------------- |
| Inputs, `--config`, baseline files                      | Current working directory. |
| Config `css`, `buildDir`, `exclude`, and file overrides | Config directory.          |
| Paths inside a baseline file                            | Config directory.          |

The project root is the config's directory, or the working directory when there is no config. selfix looks there for Nuxt UI and its generated theme. It doesn't search parent directories for a config, and a config with another extension, such as `selfix.config.js`, is an error.

## Options

| Option                        | Behavior                                                                                   |
| ----------------------------- | ------------------------------------------------------------------------------------------ |
| `--config <file.ts>`          | Use this config. Defaults to `selfix.config.ts` when it exists.                            |
| `--format text\|json\|gitlab` | Choose output format. Defaults to `text`.                                                  |
| `--max-warnings <n>`          | Fail when warnings exceed this non-negative integer. Unlimited by default.                 |
| `--unused-exceptions <level>` | Set `off`, `warn`, or `error` for unused exception comments. Overrides `unusedExceptions`. |
| `--baseline <file>`           | Suppress known findings. See [Baseline](#baseline).                                        |
| `--update-baseline <file>`    | Record current findings in a baseline file.                                                |
| `--prune-baseline <file>`     | Lower baseline counts to current findings, then check.                                     |
| `--help`, `-h`                | Print usage.                                                                               |
| `--version`                   | Print the installed version.                                                               |
| `--`                          | Treat all remaining arguments as inputs.                                                   |

Help and version commands don't load your project.

## Output formats

Text output has one line per finding with the file, line, column, severity, rule, and message, followed by a summary:

```text
app/pages/index.vue:12:6 error no-raw-colors Replace "text-gray-500" with a theme color such as text-dimmed, text-muted, text-toned, text-default, text-highlighted, text-inverted, text-primary, text-secondary.
Checked 3 Vue files: 1 error, 0 warnings.
Exceptions: 2 suppressed.
```

The `Exceptions` line appears when [exception comments](configuration.md#suppress-findings) suppressed findings.

Use JSON when another tool needs the findings:

```sh
pnpm exec selfix --format json
```

JSON returns an object with the [diagnostics](api.md#diagnostic-fields), suppressed counts, and unused [baseline](#baseline) entries:

```json
{
  "diagnostics": [],
  "suppressed": { "inline": 2, "baseline": 0 },
  "unused": []
}
```

`suppressed.inline` counts findings hidden by exception comments. Without a baseline, `suppressed.baseline` is `0` and `unused` is `[]`. JSON paths are absolute, and text paths are relative to the working directory.

Findings go to stdout. Loading, config, and input failures go to stderr as `selfix: ...`, even in JSON and GitLab mode, and print no partial report. If the project doesn't use Nuxt UI, selfix says so on stderr and checks it without Nuxt UI's components.

### GitLab Code Quality

Use `gitlab` to write a [GitLab Code Quality](https://docs.gitlab.com/ci/testing/code_quality/) report. Merge requests show its findings in the Code Quality widget, and GitLab Ultimate also marks them in the diff:

```sh
pnpm exec selfix --format gitlab > gl-code-quality-report.json
```

The report is a JSON array with one issue per finding; a clean check returns `[]`:

```json
[
  {
    "description": "…",
    "check_name": "no-arbitrary-values",
    "fingerprint": "3f1c…",
    "severity": "major",
    "location": { "path": "app/pages/index.vue", "lines": { "begin": 2 } }
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
pnpm exec selfix apps/web/app --config apps/web/selfix.config.ts --format gitlab
```

Fingerprints don't include line numbers, including the parser position in a script parse error, so a finding keeps its fingerprint when unrelated edits move it. Identical findings in one file are numbered in source order. Moving or renaming the file, or changing the rule's message, gives the finding a new fingerprint.

## Baseline

A baseline file records existing findings as counts per file and rule. A check against it suppresses up to that many findings and reports the rest, so new findings fail while old ones remain. See [adoption](adoption.md#record-existing-findings-in-a-baseline) for the workflow.

```sh
pnpm exec selfix --update-baseline selfix-baseline.json
pnpm exec selfix --baseline selfix-baseline.json
```

Keys are config-relative paths with `/` separators:

```json
{
  "app/pages/index.vue": {
    "no-raw-colors": { "count": 3 }
  }
}
```

| Option                     | Behavior                                                                                                                                        |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `--baseline <file>`        | Suppress the first `count` findings of each file and rule in source order. Report the rest and unused entries.                                  |
| `--update-baseline <file>` | Replace the file with the current errors and warnings, and exit `0`. With parse errors or exception comment errors, write nothing and exit `1`. |
| `--prune-baseline <file>`  | Lower counts above the current findings and remove entries that reach zero, then check like `--baseline`.                                       |

selfix can't tell which finding in a file is new. With 3 recorded and 4 current findings, it reports the last one.

An entry is unused when its file has fewer findings than its count. selfix lists unused entries and exits `1`, so a fixed finding can't make room for a new one. Run `--prune-baseline` to lower the counts. Renaming a file leaves its old entry unused and reports its findings as new.

selfix checks an entry only when its file is an input, lies in an input directory, or no longer exists. A run on `app/pages/checkout` ignores entries for other files, while entries for excluded files under `app/pages/checkout` become unused. `--update-baseline` replaces the whole file with findings from the current inputs, so run it with the same inputs as your check.

Parse errors are never recorded or suppressed. Exception comments apply first, so the findings they suppress are never recorded, and neither are `invalid-exception` and `unused-exception` findings. A new comment for a recorded finding leaves its entry unused, so run `--prune-baseline` after you add one. `--baseline` and `--prune-baseline` leave the entries of a file that fails to parse untouched. Config, theme, and input failures still exit `2` and never write the file. A missing or malformed baseline file is an input failure.

Text output adds a summary line:

```text
Checked 3 Vue files: 1 error, 0 warnings.
Baseline: 4 suppressed, 0 unused.
```

JSON output counts baseline suppressions and lists unused entries:

```json
{
  "diagnostics": [],
  "suppressed": { "inline": 0, "baseline": 4 },
  "unused": [
    { "file": "/repo/app/pages/index.vue", "rule": "no-raw-colors", "count": 3, "found": 1 }
  ]
}
```

GitLab output lists only unsuppressed findings and writes unused entries to stderr. `--max-warnings` counts only unsuppressed warnings.

Use one baseline option per run. `--update-baseline` rejects `--format json|gitlab` and `--max-warnings`.

## Exit codes

| Code | Meaning                                                                                  |
| ---- | ---------------------------------------------------------------------------------------- |
| `0`  | No errors; warnings within the limit, if set. Also used for help/version.                |
| `1`  | Rule, parse, or exception comment errors, too many warnings, or unused baseline entries. |
| `2`  | Configuration, theme, or input failure, including an empty scan.                         |

For gradual rollout, see [warning limits](adoption.md#set-a-warning-limit).
