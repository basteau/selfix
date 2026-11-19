---
title: How selfix works
description: The steps from a Vue file to a finding, and why selfix runs as its own command.
---

selfix reads each Vue file, finds the classes and components in its template, and checks them against Nuxt UI, your config, and your Tailwind CSS. It never runs your app.

## From file to finding

1. **Load Nuxt UI.** selfix reads the component list from the installed `@nuxt/ui` package and the variants of each component from the theme your app generated. It parses those files and never runs them.
2. **Load the theme.** selfix compiles your Tailwind entry with your installed Tailwind CSS, including Nuxt UI's generated `ui.css`. That gives it every utility, variant, and theme token your app has. If the CSS fails to load, the check stops with exit code `2` instead of reporting a clean result.
3. **Read every possible class.** selfix parses the template with Vue's compiler. It collects static classes, both branches of a condition, array items, object keys, top-level constants, `cn` or `clsx` arguments, and the slots of a `ui` prop. A class it cannot read is reported by `require-static-classes` or as a `parse-error`, never skipped. See [What selfix can read](analysis.md).
4. **Group classes by effect.** selfix compiles each class and groups it into categories such as layout, spacing, and color by the CSS it produces. `mt-4` is layout. `p-4` is spacing.
5. **Apply the rules.** On a protected component, [no-restyle](no-restyle.md) compares those categories with the component's contract. [prefer-ui-components](prefer-ui-components.md) reports native elements Nuxt UI replaces. `no-raw-colors`, `no-arbitrary-values`, `no-inline-styles`, and `no-unknown-classes` check every element. [no-restricted-components](no-restricted-components.md) reports components you ban.
6. **Report.** Each finding points to the line and column in the original `.vue` file and names the rule and, for class findings, the class. A `no-restyle` finding also names the props your theme offers.

## Contracts decide what callers may change

For `no-restyle`, a contract is the set of classes a caller may add to a protected component. The default contract allows layout, so a page decides where a `UButton` sits and Nuxt UI decides how it looks. You can widen or narrow the contract of one component, such as letting `UCard` accept padding, without touching the others. See [component contracts](configuration.md#component-contracts).

## Why a standalone command

selfix runs as its own command instead of an ESLint or Oxlint plugin. The setup is one dev dependency, with no parser to configure, and it works the same in projects that use either linter or neither.

The trade-off is a separate step in your scripts and CI. It runs next to your existing linter, not inside it.
