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

## Other CI systems

Use Node.js 22.18 or later and run:

```sh
pnpm install --frozen-lockfile
pnpm run lint:design
```

For machine-readable results, add `--format json`. See [output formats](cli.md#output-formats).
