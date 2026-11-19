---
title: FAQ
description: Short answers about requirements, scope, and what selfix does not do.
---

## Do I need Nuxt, ESLint, or a config file?

No. selfix needs Nuxt UI 4, Vue 3, and Tailwind CSS 4. It works in Nuxt and in [Vue with Vite](vue.md), runs as its own command, and needs no config.

## Does it work without Nuxt UI?

It runs, but that is not what it is for. Without Nuxt UI, only the components you name in `components` are protected, and selfix says so. For a Tailwind project without Nuxt UI, use [shadcn/lint](https://github.com/shadcn-ui/lint).

## Does selfix support Tailwind CSS 3, React, or JSX?

No. selfix checks Vue single-file component templates against Tailwind CSS 4. It does not read JSX, TSX, or class calls that appear only in script. See [What selfix can read](analysis.md).

## Why is a class on UIcon not reported?

`UIcon` and `UApp` have no theme, so `class` is how you style them. selfix protects the components that have one. See [protected components](configuration.md#protected-components).

## Does selfix fix findings for me?

No. Findings say what to change. selfix suggests a replacement for a single clear typo or for an arbitrary value that matches a theme utility. selfix never edits your files. A coding agent can apply the fixes and run the check again.

## Does selfix run my code?

It never runs your app or evaluates your templates or scripts. Your `selfix.config.ts` and any Tailwind `@plugin` or `@config` modules do run, with Node's permissions, so only use config files and plugins you trust. See [limitations and trust](analysis.md#limitations-and-trust).

## Can I silence one finding in the template?

Yes, with a `selfix-disable-next-line` comment that names the rules and gives a reason. See [suppress findings](configuration.md#suppress-findings). Prefer the rule's `allow` list ([rule settings](configuration.md#rule-settings)), a component [contract](configuration.md#component-contracts), or an [override](configuration.md#per-file-rule-overrides) for some files when the exception isn't one line.

## Does selfix sort or merge classes?

No. selfix checks what each class does, not its order. Keep your class-sorting tool, and keep `cn`, `clsx`, or `twMerge` in your code. selfix reads their arguments without running them. Add other helpers with [class helpers](configuration.md#class-helpers).
