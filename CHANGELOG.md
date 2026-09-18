# Changelog

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
