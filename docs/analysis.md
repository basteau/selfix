# How analysis works

[Documentation index](README.md)

selfix checks the Vue source you supply against a loaded theme and explicit rules. It does not render the application.

1. Vue's parser locates template class bindings, imports, and style sites. selfix collects readable class alternatives and the limited script constants described in [Vue class bindings](#vue-class-bindings). It tracks template scopes so a loop or slot binding cannot inherit an unrelated script constant.
2. Tailwind loads the supplied CSS and its imports. For each readable class, selfix inspects generated declarations and matching custom CSS to determine whether the class is known, which categories it affects, and whether it uses raw colors.
3. Each enabled rule applies its own [policy](configuration.md#shared-policy). Component recognition selects where `no-restyle` applies; the other rules also check native elements. Findings point back to the original SFC using the [diagnostic location conventions](cli.md#discovery-and-output).

A known class is not necessarily allowed. For example, Tailwind recognizes `p-4`, but the default `no-restyle` policy rejects it on a recognized Button. An allowance in `no-restyle` also leaves the other rules active.

A clean result means the enabled rules found no violations in the selected source under that configuration. It does not prove that every styling path in the application was checked. Excluded files, unreadable classes when `require-static-classes` is disabled, and classes passed through uninspected props can leave styling outside the check. See [limitations and trust](#limitations-and-trust) before treating the result as a coverage guarantee.

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

External `<script src="./component.ts">` blocks produce a recoverable `parse-error` at the script block, even with every rule off. selfix does not load, import, or execute that application module, so its imports and component registrations are unavailable. Move the script content into an inline `<script>` or `<script setup>` block in the SFC. Independent literal template sites still receive applicable rule findings.

## Limitations and trust

- Analysis targets Vue SFC templates. JSX/TSX, template preprocessors, external templates, and arbitrary script-only class calls are outside the supported input. Props such as `ui`, `contentClass`, and `overlayClass` are inspected only when explicitly configured through [classProps](configuration.md#configured-class-props).
- Class readability is limited to the [documented expression forms and scopes](#vue-class-bindings). Application expressions are never evaluated. Conditional alternatives are checked without deciding which branch runs.
- Component recognition uses configured names and import strings. There is no cross-file wrapper tracing, automatic variant discovery, or autofix. Configure wrapper policies explicitly and choose component props from the component's actual API. Run selfix separately from ESLint or Oxlint.
- Recoverable collection uncertainty (such as dynamic `v-bind` attributes) produces `parse-error` diagnostics while independent, statically readable sites still receive rule diagnostics. Repeated unsupported properties in one object binding produce one uncertainty report. Fatal SFC, script, or template compiler failures suppress ordinary rule findings for the file.
- Malformed SFCs produce `parse-error` diagnostics even with rules disabled. Unsupported templates and failed theme loading do not silently pass. See [CLI exits](cli.md#discovery-and-output) and [API error handling](api.md#api).
- **Use trusted configuration:** `selfix.config.ts` and Tailwind `@plugin`/`@config` modules execute as Node modules with the process's permissions. The promise not to evaluate application expressions does not make configuration files inert or sandbox them.
- Tailwind validation uses `__unstable__loadDesignSystem`; API changes may require a selfix update.

See also: [rule reference](rules.md), [configuration](configuration.md), and [troubleshooting](troubleshooting.md).
