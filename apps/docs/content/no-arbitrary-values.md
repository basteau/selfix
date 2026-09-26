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

When a theme utility produces the same value, selfix suggests it:

```text
src/Page.vue:3:8 error no-arbitrary-values Replace "p-[16px]" with a named theme utility instead of an arbitrary value. Did you mean "p-4"?
```

- selfix compiles the named utilities with the same root, such as `p-*` for `p-[16px]`, and compares their CSS after resolving theme variables. It treats `1rem` as `16px` and assumes theme variables keep their `@theme` values at runtime. Other variables, such as `var(--gap, 16px)`, never match.
- It suggests only named utilities from Tailwind's class list. `p-[13px]` gets no suggestion, even though `p-3.25` has the same value.
- Arbitrary properties such as `[padding:1rem]` and classes with modifiers such as `text-[#fff]/50` get no suggestion.
- A theme color defined through another variable, such as `--color-primary: var(--primary)` in shadcn-vue themes, has no literal value to match.
- selfix only suggests a utility that passes the other enabled rules, so a Button contract or `no-raw-colors` can withhold it.

Without a suggestion, use the named utility closest to the design. If the design needs a new value, add it to your theme. For a one-off exception, allow the class: `allow: ["p-[13px]"]`.

## What it reports

- Arbitrary values such as `p-[13px]` and `bg-[#fff]`.
- Arbitrary properties such as `[mask-type:luminance]`.
- Bracket modifiers such as `bg-primary/[0.5]`.

CSS-variable shorthand such as `p-(--gutter)` and arbitrary variants such as `[&>svg]:size-4` pass. The rule checks values, not variants.

## Options

`allow`, `deny`, `contracts`, and `message`. See [rule settings](configuration.md#rule-settings).
