---
title: no-arbitrary-values
description: Reports bracket values and arbitrary properties.
---

Reports bracket values, which bypass your theme.

```vue
<!-- Reported. -->
<div class="p-[13px]" />

<!-- Allowed. -->
<div class="p-3" />
```

## Fix a finding

Use the named utility closest to the design. If the design needs a new value, add it to your theme. For a one-off exception, allow the class: `allow: ["p-[13px]"]`.

## What it reports

- Arbitrary values such as `p-[13px]` and `bg-[#fff]`.
- Arbitrary properties such as `[mask-type:luminance]`.
- Bracket modifiers such as `bg-primary/[0.5]`.

CSS-variable shorthand such as `p-(--gutter)` and arbitrary variants such as `[&>svg]:size-4` pass. The rule checks values, not variants.

## Options

`allow`, `deny`, `contracts`, and `message`. See [shared policy](configuration.md#shared-policy).
