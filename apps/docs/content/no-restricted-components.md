---
title: no-restricted-components
description: Reports components you ban by name or import.
---

Reports components you ban, wherever a template uses them. The rule is on by default but bans nothing until you list components.

```ts
rules: {
  "no-restricted-components": ["error", {
    components: [{
      name: "CustomButton",
      replacement: "UButton",
      message: "Use our standard button for consistent behavior.",
    }],
  }],
},
```

`<CustomButton />` then reports the following, plus the global `note` when you set one:

```text
<CustomButton> is restricted. Use <UButton> instead. Use our standard button for consistent behavior.
```

selfix names the replacement. It never rewrites imports, props, or templates.

## Ban by import

To ban an export from a module, match the import:

```ts
"no-restricted-components": ["error", {
  imports: [{ source: "some-ui", name: "CustomButton", replacement: "UButton" }],
}],
```

`import { CustomButton as LegacyButton } from "some-ui"` makes `<LegacyButton>` and `<legacy-button>` report. Use `name: "default"` for `import Button from "some-ui"` and `import { default as Button }`. For a string export such as `import { "custom-button" as Quoted }`, use `name: "custom-button"`.

## Options

| Option       | Entries                                    |
| ------------ | ------------------------------------------ |
| `components` | `{ name, replacement?, message? }`         |
| `imports`    | `{ source, name, replacement?, message? }` |

- `name` and `source` are exact, nonempty strings, not patterns.
- When a usage matches several entries, selfix reports once. `components` entries come first, and the first match supplies `replacement` and `message`.
- A [file override](configuration.md#per-file-rule-overrides) that sets only severity keeps both lists. A supplied list replaces that list, and `[]` clears it.
- `allow`, `deny`, and `contracts` do not apply.

## Matching

- `components` matches local import names and global or auto-imported names, in PascalCase or kebab-case. `URLButton` matches `u-r-l-button`, not `url-button`.
- A `components` entry does not follow renames. `import { CustomButton as OtherButton }` needs an `imports` entry or a ban on `OtherButton`.
- `imports` compares the import string written in the SFC. It does not resolve aliases or follow re-exports, so `some-ui` does not match `some-ui/button` or `@/some-ui`.
- A static `<component :is="Button">` resolves to the `Button` import only when `Button` is an unshadowed runtime import. The lookup is exact, so `:is="button"` does not resolve. A `v-for` or slot binding with the same name leaves `:is` unresolved.
- A namespace tag such as `<UI.Button>` keeps the name `UI.Button`. A ban on `Button` or `UI` does not match it, and it is not the named export `Button` for `imports` entries.
- Type-only imports, native elements, and `v-pre` content never match.

## Coverage errors

While either list has entries, selfix must know which component each tag is. Unresolved dynamic components, unresolved namespace tags, bare namespace imports, and `is="vue:…"` produce `parse-error`. These are always errors, even when the rule is a warning, and the CLI exits with status 1. Turn the rule off or clear both lists to remove the requirement.
