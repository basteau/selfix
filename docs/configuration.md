# Configuration

[Documentation index](README.md)

`selfix.config.ts` is the standalone runner's configuration file. It default-exports a config object, normally through `defineConfig`. See the [quickstart](getting-started.md#quickstart) for Node's native TypeScript requirements.

### Project settings

| Field              | Type                                     | Default and meaning                                                                                                                  |
| ------------------ | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `project`          | `ProjectOptions \| false`                | CLI: automatic discovery. API: disabled unless an object is supplied. See [component source discovery](#component-source-discovery). |
| `css`              | `string`                                 | No default. CLI stylesheet path relative to the config directory; required unless `--css` supplies it.                               |
| `classProps`       | `ClassProps[]`                           | `[]`. Component-scoped additional class props; see [configured class props](#configured-class-props).                                |
| `cssAliases`       | `Record<string, string>`                 | `{}`. Exact CSS import names mapped to local `.css` paths relative to the config directory (API: `base`).                            |
| `ui`               | `string[]`                               | `["@/components/ui"]`. Import-source prefixes matched on whole path segments.                                                        |
| `componentImports` | `string[]`                               | `[]`. Additional import-source regular expressions.                                                                                  |
| `ignoreImports`    | `string[]`                               | `[]`. Import-source regular expressions excluded from UI recognition.                                                                |
| `components`       | `string[]`                               | `[]`. Component-name regular expressions, including global components.                                                               |
| `exclude`          | `string[]`                               | `[]`. CLI-only whole-file exclusions; see [discovery](cli.md#discovery-and-output).                                                  |
| `note`             | `string`                                 | No appended note. Nonempty text is appended to every diagnostic, including `parse-error`.                                            |
| `rules`            | `Partial<Record<RuleName, RuleSetting>>` | All six rules at `"error"`. Each value is `"off"`, `"warn"`, `"error"`, or `[severity, options]`.                                    |

### Component recognition

Recognition controls only `no-restyle`. `ui: ["@workspace/ui/components"]` matches that exact import source or its `/` descendants, but not `@workspace/ui/components-extra`. Prefixes are import strings, not filesystem paths. `componentImports: ["^@company/widgets(?:/|$)"]` adds regex-based recognition. `ui: []` disables the default prefix.

Imported PascalCase local names are collected from both script blocks. For `import { Button as ActionButton } from "@/components/ui"`, both `<ActionButton>` and `<action-button>` resolve to `ActionButton`; contracts match `ActionButton`. Setup imports take precedence over normal-script imports. Source discovery can follow supported aliases and explicit re-exports for guidance, but contracts and classProps continue to match the local name.

`components: ["^GlobalButton$"]` recognizes a global component by its collected name. Unimported lowercase/kebab-case tags keep that spelling, so configure a matching pattern when needed. `ignoreImports` takes precedence over prefixes, additional import regexes, and global-name patterns for a site with a matching import. It does not exclude the file or turn off other rules.

### Component source discovery

The CLI enables discovery by default with the config directory as its project root. API callers opt in with `config: { project: {} }`; `project: false` disables discovery. Discovery enriches `no-restyle` findings and does not recognize components, change contracts, inspect additional props, or validate passed prop values by itself.

```ts
export default defineConfig({
  project: {
    root: ".",
    // Optional overrides when supported metadata is absent or insufficient:
    aliases: { "@shared/*": "../shared/*" },
    components: { GlobalButton: "src/components/Button.vue" },
  },
})
```

| Project option   | Meaning                                                                                                                                                                                     |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `root`           | CLI: relative to the config directory. API: relative to the current directory. Defaults to that directory.                                                                                  |
| `aliases`        | Import patterns with zero or one `*`, mapped to local paths relative to root. Overrides discovered entries with the same pattern. Use `@/*` for descendants; an exact `@` only matches `@`. |
| `components`     | Exact collected component names mapped to existing `.vue` files relative to root. Overrides imported and prepared definitions; has no effect on recognition.                                |
| `tsconfig`       | Explicit metadata file relative to root. Otherwise use root `tsconfig.json`, then `jsconfig.json`, then prepared `.nuxt/tsconfig.json` for Nuxt projects.                                   |
| `nuxt`           | Force prepared Nuxt discovery on/off. By default, detect a `nuxt` dependency or a prepared components artifact.                                                                             |
| `nuxtComponents` | Prepared declaration file relative to root; defaults to `.nuxt/components.d.ts`. Supplying it also enables Nuxt discovery unless `nuxt: false`.                                             |

`cssAliases`, CSS `base`, and `ui` import prefixes remain separate settings. They do not provide component filesystem aliases. For custom Nuxt build directories, set both `nuxtComponents` and `tsconfig` as needed, as well as the generated CSS alias.

Discovery reads JSONC tsconfig/jsconfig `compilerOptions.paths`, `baseUrl` for those paths, and string/array `extends` chains. Relative extends resolve from the declaring file; package extends use Node's resolution of the JSON file. Each path mapping keeps its defining base (`baseUrl`, including an inherited base, or the declaring config directory). Child paths replace inherited paths; later bases override earlier declared settings. Exact patterns win over wildcards, then the longest wildcard prefix and suffix win; fallback targets are tried in order. Bare imports without a matching paths entry are not resolved through baseUrl alone. No Vite, Nuxt, or application configuration is executed.

Direct relative/absolute imports, mapped aliases, and explicit named/default re-exports can reach Vue definitions through multiple barrel files. An exact file wins; extensionless paths probe `.vue`, `.ts`, `.js`, `.mts`, `.mjs`, `.cts`, `.cjs`, then directory `index` files in those extensions. Multiple candidates, cycles, missing optional sources, namespace exports, export-star traversal, and general package-condition resolution yield no definition metadata. Explicit missing mappings and malformed/unreadable mapping artifacts fail actionably.

Readable props are top-level typed `defineProps<T>()` and `withDefaults(defineProps<T>(), ...)` in script setup. `T` may be a direct object type or a same-file alias/interface. Individual size/variant properties can use complete string-literal unions and same-file value aliases. Imported types, generics, inherited or merged interfaces, unions/intersections of whole prop objects, runtime declarations, factories, and shadowed macros do not supply unverified choices. Unsupported types omit choices while retaining the definition and original finding. A malformed resolved SFC fails instead of supplying misleading metadata.

Prepared Nuxt discovery reads direct declarations shaped like `export const UButton: typeof import("../node_modules/.../Button.vue")['default']`. It supports generated local names, prefixes, and kebab-case tag matching; wrapped lazy declarations and other forms are omitted. Application-owned `nuxt prepare` must run first. Missing artifacts/targets report preparation guidance. Re-run preparation after relevant application changes; selfix cannot detect stale generated files. Source discovery does not authorize U-component recognition or `ui` slot inspection: configure `components` and `classProps` explicitly.

Every linter captures its own source and metadata snapshot. Recreate it after component, barrel, dependency, or project-metadata edits; each CLI process creates a fresh snapshot. Local source directories, mapped roots, prepared definitions, and their supported static imports are captured at creation. Directory traversal skips symlink entries and generated/dependency directories unless explicitly reached by mappings or imports. An editor's supplied SFC source controls that lint call, including its imports and self-definition metadata. A newly referenced external source outside the captured graph requires a new linter. Returned diagnostics do not mutate the snapshot.

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

- `"class"` uses the existing [class expression semantics](analysis.md#vue-class-bindings), including strings, arrays, conditional object keys, supported helpers, and readable script constants. Static attributes such as `content-class="mt-4"` are also inspected.
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

The specific contracts precede `.*` because the first match wins. A contract with `deny: []` would clear the inherited ban. Discovery may list `secondary` when its type is readable, but does not validate the prop or prove it replaces a particular utility; that behavior belongs to the component API defined in the quickstart.

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

See also: [rule reference](rules.md), [theme loading](themes.md), and [CLI reference](cli.md).
