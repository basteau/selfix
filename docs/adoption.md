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

For component implementations, add a file override to your existing configuration:

```ts
overrides: [
  {
    files: ["src/components/ui/**/*.vue"],
    rules: {
      "no-inline-styles": "off",
      "no-restyle": "off",
    },
  },
],
```

This permits style attributes, SFC style blocks, and restyling inside those implementations. Other enabled rules still check them: keep `no-raw-colors` and `no-unknown-classes` enabled when you want color and vocabulary validation. Consumer files retain the top-level policy. Patterns are relative to the config directory and `**` includes zero or more directories; see [file overrides](configuration.md#per-file-rule-overrides) for ordering and inheritance.

Use `exclude` only when you intend to skip the entire file. **Every rule skips excluded files**, and overrides cannot re-include them. There are no inline suppressions.

### Verified workflows and current boundaries

The playground's normal test suite runs the installed standalone CLI with its real Vue components, Tailwind theme, and TypeScript configuration. Its author/consumer case verifies that file overrides permit implementation styling while raw colors and unknown utilities still fail, consumer restyling remains restricted, and corrected files pass. Invalid examples live in temporary copies, keeping the visible playground usable.

selfix deliberately treats a style binding as one policy site: even `:style="{ '--progress': 0.5 }"` is rejected by default. It supports whole-site or file-level permission, not individual-property allowlists. This differs from the pinned [upstream inline-style policy](https://github.com/shadcn-ui/lint/blob/bf89dcb7f66a306c7ac4943065298902afdbd969/packages/lint/src/rules/no-inline-styles.ts), which supports property matching and permits non-color CSS custom properties. The playground regression preserves selfix's stricter boundary; narrow property exceptions remain separate work.

The separate pinned Nuxt smoke verifies generated application tokens, prepared UButton/local-component discovery, configured `ui` slot findings, and corrected source. Component discovery supplies verified guidance without deciding recognition or slot policies. These representative workflows establish bounded coverage, not complete upstream parity or validation against every real-world application.

For contributors, `pnpm check` includes playground workflow tests using the lockfile's Vue/Tailwind versions; `pnpm --filter playground test` runs just that integration suite after building selfix. `pnpm smoke:nuxt` installs the pinned framework dependencies in a temporary app and runs application-owned preparation. It requires registry access and stays outside routine checks and the CI matrix. See [maintenance verification](maintaining.md) and the [Nuxt versions and limits](themes.md).

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
