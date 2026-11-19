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

- Change only dependencies, `selfix.config.ts`, the `scripts` field in `package.json`, existing agent instructions, and a temporary probe directory. Report application findings instead of fixing them.
- Keep existing lint tools and policy. If the project already has a selfix config, keep its rules and warning limit.
- For a new setup, create a config that sets `no-restyle` to `"warn"` and every other rule to `"off"`, unless the user asked for something else. Add no warning limit, and report the current warning count.
- Never widen exclusions or contracts, write a temporary config, or replace the real theme to make the check pass.
- If Nuxt UI 4 or Tailwind CSS 4 is missing, stop and report it. Do not install or upgrade Nuxt UI, Tailwind, Vue, or Node.

## Inspect the project

1. Read the contributor instructions and preserve uncommitted changes.
2. Identify the package manager. Use its exec command, such as `pnpm exec` or `npx`, wherever this page says `pnpm exec`.
3. Check the Node, Nuxt UI, Vue, and Tailwind versions against the [requirements](getting-started.md#install-selfix).
4. Find out whether the app is [Nuxt](nuxt.md) or [Vue with Vite](vue.md), and whether it sets a Nuxt UI `prefix` or a custom build directory.
5. Find the project's own design-system components, such as an `App` prefix, and ask whether to protect them.
6. Read any executable config before you run it.

## Configure selfix

1. Install selfix as described in [Getting started](getting-started.md).
2. Prepare the app so the [generated theme](themes.md#the-generated-nuxt-ui-theme) exists.
3. Create `selfix.config.ts` with the rules from the setup policy. Add `prefix`, `buildDir`, `css`, or `components` only when the project needs them. If the config uses `import` and `package.json` has no `"type": "module"`, check that the config loads before you change `package.json`.
4. Add a `lint:design` script, as described in [Adoption](adoption.md). For several apps, follow [workspaces](adoption.md#workspaces).
5. Add the `lint:design` command to the existing agent instructions, as described in [Adoption](adoption.md#run-the-same-check-in-ci-and-coding-agents).

## Prove enforcement

If every rule is off, skip this section and report that enforcement is unverified. Exit code `2` at any step means setup failed.

Create a uniquely named directory inside the app, outside any exclusions. Remove it at the end, even if a step fails. After each edit below, run this from the same directory and with the same `--config` as `lint:design`:

```sh
pnpm exec selfix <probe-directory>/Probe.vue --format json --max-warnings 0
```

1. Write `<template><div /></template>` to `Probe.vue`. Expect empty `diagnostics`, exit code `0`, and nothing on stderr. A stderr line saying Nuxt UI was not found means selfix ran in the wrong directory or the app isn't prepared.
2. Change the template to `<template><UButton class="p-4" /></template>`, with the project's prefix. Expect a `no-restyle` finding at the `class` attribute, its severity, and exit code `1`. If `no-restyle` is off, probe a rule that is on and say so.
3. Replace the class with a `size` the message lists. Expect empty `diagnostics` and exit code `0`.
4. Delete the probe directory and run the project's `lint:design` script.

## Report

Tell the user:

- the files you changed, and the commands you ran with their working directories
- the effective rules and warning limit, and the current warning count
- the probe results and the remaining findings
- what the check does not cover, such as excluded files and components without a theme

Inspired by [shadcn/lint's setup guide](https://github.com/shadcn-ui/lint/blob/main/SETUP.md).
