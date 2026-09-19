import path from "node:path"
import { expect, it } from "vitest"
import { createLinter, defineConfig, ruleNames, type Config } from "../src/index.js"

const css = '@import "tailwindcss";'

it("matches the complete filename even when it contains a line break", async () => {
  const linter = await createLinter({
    css,
    config: {
      overrides: [{ files: ["Exact.vue", "nested/**"], rules: { "no-inline-styles": "off" } }],
    },
  })
  const source = '<template><div style="padding: 4px" /></template>'
  expect(linter.lint(source, "Exact.vue\n")).toEqual([
    expect.objectContaining({ rule: "no-inline-styles" }),
  ])
  expect(linter.lint(source, "nested/Line\nBreak.vue")).toEqual([])
})

it("allows SFC style blocks only in selected files and preserves original locations elsewhere", async () => {
  const linter = await createLinter({
    css,
    config: {
      overrides: [{ files: ["components/**/*.vue"], rules: { "no-inline-styles": "off" } }],
    },
  })
  const source = "<template><div /></template>\n<style scoped>div { padding: 1rem; }</style>"
  expect(linter.lint(source, "components/Button.vue")).toEqual([])
  expect(linter.lint(source, "components-extra/Button.vue")).toEqual([
    expect.objectContaining({
      rule: "no-inline-styles",
      file: "components-extra/Button.vue",
      line: 2,
      column: 1,
      offset: 29,
    }),
  ])
})

it("relaxes implementation styling without skipping independent color and vocabulary checks", async () => {
  const linter = await createLinter({
    css,
    config: {
      overrides: [{ files: ["src/components/ui/**/*.vue"], rules: { "no-inline-styles": "off" } }],
    },
  })
  const source =
    '<template><div class="bg-red-500 not-a-utility" style="padding: 4px" /></template>'
  expect(linter.lint(source, "src/components/ui/Button.vue").map(({ rule }) => rule)).toEqual([
    "no-raw-colors",
    "no-unknown-classes",
  ])
  expect(
    linter.lint(source, "src/components/ui/nested/Button.vue").map(({ rule }) => rule),
  ).toEqual(["no-raw-colors", "no-unknown-classes"])
  expect(linter.lint(source, "src/Page.vue").map(({ rule }) => rule)).toEqual([
    "no-raw-colors",
    "no-unknown-classes",
    "no-inline-styles",
  ])
  expect(
    linter.lint('<template><div class="p-4" /></template>', "src/components/ui/Button.vue"),
  ).toEqual([])
})

it("applies matching entries in order, preserves severity-only options, and replaces tuple options", async () => {
  const linter = await createLinter({
    css,
    config: {
      components: ["^Button$"],
      note: "check-note",
      rules: {
        "no-restyle": [
          "error",
          {
            allow: ["spacing"],
            deny: ["p-4"],
            message: "base {{file}} {{className}}",
            contracts: [{ pattern: "^Button$", message: "contract {{className}}" }],
          },
        ],
      },
      overrides: [
        { files: ["src/**/*.vue"], rules: { "no-restyle": "off" } },
        { files: ["src/author/*.vue"], rules: { "no-restyle": "warn" } },
        {
          files: ["src/author/New.vue"],
          rules: {
            "no-restyle": [
              "error",
              { allow: ["shape"], message: "replacement {{file}} {{className}}" },
            ],
          },
        },
        { files: ["src/author/New.vue"], rules: { "no-restyle": "warn" } },
      ],
    },
  })
  const source = '<template><Button class="p-4 p-8 rounded-lg" /></template>'
  expect(linter.lint(source, "src/Page.vue")).toEqual([])
  expect(
    linter
      .lint(source, "src/author/Old.vue")
      .map(({ className, severity, message }) => ({ className, severity, message })),
  ).toEqual([
    { className: "p-4", severity: "warn", message: "contract p-4 check-note" },
    { className: "rounded-lg", severity: "warn", message: "contract rounded-lg check-note" },
  ])
  expect(
    linter
      .lint(source, "src/author/New.vue")
      .map(({ className, severity, message }) => ({ className, severity, message })),
  ).toEqual([
    {
      className: "p-4",
      severity: "warn",
      message: "replacement src/author/New.vue p-4 check-note",
    },
    {
      className: "p-8",
      severity: "warn",
      message: "replacement src/author/New.vue p-8 check-note",
    },
  ])
  // Reusing the same linter must not carry a previous file's overrides forward.
  expect(
    linter.lint(source, "Consumer.vue").map(({ className, severity }) => ({ className, severity })),
  ).toEqual([
    { className: "p-4", severity: "error" },
    { className: "rounded-lg", severity: "error" },
  ])
})

it("matches normalized filenames relative to root, independent of CSS and discovery roots", async () => {
  const configBase = path.join(process.cwd(), "virtual-project")
  const linter = await createLinter({
    css,
    cssBase: process.cwd(),
    root: configBase,
    config: {
      project: false,
      overrides: [
        { files: ["./src/Author?.vue", "component.vue"], rules: { "no-inline-styles": "off" } },
      ],
    },
  })
  const source = '<template><div style="color: red" /></template>'
  for (const file of [
    "src/Author1.vue",
    "src/./Author2.vue",
    path.join(configBase, "src/Author3.vue"),
  ])
    expect(linter.lint(source, file)).toEqual([])
  expect(linter.lint(source)).toEqual([])
  for (const file of [
    "src/Author12.vue",
    "src/nested/Author1.vue",
    "src/author1.vue",
    "../component.vue",
    path.join(configBase, "../component.vue"),
  ]) {
    expect(linter.lint(source, file)).toEqual([
      expect.objectContaining({ file, rule: "no-inline-styles", line: 1, column: 16, offset: 15 }),
    ])
  }
})

it("cannot suppress malformed or unsupported inputs with file rules", async () => {
  const disabled = Object.fromEntries(ruleNames.map((name) => [name, "off"])) as Config["rules"]
  const linter = await createLinter({
    css,
    config: { overrides: [{ files: ["**/*.vue"], rules: disabled! }] },
  })
  for (const source of [
    "<template><div></template>",
    '<template><div v-bind="attrs" /></template>',
    '<script src="./external.js"></script><template><div /></template>',
  ]) {
    const findings = linter.lint(source, "src/Implementation.vue")
    expect(findings.length).toBeGreaterThan(0)
    expect(
      findings.every(({ rule, severity }) => rule === "parse-error" && severity === "error"),
    ).toBe(true)
  }
})

it.each([
  { overrides: {} },
  { overrides: [{}] },
  { overrides: [{ files: [], rules: {} }] },
  { overrides: [{ files: ["src/**"], rules: { typo: "off" } }] },
  { overrides: [{ files: ["src/**"], rules: { "no-restyle": "invalid" } }] },
  {
    overrides: [
      { files: ["src/**"], rules: { "require-static-classes": ["error", { allow: ["*"] }] } },
    ],
  },
  {
    overrides: [
      { files: ["src/**"], rules: { "no-restyle": ["error", { contracts: [{ pattern: "[" }] }] } },
    ],
  },
  {
    overrides: [{ files: ["src/**"], rules: { "no-restyle": ["error", { message: "{{bad}}" }] } }],
  },
  { overrides: [{ files: ["src/**"], exclude: ["foo"], rules: {} }] },
  ...[
    "/src/*.vue",
    "../src/**",
    "src/**foo.vue",
    "!src/**",
    "src/{a,b}.vue",
    "src/[AB].vue",
    "src\\*.vue",
    "src//*.vue",
  ].map((pattern) => ({ overrides: [{ files: [pattern], rules: {} }] })),
])("rejects invalid overrides before linting: %j", (config) => {
  expect(() => defineConfig(config as unknown as Config)).toThrow()
})
