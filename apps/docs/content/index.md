---
title: Introduction
description: Catch styling drift in Vue 3 and Tailwind CSS 4 projects.
---

selfix checks the classes in your Vue templates against your components and your Tailwind theme. Run it locally, in CI, or after a coding agent edits your UI.

```vue
<!-- Reported: changes the Button's padding. -->
<Button class="p-4">Save</Button>

<!-- Allowed: places the Button on the page. -->
<Button class="mt-4 w-full">Save</Button>
```

Each protected component has a contract, the set of classes a page may add. The default contract allows layout classes such as margin and width. selfix also reports raw colors, bracket values, inline styles, unknown classes, class names it cannot read, and components you ban.

## Start

- [Getting started](getting-started.md). Add selfix to your app and fix your first finding.
- [Adopt in an existing project](adoption.md). Start with warnings and turn on one rule at a time.
- [Set up with a coding agent](agent-setup.md). Give an agent a setup task that ends with proof.

## Recipes

Recipes cover [shadcn-vue](shadcn-vue.md), [Nuxt and Nuxt UI](nuxt.md), and [running in CI](ci.md).

## Understand and look up

- [How selfix works](how-it-works.md). The steps from a Vue file to a finding.
- [Rules](rules.md). What each rule reports and how to fix it.
- [Configuration](configuration.md). Components, contracts, overrides, and messages.
- [Themes](themes.md). Load your Tailwind CSS and custom classes.
- [What selfix can read](analysis.md). Supported bindings, helpers, and limits.
- [CLI](cli.md). Commands, output, and exit codes.
- [API](api.md). Check source and read findings from Node.
- [Troubleshooting](troubleshooting.md). Fix unexpected results and loading errors.
- [FAQ](faq.md). Short answers about requirements and scope.

selfix is open source under the [MIT license](https://github.com/basteau/selfix/blob/main/LICENSE) and inspired by [shadcn/lint](https://github.com/shadcn-ui/lint). The [repository](https://github.com/basteau/selfix) has the source. To contribute, see [Development](maintaining.md).
