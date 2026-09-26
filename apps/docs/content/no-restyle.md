---
title: no-restyle
description: Reports classes that change a recognized component's appearance.
---

Reports classes that change how a protected component looks. By default, the calling template can add layout classes such as margin and width, but not padding, colors, or typography.

```vue
<!-- Reported: changes the Button's padding. -->
<Button class="p-4">Save</Button>

<!-- Allowed: places the Button on the page. -->
<Button class="mt-4 w-full">Save</Button>
```

## Fix a finding

- Use a prop the component already has, such as `variant="secondary"`.
- If callers need more control, [give the component a contract](configuration.md#component-contracts) that allows it.
- If a component's own file restyles other recognized components, turn the rule off there with a [file override](configuration.md#per-file-rule-overrides).

## Options

| Option      | Default           |
| ----------- | ----------------- |
| `allow`     | `["layout"]`      |
| `deny`      | `[]`              |
| `contracts` | `[]`              |
| `message`   | Built-in guidance |

A class that affects several [categories](configuration.md#class-patterns-and-categories) passes only when every category is allowed, or when the class itself is allowed. `deny` wins over `allow`.

## Limits

- Only [recognized components](configuration.md#component-recognition) are checked. A native `<div class="p-4">` is out of scope.
- Wrappers are traced one level deep. See [wrapper components](#wrapper-components).

## Wrapper components

A local component that renders one protected component passes its caller's class to it through Vue's attribute fallthrough. selfix checks that class against the wrapped component's contract:

```vue
<!-- AppButton.vue -->
<template>
  <Button><slot /></Button>
</template>
```

`<AppButton class="p-4">` reports `"p-4" is not allowed on <Button>`, and the message adds `<AppButton> passes its class to <Button>.`

selfix traces a wrapper only when all of these hold:

- Component source discovery finds the wrapper's file. It is on in the CLI and off by default in the [API](api.md#component-discovery-and-reuse).
- The wrapper's template has one root element without `v-for`, and that root is a recognized component. A `v-if`/`v-else` pair counts as two roots.
- The wrapper leaves `inheritAttrs` unset or sets it to the literal `true`.
- The wrapper does not declare `class` as a prop.

It follows one level only, and only the `class` attribute, not [class props](configuration.md#configured-class-props). In a custom message, `{{component}}` names the wrapped component, and the wrapper note still follows it. Size and variant choices come from the wrapper, because callers pass the wrapper's props. The API reads wrappers from its discovery snapshot, so recreate the linter after you edit a wrapper.
