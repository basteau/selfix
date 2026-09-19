---
title: Introduction
description: Keep your Vue components consistent as your app grows.
---

You build a Button with the right padding and colors. Then a page adds `p-4`. Another adds `bg-red-500`. The same component starts looking different everywhere.

selfix catches these overrides in Vue 3 and Tailwind CSS 4 projects. You choose what callers can change, and selfix checks those rules whenever you run it.

## Keep the component in control

A Button can own its appearance while the page controls its placement:

```vue
<!-- Changes the Button's padding: reported by selfix. -->
<Button class="p-4">Save</Button>

<!-- Adds space around the Button: allowed by default. -->
<Button class="mt-4 w-full">Save</Button>
```

These examples assume you've told selfix which Button to protect. Its styling rules form a **contract**: the classes callers are allowed to add. The default contract permits layout changes such as margin and width. You can give individual components more freedom.

When a check fails, selfix points to the class in your `.vue` file and explains the rejected change. Use the component's props or adjust its contract, then run the check again.

## Use your existing components and theme

selfix works with your own component library. It reads your Tailwind CSS to check that classes exist and use your theme's colors. It can also report arbitrary values, inline styles, and class names it cannot read without running code.

Run it as a standalone command with your existing Vue and Tailwind setup. No UI kit or other linter is required.

## Try it

[Follow Getting started](getting-started.md) to create a Button, catch an override, and make the check pass.

Already have an app full of styles? [Start with one rule](adoption.md) and introduce checks as you fix findings. You can also [ask a coding agent to set it up](agent-setup.md).

## About selfix

selfix is an independent project inspired by [shadcn/lint](https://github.com/shadcn-ui/lint). The [repository](https://github.com/basteau/selfix) contains the source and [MIT license](https://github.com/basteau/selfix/blob/main/LICENSE). To contribute, see [Development](maintaining.md).
