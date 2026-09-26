---
title: no-inline-styles
description: Reports style attributes, style bindings, and SFC style blocks.
---

Reports `style` attributes, `:style` bindings, and every SFC `<style>` block, including `scoped` ones.

```vue
<!-- Reported. -->
<div style="padding: 1rem" />

<!-- Allowed. -->
<div class="p-4" />
```

## Fix a finding

- Replace the style with theme classes.
- For component implementations that need their own CSS, turn the rule off for those files with a [file override](configuration.md#per-file-rule-overrides).
- For one component's `style` attribute, use a contract:

  ```ts
  "no-inline-styles": ["error", {
    contracts: [{ pattern: "^ProgressBar$", allow: ["style"] }],
  }],
  ```

## Options

`allow`, `deny`, `contracts`, and `message`. The rule matches the token `style`:

- `allow: ["style"]` on the rule allows style attributes and SFC `<style>` blocks.
- A contract's `allow: ["style"]` allows the whole attribute, not selected properties.
- `deny: ["style"]` wins over allowances.

## Limits

A `<style>` tag inside `<template>` is unsupported input and produces `parse-error`, whatever this rule's setting.
