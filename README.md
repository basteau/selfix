# selfix

**Design-system linting for Vue 3 and Tailwind CSS 4.**

Define what your components allow. selfix reports styling that breaks those contracts and gives developers and coding agents guidance for correcting it.

Works with your own components and theme. No UI kit, class helper, ESLint, or Oxlint required. selfix uses Vue's parser and Tailwind's compiler and never evaluates application expressions.

Inspired by [shadcn/lint](https://github.com/shadcn-ui/lint), with thanks to shadcn and its contributors. selfix is an independent Vue-focused project; MIT-licensed adaptations retain upstream attribution in [LICENSE](LICENSE).

[Quickstart](#quickstart) · [Adoption](#adopt-in-an-existing-project) · [Rules](#rules) · [Configuration](#configuration) · [CLI](#cli) · [API](#api) · [How analysis works](#how-analysis-works) · [Troubleshooting](#troubleshooting) · [Limits and trust](#limitations-and-trust) · [Development](#development)

## Quickstart

Create a Button, report a padding override, and correct it. Run these commands from your Vue project's root.

Requires **Node.js ≥22.18.0**, **Vue ≥3.2.13 <4**, and **Tailwind CSS ≥4 <5**. Vue and Tailwind are the only consumer peer dependencies. Install any missing peers before continuing.

**Experimental alpha:** APIs and rules may change during prerelease. Install the published alpha:

```sh
pnpm add -D selfix@alpha
```

Use `"type": "module"` in your project's `package.json`. Node loads `selfix.config.ts` with native TypeScript support. Type annotations, `import type`, and `satisfies` work; enums and `tsconfig` path aliases do not. Node does not type-check this file.

Create these files, or adapt the paths to your project. Keep existing application files when adding the example.

### Define the theme and component

Create `src/style.css`, the required Tailwind CSS entry that selfix reads:

```css
@import "tailwindcss";

@theme {
  --color-primary: #3456d1;
  --color-on-primary: #ffffff;
  --color-canvas: #f6f7f9;
  --color-ink: #172033;
}
```

Use this stylesheet in your app too, for example with `import "./style.css"` in `src/main.ts`.

Create `src/components/ui/Button.vue`:

```vue
<script setup lang="ts">
withDefaults(defineProps<{ variant?: "primary" | "secondary" }>(), { variant: "primary" })
</script>

<template>
  <button
    type="button"
    class="rounded-lg px-4 py-2 text-sm font-medium"
    :class="variant === 'primary' ? 'bg-primary text-on-primary' : 'bg-canvas text-ink'"
  >
    <slot />
  </button>
</template>
```

The Button owns its padding and colors. Callers choose a `variant` and use layout classes for placement.

### Configure and run the check

Create `selfix.config.ts` in the project root:

```ts
import { defineConfig } from "selfix"

export default defineConfig({
  css: "src/style.css",
  ui: ["./components/ui"],
})
```

The `ui` prefix matches the import in `src/Example.vue` below. Use import prefixes that match your application's source strings.

**All six rules default to `"error"`, including `no-inline-styles`, which reports SFC `<style>` blocks.** Omitted rules remain enabled. For a gradual rollout, use the [adoption configuration](#adopt-in-an-existing-project).

Create `src/Example.vue`:

```vue
<script setup lang="ts">
import Button from "./components/ui/Button.vue"
</script>

<template>
  <Button variant="secondary" class="p-4">Save</Button>
</template>
```

Run the check on this file:

```sh
pnpm exec selfix src/Example.vue
```

The command exits with code `1` and reports the class at line 6, column 31:

```text
src/Example.vue:6:31 error no-restyle "p-4" is not allowed on <Button>: the component owns its spacing. Use a component variant; use margin or a parent gap for surrounding space.
Checked 1 Vue file: 1 error, 0 warnings.
```

Replace the Button line with:

```vue
<Button variant="secondary" class="mt-4 w-full">Save</Button>
```

Run `pnpm exec selfix src/Example.vue` again. It exits with code `0`:

```text
Checked 1 Vue file: 0 errors, 0 warnings.
```

selfix reports findings in the original `.vue` file and leaves source unchanged. Apply corrections yourself or through your coding agent; there is no automatic fix command.

### Run locally and in CI

Add this script to your existing `package.json` to check all Vue files under `src`:

```json
{
  "scripts": {
    "lint:design": "selfix src"
  }
}
```

Run it locally:

```sh
pnpm run lint:design
```

In CI, use a supported Node version and your project's pnpm version, then run:

```sh
pnpm install --frozen-lockfile
pnpm run lint:design
```

Add this instruction to your project's coding-agent guide:

```text
After UI changes, run pnpm run lint:design. Correct findings using existing component
props, theme tokens, and configured contracts. Rerun the command after changes.
```

## Adopt in an existing project

Start with one rule at warning severity. Replace `selfix.config.ts` with this complete configuration, adjusting the CSS path and import prefixes:

```ts
import { defineConfig } from "selfix"

export default defineConfig({
  css: "src/style.css",
  ui: ["./components/ui"],
  rules: {
    "no-restyle": "warn",
    "no-raw-colors": "off",
    "no-arbitrary-values": "off",
    "no-inline-styles": "off",
    "no-unknown-classes": "off",
    "require-static-classes": "off",
  },
})
```

The explicit `"off"` settings disable the other five rules. Leaving them out would enable them at `"error"`. Parse errors and configuration failures still fail the check.

Run `pnpm run lint:design` and read the warning count in its summary. Warnings do not fail the command unless you set a limit. Fix repeated patterns first, using component props or [contracts](#component-contracts) when callers need more control.

If the measured total is 12 warnings, update the script to:

```json
{
  "scripts": {
    "lint:design": "selfix src --max-warnings 12"
  }
}
```

Keep using `pnpm run lint:design` locally, in CI, and in agent instructions. The command fails when warnings exceed 12; 12 or fewer pass if there are no errors. Lower the limit as you resolve findings, eventually to `--max-warnings 0`.

The limit counts all warnings. It does not track individual existing violations or prevent a new finding from replacing a resolved one.

When `no-restyle` is clean, change its severity to `"error"`. Enable another rule by changing its `"off"` setting to `"warn"`, measure the new count, and set the warning limit deliberately. Promote each rule to `"error"` as its findings are resolved. See the [rule reference](#rules) to choose the next check.

If component implementations need unrestricted styling, add `exclude: ["src/components/ui"]` to the configuration. **Every rule skips excluded files.** selfix has no per-file rule overrides or inline suppressions; use exclusions only when you intend to skip the entire file.

## Rules

All six rules default to `"error"`. Only `no-restyle` requires a [recognized UI component](#component-recognition); the other five also check native elements. Each rule has its own policy: an allowance in one rule does not bypass another.

| Rule                                              | Purpose                                                      |
| ------------------------------------------------- | ------------------------------------------------------------ |
| [no-restyle](#no-restyle)                         | Keep component styling within its contract.                  |
| [no-raw-colors](#no-raw-colors)                   | Use semantic theme colors.                                   |
| [no-arbitrary-values](#no-arbitrary-values)       | Use named utilities instead of arbitrary values.             |
| [no-inline-styles](#no-inline-styles)             | Use classes instead of style attributes or SFC style blocks. |
| [no-unknown-classes](#no-unknown-classes)         | Check classes against the loaded Tailwind theme and CSS.     |
| [require-static-classes](#require-static-classes) | Keep possible class names statically readable.               |

The examples below use the [quickstart theme](#define-the-theme-and-component). `Button` means a recognized component. Unless an example says otherwise, “passes” refers to the named rule only. Options and defaults are listed once under [shared policy](#shared-policy).

### no-restyle

Reports classes outside the recognized component's policy. The default `allow: ["layout"]` permits margin and sizing, but reports padding, gap, typography, colors, and other appearance changes.

```vue
<!-- Passes the complete default policy. -->
<Button class="mt-4 w-full">Save</Button>

<!-- Reports no-restyle. -->
<Button class="p-4">Save</Button>

<!-- Outside no-restyle's scope; also passes the other default rules. -->
<div class="p-4">Content</div>
```

Contracts can allow more categories or particular classes. A utility that affects several categories needs all of them allowed, unless a class-name pattern permits it. For example, this loaded CSS puts `card-title` in both `layout` and `color`:

```css
.card-title {
  margin: 1rem;
  color: var(--color-primary);
}
```

`allow: ["layout"]` reports `<Button class="card-title" />`. Both `allow: ["layout", "color"]` and `allow: ["card-title"]` pass this rule. `deny: ["card-title"]` reports it even with either allowance.

The rule inspects classes at the call site. It does not discover component variants, validate prop values, or trace wrappers across files. See the [worked policy](#choose-a-variant-or-a-contract) for contract ordering and replacement examples.

### no-raw-colors

Reports classes whose inspected CSS uses stock Tailwind palette variables or raw color literals. Semantic utilities such as `bg-primary` pass even when the theme token compiles to a literal. Stock color names remain palette names if redefined in the theme.

```vue
<!-- Passes no-raw-colors and the complete default policy on a native element. -->
<div class="bg-primary text-on-primary" />

<!-- Each class reports no-raw-colors. Brackets also report no-arbitrary-values. -->
<div class="bg-red-500 text-[#fff] bg-[rgb(0,0,0)]" />
```

Loaded custom CSS is inspected too. `.alert { color: red; }` makes `class="alert"` a raw-color finding; `.alert { color: var(--color-primary); }` passes this rule. Literal colors in fallbacks and composite values, such as `var(--accent, red)` or `box-shadow: 0 0 2px red`, are checked. Quotes, URLs, and variable names alone are not color literals.

`allow: ["bg-red-500"]` exempts that class from this rule. `deny: ["bg-primary"]` explicitly bans even that semantic class. These options can be limited by a component contract.

This rule checks class-associated CSS, not SVG `fill` or `stroke` attributes or inline style properties. Missing theme utilities such as `bg-prmary` belong to `no-unknown-classes`; this rule does not infer a color from an unknown spelling. Variable references are not evaluated as application expressions or checked for runtime availability.

### no-arbitrary-values

Reports bracket values, arbitrary properties, and arbitrary slash modifiers in the base utility:

```vue
<!-- Each class reports no-arbitrary-values. -->
<div class="p-[13px] [color:red] text-sm/[17px] bg-primary/[0.37]" />

<!-- Passes this rule and the complete default policy. -->
<div class="p-4 bg-primary/50 p-(--space) [&>span]:mt-4" />
```

CSS-variable shorthand such as `p-(--space)` is allowed; the linter does not prove that `--space` exists at runtime. An arbitrary variant such as `[&>span]:` is not an arbitrary utility value. A named slash modifier such as `/50` also passes.

`allow: ["p-[13px]"]` exempts that class from this rule. Allowing `p-*` through `no-restyle` alone still leaves `p-[13px]` subject to this rule. Explicit `deny` patterns can ban otherwise non-arbitrary classes. This rule checks syntax, not whether the value has a named equivalent.

### no-inline-styles

Reports each `style` attribute, `:style` or `v-bind:style` binding, and SFC `<style>` block, including `scoped`, `module`, or external `src` blocks. A statically named `style` property in a `v-bind` object is also a style site. The value does not need to be readable: even `:style="null"` is reported.

```vue
<!-- Both report no-inline-styles. -->
<div style="padding: 1rem" />
<div :style="{ padding: space }" />

<!-- Passes this rule and the complete default policy. -->
<div class="p-4" />
```

This SFC block reports once at its opening tag:

```vue
<style scoped>
.panel {
  padding: 1rem;
}
</style>
```

The policy matches the synthetic token `style`, not individual CSS properties. In this rule's options, `contracts: [{ pattern: "^div$", allow: ["style"] }]` permits whole style attributes on `div`. `contracts: [{ pattern: "^style$", allow: ["style"] }]` permits SFC style blocks. Top-level `allow: ["style"]` permits both; `deny: ["style"]` overrides it. There are no property-level exceptions such as allowing only `width`.

A `<style>` tag inside the template is unsupported input and can produce `parse-error`; a style allowance does not make that syntax supported. Use an SFC style block if the configured policy permits one.

### no-unknown-classes

Reports classes for which the configured Tailwind compiler or loaded custom CSS provides no inspected declarations. It accepts Tailwind marker classes such as `group`, `peer`, and `dark`, including named forms such as `group/card`.

```vue
<!-- Reports no-unknown-classes. -->
<div class="bg-prmary" />

<!-- Passes this rule and the complete default policy. -->
<div class="bg-primary group/card" />
```

A loaded `.notice { margin: 1rem; }` makes `notice` known. Custom declarations are combined with Tailwind declarations when both define the same class, so custom CSS does not hide raw colors or restyling. Custom-class recognition supports simple class names in selectors; it is not a browser selector engine. A plain custom class does not automatically acquire Tailwind variants such as `hover:notice`.

For classes supplied by an external stylesheet that selfix does not load, use an explicit exception such as `allow: ["external-widget"]`. That exempts only this rule; a recognized component may still need a `no-restyle` allowance. A `deny` match reports even a known class. There are no spelling suggestions or automatic corrections.

### require-static-classes

Reports class sites whose possible tokens cannot be read statically, on native elements and components alike. Literal alternatives pass even when the condition is unknown:

```vue
<!-- Passes this rule and the complete default policy. -->
<div :class="active ? 'mt-2' : 'mt-4'" />

<!-- Reports require-static-classes. -->
<div :class="`mt-${spacing}`" />
<div :class="classesFromProps" />
```

The rule accepts `message` and message contracts. `allow` and `deny` are invalid because unresolved class names cannot be matched safely. Disabling this rule stops dynamic-class findings but does not disable [unsupported-input diagnostics](#vue-class-bindings).

### Vue class bindings

selfix reads template `class` attributes and bindings without running expressions. It checks every readable alternative, even when a runtime condition would select only one. Known tokens can still receive ordinary rule findings when another part of the binding is dynamic.

| Template form                                              | What selfix reads                                                                                                     |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `class="mt-4 w-full"`, `:class="'mt-4'"`                   | Complete whitespace-separated tokens.                                                                                 |
| `:class="['mt-4', { 'w-full': wide }]"`                    | Array entries and noncomputed string or identifier object keys. Object values are conditions, not classes.            |
| `:class="wide ? 'w-full' : 'w-auto'"`                      | Both branches, without evaluating the condition.                                                                      |
| `:class="active && 'mt-4'"`                                | The right-hand class expression.                                                                                      |
| `:class="choice \|\| 'mt-4'"`, `:class="choice ?? 'mt-4'"` | Both operands; an unresolved operand makes the site dynamic.                                                          |
| `:class="cn('mt-4', { 'w-full': wide })"`                  | Arguments of recognized helper calls, using the same expression rules.                                                |
| `v-bind="{ class: ['mt-4'], style: inlineStyle }"`         | The class value and the presence of the style property. Additional configured class props are also inspected.         |
| `:class` or `v-bind:class`                                 | On Vue ≥3.4, a dynamic class site; `require-static-classes` reports it. Older Vue compilers report invalid shorthand. |

No-substitution template literals, booleans, and `null` are supported; the latter two contribute no tokens. TypeScript `as`, `satisfies`, type assertions, and non-null wrappers preserve the underlying expression's result. Computed keys, array/object spreads, member accesses, string concatenation, interpolated strings, and other calls make class expressions dynamic.

Only top-level `<script setup>` constants initialized directly with a string or a no-substitution template literal are resolved. TypeScript wrappers around those literals are supported. Arrays, objects, aliases to other constants, imported values, `let`, and normal `<script>` constants are not resolved:

```vue
<script setup>
const placement = "mt-4"
const choices = ["mt-2", "mt-4"]
</script>

<template>
  <!-- Passes the complete default policy. -->
  <div :class="placement" />
  <!-- Reports require-static-classes: script arrays are not resolved. -->
  <div :class="choices" />
</template>
```

The fixed helper names are `cn`, `clsx`, and `twMerge`. Imports under those local names remain recognized regardless of import source; aliases such as `merge` are not recognized. A local declaration with a helper name disables that helper. `v-for` aliases and slot bindings also shadow outer constants and helpers in their own scopes. Slot bindings apply to slot content, not the owner's attributes. Class literals inside loops or slots remain readable. Helpers are neither executed nor analyzed for their runtime merge behavior; `cva`, `tv`, and configurable helper lists are unsupported.

`v-bind="attrs"`, unresolved spreads or computed keys in a `v-bind` object, and dynamic arguments such as `:[key]="value"` can conceal class or style attributes. They produce `parse-error` diagnostics, even with every rule off. These differ from a valid but unresolved `:class="value"`, which produces an ordinary `require-static-classes` finding. Recoverable uncertainty preserves independent readable findings; fatal parser/compiler errors suppress ordinary rule findings for the file. Invalid expressions, external templates, and template preprocessors also produce `parse-error` diagnostics.

## Configuration

`selfix.config.ts` is the standalone runner's configuration file. It default-exports a config object, normally through `defineConfig`. See the [quickstart](#quickstart) for Node's native TypeScript requirements.

### Project settings

| Field              | Type                                     | Default and meaning                                                                                       |
| ------------------ | ---------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `css`              | `string`                                 | No default. CLI stylesheet path relative to the config directory; required unless `--css` supplies it.    |
| `classProps`       | `ClassProps[]`                           | `[]`. Component-scoped additional class props; see [configured class props](#configured-class-props).     |
| `cssAliases`       | `Record<string, string>`                 | `{}`. Exact CSS import names mapped to local `.css` paths relative to the config directory (API: `base`). |
| `ui`               | `string[]`                               | `["@/components/ui"]`. Import-source prefixes matched on whole path segments.                             |
| `componentImports` | `string[]`                               | `[]`. Additional import-source regular expressions.                                                       |
| `ignoreImports`    | `string[]`                               | `[]`. Import-source regular expressions excluded from UI recognition.                                     |
| `components`       | `string[]`                               | `[]`. Component-name regular expressions, including global components.                                    |
| `exclude`          | `string[]`                               | `[]`. CLI-only whole-file exclusions; see [discovery](#discovery-and-output).                             |
| `note`             | `string`                                 | No appended note. Nonempty text is appended to every diagnostic, including `parse-error`.                 |
| `rules`            | `Partial<Record<RuleName, RuleSetting>>` | All six rules at `"error"`. Each value is `"off"`, `"warn"`, `"error"`, or `[severity, options]`.         |

### Component recognition

Recognition controls only `no-restyle`. `ui: ["@workspace/ui/components"]` matches that exact import source or its `/` descendants, but not `@workspace/ui/components-extra`. Prefixes are import strings, not filesystem paths. `componentImports: ["^@company/widgets(?:/|$)"]` adds regex-based recognition. `ui: []` disables the default prefix.

Imported PascalCase local names are collected from both script blocks. For `import { Button as ActionButton } from "@/components/ui"`, both `<ActionButton>` and `<action-button>` resolve to `ActionButton`; contracts match `ActionButton`. Setup imports take precedence over normal-script imports. selfix does not follow re-exports or resolve import aliases on disk.

`components: ["^GlobalButton$"]` recognizes a global component by its collected name. Unimported lowercase/kebab-case tags keep that spelling, so configure a matching pattern when needed. `ignoreImports` takes precedence over prefixes, additional import regexes, and global-name patterns for a site with a matching import. It does not exclude the file or turn off other rules.

### Configured class props

Use `classProps` to inspect additional component props that contain classes. Unconfigured props are ignored; selfix does not infer a prop's meaning from its name.

```ts
export default defineConfig({
  classProps: [
    { pattern: "^U[A-Z]", props: { ui: "slot-map" } },
    { pattern: "^MyPanel$", props: { contentClass: "class" } },
  ],
})
```

`pattern` is a regular expression matched against the same collected component name used by contracts. The first matching entry wins as a whole; later entries are not merged. Imported kebab-case aliases use the resolved local component name. Unimported tags retain their collected spelling, so the example pattern targets `<UButton>`, not `<u-button>`. Prop names normalize to kebab-case: `contentClass` and `content-class` identify the same prop. Declaring both in one entry is an error. Names must start with an ASCII letter and contain only letters, digits, underscores, or hyphens. Native `class` and `style` cannot be reconfigured.

- `"class"` uses the existing [class expression semantics](#vue-class-bindings), including strings, arrays, conditional object keys, supported helpers, and readable script constants. Static attributes such as `content-class="mt-4"` are also inspected.
- `"slot-map"` accepts a literal object with noncomputed string or identifier keys. Each key names a component part (a slot); each value uses the ordinary class expression semantics. TypeScript wrappers around the map are supported. Whole-map variables, computed keys, methods, and spreads remain unresolved; selfix does not discover slots across files.

```vue
<!-- Checks p-[13px] in the base slot, and truncate in the label slot. -->
<UButton :ui="{ base: 'p-[13px]', label: { truncate: enabled } }" />
<!-- Literal v-bind objects use the same configured prop semantics. -->
<MyPanel v-bind="{ contentClass: ['mt-4', { flex: wide }] }" />
```

Slots inherit the owning component's existing rule contracts; there are no per-slot policies. Configuring a class prop does not designate its component as a design-system component: `no-restyle` still requires [component recognition](#component-recognition). Other applicable class rules inspect configured props regardless of that recognition.

Unresolved values and map entries receive `require-static-classes` findings when that rule is enabled. Known entries remain inspectable alongside unresolved ones. A static string passed to a `slot-map` prop is unresolved, not parsed as an object. Dynamic `v-bind` arguments and unresolved attribute spreads retain their `parse-error` diagnostics even with rules disabled.

Findings point to the containing original attribute or `v-bind` binding. JSON diagnostics include the normalized `prop` and, when known, `slot`. Messages append context such as `[prop "ui", slot "base"]`, including for custom messages. Native class findings retain their existing shape.

### Shared policy

| Rule option | Type                     | Default and meaning                                                      |
| ----------- | ------------------------ | ------------------------------------------------------------------------ |
| `allow`     | `string[]`               | `["layout"]` for `no-restyle`; `[]` for other rules that accept it.      |
| `deny`      | `string[]`               | `[]`. Explicit bans take precedence over allowances and ordinary checks. |
| `contracts` | `Contract[]`             | `[]`. First matching component-name regex selects a contract.            |
| `message`   | `string` or category map | Built-in guidance. See [custom messages](#custom-messages).              |

A contract has a required nonempty regex string `pattern` and optional `allow`, `deny`, and `message`. Omitted fields inherit the rule's settings. Supplied fields replace them: lists are not merged, and `[]` clears an inherited list. Contracts do not inherit from earlier contracts. `require-static-classes` accepts contracts and messages but rejects allow/deny lists at either level.

For `no-restyle`, allow defines permitted classes. For color, arbitrary-value, and unknown-class rules, allow exempts matching classes. Deny explicitly bans matching tokens even when they are semantic, non-arbitrary, or known. Supplying deny alone retains the rule's default allow list and ordinary checks. For `no-inline-styles`, matching uses the token `style` with no categories.

Class patterns use exact names or `*` wildcards, not regular expressions or utility groups. `p` matches the class `p`, not `p-4`. Unknown category-like strings such as `spacig` are treated as literal class patterns; validation does not catch those typos.

Patterns without a colon match the base utility after variants, leading/trailing `!`, and a negative prefix are removed. For example, `mt-4` matches `hover:-mt-4!`. Slash modifiers remain part of the base: `bg-primary` does not match `bg-primary/50`, while `bg-primary*` does. A pattern containing a colon matches the full original token, including variants and markers: `hover:!p-4` does not match `hover:p-4!`.

Categories come from generated CSS plus matching loaded custom declarations. A class can belong to several categories. `no-restyle` requires each category to be allowed, or a class-name pattern to match; any matching deny still wins. Other class rules treat a matching allowed category as an exception.

| Category     | Representative utilities or declarations                                    |
| ------------ | --------------------------------------------------------------------------- |
| `layout`     | Margin, sizing, flex/grid placement, cursor; `mt-4`, `w-full`, `space-x-4`. |
| `color`      | Color declarations; `bg-primary`, `text-primary`.                           |
| `typography` | Font, line height, text alignment; `text-sm`, `font-bold`, `text-center`.   |
| `spacing`    | Padding, gap, scroll spacing; `p-4`, `gap-2`.                               |
| `shape`      | Border, outline, radius; `rounded-lg`.                                      |
| `effects`    | Shadows, opacity, filters, transforms; `opacity-50`.                        |
| `motion`     | Animation and transition; `duration-200`.                                   |
| `unknown`    | Unrecognized classes or declarations outside the category mapping.          |

These are examples, not mutually exclusive utility groups. Marker classes such as `group` are treated as layout. A raw-color finding can come from a composite declaration categorized outside `color`, such as a shadow.

### Component contracts

The [shared policy](#shared-policy) defines ordering, inheritance, and pattern matching. Contracts can match native names such as `div` for rules that apply there. Recognition remains necessary for `no-restyle`.

#### Choose a variant or a contract

Use the quickstart Button's `variant="secondary"` to choose its existing appearance. If callers need to control container spacing, grant that permission explicitly. With the quickstart CSS, this complete policy lets `CardContent` accept spacing but reserves horizontal-padding overrides:

```ts
import { defineConfig } from "selfix"

export default defineConfig({
  css: "src/style.css",
  ui: ["./components/ui"],
  components: ["^CardContent$"],
  rules: {
    "no-restyle": [
      "error",
      {
        allow: ["layout"],
        deny: ["px-*"],
        contracts: [
          { pattern: "^CardContent$", allow: ["layout", "spacing"] },
          { pattern: "^Button$", allow: ["w-full"] },
          { pattern: ".*", allow: ["layout"] },
        ],
      },
    ],
  },
})
```

For these template lines, import `Button` from `./components/ui/Button.vue`; `CardContent` is a global component recognized by the config:

```vue
<!-- Passes the complete configured policy. -->
<Button variant="secondary" class="w-full">Save</Button>
<CardContent class="mt-4 p-4">Content</CardContent>

<!-- Reports no-restyle: Button's allow replaces the inherited layout allowance. -->
<Button class="mt-4">Save</Button>

<!-- Reports no-restyle: inherited deny wins over CardContent's spacing allowance. -->
<CardContent class="px-4">Content</CardContent>

<!-- Passes no-restyle, but reports no-arbitrary-values. -->
<CardContent class="p-[13px]">Content</CardContent>
```

The specific contracts precede `.*` because the first match wins. A contract with `deny: []` would clear the inherited ban. selfix does not read the Button implementation to discover or validate `secondary`; that prop is part of the component API defined in the quickstart.

### Custom messages

Every rule and contract accepts a message string or a partial map keyed by the eight [categories](#shared-policy), with an optional `default` entry:

```js
message: {
  spacing: "Use the component's spacing API instead of {{className}}.",
  default: "{{className}} violates {{rule}} on {{component}} in {{file}} ({{category}}).",
}
```

| Placeholder     | Value                                                                                       |
| --------------- | ------------------------------------------------------------------------------------------- |
| `{{component}}` | Resolved local component or native tag name; `style` for SFC style blocks.                  |
| `{{className}}` | Original class token; empty for static-class and inline-style findings.                     |
| `{{category}}`  | Selected diagnostic category; `unknown` for static-class and inline-style findings.         |
| `{{file}}`      | The linted SFC filename, exactly as supplied to the API; an absolute SFC path from the CLI. |
| `{{prop}}`      | Normalized configured prop name; empty for native class and style findings.                 |
| `{{slot}}`      | Literal slot-map key; empty when no slot is known.                                          |
| `{{rule}}`      | The rule name.                                                                              |

For `no-restyle`, the category is the first disallowed category unless a deny matched. For other class findings or explicit bans, a denied category is preferred, then the first non-layout category, then the first category. Category order follows the table above. The chosen category message takes precedence over `default`, then built-in guidance.

A contract's supplied `message` replaces the entire rule-level message, including its map. If the contract map has no matching category or `default`, built-in guidance applies; it does not fall back to the rule's map. `note` is appended after message substitution and is not a placeholder template. Custom rule messages do not replace `parse-error` messages.

Validation rejects unknown fields or rules, invalid severities, malformed tuples, wrong option types, empty array entries, invalid regular expressions, unknown message categories/placeholders, and static-class allow/deny lists. There are no `property`, `sizes`, or `suggestions` placeholders, and no placeholder fallback syntax. `defineConfig` validates immediately; API creation and the CLI also validate configs.

## CLI

```sh
pnpm exec selfix src
pnpm exec selfix "apps/**/*.vue" --config selfix.config.ts
pnpm exec selfix src --css src/style.css --format json
pnpm exec selfix src --max-warnings 0
pnpm exec selfix --help
```

| Flag                  | Default and behavior                                                                                                 |
| --------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `--config <file.ts>`  | `selfix.config.ts` in the current directory. No upward search; the file must exist and have a default config export. |
| `--css <file>`        | Overrides config `css`; path relative to the current directory.                                                      |
| `--format text\|json` | `text`. Selects diagnostic output format.                                                                            |
| `--max-warnings <n>`  | Unlimited. Non-negative integer; fails when the warning count exceeds it.                                            |
| `--help`, `-h`        | Prints usage without loading a project.                                                                              |
| `--version`           | Prints the installed version without loading a project.                                                              |
| `--`                  | Ends option parsing; all following arguments are inputs.                                                             |

### Discovery and output

Inputs are files, recursively scanned directories, or quoted globs. Quote globs so selfix receives the pattern instead of shell-expanded paths. Without inputs, it scans the current directory. Input paths, globs, `--config`, and `--css` resolve from the current directory. Config `css` and path exclusions resolve from the config directory. A config is required even with `--css`.

Only `.vue` files are checked. Repeated inputs are deduplicated and files are sorted. Directory traversal skips symbolic-link entries. A directly supplied non-Vue file, unmatched input, or final scan with no Vue files fails; an empty scan is not a clean result.

The CLI skips path segments named `node_modules`, `.git`, `dist`, `coverage`, `.nuxt`, and `.output`. Config `exclude` entries are not globs: a bare name such as `generated` matches a path segment; `src/components/ui` matches that config-relative path and descendants. Exclusions skip every rule for the whole file. `ignoreImports` affects component recognition only.

Text output contains one `file:line:column severity rule message` line per diagnostic, followed by the checked-file/error/warning summary. Text paths are relative to the current directory. JSON output is a diagnostic array with no summary; a clean scan prints `[]`. JSON `file` paths are absolute.

Each diagnostic has `file`, `rule`, `severity`, `message`, `line`, `column`, and `offset`, with optional `component`, `className`, `prop`, and `slot`. `rule` can be one of the six rules or `parse-error`; severity is `warn` or `error`. Lines and columns are one-based; offsets are zero-based JavaScript string positions in the original SFC. Class findings point to the containing attribute or binding, rather than each token's exact character. Within a file, diagnostics sort by offset and then rule name.

Diagnostic output goes to stdout. Configuration, loading, and input failures print `selfix: ...` to stderr, including when JSON format is requested.

| Exit | Meaning                                                                          |
| ---- | -------------------------------------------------------------------------------- |
| `0`  | No errors; warnings within `--max-warnings`, if set. Also used for help/version. |
| `1`  | Rule errors, parse errors, or too many warnings.                                 |
| `2`  | Configuration, theme-loading, or input failure, including an empty scan.         |

## API

```ts
import { readFile } from "node:fs/promises"
import { createLinter } from "selfix"

const linter = await createLinter({
  css: await readFile("src/style.css", "utf8"),
  base: `${process.cwd()}/src`,
  config: { ui: ["@/components/ui"] },
})

const diagnostics = linter.lint(await readFile("src/Page.vue", "utf8"), "src/Page.vue")
```

`createLinter({ css, base?, config? })` is asynchronous. `css` is required CSS **source text**, not a path; `base` is the directory for resolving imports and defaults to the current directory. `config` defaults to `{}`. API creation does not read `config.css` or apply `config.exclude`; the caller loads CSS, selects files, and supplies source text.

The returned `lint(source, filename?)` method is synchronous and returns `Diagnostic[]`. The default filename is `component.vue`; supplied filenames are preserved without path resolution. `await lintSource(source, { css, base?, config?, filename? })` creates a linter for a single call and returns the same diagnostic shape. Reuse a linter for files sharing the loaded theme and policy; recreate it after theme or configuration changes. There is no file watcher or theme reload.

Vue parsing and unsupported-input issues return `parse-error` diagnostics. Invalid configuration, CSS/theme loading, and CSS inspection failures throw or reject; callers must handle errors as well as diagnostics. A failure does not become an empty result.

Public runtime exports are `createLinter`, `lintSource`, `defineConfig`, and `ruleNames` (the six names in the rule table's order). Public type exports are `Config`, `ClassProps`, `Contract`, `Message`, `RuleName`, `RuleOptions`, `RuleSetting`, `Severity`, `Category`, `Diagnostic`, and `LinterOptions`. `defineConfig(config)` validates and returns the config. Internal collectors, validators, and compiler helpers are not package exports.

### CSS import resolution

Stylesheet imports resolve from the importing stylesheet. Relative and absolute paths must name
`.css` files. Packages are searched in Node's `node_modules` lookup paths from that directory,
then from selfix's installation. Scoped packages and exact subpath exports are supported.
For `exports`, selfix selects `style` before `default` (including nested conditions), or a
string CSS target. A selected target must start with `./`, stay inside the package, and end
in `.css`. Without `exports`, a subpath names a file directly; root imports use `style`,
then `main`, then `index.css`. Missing selected targets fail instead of falling back.
Export arrays, wildcard mappings, and conditions other than `style`/`default` are unsupported;
JavaScript targets are never loaded as CSS. Errors identify the import and its origin directory.
Tailwind's standard stylesheet imports remain supported. Trusted `@plugin`/`@config` modules
keep Node module resolution and are unaffected by CSS conditions. Vite/Nuxt configuration
and generated application themes are not loaded automatically.

`cssAliases` overrides exact stylesheet import names, including imports inside packages.
Targets are local `.css` file paths; there is no wildcard, prefix, URL, or chained-alias
resolution. In the CLI, relative targets resolve from the configuration directory, even
when `--css` points elsewhere. In `createLinter`, they resolve from `base` (or the current
directory when omitted). Imports inside a target resolve from that file's directory.
Missing targets fail without falling back to package CSS. Aliases do not affect trusted
`@plugin`/`@config` module resolution or selfix's stock-color reference theme.

### Nuxt UI application themes

Keep the application's normal CSS entry, including `@import "tailwindcss";` and
`@import "@nuxt/ui";`. Point Nuxt UI's generated import at the application's file:

```ts
// selfix.config.ts
import { defineConfig } from "selfix"

export default defineConfig({
  css: "app/assets/css/main.css",
  cssAliases: {
    "#build/ui.css": ".nuxt/ui.css",
  },
})
```

Run preparation before selfix from the application root, both locally and in CI:

```sh
pnpm exec nuxt prepare && pnpm exec selfix app
```

Nuxt generates `.nuxt/ui.css` using the application's theme options. The published
Nuxt UI package also supplies a static fallback; it does not contain application-only
semantic colors. The alias selects the generated file and fails with preparation guidance
when it is missing. If you customize Nuxt's build directory, update the target path.
Rerun preparation after theme configuration changes: selfix cannot detect stale generated
files and does not execute Nuxt configuration or run preparation itself.

Verified with Nuxt 4.5.2, Nuxt UI 4.11.1, Tailwind CSS 4.3.3, and Vue 3.5.42.
The repository's `pnpm smoke:nuxt` command installs these pinned direct dependencies in a
temporary app and verifies preparation, an application-only color versus the package
fallback, CLI paths, and missing-file errors. It requires network access and runs separately
from `pnpm check`.

This integration loads CSS definitions for class analysis. It does not evaluate runtime
`app.config.ts` values or discover component slot contracts. Inspecting `:ui` prop maps
also requires explicit [classProps configuration](#configured-class-props); CSS aliases alone
do not enable prop inspection.

## How analysis works

selfix checks the Vue source you supply against a loaded theme and explicit rules. It does not render the application.

1. Vue's parser locates template class bindings, imports, and style sites. selfix collects readable class alternatives and the limited script constants described in [Vue class bindings](#vue-class-bindings). It tracks template scopes so a loop or slot binding cannot inherit an unrelated script constant.
2. Tailwind loads the supplied CSS and its imports. For each readable class, selfix inspects generated declarations and matching custom CSS to determine whether the class is known, which categories it affects, and whether it uses raw colors.
3. Each enabled rule applies its own [policy](#shared-policy). Component recognition selects where `no-restyle` applies; the other rules also check native elements. Findings point back to the original SFC using the [diagnostic location conventions](#discovery-and-output).

A known class is not necessarily allowed. For example, Tailwind recognizes `p-4`, but the default `no-restyle` policy rejects it on a recognized Button. An allowance in `no-restyle` also leaves the other rules active.

A clean result means the enabled rules found no violations in the selected source under that configuration. It does not prove that every styling path in the application was checked. Excluded files, unreadable classes when `require-static-classes` is disabled, and classes passed through uninspected props can leave styling outside the check. See [limitations and trust](#limitations-and-trust) before treating the result as a coverage guarantee.

## Troubleshooting

### A component does not receive no-restyle findings

Check the import string in the SFC against `ui` or `componentImports`, and check `ignoreImports` first because it overrides recognition. These settings match source strings; selfix does not resolve an alias or follow a barrel to find the component implementation. For auto-imported or global components, add a `components` pattern matching the template's component name. For renamed imports, contracts use the local name.

Follow [component recognition](#component-recognition), then rerun the file explicitly with `pnpm exec selfix src/Page.vue`. Confirm the file is not [excluded](#discovery-and-output) and `no-restyle` is enabled. Use the [quickstart](#quickstart) to compare a known failing case.

### A dynamic class still fails after an allowance

If the rule is `require-static-classes`, a class allowance cannot resolve the expression. Replace construction such as `:class="'p-' + size"` with complete alternatives such as `:class="large ? 'p-4' : 'p-2'"`. Both alternatives are checked; each must satisfy the enabled policies.

Check the [supported bindings and helper-shadowing rules](#vue-class-bindings) if a constant or helper remains dynamic. `require-static-classes` accepts no `allow` or `deny` list. To defer that check during adoption, [disable the rule explicitly](#adopt-in-an-existing-project), accepting that unreadable values remain unchecked. A `parse-error` for unsupported binding syntax is separate and is not suppressed by a rule allowance.

### A scoped style block is reported

`<style scoped>` still produces a `no-inline-styles` finding. Scoping does not exempt SFC style blocks, and component-import ignores do not exempt styles. Move the styling to the configured theme and use its utilities, or grant the whole-style exception described in [no-inline-styles](#no-inline-styles). Property-level exceptions are not supported. Excluding the SFC skips every rule, so use an exclusion only when that is the intended scope.

### A custom class is unknown

Check spelling and confirm the CLI's `css` entry imports the stylesheet or defines the theme token or utility. CSS loaded only by a component, a browser, or a build-tool configuration is not automatically part of selfix's theme. Follow [CSS import resolution](#css-import-resolution) to make the definition reachable, then rerun selfix.

If another system supplies the class and selfix cannot inspect its CSS, add an explicit [no-unknown-classes allowance](#no-unknown-classes). This suppresses that rule's finding; it does not prove the class exists or exempt it from other policies. Importing package CSS also does not generate an application's Nuxt UI theme; use the [preparation and alias workflow](#nuxt-ui-application-themes).

### The CLI finds no Vue files

For `No Vue files found` or `No files match`, check the working directory, input paths, and exclusions. Run `pnpm exec selfix src/Page.vue` with an existing, non-excluded SFC to isolate discovery. Quote glob inputs as shown in [CLI discovery](#discovery-and-output). Generated directories are skipped, and config exclusions apply to the whole file. An empty scan exits with code `2`; it is not a passing check.

### CSS or theme loading fails

Read the import and origin directory in the error. Verify the configured CSS file exists, and check each imported path from its importing stylesheet. Config `css` resolves from the config directory; `--css` resolves from the current directory.

For a package import, inspect its installed `package.json` and selected CSS target against [CSS import resolution](#css-import-resolution). Use a supported exact CSS export; a JavaScript export or wildcard mapping is not a stylesheet target. If your app relies on a generated theme, supply CSS containing those definitions. selfix does not run Vite or Nuxt configuration to generate it. Failed loading stops the CLI with code `2` and rejects [API creation](#api); there is no fallback clean result.

### API results do not reflect a theme edit

A linter retains its loaded theme. Read the updated CSS and call `createLinter` again, passing the stylesheet directory as `base` for relative imports. Recreate it after configuration changes too. The [API example](#api) shows the loading boundary; there is no watcher or timed refresh. A fresh CLI invocation creates a new linter.

## Limitations and trust

- Analysis targets Vue SFC templates. JSX/TSX, template preprocessors, external templates, and arbitrary script-only class calls are outside the supported input. Props such as `ui`, `contentClass`, and `overlayClass` are inspected only when explicitly configured through [classProps](#configured-class-props).
- Class readability is limited to the [documented expression forms and scopes](#vue-class-bindings). Application expressions are never evaluated. Conditional alternatives are checked without deciding which branch runs.
- Component recognition uses configured names and import strings. There is no cross-file wrapper tracing, automatic variant discovery, or autofix. Configure wrapper policies explicitly and choose component props from the component's actual API. Run selfix separately from ESLint or Oxlint.
- Recoverable collection uncertainty (such as dynamic `v-bind` attributes) produces `parse-error` diagnostics while independent, statically readable sites still receive rule diagnostics. Repeated unsupported properties in one object binding produce one uncertainty report. Fatal SFC, script, or template compiler failures suppress ordinary rule findings for the file.
- Malformed SFCs produce `parse-error` diagnostics even with rules disabled. Unsupported templates and failed theme loading do not silently pass. See [CLI exits](#discovery-and-output) and [API error handling](#api).
- **Use trusted configuration:** `selfix.config.ts` and Tailwind `@plugin`/`@config` modules execute as Node modules with the process's permissions. The promise not to evaluate application expressions does not make configuration files inert or sandbox them.
- Tailwind validation uses `__unstable__loadDesignSystem`; API changes may require a selfix update.

## Development

The workspace contains `packages/selfix` (publishable) and `apps/playground` (private Vue + Vite app).

```sh
pnpm install --frozen-lockfile
pnpm dev          # Build selfix and start the playground
pnpm check        # Typecheck, lint, format check, test, and build
pnpm format       # Apply formatting
```

Try `class="p-8"` on a Button in `apps/playground/src/App.vue`, then run `pnpm --filter playground lint:design`. Remove it to restore a passing check; use the Button's `variant` prop to change appearance. `pnpm check` includes playground integration tests; run them alone after building with `pnpm --filter playground test`.

To verify a release artifact locally (requires registry access):

```sh
pnpm --filter selfix pack --out /tmp/selfix.tgz
pnpm smoke:package /tmp/selfix.tgz
```

The smoke check installs that archive with the workspace-tested Vue and Tailwind versions, loads native TypeScript configuration, and checks both failing and valid Vue fixtures. It prints the versions and commands and removes its temporary consumer on success or failure. CI publishes the same verified archive without rebuilding it.

See [AGENTS.md](https://github.com/basteau/selfix/blob/main/AGENTS.md) for contribution conventions. Keep documentation in this README and add regression tests for behavior changes. [Bug reports](https://github.com/basteau/selfix/issues) should include a minimal Vue/CSS example, config, command, diagnostic, and dependency versions.

## Releases

<details>
<summary>Maintainer setup and release checklist</summary>

Only `packages/selfix` is published. [Changelogen](https://github.com/unjs/changelogen) prepares the package version and root `CHANGELOG.md` from repository-wide Conventional Commits. The commands below only update files; do not pass Changelogen's `--release`, `--push`, or `--publish` flags.

Tag CI creates a [GitHub Release](https://github.com/basteau/selfix/releases) from that version's changelog section after checks and npm publication (or its bootstrap skip). Alpha and beta versions become GitHub prereleases, not Latest. Existing releases are left unchanged on reruns. Each version must have exactly one nonempty `## vVERSION` section.

### One-time setup

- Keep package repository metadata and the Git remote pointing to `basteau/selfix`.
- Direct pushes to `main` are allowed; run `pnpm check` before pushing and wait for green CI before tagging. Protect `main` against deletion and force pushes, and restrict `v*` tags to admins.
- Use Conventional Commits and preserve relevant Lore trailers. Optional PRs use squash merging with the PR title as the commit subject; CI validates those titles.
- Create the `npm` GitHub environment, restrict it to release tags, and require reviewers where available. Leave repository Actions variable `NPM_PUBLISH_ENABLED` unset until bootstrap is complete.

### First release: 0.1.0-alpha.0

Start on `main` with a clean working tree and full Git history, including tags. Prepare each version once. If its version and notes are already committed, skip preparation; if only the version is set, add `--no-bump`:

```sh
pnpm install --frozen-lockfile
pnpm release:prepare -r 0.1.0-alpha.0
pnpm format
pnpm check
```

Review the package version and `CHANGELOG.md`, commit as `chore(release): v0.1.0-alpha.0`, and push `main`. After CI passes, tag that commit:

```sh
git tag -a v0.1.0-alpha.0 -m "v0.1.0-alpha.0"
git push origin refs/tags/v0.1.0-alpha.0
```

CI validates metadata and changelog, runs checks, then packs, installs, and smoke-tests the package in an isolated consumer before the publication dry-run. Every branch and PR also runs the package smoke test. Download `selfix-package` from the successful tag run and extract `selfix.tgz`. Inspect and publish that tarball once locally:

```sh
tar -tzf selfix.tgz
npm login
npm publish ./selfix.tgz --access public --tag alpha --ignore-scripts
```

Configure the package's [npm trusted publisher](https://docs.npmjs.com/trusted-publishers/): GitHub Actions, `basteau/selfix`, workflow **`ci.yml`**, environment **`npm`**. Permit direct `npm publish`, then set repository variable `NPM_PUBLISH_ENABLED=true`. Do not rerun publication of `v0.1.0-alpha.0`. Once published, users can install with `pnpm add -D selfix@alpha`.

Use a current npm CLI for bootstrap and trusted publishing. No npm tokens belong in GitHub secrets. After verifying trusted publishing, disallow token-based publishing in npm settings. A publish dry-run does not verify registry permissions or OIDC authentication.

### Later releases

For the next release only, use `--from e6f33ce`, the rewritten equivalent of the published alpha commit, to avoid repeating old notes. Leave the published tag unchanged. Once the next release is tagged on `main`, omit `--from`.

With a clean working tree and full history:

```sh
git switch main
git pull --ff-only
pnpm release:prepare -r 0.1.0-alpha.1 --from e6f33ce
pnpm format
pnpm check
```

Review the version and changelog, commit as `chore(release): v0.1.0-alpha.1`, push, and wait for green CI before tagging as above. After tag checks and environment approval, CI publishes the exact checked tarball with OIDC and provenance, without checkout, dependency installation, or package scripts in the publish job.

Release progression: `0.1.0-alpha.0` → `0.1.0-alpha.1` → `0.1.0-beta.0` → `0.1.0`. Use explicit `-r` versions; Changelogen's inferred `0.x` feature bumps are patches.

CI maps validated versions to [npm dist-tags](https://docs.npmjs.com/adding-dist-tags-to-packages/): `X.Y.Z-alpha.N` → `alpha`, `X.Y.Z-beta.N` → `beta`, and stable `X.Y.Z` → `latest`. Git tags add a `v` prefix. Other prereleases and build metadata are rejected. Users opt in with `selfix@alpha` or `selfix@beta`. Verify npm dist-tags after bootstrap with `npm view selfix dist-tags --json`; if `latest` points to the prerelease, remove it with `npm dist-tag rm selfix latest`.

For external configuration failures, fix the configuration and rerun the failed job. Never move a published tag or reuse a published version; content changes require a new release.

</details>

## License

MIT licensed. See [LICENSE](LICENSE).
