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
- A class passed through a wrapper component is not traced to the component it wraps.
