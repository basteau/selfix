import { describe, expect, it } from "vitest"
import { collectVue } from "../src/vue.js"
import { createLinter, ruleNames, type Config } from "../src/index.js"

const css = '@import "tailwindcss"; @theme { --color-primary: #124578; }'
const rules = Object.fromEntries(
  ruleNames.map((rule) => [rule, rule === "no-raw-colors" ? "error" : "off"]),
) as Config["rules"]

describe("SVG colors", () => {
  it("reports native SVG literals at their original attributes alongside class colors", async () => {
    const linter = await createLinter({ css, config: { rules } })
    const source =
      '<template>\n<svg><path fill="#fff" :stroke="\'red\'" class="bg-red-500" /></svg>\n</template>'
    expect(linter.lint(source, "Icon.vue")).toEqual([
      expect.objectContaining({
        rule: "no-raw-colors",
        component: "path",
        prop: "fill",
        line: 2,
        column: 12,
        offset: 22,
      }),
      expect.objectContaining({
        rule: "no-raw-colors",
        component: "path",
        prop: "stroke",
        line: 2,
        column: 24,
        offset: 34,
      }),
      expect.objectContaining({ rule: "no-raw-colors", className: "bg-red-500" }),
    ])
    expect(linter.lint(source)[0]).not.toHaveProperty("className")
  })
  it.each([false, true])(
    "collects whole paint values with either Vue AST (fallback: %s)",
    (forceCompileTemplateAst) => {
      const source = `<template><svg><path fill="rgb(1 2 3)" :stroke="'var(--color-primary)'" /></svg></template>`
      expect(collectVue(source, "Icon.vue", { forceCompileTemplateAst }).svgColors).toEqual([
        { component: "path", prop: "fill", value: "rgb(1 2 3)", offset: 21 },
        { component: "path", prop: "stroke", value: "var(--color-primary)", offset: 39 },
      ])
    },
  )

  it("preserves semantic paints and reports stock variables and raw fallbacks", async () => {
    const linter = await createLinter({ css, config: { rules } })
    for (const value of [
      "currentColor",
      "none",
      "var(--color-primary)",
      "url(#gradient)",
      "url('#red')",
      "inherit",
      "context-fill",
    ]) {
      expect(linter.lint(`<template><svg fill="${value}" /></template>`), value).toEqual([])
    }
    for (const value of [
      "red",
      "#fff",
      "rgb(1 2 3)",
      "transparent",
      "var(--color-red-500)",
      "var(--color-primary, red)",
      "url(#gradient) red",
    ]) {
      expect(linter.lint(`<template><svg stroke="${value}" /></template>`), value).toEqual([
        expect.objectContaining({ rule: "no-raw-colors", prop: "stroke" }),
      ])
    }
  })

  it("keeps component props and HTML outside the SVG checks", async () => {
    const linter = await createLinter({ css, config: { rules } })
    expect(
      linter.lint(
        `<template><div fill="red" /><Chart fill="red" /><svg><Icon fill="red" /><foreignObject><div fill="red" /></foreignObject></svg></template>`,
      ),
    ).toEqual([])
  })

  it("never executes opaque bindings and preserves independent findings", async () => {
    const linter = await createLinter({ css, config: { rules } })
    const source = `<template><svg :fill="(() => { throw new Error('executed') })()" stroke="red" /></template>`
    expect(linter.lint(source)).toEqual([
      expect.objectContaining({ rule: "parse-error", prop: "fill", offset: 15 }),
      expect.objectContaining({ rule: "no-raw-colors", prop: "stroke" }),
    ])
    const disabled = await createLinter({
      css,
      config: { rules: { ...rules, "no-raw-colors": "off" } },
    })
    expect(disabled.lint(source)).toEqual([])
  })

  it("applies allow/deny to attribute names and the color category", async () => {
    const source = '<template><svg fill="red" stroke="red" /></template>'
    const allowed = await createLinter({
      css,
      config: { rules: { ...rules, "no-raw-colors": ["error", { allow: ["fill"] }] } },
    })
    expect(allowed.lint(source)).toEqual([expect.objectContaining({ prop: "stroke" })])
    const denied = await createLinter({
      css,
      config: {
        rules: { ...rules, "no-raw-colors": ["warn", { allow: ["color"], deny: ["stroke"] }] },
      },
    })
    expect(denied.lint('<template><svg fill="red" stroke="currentColor" /></template>')).toEqual([
      expect.objectContaining({
        rule: "no-raw-colors",
        severity: "warn",
        prop: "stroke",
        message: expect.stringContaining("denied"),
      }),
    ])
  })

  it("checks literal object bindings without treating paints as class lists", async () => {
    const linter = await createLinter({ css, config: { rules } })
    expect(
      linter.lint(`<template><svg v-bind="{ fill: 'rgb(1 2 3)', stroke: unknown }" /></template>`),
    ).toEqual([
      expect.objectContaining({ rule: "no-raw-colors", prop: "fill", offset: 15 }),
      expect.objectContaining({ rule: "parse-error", prop: "stroke", offset: 15 }),
    ])
    expect(
      linter.lint(`<template><svg :fill="null" :stroke="\`currentColor\`" /></template>`),
    ).toEqual([])
  })
})
