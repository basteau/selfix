# Rules

[Documentation index](README.md)

All six rules default to `"error"`. Only `no-restyle` requires a [recognized UI component](configuration.md#component-recognition); the other five also check native elements. Each rule has its own policy: an allowance in one rule does not bypass another.

| Rule                                              | Purpose                                                      |
| ------------------------------------------------- | ------------------------------------------------------------ |
| [no-restyle](#no-restyle)                         | Keep component styling within its contract.                  |
| [no-raw-colors](#no-raw-colors)                   | Use semantic theme colors.                                   |
| [no-arbitrary-values](#no-arbitrary-values)       | Use named utilities instead of arbitrary values.             |
| [no-inline-styles](#no-inline-styles)             | Use classes instead of style attributes or SFC style blocks. |
| [no-unknown-classes](#no-unknown-classes)         | Check classes against the loaded Tailwind theme and CSS.     |
| [require-static-classes](#require-static-classes) | Keep possible class names statically readable.               |

The examples below use the [quickstart theme](getting-started.md#define-the-theme-and-component). `Button` means a recognized component. Unless an example says otherwise, “passes” refers to the named rule only. Options and defaults are listed once under [shared policy](configuration.md#shared-policy).

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

The rule inspects classes at the call site. It does not discover component variants, validate prop values, or trace wrappers across files. See the [worked policy](configuration.md#choose-a-variant-or-a-contract) for contract ordering and replacement examples.

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

The rule accepts `message` and message contracts. `allow` and `deny` are invalid because unresolved class names cannot be matched safely. Disabling this rule stops dynamic-class findings but does not disable [unsupported-input diagnostics](analysis.md#vue-class-bindings).

See also: [configuration and policy defaults](configuration.md), [analysis boundaries](analysis.md), and [troubleshooting](troubleshooting.md).
