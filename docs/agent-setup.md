# Set up selfix with a coding agent

[Documentation index](README.md)

Use this procedure to add selfix to an existing Vue 3 / Tailwind CSS 4 application. Keep setup changes bounded to dependencies, configuration, scripts, and the project's existing agent instructions. Report existing application findings separately.

Copy this prompt into your coding agent:

```text
Set up selfix following https://github.com/basteau/selfix/blob/main/docs/agent-setup.md.
Inspect this project's apps, themes, imports, scripts, and existing policy first.
Preserve existing configuration and use the standalone runner. For a new setup,
use the guide's gradual adoption policy unless I have specified another policy.
Verify loading and enforcement with disposable probes, then run the real check.
Report changed files, commands, policy, findings, and coverage limits.
```

## Inspect before editing

Read the project's contributor and agent instructions and record its current changes. Identify:

- The package manager, lockfile, workspace boundaries, application packages, and task runner. Find existing lint scripts and any `selfix.config.ts` files before choosing where to install or run selfix.
- Installed Node, Vue, and Tailwind versions. selfix requires Node ≥22.18.0, Vue ≥3.2.13 <4, and Tailwind ≥4 <5. Stop and report incompatible versions instead of upgrading the application as a setup side effect.
- Each application's actual Tailwind CSS entry, including imported tokens, plugins, and generated CSS. Follow [theme loading](themes.md), including preparation for Nuxt UI. Do not substitute a minimal theme for the application's theme to remove findings.
- Actual component import strings in representative Vue files, including shared UI packages and aliases, plus global or auto-imported names. `ui` matches import-source prefixes; it is not a directory search. Use [component recognition](configuration.md#component-recognition) to configure only the required matches.
- Existing rule severities, contracts, class props, exclusions, and warning limits. Preserve them. Use discovered definition paths and verified size/variant choices when available, then inspect the component API before choosing a replacement. Discovery does not validate prop values or establish visual equivalence.

Configuration runs as Node code. Inspect and trust `selfix.config.ts` and Tailwind `@plugin`/`@config` modules before running them. See [trust and analysis limits](analysis.md#limitations-and-trust).

## Add the runner and choose policy

Use the detected package manager and the workspace's dependency ownership conventions. In a pnpm application that owns its tooling, install with `pnpm add -D selfix@alpha`. Vue and Tailwind are the only consumer peers; inspect existing versions before adding any missing peer. Preserve existing lint tools and scripts. selfix uses only the standalone runner with `selfix.config.ts`; no ESLint or Oxlint adapter is needed.

Follow the [configuration reference](configuration.md) and [native TypeScript requirements](getting-started.md#quickstart). The documented setup uses `"type": "module"`; if the package is CommonJS, resolve compatibility with its existing scripts before changing that field. Node loads the config without type-checking it; avoid enums and `tsconfig` path aliases.

For an existing setup, make targeted edits to the current config. Preserve its theme, policies, allowances, exclusions, and warning limit. **All six omitted rules default to errors.** Adding an incomplete `rules` object does not disable the omitted rules.

For a new setup, apply the user's chosen policy. If none was specified, use the complete [gradual adoption recipe](adoption.md): `no-restyle` at `warn` and the other five rules explicitly `off`. State that choice in the handoff. Do not disable checks, widen allowances or exclusions, or change the theme merely to obtain a clean run. If enforcement needs a policy decision, report it to the user.

Excluding a component implementation directory skips **every rule** in that directory. There are currently no per-file rule overrides or inline suppressions. Do not add exclusions automatically; consult [exclusion semantics](cli.md#discovery-and-output).

Add a command to the existing scripts object without replacing other scripts. For an app with `src` and a config at its root:

```json
{
  "scripts": {
    "lint:design": "selfix src --config selfix.config.ts"
  }
}
```

If that name already exists, preserve it and reuse or extend the established workflow deliberately. Keep any existing warning limit. Run `pnpm run lint:design` from that app's directory; use the equivalent script command for its package manager.

## Scope workspaces per application

selfix does not discover application configurations automatically or search parent directories for a config. Each run loads one config and one theme. Give apps with different themes or import conventions their own `selfix.config.ts` and run them separately.

For example, with tooling installed at a pnpm workspace root, run these commands from that root:

```sh
pnpm exec selfix apps/store/src --config apps/store/selfix.config.ts
pnpm exec selfix apps/admin/src --config apps/admin/selfix.config.ts
```

In the store config, `css: "src/style.css"` refers to `apps/store/src/style.css`. In the admin config, `css: "styles/theme.css"` refers to `apps/admin/styles/theme.css`. Keep each config's `ui`, component patterns, and policies specific to that app's imports and API. Do not scan both apps with one app's theme. Check shared Vue packages separately with the intended consuming theme and explicit input paths.

Inputs and `--config` resolve from the working directory; config `css`, `cssAliases`, and path exclusions resolve from the config directory. A `--css` override instead resolves from the working directory. Prefer the saved config's theme path for repeatable checks. See the [CLI reference](cli.md).

If dependencies belong to each app instead, add the app-local script above and use the workspace's existing package filters or task runner to invoke it. Record the exact working directory and commands; do not assume a root binary is available.

## Verify loading, then enforcement

Use a uniquely named disposable directory inside each app, outside excluded paths and generated directories. Do not overwrite an existing file. Keep the selected config and theme unchanged, explicitly pass the probe file as input, and remove the directory in a `finally` block or shell cleanup trap even if verification fails. Do not edit application components for this test.

1. Write `Probe.vue` containing `<template><div /></template>`. From the app directory, run `pnpm exec selfix <probe-directory>/Probe.vue --config selfix.config.ts --format json`. Expect exit `0` and `[]`. This confirms config/theme loading and input selection, not enforcement. `--help` and `--version` do not load the configuration.
2. Replace only the disposable probe with a known violation of an enabled rule, chosen against the selected theme and policy. For the gradual adoption policy, import a real recognized component using its actual import string and local name, and give it a known forbidden appearance utility. Under the default `no-restyle` allowance and a standard Tailwind theme, `class="p-4"` on that component reports a warning. Verify the expected rule, severity, and original probe location; exit `0` alone is insufficient for a warning. Repeat with `--max-warnings 0` to verify exit `1`.
3. Correct the probe by removing the forbidden override or using an existing supported component prop. Rerun the same command, including the warning limit, and expect no probe findings and exit `0`. For a custom policy that allows padding or disables `no-restyle`, choose another enabled rule and a violation that its actual options reject. An error finding exits `1` without a warning limit. Do not change policy to make the probe work. If all rules are off, report that enforcement was not verified and request a policy decision.
4. Remove the entire disposable directory. Run the real project script on its intended source scope, preserving any warning limit. Record the output and exit status. Compare the diff with the baseline to confirm probes and application edits were not left behind.

Exit `2` indicates configuration, theme-loading, or input failure, including a scan with no Vue files; resolve it before calling setup verified. Exit `1` can mean rule errors, parse errors, or exceeded warning limits. Report existing findings as findings, and treat unsupported-input `parse-error` diagnostics as coverage limitations that need attention. A successful loading probe does not resolve failures encountered in the actual source scan. See [troubleshooting](troubleshooting.md).

selfix never autofixes source. A clean scan covers only selected files, enabled checks, and [supported analysis](analysis.md). Additional class props need explicit configuration; wrappers and arbitrary runtime expressions are not fully traced.

## Hand off the setup

Report:

- Changed files and installed dependencies, including lockfile changes.
- Exact commands and working directories for each app and CI.
- All six effective rule severities, retained warning limits, and where contracts and exclusions are configured.
- Loading and enforcement probe results, correction results, cleanup, and the real scan's exit status and remaining findings.
- Excluded paths, unsupported syntax, unconfigured class props, or other coverage limitations. Do not claim complete styling coverage from a clean result.
- The policy file to edit next and links to [configuration](configuration.md), [rules](rules.md), and [adoption](adoption.md).

Add an instruction like this to the consumer's existing agent guide, substituting its verified command and working directory:

```text
After UI edits, run pnpm run lint:design from the app directory. Correct findings
using existing component props, theme tokens, and configured contracts, then rerun.
Preserve the agreed policy; report unresolved findings instead of weakening checks.
```

Keep the project's agent guidance in its established location; this procedure does not require new nested `AGENTS.md` files.

The inspect, preserve, verify, and handoff approach is inspired by [shadcn/lint's setup guide](https://github.com/shadcn-ui/lint/blob/main/SETUP.md). These instructions describe selfix's standalone runner and explicit rule policy.
