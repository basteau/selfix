---
title: require-static-classes
description: Reports class values selfix cannot read without running code.
---

Reports class values that selfix cannot read without running your code.

```vue
<!-- Reported: the class is assembled at runtime. -->
<div :class="`mt-${spacing}`" />

<!-- Allowed: selfix checks both choices. -->
<div :class="large ? 'mt-4' : 'mt-2'" />
```

## Fix a finding

Write each possible class in full. Conditions, arrays, object keys, and string constants in `<script setup>` stay readable. See [class bindings](analysis.md#vue-class-bindings) for every supported form.

The same goes for the `ui` prop of a protected component. Write the slot map as an object in the template:

```vue
<!-- Reported: selfix cannot read the slots. -->
<UButton :ui="buttonUi" />

<!-- Allowed. -->
<UButton :ui="{ label: 'truncate' }" />
```

A component of your own that forwards what it receives, such as `:class="props.class"` or `:ui="props.ui"`, cannot be read either. Turn the rule off for those files with a [file override](configuration.md#per-file-rule-overrides).

## Options

`message` and `contracts`. There are no `allow` or `deny` lists, because a rule cannot match a class name it cannot read.

## Limits

- Turning the rule off leaves unreadable values unchecked, including `v-bind` spreads that may pass `class` or `style`.
- The rule reports each opaque spread, such as `v-bind="attrs"`, once at its `v-bind`. `v-bind="$attrs"` is not reported, because the caller's classes are checked where the caller writes them. See [unsupported bindings](analysis.md#unsupported-bindings).
- Malformed bindings and dynamic attribute names produce `parse-error` whatever this rule's setting.
