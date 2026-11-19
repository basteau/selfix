---
title: no-restyle
description: Reports classes that change a Nuxt UI component's appearance.
---

Reports classes that change how a protected component looks, in `class` and in every slot of the `ui` prop. By default, the calling template can add layout classes such as margin and width, but not padding, colors, or typography.

```vue
<!-- Reported: changes the button's padding and its label. -->
<UButton class="p-4">Save</UButton>
<UButton :ui="{ label: 'font-bold' }">Save</UButton>

<!-- Allowed: places the button on the page. -->
<UButton class="mt-4 w-full">Save</UButton>
```

## Fix a finding

The message names the props your theme has for that kind of change, and where to change the component for the whole app:

```text
"p-4" is not allowed on <UButton>: the component owns its spacing. Use size (xs, sm, md, lg, xl), or restyle it for the whole app under ui.button in app.config.ts.
```

- Use one of the listed props, such as `size="lg"` or `color="neutral" variant="outline"`.
- If every instance should change, theme the component in `app.config.ts`. In a Vue project the message names `vite.config.ts`, where the Nuxt UI plugin takes the same `ui` options.
- If callers need more control, [give the component a contract](configuration.md#component-contracts) that allows it.
- If one of your own component files restyles Nuxt UI components, turn the rule off there with a [file override](configuration.md#per-file-rule-overrides).

## Options

| Option      | Default           |
| ----------- | ----------------- |
| `allow`     | `["layout"]`      |
| `deny`      | `[]`              |
| `contracts` | `[]`              |
| `message`   | Built-in guidance |

A class that affects several [categories](configuration.md#class-patterns-and-categories) passes only when every category is allowed, or when the class itself is allowed. `deny` wins over `allow`.

## Limits

- Only [protected components](configuration.md#protected-components) are checked: Nuxt UI components that have a theme, and the components you name. A native `<div class="p-4">` and `<UIcon class="size-5">` are out of scope.
- Wrappers are not traced. A class on your own `AppButton` is checked when `AppButton` is named in `components`.
- Classes in other props, such as `active-class`, and in `app.config.ts` are not checked.
