import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { run } from "../src/cli.js"

const dirs: string[] = []
afterEach(async () => {
  await Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })))
})
async function project() {
  // Under the workspace so Tailwind's package imports resolve normally.
  const dir = await mkdtemp(path.join(process.cwd(), ".selfix-test-"))
  dirs.push(dir)
  await writeFile(path.join(dir, "theme.css"), '@import "tailwindcss";')
  await writeFile(
    path.join(dir, "selfix.config.ts"),
    'const css: string = "theme.css"; export default { css }',
  )
  return dir
}
async function invoke(args: string[], dir: string) {
  let stdout = ""
  let stderr = ""
  const code = await run(args, dir, {
    out: (text) => {
      stdout += text
      return true
    },
    err: (text) => {
      stderr += text
      return true
    },
  })
  return { code, stdout, stderr }
}

describe("CLI", () => {
  it("discovers component sources from the config directory, with root override and opt-out", async () => {
    const dir = await project()
    await mkdir(path.join(dir, "app"))
    await writeFile(
      path.join(dir, "app/Button.vue"),
      `<script setup lang="ts">defineProps<{size: 'sm' | 'lg'}>()</script><template><button /></template>`,
    )
    await writeFile(
      path.join(dir, "app/Page.vue"),
      `<script setup>import Button from '@/Button.vue'</script>\n<template><Button class="p-4" /></template>`,
    )
    await writeFile(
      path.join(dir, "jsconfig.json"),
      JSON.stringify({ compilerOptions: { paths: { "@/*": ["app/*"] } } }),
    )
    await writeFile(
      path.join(dir, "selfix.config.ts"),
      'export default {css:"theme.css", components:["^Button$"]}',
    )
    const args = ["Page.vue", "--config", "../selfix.config.ts", "--format", "json"]
    const automatic = await invoke(args, path.join(dir, "app"))
    expect(automatic.stderr).toBe("")
    expect(automatic.code).toBe(1)
    expect(JSON.parse(automatic.stdout)[0]).toMatchObject({
      file: path.join(dir, "app/Page.vue"),
      line: 2,
      column: 19,
      definition: { file: path.join(dir, "app/Button.vue"), props: { size: ["sm", "lg"] } },
    })
    await writeFile(
      path.join(dir, "override.config.ts"),
      'export default {css:"theme.css", components:["^Button$"], project:{root:"app", aliases:{"@/*":"./*"}}}',
    )
    expect(
      JSON.parse(
        (
          await invoke(
            ["Page.vue", "--config", "../override.config.ts", "--format", "json"],
            path.join(dir, "app"),
          )
        ).stdout,
      )[0].definition,
    ).toEqual({ file: path.join(dir, "app/Button.vue"), props: { size: ["sm", "lg"] } })
    await writeFile(
      path.join(dir, "disabled.config.ts"),
      'export default {css:"theme.css", components:["^Button$"], project:false}',
    )
    const disabled = await invoke(
      ["Page.vue", "--config", "../disabled.config.ts", "--format", "json"],
      path.join(dir, "app"),
    )
    expect(disabled.code).toBe(1)
    expect(JSON.parse(disabled.stdout)[0]).not.toHaveProperty("definition")
  })
  it("resolves CSS aliases from the config directory even with --css and a different cwd", async () => {
    const dir = await project()
    await mkdir(path.join(dir, "app"))
    await mkdir(path.join(dir, ".nuxt"))
    await writeFile(path.join(dir, ".nuxt/ui.css"), "@theme { --color-brand: #123456; }")
    await writeFile(
      path.join(dir, "app/main.css"),
      '@import "tailwindcss"; @import "#build/ui.css";',
    )
    await writeFile(
      path.join(dir, "selfix.config.ts"),
      'export default { css: "app/main.css", cssAliases: { "#build/ui.css": ".nuxt/ui.css" } }',
    )
    await writeFile(path.join(dir, "app/Page.vue"), '<template><div class="bg-brand" /></template>')
    const args = ["--config", "../selfix.config.ts", "--format", "json"]
    expect(await invoke(args, path.join(dir, "app"))).toEqual({
      code: 0,
      stdout: "[]\n",
      stderr: "",
    })
    expect(await invoke([...args, "--css", "main.css"], path.join(dir, "app"))).toEqual({
      code: 0,
      stdout: "[]\n",
      stderr: "",
    })
    await rm(path.join(dir, ".nuxt/ui.css"))
    const missing = await invoke(args, path.join(dir, "app"))
    expect(missing.code).toBe(2)
    expect(missing.stderr).toContain("#build/ui.css")
    expect(missing.stderr).toContain(path.join(dir, ".nuxt/ui.css"))
    expect(missing.stderr).toContain("nuxt prepare")
  })
  it("finds Vue files, prints actionable positions, and exits nonzero", async () => {
    const dir = await project()
    await writeFile(
      path.join(dir, "Page.vue"),
      '<template>\n  <div class="p-[13px]" />\n</template>',
    )
    const result = await invoke([], dir)
    expect(result.code).toBe(1)
    expect(result.stdout).toMatch(/Page.vue:2:\d+ error no-arbitrary-values/)
    expect(result.stderr).toBe("")
    expect(await readFile(path.join(dir, "Page.vue"), "utf8")).toContain('class="p-[13px]"')
  })
  it("outputs deterministic JSON and deduplicates glob inputs", async () => {
    const dir = await project()
    await writeFile(path.join(dir, "Page.vue"), '<template><div class="rounded-huge" /></template>')
    const result = await invoke(["*.vue", "Page.vue", "--format", "json"], dir)
    expect(result.code).toBe(1)
    const diagnostics = JSON.parse(result.stdout)
    expect(diagnostics).toHaveLength(1)
    expect(diagnostics[0]).toMatchObject({
      rule: "no-unknown-classes",
      file: path.join(dir, "Page.vue"),
    })
  })
  it("skips excluded and generated directories", async () => {
    const dir = await project()
    for (const name of ["dist", "node_modules", "generated"]) {
      await mkdir(path.join(dir, name))
      await writeFile(
        path.join(dir, name, "Broken.vue"),
        '<template><div class="nonsense" /></template>',
      )
    }
    await writeFile(path.join(dir, "Page.vue"), '<template><div class="p-4" /></template>')
    await writeFile(
      path.join(dir, "selfix.config.ts"),
      'export default { css: "theme.css", exclude: ["generated"] }',
    )
    const result = await invoke([], dir)
    expect(result.code).toBe(0)
    expect(result.stdout).toContain("Checked 1 Vue file: 0 errors")
  })
  it("loads typed config and resolves its CSS relative to the config file", async () => {
    const dir = await project()
    await mkdir(path.join(dir, "app"))
    await writeFile(path.join(dir, "app", "Page.vue"), '<template><div class="p-4" /></template>')
    await writeFile(path.join(dir, "selfix.config.ts"), 'export default { css: "theme.css" }')
    expect((await invoke(["--config", "../selfix.config.ts"], path.join(dir, "app"))).code).toBe(0)
  })
  it("enforces optional warning thresholds", async () => {
    const dir = await project()
    await writeFile(path.join(dir, "Page.vue"), '<template><div class="p-[13px]" /></template>')
    await writeFile(
      path.join(dir, "selfix.config.ts"),
      'export default { css: "theme.css", rules: { "no-arbitrary-values": "warn" } }',
    )
    expect((await invoke([], dir)).code).toBe(0)
    expect((await invoke(["--max-warnings", "0"], dir)).code).toBe(1)
  })
  it("fails closed for missing input, invalid config and theme failures", async () => {
    const dir = await project()
    expect((await invoke([], dir)).code).toBe(2)
    expect((await invoke(["missing.vue"], dir)).stderr).toContain("No files match")
    expect((await invoke(["--unknown"], dir)).code).toBe(2)
    expect((await invoke(["--format", "yaml"], dir)).code).toBe(2)
    await writeFile(path.join(dir, "Page.vue"), "<template><div /></template>")
    await writeFile(path.join(dir, "theme.css"), '@import "./missing.css";')
    expect((await invoke([], dir)).code).toBe(2)
    await writeFile(path.join(dir, "invalid.ts"), "export default { typo: true }")
    expect((await invoke(["--config", "invalid.ts"], dir)).stderr).toContain("Unknown config")
  })
  it("shows help without loading a project", async () => {
    const result = await invoke(["--help"], os.tmpdir())
    expect(result.code).toBe(0)
    expect(result.stdout).toContain("Usage: selfix")
  })
  it("requires a TypeScript config instead of silently using defaults or other formats", async () => {
    const dir = await project()
    await rm(path.join(dir, "selfix.config.ts"))
    await writeFile(path.join(dir, "selfix.config.json"), '{"css":"theme.css"}')
    const missing = await invoke(["--css", "theme.css"], dir)
    expect(missing.code).toBe(2)
    expect(missing.stderr).toContain("Create selfix.config.ts")
    for (const extension of ["json", "js", "mjs"]) {
      const result = await invoke(["--config", `selfix.config.${extension}`], dir)
      expect(result.code).toBe(2)
      expect(result.stderr).toContain("Configuration must be a .ts file")
    }
  })
  it("reports a missing default export and invalid TypeScript", async () => {
    const dir = await project()
    await writeFile(path.join(dir, "named.ts"), 'export const config = { css: "theme.css" }')
    expect((await invoke(["--config", "named.ts"], dir)).stderr).toContain(
      "config must be an object",
    )
    await writeFile(path.join(dir, "broken.ts"), "export default { css:")
    expect((await invoke(["--config", "broken.ts"], dir)).code).toBe(2)
  })
})
