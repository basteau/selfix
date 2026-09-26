import { expect, it } from "vitest"
import { createLinter, ruleNames, type Config } from "../src/index.js"
import { declarationSignature, themeUtility } from "../src/tailwind.js"

const css = '@import "tailwindcss"; @theme { --color-primary: #124578; }'
const rules = Object.fromEntries(
  ruleNames.map((name) => [name, name === "no-unknown-classes" ? "error" : "off"]),
) as Config["rules"]

it("suggests a complete compiler-validated utility without moving the diagnostic", async () => {
  const linter = await createLinter({ css, config: { rules } })
  const source = '<template><div class="flex-cols" /></template>'
  expect(linter.lint(source, "Example.vue")).toEqual([
    expect.objectContaining({
      file: "Example.vue",
      rule: "no-unknown-classes",
      className: "flex-cols",
      suggestions: ["flex-col"],
      offset: 15,
      line: 1,
      column: 16,
    }),
  ])
})

it.each([
  ["hovr:flex", "hover:flex"],
  ["hover:!flex-cols", "hover:!flex-col"],
  ["focus:flex-cols!", "focus:flex-col!"],
  ["-translat-x-4", "-translate-x-4"],
  ["bg-primray/50", "bg-primary/50"],
  ["group-hovr/menu:flex", "group-hover/menu:flex"],
])("preserves complete token syntax for %s", async (token, expected) => {
  const linter = await createLinter({ css, config: { rules } })
  expect(linter.lint(`<template><div class="${token}" /></template>`)[0]).toMatchObject({
    suggestions: [expected],
  })
})

it("preserves the configured prefix and uses custom variant vocabulary", async () => {
  const linter = await createLinter({
    css: '@import "tailwindcss" prefix(tw); @custom-variant hocus (&:hover, &:focus);',
    config: { rules },
  })
  expect(linter.lint('<template><div class="tw:hocsu:flex!" /></template>')[0]).toMatchObject({
    suggestions: ["tw:hocus:flex!"],
  })
})

it("filters suggestions through enabled policies, contracts, and file overrides", async () => {
  const linter = await createLinter({
    css,
    config: {
      components: ["^Button$"],
      rules: {
        ...rules,
        "no-restyle": ["error", { contracts: [{ pattern: "^Button$", allow: [] }] }],
        "no-raw-colors": "warn",
      },
      overrides: [
        {
          files: ["Blocked.vue"],
          rules: { "no-unknown-classes": ["error", { deny: ["flex-col"] }] },
        },
      ],
    },
  })
  expect(
    linter.lint('<template><div class="flex-cols" /></template>', "Allowed.vue")[0].suggestions,
  ).toEqual(["flex-col"])
  for (const [component, token, file] of [
    ["Button", "flex-cols", "Allowed.vue"],
    ["div", "bg-rde-500", "Allowed.vue"],
    ["div", "flex-cols", "Blocked.vue"],
  ]) {
    const findings = linter.lint(`<template><${component} class="${token}" /></template>`, file)
    const finding = findings.find((item) => item.rule === "no-unknown-classes")!
    expect(finding).toBeDefined()
    expect(finding).not.toHaveProperty("suggestions")
  }
})

it("keeps ambiguous, unsupported, and invalid corrections as ordinary diagnostics", async () => {
  const linter = await createLinter({
    css: css + " @utility task-cat { display: flex; } @utility task-car { display: grid; }",
    config: { rules },
  })
  for (const token of [
    "task-cap",
    "hovr:flex-cols",
    "bg-primray/nonsense",
    "-flex-cols",
    "bg-[reed]x",
    "totally-unrelated",
  ]) {
    const findings = linter.lint(`<template><div class="${token}" /></template>`)
    expect(findings).toHaveLength(1)
    expect(findings[0]).toMatchObject({ rule: "no-unknown-classes", className: token })
    expect(findings[0]).not.toHaveProperty("suggestions")
  }
  expect(linter.lint('<template><div class="flex-col hover:flex" /></template>')).toEqual([])
})

it("uses each loaded theme's vocabulary without leaking between linters", async () => {
  const custom = await createLinter({
    css: css + " @utility task-unique { display: flex; }",
    config: { rules },
  })
  const ordinary = await createLinter({ css, config: { rules } })
  const source = '<template><div class="task-uniqu" /></template>'
  expect(custom.lint(source)[0].suggestions).toEqual(["task-unique"])
  expect(ordinary.lint(source)[0]).not.toHaveProperty("suggestions")
  expect(custom.lint(source)).toEqual(custom.lint(source))
})

it("honors rule allowances and disabled rules without suppressing independent findings", async () => {
  const source = '<template><div class="bg-rde-500 flex-cols" /></template>'
  for (const setting of ["off", ["error", { allow: ["bg-red-500"] }]] satisfies NonNullable<
    Config["rules"]
  >["no-raw-colors"][]) {
    const linter = await createLinter({
      css,
      config: { rules: { ...rules, "no-raw-colors": setting } },
    })
    expect(
      linter.lint(source).map(({ className, suggestions }) => ({ className, suggestions })),
    ).toEqual([
      { className: "bg-rde-500", suggestions: ["bg-red-500"] },
      { className: "flex-cols", suggestions: ["flex-col"] },
    ])
  }
})

it("preserves configured prop and slot metadata on spelling findings", async () => {
  const linter = await createLinter({
    css,
    config: { rules, classProps: [{ pattern: "^Button$", props: { ui: "slot-map" } }] },
  })
  const findings = linter.lint("<template><Button :ui=\"{base: 'flex-cols'}\" /></template>")
  expect(findings).toEqual([
    expect.objectContaining({ prop: "ui", slot: "base", suggestions: ["flex-col"] }),
  ])
})

it.each([
  ["p-[16px]", ["p-4"]],
  ["p-[1rem]", ["p-4"]],
  ["hover:p-[16px]", ["hover:p-4"]],
  ["bg-[#124578]", ["bg-primary"]],
  ["w-[100%]", ["w-full"]],
  ["hover:p-[16px]!", ["hover:p-4!"]],
])("suggests the theme utility with the same value for %s", async (token, expected) => {
  const linter = await createLinter({ css })
  const finding = linter
    .lint(`<template><div class="${token}" /></template>`)
    .find((item) => item.rule === "no-arbitrary-values")
  expect(finding?.suggestions).toEqual(expected)
})

it.each(["p-[13px]", "w-[1234px]", "bg-[var(--primary)]"])(
  "suggests nothing when %s has no named theme utility",
  async (token) => {
    const linter = await createLinter({ css })
    const [finding] = linter.lint(`<template><div class="${token}" /></template>`)
    expect(finding).toMatchObject({ rule: "no-arbitrary-values" })
    expect(finding?.suggestions).toBeUndefined()
  },
)

it("matches theme values after resolving variables and calc products", () => {
  const theme = new Map([
    ["--spacing", "0.25rem"],
    ["--color-primary", "#124578"],
  ])
  const sign = (value: string) => declarationSignature([{ property: "padding", value }], theme)
  expect(sign("calc(var(--spacing) * 4)")).toBe(sign("16px"))
  expect(sign("calc(var(--spacing) * 4)")).toBe(sign("1rem"))
  expect(sign("var(--color-primary)")).toBe(sign("#124578"))
  expect(sign("var(--missing)")).not.toBe(sign("16px"))
  expect(sign("var(--missing, 16px)")).not.toBe(sign("16px"))
  const signatures: Record<string, string> = {
    "p-[16px]": "a",
    "p-4": "a",
    "p-3": "b",
    "p-(--x)": "a",
  }
  const names = () => ["p-3", "p-4", "p-(--x)"]
  expect(themeUtility("md:p-[16px]!", names, (name) => signatures[name])).toBe("md:p-4!")
  expect(
    themeUtility(
      "p-[16px]",
      () => ["p-4", "p-four"],
      (name) => (name === "p-four" ? "a" : signatures[name]),
    ),
  ).toBeUndefined()
  expect(themeUtility("[padding:1rem]", names, () => "a")).toBeUndefined()
})

it("withholds a value suggestion that another enabled rule would report", async () => {
  const linter = await createLinter({ css })
  const [raw] = linter.lint('<template><div class="text-[#fff]" /></template>')
  expect(raw).toMatchObject({ rule: "no-arbitrary-values" })
  expect(raw?.suggestions).toBeUndefined()
  const button = linter.lint(
    '<script setup>import { Button } from "@/components/ui"</script><template><Button class="p-[16px]" /></template>',
  )
  expect(button.map((item) => [item.rule, item.suggestions])).toEqual([
    ["no-arbitrary-values", undefined],
    ["no-restyle", undefined],
  ])
})

it("keeps the theme prefix on a value suggestion", async () => {
  const linter = await createLinter({
    css: '@import "tailwindcss" prefix(tw); @theme { --color-primary: #124578; }',
  })
  const [finding] = linter.lint('<template><div class="tw:hover:p-[16px]" /></template>')
  expect(finding).toMatchObject({ rule: "no-arbitrary-values", suggestions: ["tw:hover:p-4"] })
})

it.each([
  ["-mt-[16px]", ["-mt-4"]],
  ["text-[14px]", undefined],
  ["p-[var(--gap,16px)]", undefined],
  ["z-[var(--z,10)]", undefined],
])("suggests %s only when the value is equivalent", async (token, expected) => {
  const linter = await createLinter({ css })
  const finding = linter
    .lint(`<template><div class="${token}" /></template>`)
    .find((item) => item.rule === "no-arbitrary-values")
  expect(finding?.suggestions).toEqual(expected)
})

it("reports arbitrary blur values whose siblings have empty custom properties", async () => {
  const linter = await createLinter({ css })
  for (const token of ["blur-[8px]", "blur-none"])
    expect(() => linter.lint(`<template><div class="${token}" /></template>`)).not.toThrow()
  expect(linter.lint('<template><div class="blur-[8px]" /></template>')).toEqual([
    expect.objectContaining({ rule: "no-arbitrary-values" }),
  ])
})
