import { describe, expect, it } from "vitest"
import { createLinter, defineConfig, ruleNames, type Config, type RuleName } from "../src/index.js"

const css = '@import "tailwindcss"; @theme { --color-primary: #124578; }'
function only(name: RuleName, options = {}) {
  return Object.fromEntries(
    ruleNames.map((rule) => [rule, rule === name ? ["error", options] : "off"]),
  ) as Config["rules"]
}
const button = (attrs: string) =>
  `<script setup>import { Button } from '@/components/ui/button'</script>\n<template><Button ${attrs} /></template>`

describe("design-system rules", () => {
  it("enforces all six rules on Vue", async () => {
    const linter = await createLinter({ css })
    const result = linter.lint(
      button(
        'class="p-[13px] bg-red-500 rounded-huge" :class="`text-${size}`" style="padding: 1px"',
      ),
      "Page.vue",
    )
    expect(new Set(result.map((item) => item.rule))).toEqual(new Set(ruleNames))
    expect(
      result.every((item) => item.line === 2 && item.column > 1 && item.file === "Page.vue"),
    ).toBe(true)
  })
  it("reports raw colors after quoted and escaped variant delimiters", async () => {
    const linter = await createLinter({ css, config: { rules: only("no-raw-colors") } })
    const tokens = [
      "[&[data-x='(']]:bg-[red]",
      '[&[data-x=")"]]:bg-[red]',
      "[&[data-x='[']]:bg-[red]",
      '[&[data-x="]"]]:bg-[red]',
      String.raw`[&.foo\(]:bg-[red]`,
      String.raw`[&.foo\)]:bg-[red]`,
      String.raw`[&.foo\[]:bg-[red]`,
      String.raw`[&.foo\]]:bg-[red]`,
    ]
    const classes = [...tokens, "[&[data-x='(']]:bg-primary"]
      .join(" ")
      .replaceAll("&", "&amp;")
      .replaceAll('"', "&quot;")
    expect(
      linter.lint(`<template><div class="${classes}" /></template>`).map((item) => item.className),
    ).toEqual(tokens)
  })
  it("allows layout while rejecting component appearance", async () => {
    const linter = await createLinter({ css, config: { rules: only("no-restyle") } })
    expect(linter.lint(button('class="mt-4 w-full"'))).toEqual([])
    expect(
      linter.lint(button('class="p-4 hover:rounded-full"')).map((item) => item.className),
    ).toEqual(["p-4", "hover:rounded-full"])
    expect(linter.lint('<template><div class="p-4" /></template>')).toEqual([])
  })
  it.each([
    [{}, true],
    [{ allow: [] }, true],
    [{ allow: ["layout"] }, true],
    [{ allow: ["color"] }, true],
    [{ allow: ["layout", "color"] }, false],
    [{ allow: ["card-title"] }, false],
    [{ allow: ["card-*"] }, false],
    [{ allow: ["*"], deny: ["color"] }, true],
    [{ allow: ["layout", "color"], deny: ["card-*"] }, true],
  ])("requires every mixed category unless the token is allowed: %j", async (options, rejected) => {
    const linter = await createLinter({
      css: `${css} .card-title { color: var(--color-primary); margin: 1rem; }`,
      config: { rules: only("no-restyle", options) },
    })
    const result = linter.lint(button('class="card-title"'))
    expect(result).toHaveLength(rejected ? 1 : 0)
    if (rejected) expect(result[0].message).toContain("owns its color")
  })
  it("normalizes variants and markers but matches colon patterns against the full token", async () => {
    const linter = await createLinter({
      css,
      config: {
        rules: only("no-restyle", {
          allow: ["mt-4", "bg-*", "hover:!p-4", "[color:var(--color-primary)]"],
          deny: ["focus:bg-*"],
        }),
      },
    })
    const tokens = [
      "[&:not(:hover)]:!-mt-4",
      "hover:-mt-4!",
      "hover:bg-(color:--color-primary)",
      "hover:!p-4",
      "focus:!p-4",
      "hover:p-4!",
      "[color:var(--color-primary)]",
      "hover:[color:var(--color-primary)]",
      "focus:bg-(color:--color-primary)",
    ]
    expect(
      linter.lint(button(`class="${tokens.join(" ")}"`)).map((item) => item.className),
    ).toEqual([
      "focus:!p-4",
      "hover:p-4!",
      "hover:[color:var(--color-primary)]",
      "focus:bg-(color:--color-primary)",
    ])
  })
  it("supports first matching contracts, inherited options, deny precedence and messages", async () => {
    const config = defineConfig({
      note: "See DESIGN.md.",
      rules: only("no-restyle", {
        allow: ["layout"],
        contracts: [
          {
            pattern: "^Button$",
            allow: ["spacing", "w-full"],
            deny: ["px-*"],
            message: "{{className}} violates {{component}} {{category}} in {{file}}.",
          },
          { pattern: ".*", allow: ["*"] },
        ],
      }),
    })
    const linter = await createLinter({ css, config })
    const result = linter.lint(button('class="p-4 w-full px-2 mt-4"'), "Page.vue")
    expect(result.map((item) => item.className)).toEqual(["px-2", "mt-4"])
    expect(result[0].message).toBe("px-2 violates Button spacing in Page.vue. See DESIGN.md.")
  })
  it("recognizes configured imports and global components and honors exclusions", async () => {
    const linter = await createLinter({
      css,
      config: {
        ui: ["@acme/ui"],
        components: ["^GlobalButton$"],
        ignoreImports: ["/internal$"],
        rules: only("no-restyle"),
      },
    })
    expect(linter.lint('<template><GlobalButton class="p-4" /></template>')).toHaveLength(1)
    expect(
      linter.lint(
        '<script setup>import Button from "@acme/uix"</script><template><Button class="p-4" /></template>',
      ),
    ).toEqual([])
    expect(
      linter.lint(
        '<script setup>import Button from "@acme/ui/internal"</script><template><Button class="p-4" /></template>',
      ),
    ).toEqual([])
  })
  it("exempts vocabulary classes but deny still wins", async () => {
    const linter = await createLinter({
      css,
      config: { rules: only("no-arbitrary-values", { allow: ["p-*"], deny: ["p-[13px]"] }) },
    })
    const result = linter.lint(
      '<template><div class="p-[12px] p-[13px] hover:p-[14px] [&amp;>span]:mt-4 bg-(--primary)" /></template>',
    )
    expect(result.map((item) => item.className)).toEqual(["p-[13px]"])
  })
  it("checks native element classes and ignores arbitrary variants", async () => {
    const linter = await createLinter({ css, config: { rules: only("no-arbitrary-values") } })
    expect(
      linter.lint('<template><div class="[&amp;>span]:mt-4 p-(--space)" /></template>'),
    ).toEqual([])
    expect(
      linter.lint('<template><div class="hover:p-[13px] [color:red]" /></template>'),
    ).toHaveLength(2)
  })
  it("uses warning severities and reports parse failures even with rules disabled", async () => {
    const linter = await createLinter({
      css,
      config: { rules: { ...only("no-arbitrary-values"), "no-arbitrary-values": "warn" } },
    })
    expect(linter.lint('<template><div class="p-[13px]" /></template>')[0].severity).toBe("warn")
    expect(linter.lint("<template><div></template>")[0].rule).toBe("parse-error")
  })
  it("detects arbitrary opacity and line-height modifiers", async () => {
    const linter = await createLinter({ css, config: { rules: only("no-arbitrary-values") } })
    const result = linter.lint(
      '<template><div class="text-sm/[17px] bg-red-500/[0.37] [&amp;>span]:mt-4 text-sm/(--leading)" /></template>',
    )
    expect(result.map((item) => item.className)).toEqual(["text-sm/[17px]", "bg-red-500/[0.37]"])
  })
  it("rejects bad configuration before linting", () => {
    expect(() => defineConfig({ rules: { typo: "error" } } as Config)).toThrow("Unknown rule")
    expect(() =>
      defineConfig({ rules: only("no-restyle", { contracts: [{ pattern: "[" }] }) }),
    ).toThrow("Invalid regular expression")
    expect(() => defineConfig({ rules: only("no-restyle", { message: "{{missing}}" }) })).toThrow(
      "Unknown message placeholder",
    )
    expect(() => defineConfig({ ui: "invalid" } as unknown as Config)).toThrow("array")
    expect(() => defineConfig({ rules: only("require-static-classes", { allow: ["*"] }) })).toThrow(
      "not allow/deny",
    )
  })
})
