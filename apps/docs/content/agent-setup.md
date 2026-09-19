---
title: Set up selfix with a coding agent
description: Give your agent a setup task with a checkable result.
---

A coding agent can connect selfix to your app's theme and components. Give it this prompt:

```text
Set up selfix using https://github.com/basteau/selfix/blob/main/apps/docs/content/agent-setup.md.
Inspect our theme, component imports, scripts, and existing config first.
Preserve our current policy. For a new setup, start with no-restyle warnings
and turn the other rules off unless I specify otherwise.
Verify that a deliberate styling violation is reported and its correction passes.
Then run the real check and report the result without weakening the policy.
```

The procedure below is for the agent doing that work. Keep setup changes to dependencies, config, scripts, and existing agent instructions. Report application findings separately.

## Inspect before editing

Read the project's contributor instructions and note existing changes. Identify:

- The package manager, workspace apps, and current lint commands.
- Installed Node, Vue, and Tailwind versions against the [requirements](getting-started.md#install-selfix).
- The actual Tailwind entry and any generated CSS it needs.
- Component import strings and auto-imported names.
- Existing selfix rules, contracts, exclusions, and warning limits.

Report incompatible versions rather than upgrading the app as a setup side effect. Inspect configuration before executing it; selfix config and Tailwind plugins run as Node code.

## Add the runner

Use the project's package manager. For a pnpm app that owns its tooling:

```sh
pnpm add -D selfix
```

Keep existing lint tools. Create `selfix.config.ts` using the real theme and matching [component imports](configuration.md#component-recognition). Check module compatibility before changing `"type"` in an existing CommonJS package; see [configuration requirements](configuration.md#configuration-file).

## Choose the policy

Preserve an existing policy. For a new setup without a specified policy, use the complete [warning configuration](adoption.md#start-with-warnings): `no-restyle` at `warn`, the other five rules at `off`. Omitted rules default to `error`.

Add or reuse a script in `package.json`:

```json
{
  "scripts": {
    "lint:design": "selfix src"
  }
}
```

Keep any existing warning limit. Don't weaken rules, widen exclusions, or substitute a smaller theme to make the check pass.

## Scope workspaces per application

Each run uses one config and one theme. Give apps with different themes separate configs.

If tooling is installed at the workspace root, run from there:

```sh
pnpm exec selfix apps/store/src --config apps/store/selfix.config.ts
pnpm exec selfix apps/admin/src --config apps/admin/selfix.config.ts
```

In the store config, `css: "src/style.css"` means `apps/store/src/style.css`. Check shared packages with their intended consuming theme. For app-owned tooling, use app-local scripts. Record the working directory; see [CLI paths](cli.md#paths).

## Verify loading, then enforcement

Use a uniquely named temporary directory inside the app, outside excluded paths. Keep the real config and theme. Arrange cleanup even if a check fails.

### 1. Verify loading

Create `Probe.vue`:

```vue
<template><div /></template>
```

Run from the app directory, replacing `<probe-directory>` with the temporary path:

```sh
pnpm exec selfix <probe-directory>/Probe.vue --format json
```

Expect exit `0` and `[]`. This confirms the config and theme load. Help/version commands don't verify that.

### 2. Verify an enabled rule

Import a real protected component and add a class its policy rejects. With the default `no-restyle` allowance and standard Tailwind spacing, `class="p-4"` works as the violation.

Check the rule, severity, and source location. For warnings, add `--max-warnings 0` and expect exit `1`. If every rule is off, report that enforcement wasn't verified and ask which rule to enable.

### 3. Verify the correction

Remove the override or use a supported component prop. Run the same command and warning limit. Expect no findings and exit `0`.

### 4. Run the real check

Remove the temporary directory. Run the project's script on its intended files and report the remaining findings. Exit `2` means setup or loading failed; resolve it before calling the setup verified. See [Troubleshooting](troubleshooting.md).

## Hand off the setup

Report changed files, commands and working directories, effective rule severities, warning limits, verification results, and remaining findings. Include exclusions or unsupported syntax that limit coverage.

Add the verified command to the project's existing agent instructions:

```text
After UI edits, run pnpm run lint:design from the app directory.
Correct findings using component props, theme classes, or agreed contracts.
Preserve the policy and report unresolved findings instead of weakening checks.
```

This procedure is inspired by [shadcn/lint's setup guide](https://github.com/shadcn-ui/lint/blob/main/SETUP.md).
