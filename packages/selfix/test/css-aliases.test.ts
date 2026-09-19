import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { expect, test } from "vitest"
import { createLinter, defineConfig, type Config } from "../src/index.js"

test("loads application CSS instead of the package fallback through an exact alias", async () => {
  const base = await mkdtemp(join(tmpdir(), "selfix-css-alias-"))
  try {
    const pkg = join(base, "node_modules", "fixture-ui")
    await mkdir(pkg, { recursive: true })
    await mkdir(join(base, ".nuxt"))
    await writeFile(join(pkg, "package.json"), JSON.stringify({ style: "index.css" }))
    await writeFile(join(pkg, "index.css"), '@import "./fallback.css";')
    await writeFile(join(pkg, "fallback.css"), "@theme { --color-fallback: #123456; }")
    await writeFile(join(base, ".nuxt", "ui.css"), '@import "./tokens.css";')
    await writeFile(join(base, ".nuxt", "tokens.css"), "@theme { --color-brand: #123456; }")
    const linter = await createLinter({
      css: '@import "tailwindcss"; @import "fixture-ui";',
      root: base,
      config: { cssAliases: { "./fallback.css": ".nuxt/ui.css" } },
    })
    const diagnostics = linter.lint('<template><div class="bg-brand bg-fallback" /></template>')
    expect(diagnostics.map(({ rule, className }) => ({ rule, className }))).toEqual([
      { rule: "no-unknown-classes", className: "bg-fallback" },
    ])
  } finally {
    await rm(base, { recursive: true, force: true })
  }
})

test("a missing alias target rejects API creation even when the original import exists", async () => {
  const base = await mkdtemp(join(tmpdir(), "selfix-css-alias-missing-"))
  try {
    await writeFile(join(base, "fallback.css"), ".fallback { padding: 1rem; }")
    await expect(
      createLinter({
        css: '@import "./fallback.css";',
        root: base,
        config: { cssAliases: { "./fallback.css": "missing.css" } },
      }),
    ).rejects.toThrow(`at "${join(base, "missing.css")}"`)
  } finally {
    await rm(base, { recursive: true, force: true })
  }
})

test("aliases match exact names and treat targets as files rather than more aliases", async () => {
  const base = await mkdtemp(join(tmpdir(), "selfix-css-alias-exact-"))
  try {
    await mkdir(join(base, "theme"))
    await writeFile(join(base, "theme", "other.css"), ".ordinary { padding: 1rem; }")
    await writeFile(join(base, "theme.css"), ".aliased { padding: 1rem; }")
    const linter = await createLinter({
      css: '@import "./theme/other.css"; @import "#build/ui.css";',
      root: base,
      config: {
        cssAliases: {
          "./theme": "missing.css",
          "#build/ui.css": "theme.css",
          "theme.css": "missing.css",
        },
      },
    })
    expect(linter.lint('<template><div class="ordinary aliased" /></template>')).toEqual([])
  } finally {
    await rm(base, { recursive: true, force: true })
  }
})

test.each([
  null,
  [],
  "theme.css",
  { "": "theme.css" },
  { "#build/*": "theme.css" },
  { theme: 1 },
  { theme: "theme.js" },
  { theme: "*.css" },
  { theme: "https://example.com/theme.css" },
  { theme: "file:///theme.css" },
])("rejects unsupported alias configuration %j", (cssAliases) => {
  expect(() => defineConfig({ cssAliases } as unknown as Config)).toThrow("cssAliases")
})
