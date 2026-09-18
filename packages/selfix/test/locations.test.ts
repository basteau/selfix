import { expect, it } from "vitest"
import { createLinter } from "../src/index.js"

it.each(["\n", "\r\n"])(
  "preserves UTF-16 locations and stable ordering with %j newlines",
  async (newline) => {
    const source = [
      "<template>",
      '  <div>😀é</div><Button class="bg-red-500 p-[13px] madeup" />',
      "  <Button",
      '    :class="[',
      "      'p-4', unknown",
      '    ]"',
      "    :ui=\"{ base: 'p-4' }\"",
      '    style="color:red"',
      '    v-bind="attrs"',
      "  />",
      "</template>",
      "<style>.x { color:red }</style>",
    ].join(newline)
    const linter = await createLinter({
      css: '@import "tailwindcss";',
      config: {
        components: ["^Button$"],
        classProps: [{ pattern: "^Button$", props: { ui: "slot-map" } }],
      },
    })
    const findings = linter.lint(source, "Positions.vue")
    // Explicit original-SFC positions: the emoji occupies two JS string units.
    // LF source removes one code unit for every preceding CRLF line ending.
    const expected = [
      ["no-arbitrary-values", 2, 25, 36],
      ["no-raw-colors", 2, 25, 36],
      ["no-restyle", 2, 25, 36],
      ["no-restyle", 2, 25, 36],
      ["no-restyle", 2, 25, 36],
      ["no-unknown-classes", 2, 25, 36],
      ["no-restyle", 4, 5, 90],
      ["require-static-classes", 4, 5, 90],
      ["no-restyle", 7, 5, 135],
      ["no-inline-styles", 8, 5, 162],
      ["parse-error", 9, 5, 185],
      ["require-static-classes", 9, 5, 185],
      ["no-inline-styles", 12, 1, 220],
    ] as const
    expect(findings.map(({ rule, line, column, offset }) => [rule, line, column, offset])).toEqual(
      expected.map(([rule, line, column, offset]) => [
        rule,
        line,
        column,
        offset - (newline === "\n" ? line - 1 : 0),
      ]),
    )
    expect(findings.every(({ file }) => file === "Positions.vue")).toBe(true)
    expect(findings[8]).toMatchObject({ prop: "ui", slot: "base" })
    expect(findings.slice(2, 5).map(({ className }) => className)).toEqual([
      "bg-red-500",
      "p-[13px]",
      "madeup",
    ])
    expect(linter.lint(source, "Positions.vue")).toEqual(findings)
    // Reuse the same linter on another source without leaking its line index.
    expect(linter.lint('<template><div class="p-[13px]" /></template>', "Other.vue")).toEqual([
      expect.objectContaining({ file: "Other.vue", line: 1, column: 16, offset: 15 }),
    ])
  },
)

it("preserves parser locations at the start and end of malformed sources", async () => {
  const linter = await createLinter({ css: '@import "tailwindcss";' })
  expect(linter.lint("", "Empty.vue")).toEqual([
    expect.objectContaining({ rule: "parse-error", line: 1, column: 1, offset: 0 }),
  ])
  const source = "<template>\r\n<div>😀"
  const findings = linter.lint(source, "Broken.vue")
  expect(findings.length).toBeGreaterThan(0)
  expect(findings.every(({ rule }) => rule === "parse-error")).toBe(true)
  // Unclosed tags are located at their opening, not at the end of the file.
  expect(findings.map(({ line, column, offset }) => [line, column, offset])).toEqual([
    [1, 1, 0],
    [2, 1, 12],
  ])
})
