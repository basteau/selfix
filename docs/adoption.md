# Adopt in an existing project

[Documentation index](README.md)

For a new setup, start with one rule at warning severity using this complete configuration, adjusting the CSS path and import prefixes. If selfix is already configured, preserve its policy and merge only intended changes rather than replacing the file. For a coding agent to handle setup, use the [agent setup guide](agent-setup.md):

```ts
import { defineConfig } from "selfix"

export default defineConfig({
  css: "src/style.css",
  ui: ["./components/ui"],
  rules: {
    "no-restyle": "warn",
    "no-raw-colors": "off",
    "no-arbitrary-values": "off",
    "no-inline-styles": "off",
    "no-unknown-classes": "off",
    "require-static-classes": "off",
  },
})
```

The explicit `"off"` settings disable the other five rules. Leaving them out would enable them at `"error"`. Parse errors and configuration failures still fail the check.

Run `pnpm run lint:design` and read the warning count in its summary. Warnings do not fail the command unless you set a limit. Fix repeated patterns first, using component props or [contracts](configuration.md#component-contracts) when callers need more control.

If the measured total is 12 warnings, update the script to:

```json
{
  "scripts": {
    "lint:design": "selfix src --max-warnings 12"
  }
}
```

Keep using `pnpm run lint:design` locally, in CI, and in agent instructions. The command fails when warnings exceed 12; 12 or fewer pass if there are no errors. Lower the limit as you resolve findings, eventually to `--max-warnings 0`.

The limit counts all warnings. It does not track individual existing violations or prevent a new finding from replacing a resolved one.

When `no-restyle` is clean, change its severity to `"error"`. Enable another rule by changing its `"off"` setting to `"warn"`, measure the new count, and set the warning limit deliberately. Promote each rule to `"error"` as its findings are resolved. See the [rule reference](rules.md#rules) to choose the next check.

If component implementations need unrestricted styling, add `exclude: ["src/components/ui"]` to the configuration. **Every rule skips excluded files.** selfix has no per-file rule overrides or inline suppressions; use exclusions only when you intend to skip the entire file.

### Run locally and in CI

Add this script to your existing `package.json` to check all Vue files under `src`:

```json
{
  "scripts": {
    "lint:design": "selfix src"
  }
}
```

Run it locally:

```sh
pnpm run lint:design
```

In CI, use a supported Node version and your project's pnpm version, then run:

```sh
pnpm install --frozen-lockfile
pnpm run lint:design
```

Add this instruction to your project's coding-agent guide:

```text
After UI changes, run pnpm run lint:design. Correct findings using existing component
props, theme tokens, and configured contracts. Rerun the command after changes.
```

See also: [getting started](getting-started.md), [rule reference](rules.md), and [CLI reference](cli.md).
