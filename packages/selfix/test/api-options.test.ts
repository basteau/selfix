import { expect, it } from "vitest"
import { createLinter, type LinterOptions } from "../src/index.js"

it.each(["css", "exclude"])("rejects CLI-only config.%s in API calls", async (field) => {
  await expect(
    createLinter({
      css: '@import "tailwindcss";',
      config: { [field]: field === "css" ? "theme.css" : ["ignored"] },
    } as LinterOptions),
  ).rejects.toThrow(`config.${field} is only supported by the CLI`)
})

it.each(["base", "configBase"])(
  "rejects removed option %s with replacement guidance",
  async (key) => {
    await expect(createLinter({ css: "", [key]: "." } as LinterOptions)).rejects.toThrow(
      key === "base" ? "Use cssBase" : "Use root",
    )
  },
)

it.each([{}, { root: "src" }])(
  "uses project paths independently of CSS and discovery overrides: %j",
  async (project) => {
    const { mkdtemp, mkdir, writeFile, rm } = await import("node:fs/promises")
    const { tmpdir } = await import("node:os")
    const { join } = await import("node:path")
    const root = await mkdtemp(join(tmpdir(), "selfix-api-root-"))
    try {
      await mkdir(join(root, "assets"))
      await mkdir(join(root, "src"))
      await writeFile(join(root, "assets", "local.css"), ".local { margin: 1rem; }")
      await writeFile(join(root, "tokens.css"), ".pad { padding: 1rem; }")
      await writeFile(
        join(root, "src", "Button.vue"),
        '<script setup lang="ts">defineProps<{size: "small"}>()</script>',
      )
      const linter = await createLinter({
        css: '@import "./local.css"; @import "#theme";',
        root,
        cssBase: "assets",
        config: {
          cssAliases: { "#theme": "tokens.css" },
          components: ["^Button$"],
          project,
          overrides: [{ files: ["src/*.vue"], rules: { "no-inline-styles": "off" } }],
        },
      })
      const source =
        '<script setup>import Button from "./Button.vue"</script>\n<template><Button class="local pad" style="padding: 4px" /></template>'
      const result = linter.lint(source, "src/Page.vue")
      expect(result).toEqual([
        expect.objectContaining({
          file: "src/Page.vue",
          rule: "no-restyle",
          className: "pad",
          line: 2,
          column: 19,
          definition: { file: join(root, "src", "Button.vue"), props: { size: ["small"] } },
        }),
      ])
      expect(linter.lint(source, join(root, "src", "Page.vue"))[0].file).toBe(
        join(root, "src", "Page.vue"),
      )
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  },
)

it("defaults cssBase to root and keeps discovery opt-in", async () => {
  const { mkdtemp, writeFile, rm } = await import("node:fs/promises")
  const { tmpdir } = await import("node:os")
  const { join } = await import("node:path")
  const root = await mkdtemp(join(tmpdir(), "selfix-api-default-"))
  try {
    await writeFile(join(root, "theme.css"), ".pad { padding: 1rem; }")
    await writeFile(join(root, "tsconfig.json"), "invalid metadata")
    const linter = await createLinter({
      css: '@import "./theme.css";',
      root,
      config: { components: ["^Button$"] },
    })
    expect(linter.lint('<template><Button class="pad" /></template>')[0]).toMatchObject({
      file: "component.vue",
      rule: "no-restyle",
    })
    await expect(createLinter({ css: "", root, config: { project: {} } })).rejects.toThrow()
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

// Checked by tsc: CLI-only fields and removed path options are not API options.
const invalidApiOptions: LinterOptions = {
  css: "",
  // @ts-expect-error CLI config fields are unavailable to API callers.
  config: { exclude: ["ignored.vue"] },
}
void invalidApiOptions
