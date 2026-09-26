---
title: no-unknown-classes
description: Reports classes your Tailwind CSS cannot generate.
---

Reports classes that neither Tailwind nor your loaded CSS defines. selfix asks your Tailwind compiler about every class.

```vue
<!-- Reported: misspelled primary. -->
<div class="bg-prmary" />

<!-- Allowed. -->
<div class="bg-primary" />
```

## Fix a finding

1. Check the spelling. When exactly one valid class is one edit away, selfix suggests it:

   ```text
   src/Page.vue:3:8 error no-unknown-classes Tailwind cannot generate "flex-cols". Check the spelling and the configured CSS theme. Did you mean "flex-col"?
   ```

2. If the class comes from another stylesheet, import that stylesheet from your configured `css` entry. See [Themes](themes.md).
3. If a system outside your CSS supplies the class, allow it: `allow: ["external-widget"]`. This skips this rule only.

## Suggestions

- A suggestion fixes one insertion, deletion, substitution, or swap of adjacent letters in one utility or variant.
- Every suggestion compiles and passes the other class rules set to `warn` or `error`, including contracts and file overrides.
- Prefixes, `-`, `!`, and `/` modifiers are kept. selfix does not map colors or arbitrary values to theme tokens.
- Ties, multiple mistakes, arbitrary syntax, escaped names, and wrong prefixes usually get no suggestion. The finding remains.
- selfix never edits your files.

## What passes

- Tailwind utilities and variants from your theme, plugins, and custom `@utility` and `@variant` rules.
- Markers such as `group`, `peer`, `dark`, and `group/card`.
- Custom classes from loaded CSS. They do not gain Tailwind variants, so `hover:notice` is reported.

## Options

`allow`, `deny`, `contracts`, and `message`. See [rule settings](configuration.md#rule-settings).
