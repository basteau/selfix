---
title: Run in CI
description: Fail pull requests that add styling drift.
---

Run your [`lint:design` script](adoption.md) in CI, so CI and your machine enforce the same rules and warning limit.

## GitHub Actions

```yaml
# .github/workflows/design-lint.yml
name: Design lint
on:
  pull_request:
  push:
    branches: [main]

jobs:
  selfix:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: pnpm/action-setup@v6
      - uses: actions/setup-node@v7
        with:
          node-version: 24
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm run lint:design
```

- `pnpm/action-setup` reads the pnpm version from the `packageManager` field in `package.json`. Without that field, set `with: version:` on the action.
- In a monorepo, run the app's script with `pnpm --filter <app> run lint:design`.
- For Nuxt, add `- run: pnpm exec nuxt prepare` before the check. See [Nuxt](nuxt.md).
- The job fails on exit code `1` (errors, or warnings over the limit) and exit code `2` (configuration, theme, or input failure).

## GitLab CI

Write a [Code Quality report](cli.md#gitlab-code-quality) so merge requests show selfix findings:

```yaml
# .gitlab-ci.yml
design-lint:
  image: node:24
  before_script:
    - corepack enable
    - pnpm install --frozen-lockfile
  script:
    - pnpm exec selfix src --format gitlab > gl-code-quality-report.json
  artifacts:
    when: always
    reports:
      codequality: gl-code-quality-report.json
```

- Pass the same inputs and `--max-warnings` as your `lint:design` script. Use `pnpm exec` rather than `pnpm run`, which can print a script banner to stdout and corrupt the report.
- `when: always` uploads the report when findings fail the job.
- Report paths are relative to the directory selfix runs in, and GitLab expects them relative to the repository root. In a monorepo, run selfix from the root with the app's `--config` instead of `pnpm --filter`. See [GitLab Code Quality](cli.md#gitlab-code-quality).
- On exit code `2`, the error goes to the job log and the report file is empty.

## Other CI systems

Use Node.js 22.18 or later and run:

```sh
pnpm install --frozen-lockfile
pnpm run lint:design
```

For machine-readable results, add `--format json` or `--format gitlab`. See [output formats](cli.md#output-formats).
