# Themes

[Documentation index](README.md)

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

### Nested custom CSS

selfix inspects supported nested declarations from the CSS entry and imported stylesheets:

```css
.card {
  margin: 1rem;
  &:hover,
  &:focus {
    @media (width > 40rem) {
      color: red;
    }
  }
}
```

Here `card` retains both layout and color declarations, including the literal `red`.
It can trigger both `no-restyle` and `no-raw-colors`, independently of whether the
media query or pseudo-class currently matches. Nesting does not turn a literal
color into a semantic theme reference.

Each nested selector-list branch must start with a single `&`, followed by a
supported compound selector. Multiple levels and `@media`, `@supports`,
`@container`, and `@starting-style` blocks retain ownership. Descendants, siblings,
parent references inside functions, and other nested at-rule blocks fail inspection
explicitly; they are not attributed to the enclosing class. `@property` registrations
remain ignored. See the [bounded selector subset](analysis.md#custom-css-selectors)
for supported compounds and error behavior. This is class attribution, without
browser matching or cascade evaluation.

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
also requires explicit [classProps configuration](configuration.md#configured-class-props); CSS aliases alone
do not enable prop inspection.

See also: [configuration](configuration.md), [API reference](api.md), and [troubleshooting](troubleshooting.md).
