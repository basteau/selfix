---
title: Set up with a coding agent
description: Give your agent a setup task that ends with proof the check works.
---

Paste this prompt into your coding agent:

```text
Set up selfix in this project. Follow
https://github.com/basteau/selfix/blob/main/apps/docs/content/agent-setup.md
```

The agent configures selfix, proves that it reports a deliberate override, and tells you what changed. The agent follows the rest of this page.

## Setup policy

- Change only dependencies, `selfix.config.ts`, the `scripts` and `"type"` fields in `package.json`, existing agent instructions, and a temporary probe directory. Report application findings instead of fixing them.
- Keep existing lint tools and policy. If the project already has a selfix config, keep its rules and warning limit.
- For a new config, set `no-restyle` to `"warn"` and every other rule to `"off"`, unless the user asked for something else. Add no warning limit, and report the current warning count.
- Never widen exclusions, write a temporary config, or replace the real theme to make the check pass.
- If Tailwind CSS 4 is missing, stop and report it. Do not install or upgrade Tailwind, Vue, or Node.

## Inspect the project

1. Read the contributor instructions and preserve uncommitted changes.
2. Identify the package manager. Use its exec command, such as `pnpm exec` or `npx`, wherever this page says `pnpm exec`.
3. Check the Node, Vue, and Tailwind versions against the [requirements](getting-started.md#install-selfix).
4. Find the Tailwind entry and any generated CSS.
5. Find how pages reference shared components. Note the import string, such as `@/components/ui`, or the component names if they are auto-imported or registered globally.
6. Read any executable config before you run it.

## Configure selfix

1. Install selfix and create `selfix.config.ts` as described in [Getting started](getting-started.md). Skip its optional step that creates a component. Set `ui` for import strings and `components` for auto-imported names. Before you add `"type": "module"` to an existing `package.json`, check that its other `.js` files still load.
2. Add a `lint:design` script, as described in [Adoption](adoption.md). For apps with separate themes, follow [workspaces](adoption.md#workspaces).
3. Run doctor from the same directory and with the same `--config` as `lint:design`:

   ```sh
   pnpm exec selfix <app-source> --doctor
   ```

   Check the summary line `N actively protected` and any advisory. If nothing is actively protected, or `no-restyle` is off, report it and ask which components to protect.

4. Add the `lint:design` command to the existing agent instructions, as described in [Adoption](adoption.md#run-the-same-check-in-ci-and-coding-agents).

## Prove enforcement

If doctor found no protected component, or every rule is off, skip this section and report that enforcement is unverified. Exit code `2` at any step means setup failed.

Create a uniquely named directory inside the app, outside any exclusions. Remove it at the end, even if a step fails. After each edit below, run this from the same directory and with the same `--config` as `lint:design`:

```sh
pnpm exec selfix <probe-directory>/Probe.vue --format json --max-warnings 0
```

1. Write `<template><div /></template>` to `Probe.vue`. Expect empty `diagnostics` and exit code `0`, which confirms the config and theme load.
2. Use a real protected component the way the app's pages do, with the same import string or no import if it is auto-imported. Add a class its policy rejects, such as `p-4` under the default `no-restyle` contract with standard Tailwind spacing. Expect that rule, its severity, the line and column of the class, and exit code `1`.
3. Remove the class or use a supported prop. Expect empty `diagnostics` and exit code `0`.
4. Delete the probe directory and run the project's `lint:design` script.

## Report

Tell the user:

- the files you changed, and the commands you ran with their working directories
- the effective rules and warning limit, and the current warning count
- the doctor summary, the probe results, and the remaining findings
- what the check does not cover, such as excluded files

Inspired by [shadcn/lint's setup guide](https://github.com/shadcn-ui/lint/blob/main/SETUP.md).
