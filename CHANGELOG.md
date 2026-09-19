# Changelog

## v2.0.0

This release simplifies API paths, file matching, and rule overrides, with shorter developer guides and a new Blume documentation site.

[Compare changes](https://github.com/basteau/selfix/compare/v1.0.0...v2.0.0)

### Breaking changes

- **API paths:** Replace `base` with `cssBase` and `configBase` with `root`. `root` defaults to the working directory and owns CSS alias targets, file overrides, relative lint filenames, and default component discovery. `cssBase` only controls stylesheet imports and defaults to `root`; relative `cssBase` and `project.root` resolve from `root`. Diagnostic filenames remain as supplied. API discovery remains opt-in. ([02c5ca7](https://github.com/basteau/selfix/commit/02c5ca7))
- **API config:** `createLinter` and `lintSource` accept `LinterConfig`, which excludes CLI-only `css` and `exclude`. Those CLI-only fields are now rejected instead of silently ignored. The removed `base` and `configBase` options also fail with replacement guidance.
- **Exclusions:** `exclude` uses the same config-relative, full-path glob syntax as overrides: `*`, `**`, and `?`. Replace `generated` with `**/generated/**` and `src/generated` with `src/generated/**`. Bare directory shorthand is rejected; exact `.vue` paths remain valid. ([9c53841](https://github.com/basteau/selfix/commit/9c53841))
- **Override options:** `[severity, options]` now preserves omitted fields instead of resetting them. Supplied lists and message maps replace as units. Use `deny: []` or `contracts: []` to clear inherited lists, and `message: {}` to clear the rule-level custom message. Severity-only overrides still preserve options; matching contracts can still supply messages. ([a306a18](https://github.com/basteau/selfix/commit/a306a18))

### Documentation

The first tutorial now demonstrates one Button override and its correction. Guides remove internal algorithms, consolidate rollout and agent setup, and give CLI and API references distinct jobs. Documentation is 18% shorter, with runnable examples and verified links.

Node, Vue, and Tailwind requirements are unchanged. All six rules still default to errors. No new consumer dependencies are required.

## v1.0.0

First stable release of selfix: design-system linting for Vue 3 and Tailwind CSS 4, with six rules, a standalone CLI, and a typed Node API. Install with `pnpm add -D selfix`.

Requires Node.js ≥22.18.0, Vue ≥3.2.13 <4, and Tailwind CSS ≥4 <5. Vue and Tailwind are the only consumer peer dependencies; no UI kit or lint framework is required.

[Compare changes since the previous alpha](https://github.com/basteau/selfix/compare/v0.1.0-alpha.1...v1.0.0)

### Highlights

- Per-file rule overrides let component authors relax selected checks without excluding their files from the remaining rules. Matching entries apply in order, with later settings winning per rule. ([8e9457b](https://github.com/basteau/selfix/commit/8e9457b))
- Component discovery enriches diagnostics with source definitions and verified literal size/variant choices. It supports configured project aliases, explicit barrel re-exports, and supported prepared Nuxt component declarations. ([bbe8d41](https://github.com/basteau/selfix/commit/bbe8d41))
- Restyling diagnostics give category-specific guidance, and common Tailwind utilities receive more accurate classifications. ([6eae1a6](https://github.com/basteau/selfix/commit/6eae1a6), [d078b12](https://github.com/basteau/selfix/commit/d078b12))
- Improved custom CSS inspection covers marker classes, selector attribution, nested ownership, and declarations expanded by `@apply`, while preserving raw-color provenance.
- Vue component recognition follows runtime identities, minimum supported compiler compatibility is restored, and unsupported external scripts report actionable parse errors.
- A concise quickstart, agent setup guide, and tested author/consumer adoption workflow help teams configure selfix. Packed-consumer CI checks Linux and macOS with minimum and workspace dependency versions before publication.

### Upgrading from alpha

Install `selfix` without a prerelease dist-tag. The standalone `selfix.config.ts` integration remains the same. All six rules still default to errors; omitted rules remain enabled. Component discovery is enabled by default in the CLI and opt-in for API callers. Set `project: false` to disable it. CLI users may now encounter actionable project-metadata or missing Nuxt preparation errors; prepare the project, correct the configuration, or disable discovery.

Corrected CSS inspection and component recognition may report violations that alpha versions missed. Review those findings and use component contracts or per-file overrides for intentional exceptions. Parse errors cannot be disabled through rule overrides.

The documented [analysis boundaries](https://github.com/basteau/selfix/blob/v1.0.0/docs/analysis.md) still apply. selfix does not evaluate application expressions or guarantee coverage of every runtime styling path; dynamic and namespace component recognition remains outside the supported scope.

## v0.1.0-alpha.1

This alpha adds explicit application CSS aliases and component-scoped class props, including literal slot maps such as Nuxt UI `ui`. Vue scope handling, CSS inspection, and recoverable diagnostics are more reliable, and the README now includes a runnable quickstart and adoption guide.

Existing projects may receive additional findings for styling that earlier versions missed. The new configuration APIs remain experimental; this release stays on the `alpha` channel.

[compare changes](https://github.com/basteau/selfix/compare/e6f33ce...v0.1.0-alpha.1)

### 🚀 Enhancements

- **release:** Create GitHub releases from the changelog ([f6aec37](https://github.com/basteau/selfix/commit/f6aec37))
- **css:** Support application stylesheet aliases ([65907ab](https://github.com/basteau/selfix/commit/65907ab))
- **vue:** Inspect configured class props and slot maps ([0c024c8](https://github.com/basteau/selfix/commit/0c024c8))

### 🩹 Fixes

- **tailwind:** Recognize named color literals consistently ([8268a88](https://github.com/basteau/selfix/commit/8268a88))
- **vue:** Parse scope bindings and preserve source offsets ([d75fa06](https://github.com/basteau/selfix/commit/d75fa06))
- **vue:** Respect shadowed class helpers ([717309f](https://github.com/basteau/selfix/commit/717309f))
- **tailwind:** Inspect overlapping custom CSS ([8eac9f0](https://github.com/basteau/selfix/commit/8eac9f0))
- **tailwind:** Correct utility categories and rejection messages ([decc2bd](https://github.com/basteau/selfix/commit/decc2bd))
- **vue:** Separate slot content and owner scopes ([2b36318](https://github.com/basteau/selfix/commit/2b36318))
- **vue:** Support same-name class shorthand ([e0f7ac9](https://github.com/basteau/selfix/commit/e0f7ac9))
- **css:** Scan declaration boundaries safely ([7220480](https://github.com/basteau/selfix/commit/7220480))
- **colors:** Detect raw colors in composite values ([51ab736](https://github.com/basteau/selfix/commit/51ab736))
- **css:** Resolve package stylesheet exports ([9220374](https://github.com/basteau/selfix/commit/9220374))
- **vue:** Preserve independent findings after collection issues ([547c4ff](https://github.com/basteau/selfix/commit/547c4ff))

### 💅 Refactors

- **test:** Trim release test scaffolding ([3ad5f87](https://github.com/basteau/selfix/commit/3ad5f87))
- **cli:** Keep a single executable entry point ([19daf84](https://github.com/basteau/selfix/commit/19daf84))
- **build:** Prepare package docs only when packing ([582e4fa](https://github.com/basteau/selfix/commit/582e4fa))
- **vue:** Parse scripts once and simplify aliases ([7cd24fc](https://github.com/basteau/selfix/commit/7cd24fc))
- **vue:** Use parser-provided AST types ([a4aa64c](https://github.com/basteau/selfix/commit/a4aa64c))
- **rules:** Consolidate class and category policies ([562f8b9](https://github.com/basteau/selfix/commit/562f8b9))
- **policy:** Prepare matchers once per linter ([965166b](https://github.com/basteau/selfix/commit/965166b))

### 📖 Documentation

- Move shadcn/lint acknowledgment to the introduction ([82cc330](https://github.com/basteau/selfix/commit/82cc330))
- **release:** Correct the next changelog baseline ([6330629](https://github.com/basteau/selfix/commit/6330629))
- Document setup policies and analysis boundaries ([96ba599](https://github.com/basteau/selfix/commit/96ba599))

### ✅ Tests

- **package:** Verify packed artifact in isolated consumer ([612e559](https://github.com/basteau/selfix/commit/612e559))

## v0.1.0-alpha.0

Initial experimental release for Vue 3 and Tailwind CSS 4: six design-system rules, component contracts, a standalone CLI, and a typed Node API. APIs and rules may change during prerelease.

### 🚀 Enhancements

- Enforce Vue design-system rules with selfix ([4daab89](https://github.com/basteau/selfix/commit/4daab89))
- **release:** Support alpha and beta channels ([6a623a6](https://github.com/basteau/selfix/commit/6a623a6))

### 🩹 Fixes

- **cli:** Make workspace command available on clean installs ([8309193](https://github.com/basteau/selfix/commit/8309193))

### 📖 Documentation

- Streamline the Vue-first README ([af4fd9f](https://github.com/basteau/selfix/commit/af4fd9f))

### 📦 Build

- **release:** Add guarded npm publishing workflow ([cb40218](https://github.com/basteau/selfix/commit/cb40218))

### ✅ Tests

- **playground:** Catch incorrect usage through the installed CLI ([31bc0d9](https://github.com/basteau/selfix/commit/31bc0d9))
