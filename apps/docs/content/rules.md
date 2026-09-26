---
title: Rules
description: Choose which styling habits to catch and how to correct them.
---

selfix has seven rules. All start at `"error"`; you can turn each off, make it a warning, or configure exceptions. Use the [adoption guide](adoption.md) to start with one rule.

The color examples use the theme below. `Button` is a [recognized component](configuration.md#component-recognition). Each section describes one rule; passing it does not bypass the others.

## no-restricted-components

Ban exact component names, or an authored import and exported name, independently of styling recognition, classes, or definition discovery:

```ts
rules: {
  "no-restricted-components": ["error", {
    components: [{
      name: "CustomButton",
      replacement: "UButton",
      message: "Use our standard button for consistent behavior.",
    }],
  }],
},
```

`<CustomButton />` reports: `<CustomButton> is restricted. Use <UButton> instead. Use our standard button for consistent behavior.` The finding points to the opening tag, includes component metadata, and appends the global `note` when present. Styling findings still report independently.

Each entry requires a nonempty exact `name`; `replacement` and `message` are optional nonempty strings. Names are not regexes or class patterns. Unknown options are rejected. An omitted or empty `components` or `imports` list bans nothing from that list, including under the default error severity. Duplicate matching entries use the first entry's guidance.

Matching uses local imported names or global/auto-imported names, with PascalCase and kebab-case equivalents. Acronyms remain distinct: `URLButton` matches `u-r-l-button`, not `url-button`. When different local imports compete, Vue’s exact, camelized, then PascalCase lookup determines the binding; a lowercase import and a distinct PascalCase global remain separate. A `name` restriction on `CustomButton` does not follow `import { CustomButton as OtherButton }`; use an import restriction or restrict `OtherButton` separately. Type-only imports do not establish runtime aliases. Native elements and literal `v-pre` content are excluded.

Import restrictions match the authored module string and exported name, including a local rename:

```ts
rules: {
  "no-restricted-components": ["error", {
    imports: [{
      source: "some-ui",
      name: "CustomButton",
      replacement: "UButton",
    }],
  }],
},
```

`import { CustomButton as LegacyButton } from "some-ui"` makes `<LegacyButton>` and `<legacy-button>` report `<LegacyButton> is restricted. Use <UButton> instead.` A default export uses `name: "default"`, including `import Button from "some-ui"` and `import { default as Button } from "some-ui"`. A string export uses that string, such as `name: "custom-button"` for `import { "custom-button" as Quoted }`. `source` and `name` are exact and nonempty; `some-ui` does not match `some-ui/button`, `@/some-ui`, or `./barrel`.

The comparison uses the import written in the SFC. It does not resolve path aliases, follow barrel re-exports, or treat a global, auto-imported, or wrapper component as that export. A namespace member such as `<UI.Button>` is not the named export `Button`. Type-only imports, other exports from the same module, and native elements do not match. A `v-for` or slot binding shadows `:is="LegacyButton"` and leaves that usage unresolved; it does not retarget the `<LegacyButton>` tag.

When a usage matches more than one entry, selfix reports one finding. Entries in `components` are considered before entries in `imports`, and the first match in each list supplies `replacement` and `message`.

The rule supports `off`, `warn`, `error`, and [file overrides](configuration.md#per-file-rule-overrides). A severity-only override preserves both lists. A supplied `components` or `imports` list replaces only that list; `[]` clears it, and omitting a list preserves the inherited one. Styling options such as `allow`, `deny`, and `contracts` do not apply.

A static `<component :is="Button">` or `<Component :is="Button">` binding uses the same local import as a direct `<Button>` tag when that name is an unshadowed runtime import. Lookup is exact: `:is="button"` is not the `Button` import. A namespace member written `<UI.Button>` or `:is="UI.Button"` keeps the name `UI.Button` and the namespace module as its import source. Contracts, configured class props, and a restriction entry match that exact written name. A restriction on `Button` or `UI` does not follow the member. `v-for` and slot props shadow `:is` expressions; they do not retarget a dotted tag, matching Vue's compiler. Calls, conditionals, strings, computed members, local aliases, and type-only imports stay unresolved. `is="vue:…"` stays unresolved.

When either effective list is nonempty and the rule is enabled, unresolved dynamic components, unresolved namespace tags, bare namespace imports, and `is="vue:…"` usages produce `parse-error` coverage diagnostics. These are always errors, even when restrictions are warnings; the CLI exits with status 1. Disabling the rule or clearing both lists removes this rule's coverage requirement. No expressions are evaluated. Direct restriction warnings use the normal warning limit; both text and JSON output include findings. selfix recommends replacements without rewriting imports, props, events, slots, or source.

## no-restyle

Keep a component's appearance under its control. By default, callers can add layout classes such as margin and width, but cannot change padding, colors, or typography.

```vue
<!-- Rejected: changes the Button's padding. -->
<Button class="p-4">Save</Button>

<!-- Allowed: controls placement and width. -->
<Button class="mt-4 w-full">Save</Button>
```

Use the component's existing props to choose its appearance. If callers need more control, [give the component a contract](configuration.md#component-contracts) that allows it.

This is the only rule that requires a recognized component. A native `<div class="p-4">` is outside its scope.

A class affecting several categories needs all of them allowed, or an allowance by class name. Explicit bans win; see [policy options](configuration.md#shared-policy).

## no-raw-colors

Use colors named for their purpose so the theme controls their values.

```vue
<!-- Rejected: a palette color and a literal color. -->
<div class="bg-red-500 text-[#fff]" />

<!-- Allowed: colors from the theme. -->
<div class="bg-primary text-on-primary" />
```

Add purpose-based colors to your Tailwind entry:

```css
@import "tailwindcss";

@theme {
  --color-primary: #3456d1;
  --color-on-primary: #ffffff;
}
```

The class must use the named token. Redefining `red-500` still leaves it a palette color.

Custom CSS is checked too: replace `.alert { color: red; }` with a theme variable such as `var(--color-primary)`.

`currentColor` and the built-in `bg-transparent` utility pass. Authored `transparent` in arbitrary values or custom CSS is reported. This rule checks class CSS and native SVG `fill`/`stroke` attributes. Inline style properties remain outside its color checks.

Native SVG paints can use `currentColor`, `none`, semantic variables such as `var(--color-primary)`, or paint-server references such as `url(#gradient)`. Raw literals, stock palette variables, and raw fallback colors are reported, including in literal bindings:

```vue
<!-- Rejected -->
<svg><path fill="#fff" :stroke="'red'" /></svg>

<!-- Allowed -->
<svg><path fill="currentColor" stroke="var(--color-primary)" /></svg>
```

Only literal strings (including template literals without substitutions) and `null` bindings are readable; `null` removes the attribute. Literal `v-bind` objects use the same checks. Unresolved SVG paint bindings produce `parse-error` while this rule is enabled. Component props and HTML inside SVG `foreignObject` are excluded.

For a deliberate exception, add a rule option such as `allow: ["bg-red-500"]`. SVG exceptions match `fill`, `stroke`, or the `color` category through the same allow/deny policy; deny takes precedence. SVG diagnostics carry `prop` and point to the attribute (the whole `v-bind` for object bindings), without a `className`.

## no-arbitrary-values

Use the theme's spacing and sizing choices instead of introducing a value at each call site.

```vue
<!-- Rejected. -->
<div class="p-[13px]" />

<!-- Allowed. -->
<div class="p-4" />
```

Choose a named utility that fits the design. If the design needs a new value, add it to the theme or allow that class explicitly with `allow: ["p-[13px]"]`.

Arbitrary properties and bracket modifiers also fail. CSS-variable shorthand and arbitrary variants pass; the rule checks values, not variants.

## no-inline-styles

Keep styling in classes that selfix can check against your theme.

```vue
<!-- Rejected. -->
<div style="padding: 1rem" />

<!-- Allowed. -->
<div class="p-4" />
```

The rule reports style attributes, bindings, and all SFC `<style>` blocks.

For component implementations that need these styles, use a [file override](configuration.md#per-file-rule-overrides). For a component-specific exception, configure this rule with a contract:

```ts
contracts: [{ pattern: "^ProgressBar$", allow: ["style"] }],
```

This allows the whole style attribute, not selected properties. Rule-level `allow: ["style"]` also allows SFC blocks; `deny: ["style"]` wins over allowances.

A `<style>` tag inside the template is unsupported input, regardless of this rule's settings.

## no-unknown-classes

Catch class names that your loaded theme doesn't define.

```vue
<!-- Rejected: misspelled primary. -->
<div class="bg-prmary" />

<!-- Allowed. -->
<div class="bg-primary" />
```

For a unique close spelling match, selfix suggests a complete replacement such as `flex-cols` → `flex-col` or `hovr:flex` → `hover:flex`. Candidates come from the loaded Tailwind compiler's utility and variant vocabulary, including theme completions and custom utilities/variants. Each complete replacement must compile and pass all applicable enabled class rules, including component contracts and file overrides. Rules set to `warn` still constrain suggestions.

Matching allows one insertion, deletion, substitution, or adjacent transposition in one utility or variant. Prefixes, negative signs, important markers, and slash modifiers are preserved. Ties among permitted candidates produce no suggestion. Tokens containing arbitrary syntax or escaped identifiers, missing/incorrect prefixes, multiple spelling mistakes, and names absent from compiler completions may receive no suggestion. selfix does not approximate colors, convert arbitrary values to theme scales, or edit your files. Existing findings remain even when there is no suggestion.

Check the spelling first. If the class exists in another stylesheet, make sure your configured CSS entry imports it. See [Themes](themes.md).

Tailwind markers such as `group`, `peer`, `dark`, and `group/card` are accepted. Loaded custom classes are accepted too, but don't automatically gain Tailwind variants such as `hover:notice`.

If an external system supplies a class that selfix cannot load, use an explicit exception such as `allow: ["external-widget"]`. That skips this rule only.

## require-static-classes

Write complete class names so selfix can check every possible choice.

```vue
<!-- Rejected: the class is assembled at runtime. -->
<div :class="`mt-${spacing}`" />

<!-- Allowed: both choices can be checked. -->
<div :class="large ? 'mt-4' : 'mt-2'" />
```

Both alternatives are checked without running the condition. See [supported bindings](analysis.md#vue-class-bindings) for more forms.

This rule accepts custom messages, but no `allow` or `deny` list: it cannot match a class name it cannot read. Turning it off leaves those dynamic values unchecked. Unsupported syntax can still produce `parse-error`.

For severity settings, exceptions, and matching order, see [Shared policy](configuration.md#shared-policy).
