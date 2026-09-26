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

## Options

`message` and `contracts`. There are no `allow` or `deny` lists, because a rule cannot match a class name it cannot read.

## Limits

- Turning the rule off leaves unreadable values unchecked.
- Unsupported bindings such as `v-bind="attrs"` produce `parse-error` whatever this rule's setting. See [unsupported bindings](analysis.md#unsupported-bindings).
