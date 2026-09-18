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
  it.each([
    ["leading-6", "typography"],
    ["ease-in", "motion"],
    ["rotate-45", "effects"],
  ])("allows %s through its category permission", async (token, category) => {
    const linter = await createLinter({
      css,
      config: { rules: only("no-restyle", { allow: [category] }) },
    })
    expect(linter.lint(button(`class="${token}"`))).toEqual([])
  })

  it.each([
    { allow: ["typography"], expected: "unknown" },
    { allow: [], expected: "typography" },
    { allow: ["*"], deny: ["unknown"], expected: "unknown" },
    { allow: [], deny: ["unknown", "typography"], expected: "typography" },
  ])("reports the blocked category for a mixed utility: %j", async ({ expected, ...options }) => {
    const linter = await createLinter({
      css: `${css} .mixed { tab-size: 4; line-height: 1.5; }`,
      config: {
        rules: only("no-restyle", {
          ...options,
          message: { typography: "blocked {{category}}", unknown: "unclassified {{category}}" },
        }),
      },
    })
    expect(linter.lint(button('class="mixed"'))).toEqual([
      expect.objectContaining({
        className: "mixed",
        message: expected === "unknown" ? "unclassified unknown" : "blocked typography",
      }),
    ])
  })

  it("names the disallowed category in the default rejection message", async () => {
    const linter = await createLinter({
      css: `${css} .mixed { line-height: 1.5; --tw-unrecognized: 1; }`,
      config: { rules: only("no-restyle", { allow: ["typography"] }) },
    })
    expect(linter.lint(button('class="mixed"'))).toEqual([
      expect.objectContaining({
        className: "mixed",
        message: expect.stringContaining("owns its unknown"),
      }),
    ])
  })

  it("keeps token deny precedence over category permissions", async () => {
    const linter = await createLinter({
      css,
      config: { rules: only("no-restyle", { allow: ["typography"], deny: ["leading-*"] }) },
    })
    expect(linter.lint(button('class="leading-6"'))).toEqual([
      expect.objectContaining({
        className: "leading-6",
        message: expect.stringContaining("denied"),
      }),
    ])
  })

  it.each(["no-restyle", "no-raw-colors"] as const)(
    "%s independently rejects custom colors overlapping a layout utility",
    async (rule) => {
      const linter = await createLinter({
        css: `${css} .mt-4 { color: red; }`,
        config: { rules: only(rule) },
      })
      expect(linter.lint(button('class="mt-4"'), "Overlap.vue")).toEqual([
        expect.objectContaining({
          rule,
          className: "mt-4",
          file: "Overlap.vue",
          line: 2,
          column: 19,
        }),
      ])
    },
  )

  it("reports shadowed helper calls at their original class attributes", async () => {
    const linter = await createLinter({ css, config: { rules: only("require-static-classes") } })
    const source = `<script setup>
function cn() { throw new Error('never run') }
</script>
<template>
  <div :class="cn('p-2')" />
  <Box v-slot="{ clsx }">
    <div :class="clsx('p-4')" />
  </Box>
  <div v-for="twMerge in rows" :class="twMerge('p-6')" />
  <div :class="clsx('m-2')" />
</template>`
    expect(linter.lint(source, "Helpers.vue")).toEqual([
      expect.objectContaining({
        rule: "require-static-classes",
        file: "Helpers.vue",
        line: 5,
        column: 8,
      }),
      expect.objectContaining({
        rule: "require-static-classes",
        file: "Helpers.vue",
        line: 7,
        column: 10,
      }),
      expect.objectContaining({
        rule: "require-static-classes",
        file: "Helpers.vue",
        line: 9,
        column: 32,
      }),
    ])
  })

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
    [{}, "color"],
    [{ allow: [] }, "layout"],
    [{ allow: ["layout"] }, "color"],
    [{ allow: ["color"] }, "layout"],
    [{ allow: ["layout", "color"] }, false],
    [{ allow: ["card-title"] }, false],
    [{ allow: ["card-*"] }, false],
    [{ allow: ["*"], deny: ["color"] }, "color"],
    [{ allow: ["layout", "color"], deny: ["card-*"] }, "color"],
  ])("requires every mixed category unless the token is allowed: %j", async (options, rejected) => {
    const linter = await createLinter({
      css: `${css} .card-title { color: var(--color-primary); margin: 1rem; }`,
      config: { rules: only("no-restyle", { ...options, message: "blocked {{category}}" }) },
    })
    const result = linter.lint(button('class="card-title"'))
    expect(result).toHaveLength(rejected ? 1 : 0)
    if (rejected) expect(result[0].message).toBe(`blocked ${rejected}`)
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
