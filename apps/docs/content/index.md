---
title: Introduction
description: Catch styling drift in Nuxt UI projects.
---

selfix checks the classes in your Vue templates against Nuxt UI's components and the theme your app generated. Run it locally, in CI, or after a coding agent edits your UI. It needs no configuration.

```vue
<!-- Reported: restyles the button. Use its size prop instead. -->
<UButton class="p-4">Save</UButton>
<UButton :ui="{ label: 'font-bold' }">Save</UButton>

<!-- Reported: a palette color and a native element. -->
<p class="text-gray-500">Saved.</p>
<button>Save</button>

<!-- Allowed: props, theme colors, and layout classes. -->
<UButton size="lg" class="mt-4 w-full">Save</UButton>
<p class="text-muted">Saved.</p>
```

Each Nuxt UI component has a contract, the set of classes a page may add in `class` and in the `ui` prop. The default contract allows layout classes such as margin and width. A finding names the props your theme offers instead. selfix also reports raw colors, bracket values, inline styles, unknown classes, class names it cannot read, and components you ban.

## Start

- [Getting started](getting-started.md). Add selfix to your app and fix your first finding.
- [Adopt in an existing project](adoption.md). Start with warnings and turn on one rule at a time.
- [Set up with a coding agent](agent-setup.md). Give an agent a setup task that ends with proof.

## Recipes

Recipes cover [Nuxt](nuxt.md), [Vue with Vite](vue.md), and [running in CI](ci.md).

## Understand and look up

- [How selfix works](how-it-works.md). The steps from a Vue file to a finding.
- [Rules](rules.md). What each rule reports and how to fix it.
- [Configuration](configuration.md). Your own components, contracts, overrides, and messages.
- [Themes](themes.md). The stylesheet and the generated Nuxt UI theme.
- [What selfix can read](analysis.md). Supported bindings, helpers, and limits.
- [CLI](cli.md). Commands, output, and exit codes.
- [API](api.md). Check source and read findings from Node.
- [Troubleshooting](troubleshooting.md). Fix unexpected results and loading errors.
- [FAQ](faq.md). Short answers about requirements and scope.

selfix is open source under the [MIT license](https://github.com/basteau/selfix/blob/main/LICENSE) and inspired by [shadcn/lint](https://github.com/shadcn-ui/lint), which is the better choice for a Tailwind project without Nuxt UI. The [repository](https://github.com/basteau/selfix) has the source. To contribute, see [Development](maintaining.md).
