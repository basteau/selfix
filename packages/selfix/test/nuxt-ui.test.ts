import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs"
import path from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { createLinter, defineConfig, type Config } from "../src/index.js"
import { loadNuxtUi, readTheme } from "../src/nuxt-ui.js"
import { findEntry } from "../src/tailwind.js"
import { installNuxtUi } from "./nuxt-ui-fixture.js"

const dirs: string[] = []
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})

/** A project under the workspace, so "tailwindcss" resolves like in an application. */
function project(options: { nuxtUi?: boolean; buildDir?: string; css?: string | false } = {}) {
  const root = mkdtempSync(path.join(process.cwd(), ".selfix-test-"))
  dirs.push(root)
  if (options.nuxtUi !== false) installNuxtUi(root, options.buildDir)
  if (options.css !== false) {
    mkdirSync(path.join(root, "app/assets/css"), { recursive: true })
    writeFileSync(
      path.join(root, "app/assets/css/main.css"),
      options.css ?? '@import "tailwindcss";\n@import "@nuxt/ui";\n',
    )
  }
  return root
}
const template = (body: string) => `<template>\n${body}\n</template>`
const summary = (findings: { rule: string; className?: string; component?: string }[]) =>
  findings.map(({ rule, component, className }) => [rule, component, className].join(" ").trim())

describe("Nuxt UI discovery", () => {
  it("is absent without the package and refuses a build directory that has no package", () => {
    const root = project({ nuxtUi: false })
    expect(loadNuxtUi(root)).toBeUndefined()
    expect(() => loadNuxtUi(root, { buildDir: ".nuxt" })).toThrow("@nuxt/ui is not installed")
  })

  it("requires a prepared project when it depends on Nuxt UI or sets buildDir", () => {
    const root = project()
    rmSync(path.join(root, ".nuxt/ui.css"))
    // A hoisted package above a project that does not list it is not that project's.
    expect(loadNuxtUi(root)).toBeUndefined()
    expect(() => loadNuxtUi(root, { buildDir: "elsewhere" })).toThrow(
      `Nuxt UI's generated theme (ui.css) is missing from elsewhere in ${root}. Run "nuxt prepare"`,
    )
    for (const field of ["dependencies", "devDependencies"]) {
      writeFileSync(
        path.join(root, "package.json"),
        JSON.stringify({ [field]: { "@nuxt/ui": "4" } }),
      )
      expect(() => loadNuxtUi(root)).toThrow(
        `missing from .nuxt and ${path.join("node_modules", ".nuxt-ui")} in ${root}. Run "nuxt prepare" (Nuxt) or build once with Vite (Vue), or set buildDir.`,
      )
    }
  })

  it("fails on generated themes it cannot read instead of leaving components unprotected", async () => {
    const root = project()
    writeFileSync(
      path.join(root, ".nuxt/ui/card.ts"),
      'export default { "slots": { "root": "" }, "variants": { "variant": { "solid": "" } } } as const',
    )
    writeFileSync(path.join(root, ".nuxt/ui/button.ts"), "export default defineTheme({})")
    const linter = await createLinter({ root })
    expect(summary(linter.lint(template('<UCard class="p-4" />')))).toEqual([
      "no-restyle UCard p-4",
    ])
    expect(() => linter.lint(template('<UButton class="p-4" />'))).toThrow(
      `Unable to read the generated Nuxt UI theme ${path.join(root, ".nuxt/ui/button.ts")}. selfix supports @nuxt/ui 4.`,
    )
    rmSync(path.join(root, ".nuxt/ui"), { recursive: true })
    await expect(createLinter({ root })).rejects.toThrow(
      `Nuxt UI's generated component themes are missing from ${path.join(root, ".nuxt/ui")}. Run "nuxt prepare"`,
    )
  })

  it.each([
    [undefined, "node_modules/.nuxt-ui", "vite.config.ts"],
    [undefined, ".nuxt", "app.config.ts"],
    ["generated", "generated", "app.config.ts"],
  ])("finds Nuxt, Vite, and configured build directories: %s %s", (dir, buildDir, themeConfig) => {
    const root = project({ buildDir })
    expect(loadNuxtUi(root, dir ? { buildDir: dir } : {})).toMatchObject({
      css: path.join(root, buildDir, "ui.css"),
      themeConfig,
    })
  })

  it("resolves registered tags, Lazy variants, and imports to themed components", () => {
    const nuxtUi = loadNuxtUi(project())!
    for (const tag of ["UButton", "u-button", "uButton", "LazyUButton", "lazy-u-button"])
      expect(nuxtUi.component(tag)).toMatchObject({ name: "Button", theme: { key: "button" } })
    expect(nuxtUi.component("UFormField")?.theme).toEqual({ key: "formField", variants: {} })
    // Generated filenames keep an acronym together.
    expect(nuxtUi.component("UPageCTA")?.theme).toEqual({
      key: "pageCTA",
      variants: { variant: ["solid"] },
    })
    for (const source of ["@nuxt/ui/components/Button.vue", "#ui/components/Button.vue"])
      expect(nuxtUi.component("Anything", source)?.name).toBe("Button")
    expect(nuxtUi.component("UButton", "#components")?.name).toBe("Button")
    expect(nuxtUi.component("Btn", "#components", "UButton")?.name).toBe("Button")
    // Components without a theme own no appearance: UIcon is styled by class.
    for (const tag of ["UIcon", "UColorModeButton"]) expect(nuxtUi.component(tag)).toBeUndefined()
    // A local import, an unknown name, prose, and other prefixes are not Nuxt UI components.
    expect(nuxtUi.component("UButton", "./MyButton.vue")).toBeUndefined()
    expect(nuxtUi.component("UButton", "#components", "Other")).toBeUndefined()
    for (const tag of ["UNope", "UH1", "Button", "LazyButton", "Ubutton", "ui-button"])
      expect(nuxtUi.component(tag)).toBeUndefined()
    expect(nuxtUi.tag("Button")).toBe("UButton")
    expect(nuxtUi.tag("Icon")).toBe("UIcon")
    expect(nuxtUi.tag("InputDate")).toBeUndefined()
  })

  it("honors a configured prefix", () => {
    const nuxtUi = loadNuxtUi(project(), { prefix: "Ui" })!
    expect(nuxtUi.component("UiButton")?.name).toBe("Button")
    expect(nuxtUi.component("lazy-ui-button")?.name).toBe("Button")
    expect(nuxtUi.component("UButton")).toBeUndefined()
    expect(nuxtUi.tag("Card")).toBe("UiCard")
  })

  it("reads variant choices from a generated theme without evaluating it", () => {
    expect(
      readTheme(
        `const color = ["primary"] as const
         throw new Error("never run")
         export default {
           "slots": { "base": "p-2", label: ["truncate"], [computed]: "", ...rest },
           "variants": { "color": { "primary": "" }, "square": { "true": "" }, "broken": 1 },
           "defaultVariants": { "color": "primary" as typeof color[number] }
         }`,
        "button",
      ),
    ).toEqual({
      key: "button",
      variants: { color: ["primary"], square: ["true"], broken: [] },
    })
    expect(readTheme('export default { "base": "w-full" }', "container")).toEqual({
      key: "container",
      variants: {},
    })
    for (const source of ["export default {", "export default theme", "const theme = {}"])
      expect(readTheme(source, "button")).toBeUndefined()
  })
})

describe("linting a Nuxt UI project", () => {
  it("needs no configuration: it finds the stylesheet, the theme, and the components", async () => {
    const root = project()
    const linter = await createLinter({ root })
    expect(linter.nuxtUi).toBe(true)
    const source = template(
      `<UButton class="p-4 mt-2" :ui="{ leadingIcon: 'text-lg', base: 'w-full' }" />
<LazyUCard class="rounded-xl" />
<u-form-field class="font-bold" />
<UIcon name="i-lucide-x" class="size-5 text-primary" />
<AppButton class="p-4" />`,
    )
    expect(linter.lint(source, "Page.vue")).toEqual([
      {
        file: "Page.vue",
        rule: "no-restyle",
        severity: "error",
        component: "UButton",
        className: "p-4",
        line: 2,
        column: 10,
        offset: source.indexOf("class="),
        message:
          '"p-4" is not allowed on <UButton>: the component owns its spacing. Use size (xs, sm, md, lg, xl), or restyle it for the whole app under ui.button in app.config.ts.',
      },
      {
        file: "Page.vue",
        rule: "no-restyle",
        severity: "error",
        component: "UButton",
        className: "text-lg",
        prop: "ui",
        slot: "leadingIcon",
        line: 2,
        column: 27,
        offset: source.indexOf(":ui"),
        message:
          '"text-lg" is not allowed on <UButton>: the component owns its typography. Use size (xs, sm, md, lg, xl), or restyle it for the whole app under ui.button in app.config.ts. In ui.leadingIcon.',
      },
      expect.objectContaining({
        component: "LazyUCard",
        className: "rounded-xl",
        message:
          '"rounded-xl" is not allowed on <LazyUCard>: the component owns its shape. Use variant (solid, outline, soft, subtle), or restyle it for the whole app under ui.card in app.config.ts.',
      }),
      expect.objectContaining({
        component: "u-form-field",
        className: "font-bold",
        message:
          '"font-bold" is not allowed on <u-form-field>: the component owns its typography. Restyle it for the whole app under ui.formField in app.config.ts.',
      }),
    ])
  })

  it("names both color props for a color restyle", async () => {
    const linter = await createLinter({ root: project() })
    expect(linter.lint(template('<UButton class="bg-error" />'))[0].message).toBe(
      '"bg-error" is not allowed on <UButton>: the component owns its color. Use color (primary, secondary, success, info, warning, error, neutral) or variant (solid, outline, soft, subtle, ghost, link), or restyle it for the whole app under ui.button in app.config.ts.',
    )
  })

  it("accepts Nuxt UI's colors, including its neutral alias, and suggests them for raw ones", async () => {
    const linter = await createLinter({ root: project() })
    expect(
      linter.lint(
        template(
          '<div class="text-muted bg-elevated border-default text-primary bg-primary-500 text-neutral-500 hover:bg-error/50" />',
        ),
      ),
    ).toEqual([])
    expect(
      linter
        .lint(template('<div class="text-gray-500 dark:bg-black border-neutral-200" />'))
        .map(({ rule, message }) => `${rule}: ${message}`),
    ).toEqual([
      'no-raw-colors: Replace "text-gray-500" with a theme color such as text-dimmed, text-muted, text-toned, text-default, text-highlighted, text-inverted, text-primary, text-secondary.',
      'no-raw-colors: Replace "dark:bg-black" with a theme color such as bg-default, bg-muted, bg-elevated, bg-accented, bg-inverted, bg-primary, bg-secondary, bg-success.',
      // Only the shades Nuxt UI declares are its aliases.
      'no-raw-colors: Replace "border-neutral-200" with a theme color such as border-default, border-muted, border-accented, border-inverted, border-primary, border-secondary, border-success, border-info.',
    ])
  })

  it("suggests the theme's own class for a misspelled Nuxt UI token", async () => {
    const linter = await createLinter({ root: project() })
    expect(
      linter
        .lint(template('<div class="bg-elevted hover:text-mutd flx qqqqqqqq sm" />'))
        .map(({ className, suggestions }) => [className, suggestions]),
    ).toEqual([
      ["bg-elevted", ["bg-elevated"]],
      ["hover:text-mutd", ["hover:text-muted"]],
      ["flx", ["flex"]],
      ["qqqqqqqq", undefined],
      ["sm", undefined],
    ])
  })

  it("prefers Nuxt UI components over the native elements they replace", async () => {
    const linter = await createLinter({ root: project() })
    const source = template(
      `<button type="submit">Save</button>
<input /><input type="checkbox" /><input type="NUMBER" /><input type="date" />
<input type="hidden" /><input type="image" /><input :type="kind" />
<select /><textarea /><hr /><dialog />
<kbd>K</kbd><a href="/">Home</a><div v-pre><button /></div>`,
    )
    const findings = linter.lint(source, "Page.vue")
    expect(findings.map(({ rule }) => rule)).toEqual(findings.map(() => "prefer-ui-components"))
    expect(findings.map(({ component, line, message }) => [line, component, message])).toEqual([
      [2, "button", "Use <UButton> instead of a native <button>, so it follows the design system."],
      [3, "input", "Use <UInput> instead of a native <input>, so it follows the design system."],
      [3, "input", "Use <UCheckbox> instead of a native <input>, so it follows the design system."],
      [
        3,
        "input",
        "Use <UInputNumber> instead of a native <input>, so it follows the design system.",
      ],
      // This version ships no UInputDate, so the general input is the answer.
      [3, "input", "Use <UInput> instead of a native <input>, so it follows the design system."],
      [4, "input", "Use <UInput> instead of a native <input>, so it follows the design system."],
      [5, "select", "Use <USelect> instead of a native <select>, so it follows the design system."],
      [
        5,
        "textarea",
        "Use <UTextarea> instead of a native <textarea>, so it follows the design system.",
      ],
      [5, "hr", "Use <USeparator> instead of a native <hr>, so it follows the design system."],
      [5, "dialog", "Use <UModal> instead of a native <dialog>, so it follows the design system."],
      // The fixture ships no UKbd; anchors are not replaced by default.
      [6, "button", "Use <UButton> instead of a native <button>, so it follows the design system."],
    ])
    expect(findings[0]).toMatchObject({ column: 1, offset: source.indexOf("<button") })
  })

  it("lets a project extend, exempt, and scope native replacements", async () => {
    const config = defineConfig({
      rules: {
        "prefer-ui-components": [
          "warn",
          { elements: { a: "ULink", hr: false, input: "AppInput" } },
        ],
      },
      overrides: [
        { files: ["components/**"], rules: { "prefer-ui-components": "off" } },
        {
          files: ["pages/Strict.vue"],
          rules: { "prefer-ui-components": ["error", { elements: { hr: "USeparator" } }] },
        },
      ],
    })
    const linter = await createLinter({ root: project(), config })
    const source = template(
      '<a href="/" /><hr /><input type="checkbox" /><input type="hidden" /><button />',
    )
    expect(
      linter.lint(source, "pages/Home.vue").map(({ severity, message }) => [severity, message]),
    ).toEqual([
      ["warn", "Use <ULink> instead of a native <a>, so it follows the design system."],
      ["warn", "Use <AppInput> instead of a native <input>, so it follows the design system."],
      ["warn", "Use <UButton> instead of a native <button>, so it follows the design system."],
    ])
    expect(linter.lint(source, "components/AppButton.vue")).toEqual([])
    // A supplied map replaces the base map as a unit; the defaults still apply.
    expect(summary(linter.lint(source, "pages/Strict.vue"))).toEqual([
      "prefer-ui-components hr",
      "prefer-ui-components input",
      "prefer-ui-components button",
    ])
  })

  it("applies one contract to every spelling of a component and protects named ones", async () => {
    const config: Config = {
      components: ["^App[A-Z]"],
      rules: {
        "no-restyle": [
          "error",
          { contracts: [{ pattern: "^UCard$", allow: ["layout", "spacing"] }] },
        ],
      },
    }
    const linter = await createLinter({ root: project(), config })
    expect(
      summary(
        linter.lint(
          template(
            `<UCard class="p-0 shadow-lg" :ui="{ body: 'p-0' }" /><u-card class="p-0" /><LazyUCard class="p-0" />
<AppPanel class="p-4" :ui="{ root: 'font-bold' }" /><app-panel class="p-4" /><appPanel class="p-4" /><Application class="p-4" />
<LazyAppPanel class="p-4" /><lazy-app-panel class="p-4" />`,
          ),
        ),
      ),
    ).toEqual([
      "no-restyle UCard shadow-lg",
      "no-restyle AppPanel p-4",
      "no-restyle AppPanel font-bold",
      "no-restyle app-panel p-4",
      "no-restyle appPanel p-4",
      "no-restyle LazyAppPanel p-4",
      "no-restyle lazy-app-panel p-4",
    ])
  })

  it("reads ui on protected components only, and reports a ui value it cannot read", async () => {
    const linter = await createLinter({ root: project(), config: { components: ["^AppCard$"] } })
    const source = template(
      `<AppCard :ui="{ base: 'text-gray-500' }" />
<UButton ui="p-4" /><UButton :ui="slots" /><UButton :ui="{ ...more, [key]: 'p-4' }" />
<div ui="p-4" :ui="{ base: 'bg-black' }" />
<MyChart :ui="{ theme: 'compact' }" /><MyChart :ui="chartUi" /><UIcon ui="compact" />`,
    )
    expect(
      linter.lint(source).map(({ rule, line, component, slot }) => [rule, line, component, slot]),
    ).toEqual([
      ["no-raw-colors", 2, "AppCard", "base"],
      ["no-restyle", 2, "AppCard", "base"],
      ["require-static-classes", 3, "UButton", undefined],
      ["require-static-classes", 3, "UButton", undefined],
      ["require-static-classes", 3, "UButton", undefined],
    ])
  })

  it("honors the prefix and build directory options", async () => {
    const root = project({ buildDir: "build" })
    const linter = await createLinter({ root, config: { prefix: "Ui", buildDir: "build" } })
    expect(
      summary(linter.lint(template('<UiButton class="p-4" /><UButton class="p-4" /><hr />'))),
    ).toEqual(["no-restyle UiButton p-4", "prefer-ui-components hr"])
    expect(linter.lint(template("<hr />"))[0].message).toContain("<UiSeparator>")
  })
})

describe("stylesheet and project loading", () => {
  it("follows imports of Nuxt UI components under a local name", async () => {
    const linter = await createLinter({ root: project() })
    const source = `<script setup>
import { UButton as Btn, UCard } from "#components"
import Direct from "#ui/components/Button.vue"
import UModal from "./Modal.vue"
</script>
<template><Btn class="p-4" /><UCard class="p-4" /><Direct class="p-4" /><UModal class="p-4" /></template>`
    expect(summary(linter.lint(source))).toEqual([
      "no-restyle Btn p-4",
      "no-restyle UCard p-4",
      "no-restyle Direct p-4",
    ])
  })

  it("never treats a native element as one of the project's components", async () => {
    const linter = await createLinter({ root: project(), config: { components: ["utt", "."] } })
    expect(
      summary(
        linter.lint(
          template(
            `<button class="p-4" :ui="{ base: 'p-4' }" /><div class="p-4" /><Shutter class="p-4" />`,
          ),
        ),
      ),
    ).toEqual(["prefer-ui-components button", "no-restyle Shutter p-4"])
  })

  it("applies an inline-style contract under the registered name of a renamed import", async () => {
    const linter = await createLinter({
      root: project(),
      config: {
        rules: {
          "no-inline-styles": [
            "error",
            { contracts: [{ pattern: "^UButton$", allow: ["style"] }] },
          ],
        },
      },
    })
    const source = `<script setup>import B from "@nuxt/ui/components/Button.vue"</script>
<template><B style="top: 0" /><UButton :style="{ top: 0 }" /><u-button v-bind="{ style: 'top: 0' }" /><UCard style="top: 0" /></template>`
    expect(summary(linter.lint(source))).toEqual(["no-inline-styles UCard"])
  })

  it("keeps the Tailwind prefix on theme color suggestions", async () => {
    const root = project({ css: '@import "tailwindcss" prefix(tw);\n@import "@nuxt/ui";\n' })
    const linter = await createLinter({ root })
    expect(linter.lint(template('<p class="tw:text-red-500 tw:text-muted" />'))[0]?.message).toBe(
      'Replace "tw:text-red-500" with a theme color such as tw:text-dimmed, tw:text-muted, tw:text-toned, tw:text-default, tw:text-highlighted, tw:text-inverted, tw:text-primary, tw:text-secondary.',
    )
  })

  it("names the Vite plugin options in a Vue project", async () => {
    const linter = await createLinter({ root: project({ buildDir: "node_modules/.nuxt-ui" }) })
    expect(linter.lint(template('<UButton class="p-4" />'))[0].message).toContain(
      "or restyle it for the whole app under ui.button in vite.config.ts.",
    )
  })

  it("ignores a hoisted package in a project that does not use Nuxt UI", async () => {
    const root = project({ css: '@import "tailwindcss";' })
    rmSync(path.join(root, ".nuxt"), { recursive: true })
    const linter = await createLinter({ root })
    expect(linter.nuxtUi).toBe(false)
    expect(linter.lint(template('<UButton class="p-4" /><button />'))).toEqual([])
    // The same project is unprepared once it lists Nuxt UI, whatever its stylesheet imports.
    writeFileSync(path.join(root, "package.json"), '{"dependencies":{"@nuxt/ui":"^4.0.0"}}')
    await expect(createLinter({ root })).rejects.toThrow("nuxt prepare")
  })

  it("detects the Tailwind entry by its imports, outside comments", async () => {
    const root = project({ css: false })
    const write = (file: string, css: string) => writeFileSync(path.join(root, file), css)
    write("old.css", '/* @import "tailwindcss"; */\n.old { margin: 0 }')
    write("plain.css", '@import "./old.css";')
    expect(() => findEntry(root)).toThrow("No stylesheet importing")
    for (const entry of [
      '@import"tailwindcss";',
      "@import url('tailwindcss');",
      '@import "tailwindcss" prefix(tw);',
    ]) {
      write("entry.css", entry)
      expect(findEntry(root)).toBe(path.join(root, "entry.css"))
    }
    // Tailwind's split setup counts too: its parts are imported one by one.
    write(
      "entry.css",
      '@layer theme, base, components, utilities;\n@import "tailwindcss/theme.css" layer(theme);\n@import "tailwindcss/utilities.css" layer(utilities);\n.split { margin: 0 }',
    )
    const linter = await createLinter({ root })
    expect(summary(linter.lint(template('<div class="split mt-4 old" />')))).toEqual([
      "no-unknown-classes div old",
    ])
  })

  it("skips stylesheet links it cannot read while looking for the entry", async () => {
    const root = project()
    symlinkSync(path.join(root, "missing.css"), path.join(root, "app/broken.css"))
    await expect(createLinter({ root })).resolves.toMatchObject({ nuxtUi: true })
  })

  it("fails when the generated theme is missing, naming the fix", async () => {
    const root = project()
    rmSync(path.join(root, ".nuxt/ui.css"))
    await expect(createLinter({ root })).rejects.toThrow("nuxt prepare")
  })

  it("requires exactly one Tailwind entry unless css names it", async () => {
    const root = project({ css: false })
    await expect(createLinter({ root })).rejects.toThrow(
      `No stylesheet importing "tailwindcss" was found in ${root}. Set css in selfix.config.ts.`,
    )
    for (const file of ["b.css", "nested/a.css"]) {
      mkdirSync(path.dirname(path.join(root, file)), { recursive: true })
      writeFileSync(
        path.join(root, file),
        "@import 'tailwindcss';\n.from-" + file[0] + " { margin: 0 }",
      )
    }
    writeFileSync(path.join(root, "plain.css"), ".plain { margin: 0 }")
    await expect(createLinter({ root })).rejects.toThrow(
      `Several stylesheets import "tailwindcss" (${path.join(root, "b.css")}, ${path.join(root, "nested/a.css")}). Choose one with css in selfix.config.ts.`,
    )
    const linter = await createLinter({ root, config: { css: "nested/a.css" } })
    expect(summary(linter.lint(template('<div class="from-n from-b" />')))).toEqual([
      "no-unknown-classes div from-b",
    ])
    await expect(createLinter({ root, config: { css: "missing.css" } })).rejects.toThrow(
      `Unable to read the Tailwind CSS entry ${path.join(root, "missing.css")}`,
    )
  })

  it("lints against supplied stylesheet source, resolving imports from cssBase", async () => {
    const root = project()
    writeFileSync(path.join(root, "app/tokens.css"), ".token { margin: 0 }")
    const linter = await createLinter({
      root,
      css: '@import "tailwindcss"; @import "@nuxt/ui"; @import "./tokens.css";',
      cssBase: "app",
    })
    expect(linter.lint(template('<div class="token text-muted" />'))).toEqual([])
    await expect(
      createLinter({ root, css: '@import "./tokens.css";', cssBase: "" }),
    ).rejects.toThrow("cssBase must be a non-empty directory path")
  })

  it("works without Nuxt UI, protecting only the components a project names", async () => {
    const root = project({ nuxtUi: false, css: '@import "tailwindcss";' })
    const linter = await createLinter({ root, config: { components: ["^Button$"] } })
    expect(linter.nuxtUi).toBe(false)
    expect(
      summary(
        linter.lint(
          template(
            '<UButton class="p-4" /><Button class="p-4" /><button /><div class="text-muted" />',
          ),
        ),
      ),
    ).toEqual(["no-restyle Button p-4", "no-unknown-classes div text-muted"])
  })
})
