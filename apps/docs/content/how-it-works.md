---
title: How selfix works
description: The steps from a Vue file to a finding, and why selfix runs as its own command.
---

selfix reads each Vue file, finds the classes and components in its template, and checks them against your config and your Tailwind CSS. It never runs your app.

## From file to finding

1. **Load the theme.** selfix compiles your `css` entry with your installed Tailwind CSS. That gives it every utility, variant, and theme token that entry defines. If the CSS fails to load, the check stops with exit code `2` instead of reporting a clean result.
2. **Recognize components.** A component is protected when its import path starts with a `ui` prefix or matches a `componentImports` pattern, or its name matches a `components` pattern. `ignoreImports` overrides all three. `--doctor` shows which setting matched each usage.
3. **Read every possible class.** selfix parses the template with Vue's compiler. It collects static classes, both branches of a condition, array items, object keys, top-level constants, and `cn` or `clsx` arguments. A class it cannot read is reported by `require-static-classes` or as a `parse-error`, never skipped. See [What selfix can read](analysis.md).
4. **Sort classes by effect.** selfix compiles each class and sorts it into categories such as layout, spacing, and color by the CSS it produces. `mt-4` is layout. `p-4` is spacing.
5. **Apply the rules.** On a protected component, [no-restyle](no-restyle.md) compares those categories with the component's contract. `no-raw-colors`, `no-arbitrary-values`, `no-inline-styles`, and `no-unknown-classes` check every element. [no-restricted-components](no-restricted-components.md) reports components you ban.
6. **Report.** Each finding points to the line and column in the original `.vue` file and names the rule and, for class findings, the class.

## Contracts decide what callers may change

For `no-restyle`, a contract is the set of classes a caller may add to a protected component. The default contract allows layout, so a page decides where a Button sits and the Button decides how it looks. You can widen or narrow the contract of one component, such as letting `CardContent` accept padding, without touching the others. See [component contracts](configuration.md#component-contracts).

## Why a standalone command

selfix runs as its own command instead of an ESLint or Oxlint plugin. The setup is one dev dependency and one config file, with no parser to configure, and it works the same in projects that use either linter or neither.

The trade-off is a separate step in your scripts and CI. It runs next to your existing linter, not inside it.
