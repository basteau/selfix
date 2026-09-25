import { expect, it } from "vitest"
import { createLinter, ruleNames, type Config } from "../src/index.js"

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
