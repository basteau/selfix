---
title: FAQ
description: Short answers about requirements, scope, and what selfix does not do.
---

## Do I need shadcn-vue, a UI kit, or ESLint?

No. selfix needs Vue 3 and Tailwind CSS 4. It works with your own components and runs as its own command. See [shadcn-vue](shadcn-vue.md) if you use it.

## Does selfix support Tailwind CSS 3, React, or JSX?

No. selfix checks Vue single-file component templates against Tailwind CSS 4. It does not read JSX, TSX, or class calls that appear only in script. See [What selfix can read](analysis.md).

## Does selfix fix findings for me?

No. Findings say what to change, and `no-unknown-classes` suggests a replacement for a single clear typo. selfix never edits your files. A coding agent can apply the fixes and run the check again.

## Does selfix run my code?

It never runs your app or evaluates your templates or scripts. Your `selfix.config.ts` and any Tailwind `@plugin` or `@config` modules do run, with Node's permissions, so only use config files and plugins you trust. See [limitations and trust](analysis.md#limitations-and-trust).

## Can I silence one finding in the template?

No. There are no inline suppressions. Add the class to the rule's `allow` list ([rule settings](configuration.md#rule-settings)), give a component a [contract](configuration.md#component-contracts), or change rules for some files with an [override](configuration.md#per-file-rule-overrides).

## Does selfix sort or merge classes?

No. selfix checks what each class does, not its order. Keep your class-sorting tool, and keep `cn`, `clsx`, or `twMerge` in your code. selfix reads their arguments without running them. Add other helpers with [class helpers](configuration.md#class-helpers).
