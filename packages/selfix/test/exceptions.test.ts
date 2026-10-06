import { spawnSync } from "node:child_process"
import { expect, it } from "vitest"
import { createLinter, type LinterConfig } from "../src/index.js"

const css = '@import "tailwindcss";'
const linterWith = (config: LinterConfig = {}) => createLinter({ css, config })
const rules = (diagnostics: { rule: string; line: number }[]) =>
  diagnostics.map(({ rule, line }) => [rule, line])

it("suppresses the named rule's findings on the next line and keeps the reason", async () => {
  const linter = await linterWith()
  const source = [
    "<template>",
    "  <!-- selfix-disable-next-line no-raw-colors -- partner brand color -->",
    '  <div class="bg-[#e30613]" />',
    '  <div class="bg-[#e30613]" />',
    "</template>",
  ].join("\n")
  const { diagnostics, suppressed } = linter.check(source, "Brand.vue")
  expect(rules(diagnostics)).toEqual([
    ["no-arbitrary-values", 3],
    ["no-arbitrary-values", 4],
    ["no-raw-colors", 4],
  ])
  expect(suppressed).toEqual([
    expect.objectContaining({
      rule: "no-raw-colors",
      line: 3,
      className: "bg-[#e30613]",
      reason: "partner brand color",
    }),
  ])
  expect(linter.lint(source, "Brand.vue")).toEqual(diagnostics)
})

it("suppresses several rules named in one comment", async () => {
  const linter = await linterWith()
  const source = [
    "<template>",
    "  <!-- selfix-disable-next-line no-raw-colors, no-arbitrary-values -- print palette -->",
    '  <div class="bg-[#e30613] madeup" />',
    "</template>",
  ].join("\n")
  const { diagnostics, suppressed } = linter.check(source, "Print.vue")
  expect(rules(diagnostics)).toEqual([["no-unknown-classes", 3]])
  expect(rules(suppressed)).toEqual([
    ["no-arbitrary-values", 3],
    ["no-raw-colors", 3],
  ])
})

it.each([
  [
    "selfix-disable-next-line no-raw-colors",
    'Exception comment needs a reason. Add "-- <reason>" after the rule names.',
  ],
  [
    "selfix-disable-next-line no-raw-colors --   ",
    'Exception comment needs a reason. Add "-- <reason>" after the rule names.',
  ],
  [
    "selfix-disable-next-line -- brand",
    'Exception comment names no rule. Write "selfix-disable-next-line <rule>[, <rule>] -- <reason>".',
  ],
  [
    "selfix-disable-next-line no-raw-colors, no-raw-color -- brand",
    'Exception comment names unknown rule "no-raw-color". Separate rule names with commas; rules are no-restricted-components, no-restyle, no-raw-colors, no-arbitrary-values, no-inline-styles, no-unknown-classes, require-static-classes.',
  ],
  [
    "selfix-disable-next-line parse-error -- generated",
    "Parse errors cannot be suppressed. Fix the reported syntax instead.",
  ],
  [
    "selfix-disable-next-line no-raw-colors,, no-arbitrary-values -- brand",
    "Exception comment has an empty rule name between commas.",
  ],
  [
    "selfix-disable-next-line no-raw-colors, no-raw-colors -- brand",
    "Exception comment names no-raw-colors twice.",
  ],
  [
    "selfix-disabled-next-line no-raw-colors -- brand",
    'Unsupported exception comment. Write "selfix-disable-next-line <rule>[, <rule>] -- <reason>" above the line, or use overrides for whole files.',
  ],
  [
    "selfix-disable no-raw-colors -- brand",
    'Unsupported exception comment. Write "selfix-disable-next-line <rule>[, <rule>] -- <reason>" above the line, or use overrides for whole files.',
  ],
])("reports the invalid comment <!-- %s --> and suppresses nothing", async (comment, message) => {
  const linter = await linterWith({ rules: { "no-arbitrary-values": "off" } })
  const source = `<template>\n  <!-- ${comment} -->\n  <div class="bg-[#e30613]" />\n</template>`
  const { diagnostics, suppressed } = linter.check(source, "Invalid.vue")
  expect(diagnostics).toEqual([
    expect.objectContaining({
      rule: "invalid-exception",
      severity: "error",
      message,
      line: 2,
      column: 3,
      offset: 13,
    }),
    expect.objectContaining({ rule: "no-raw-colors", line: 3 }),
  ])
  expect(suppressed).toEqual([])
})

it("ignores other comments, including selfix- text that is not a directive", async () => {
  const linter = await linterWith({ rules: { "no-arbitrary-values": "off" } })
  const source = [
    "<template>",
    "  <!-- selfix-notes: brand colors live in tokens.css -->",
    "  <!-- a selfix-disable-next-line no-raw-colors -- mention -->",
    '  <div class="bg-[#e30613]" />',
    "</template>",
  ].join("\n")
  expect(rules(linter.lint(source, "Notes.vue"))).toEqual([["no-raw-colors", 4]])
})

it("reports unused exceptions at the comment with the configured severity", async () => {
  const source = [
    "<template>",
    "  <!-- selfix-disable-next-line no-raw-colors -- fixed since -->",
    '  <div class="p-4" />',
    "  <!-- selfix-disable-next-line no-raw-colors, no-unknown-classes -- partner -->",
    '  <div class="bg-[#e30613]" />',
    "</template>",
  ].join("\n")
  const config: LinterConfig = { rules: { "no-arbitrary-values": "off" } }
  const unused = (await linterWith(config)).lint(source, "Unused.vue")
  expect(unused).toEqual([
    expect.objectContaining({
      rule: "unused-exception",
      severity: "error",
      message:
        "Unused exception: no-raw-colors reported nothing on the next line. Remove the comment.",
      line: 2,
      column: 3,
    }),
    expect.objectContaining({
      rule: "unused-exception",
      severity: "error",
      message:
        "Unused exception: no-unknown-classes reported nothing on the next line. Remove this rule from the comment.",
      line: 4,
      column: 3,
    }),
  ])
  const warned = (await linterWith({ ...config, unusedExceptions: "warn" })).lint(source, "U.vue")
  expect(warned.map(({ rule, severity }) => [rule, severity])).toEqual([
    ["unused-exception", "warn"],
    ["unused-exception", "warn"],
  ])
  expect((await linterWith({ ...config, unusedExceptions: "off" })).lint(source, "U.vue")).toEqual(
    [],
  )
})

it("treats a comment for a rule that is off as unused", async () => {
  const linter = await linterWith({ rules: { "no-raw-colors": "off" } })
  const source = [
    "<template>",
    "  <!-- selfix-disable-next-line no-raw-colors -- partner -->",
    '  <div class="bg-[#e30613]" />',
    "</template>",
  ].join("\n")
  expect(rules(linter.lint(source, "Off.vue"))).toEqual([
    ["unused-exception", 2],
    ["no-arbitrary-values", 3],
  ])
})

it("covers only the line after the comment, so a multi-line element keeps later findings", async () => {
  const linter = await linterWith({
    components: ["^Button$"],
    rules: { "no-arbitrary-values": "off" },
  })
  const source = [
    "<template>",
    "  <!-- selfix-disable-next-line no-restyle -- legacy layout -->",
    '  <Button class="text-lg"',
    "    :class=\"'bg-[#e30613]'\"",
    "  />",
    "  <!--",
    "    selfix-disable-next-line no-raw-colors --",
    "    partner brand color",
    "  -->",
    '  <div class="bg-[#e30613]" />',
    "</template>",
  ].join("\n")
  const { diagnostics, suppressed } = linter.check(source, "Multi.vue")
  expect(rules(suppressed)).toEqual([
    ["no-restyle", 3],
    ["no-raw-colors", 10],
  ])
  expect(suppressed[1]).toMatchObject({ reason: "partner brand color" })
  expect(rules(diagnostics)).toEqual([
    ["no-raw-colors", 4],
    ["no-restyle", 4],
  ])
})

it("reads comments between v-if branches and inside nested templates", async () => {
  const linter = await linterWith({ rules: { "no-arbitrary-values": "off" } })
  const source = [
    "<template>",
    '  <div v-if="a" class="bg-[#111111]" />',
    "  <!-- selfix-disable-next-line no-raw-colors -- fallback brand -->",
    '  <div v-else-if="b" class="bg-[#222222]" />',
    "  <template v-else>",
    "    <!-- selfix-disable-next-line no-raw-colors -- nested brand -->",
    '    <span class="text-[#333333]" />',
    "  </template>",
    "</template>",
  ].join("\n")
  const { diagnostics, suppressed } = linter.check(source, "Branches.vue")
  expect(rules(diagnostics)).toEqual([["no-raw-colors", 2]])
  expect(suppressed.map(({ line, reason }) => [line, reason])).toEqual([
    [4, "fallback brand"],
    [7, "nested brand"],
  ])
})

it("never suppresses parse errors or findings outside the template", async () => {
  const linter = await linterWith()
  const source = [
    "<template>",
    "  <!-- selfix-disable-next-line no-raw-colors, no-inline-styles -- vendor -->",
    '  <svg><path :fill="color" /></svg></template><style>.x{}</style>',
  ].join("\n")
  const { diagnostics, suppressed } = linter.check(source, "Outside.vue")
  expect(suppressed).toEqual([])
  expect(rules(diagnostics)).toEqual([
    ["unused-exception", 2],
    ["parse-error", 3],
    ["no-inline-styles", 3],
  ])
  expect(diagnostics[0]!.message).toBe(
    "Unused exception: no-raw-colors, no-inline-styles reported nothing on the next line. Remove the comment.",
  )
})

it("rejects an invalid unusedExceptions setting", async () => {
  await expect(
    createLinter({ css, config: { unusedExceptions: "ignore" as "off" } }),
  ).rejects.toThrow("unusedExceptions must be off, warn, or error.")
})

it("reads comments from the original source when Vue's production parser strips them", () => {
  // Vue's parser keeps comments only in development builds unless asked; NODE_ENV picks the build.
  // Production builds also measure the template without its comments, so the first comment
  // and the stale one before </template> would otherwise fall outside it.
  const source = [
    "<template><!-- selfix-disable-next-line no-raw-colors -- first -->",
    '  <div v-if="a" class="bg-[#111111]" />',
    "  <!-- selfix-disable-next-line no-raw-colors -- partner brand -->",
    '  <div v-else class="bg-[#e30613]" />',
    "<!-- selfix-disable-next-line no-raw-colors -- stale --></template>",
  ].join("\n")
  const script = `
    const { createLinter } = await import(${JSON.stringify(new URL("../dist/index.js", import.meta.url).href)})
    const linter = await createLinter({ css: '@import "tailwindcss";', config: { rules: { "no-arbitrary-values": "off" } } })
    console.log(JSON.stringify(linter.check(${JSON.stringify(source)}, "Prod.vue")))`
  const result = spawnSync(process.execPath, ["--input-type=module", "--eval", script], {
    encoding: "utf8",
    env: { ...process.env, NODE_ENV: "production" },
  })
  expect(result.stderr).toBe("")
  const { diagnostics, suppressed } = JSON.parse(result.stdout)
  expect(rules(diagnostics)).toEqual([["unused-exception", 5]])
  expect(rules(suppressed)).toEqual([
    ["no-raw-colors", 2],
    ["no-raw-colors", 4],
  ])
})
