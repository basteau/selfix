---
title: Rules
description: What each rule reports and where to configure it.
---

Every rule starts at `"error"`. Set each one to `"off"`, `"warn"`, or `"error"`, and add options where the rule supports them. To introduce rules gradually, follow [Adopt in an existing project](adoption.md).

| Rule                                                    | Reports                                                | `allow` / `deny` |
| ------------------------------------------------------- | ------------------------------------------------------ | ---------------- |
| [no-restyle](no-restyle.md)                             | Classes that change a protected component's appearance | Yes              |
| [no-raw-colors](no-raw-colors.md)                       | Palette colors, literal colors, and raw SVG paints     | Yes              |
| [no-unknown-classes](no-unknown-classes.md)             | Classes your Tailwind CSS cannot generate              | Yes              |
| [no-arbitrary-values](no-arbitrary-values.md)           | Bracket values such as `p-[13px]`                      | Yes              |
| [no-inline-styles](no-inline-styles.md)                 | `style` attributes and SFC `<style>` blocks            | Yes              |
| [require-static-classes](require-static-classes.md)     | Class values selfix cannot read without running code   | No               |
| [no-restricted-components](no-restricted-components.md) | Components or imports you ban                          | No               |

Each rule reports independently. Passing one rule never skips another.

Severity, `allow`, `deny`, `contracts`, and `message` work the same way across the rules marked Yes. See [shared policy](configuration.md#shared-policy).
