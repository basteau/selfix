---
title: Set up with a coding agent
description: Give your agent a setup task with proof that the check works.
---

Give your coding agent this prompt:

```text
Set up selfix using https://github.com/basteau/selfix/blob/main/apps/docs/content/agent-setup.md.
Inspect our theme, component imports, scripts, and existing config first.
Preserve our policy. For a new setup, start with no-restyle warnings and
turn the other rules off unless I specify otherwise.
Prove that a deliberate violation is reported and its correction passes.
Run the real check and report remaining findings without weakening policy.
```

The following steps are for the agent. Limit setup edits to dependencies, config, scripts, and existing agent instructions; report application findings separately.

## Inspect the project

Read contributor instructions and preserve existing changes. Identify the package manager, [supported versions](getting-started.md#install-selfix), actual theme entry, generated CSS, component imports, and current policy. Report incompatibilities instead of upgrading the app. Inspect executable config before running it.

## Follow the shared setup

Use [installation](getting-started.md#install-selfix) and [adoption](adoption.md) for config, scripts, warning limits, and CI. Keep existing lint tools and policy. Check module compatibility before changing an existing package's `"type"`.

For separate app themes, follow [workspace setup](adoption.md#workspaces). Don't widen exclusions or replace the real theme to make checks pass.

## Prove enforcement

Create a uniquely named temporary directory inside the app, outside exclusions. Keep the real config and arrange cleanup even on failure. Run from the app directory:

```sh
pnpm exec selfix <probe-directory>/Probe.vue --format json --max-warnings 0
```

1. Start with `<template><div /></template>`. Expect `[]` and exit `0` to confirm loading.
2. Import a real protected component and add a class its enabled policy rejects. Default `no-restyle` rejects `p-4` with standard Tailwind spacing. Verify rule, severity, location, and exit `1`.
3. Remove the override or use a supported prop. Repeat the same command; expect `[]` and exit `0`.
4. Remove the probe directory and run the real project script.

If all rules are off, report that enforcement remains unverified and ask which to enable. Exit `2` is a setup failure, not a successful check.

Report changed files, commands and working directories, effective policy and warning limits, probe results, remaining findings, and coverage limits. Add the verified command to existing agent instructions using the [adoption guidance](adoption.md#run-the-same-check-in-ci-and-coding-agents).

Inspired by [shadcn/lint's setup guide](https://github.com/shadcn-ui/lint/blob/main/SETUP.md).
