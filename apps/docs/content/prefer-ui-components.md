---
title: prefer-ui-components
description: Reports native elements that Nuxt UI has a component for.
---

Reports native elements that Nuxt UI replaces, so buttons and form controls follow your theme.

```vue
<!-- Reported. -->
<button type="submit">Save</button>
<input type="checkbox" />

<!-- Allowed. -->
<UButton type="submit">Save</UButton>
<UCheckbox />
```

## Fix a finding

Use the component the message names:

```text
Use <UButton> instead of a native <button>, so it follows the design system.
```

In files that implement your own components, native elements are often right. Turn the rule off there with a [file override](configuration.md#per-file-rule-overrides).

## What it reports

| Native element                                      | Replacement                                 |
| --------------------------------------------------- | ------------------------------------------- |
| `button`, `input` of type `button`/`submit`/`reset` | `UButton`                                   |
| `input`                                             | `UInput`                                    |
| `input` of type `checkbox`                          | `UCheckbox`                                 |
| `input` of type `radio`                             | `URadioGroup`                               |
| `input` of type `range`                             | `USlider`                                   |
| `input` of type `file`                              | `UFileUpload`                               |
| `input` of type `number`                            | `UInputNumber`                              |
| `input` of type `date`, `time`                      | `UInputDate`, `UInputTime`                  |
| `input` of type `color`                             | `UColorPicker`                              |
| `select`, `textarea`                                | `USelect`, `UTextarea`                      |
| `hr`, `kbd`, `progress`, `dialog`                   | `USeparator`, `UKbd`, `UProgress`, `UModal` |

- Only components your installed Nuxt UI version ships are suggested. A typed input falls back to `UInput` when its own component is missing.
- `input` of type `hidden` and `image` always pass.
- Replacements use your Nuxt UI [prefix](configuration.md#all-settings).
- Without Nuxt UI, only the elements you configure are reported.

## Options

`elements` maps a native tag to the component to use. Your entries are merged over the defaults, and `false` exempts a tag:

```ts
rules: {
  "prefer-ui-components": ["error", {
    elements: { a: "ULink", hr: false, button: "AppButton" },
  }],
},
```

- A replacement you set for `input` applies to every input type except `hidden` and `image`.
- In a [file override](configuration.md#per-file-rule-overrides), a supplied `elements` map replaces the inherited map. The defaults still apply under it.
- `allow`, `deny`, `contracts`, and `message` do not apply.

## Limits

- The `type` of an input is read only when it is a plain attribute. `<input :type="kind">` gets the `UInput` suggestion.
- Elements inside `v-pre` are still reported.
