import { spawnSync } from "node:child_process"
import { cpSync, existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { afterEach, beforeAll, expect, it } from "vitest"

const playground = fileURLToPath(new URL("../", import.meta.url))
const bin = path.join(playground, "node_modules/.bin/selfix")
const generated = "node_modules/.nuxt-ui"
const projects: string[] = []

beforeAll(() => {
  // Nuxt UI's Vite plugin writes the generated theme; one build provides it.
  if (existsSync(path.join(playground, generated, "ui.css"))) return
  const build = spawnSync("pnpm", ["build"], { cwd: playground, encoding: "utf8" })
  expect(build.status, build.stderr).toBe(0)
}, 120_000)

afterEach(() => {
  for (const project of projects.splice(0)) rmSync(project, { recursive: true, force: true })
})

function lint(cwd: string) {
  const result = spawnSync(bin, ["src", "--format", "json"], { cwd, encoding: "utf8" })
  expect(result.error).toBeUndefined()
  expect(result.stderr).toBe("")
  return { status: result.status, diagnostics: JSON.parse(result.stdout).diagnostics }
}

/** A copy of the playground; the real @nuxt/ui resolves from the parent directory. */
function fixture() {
  const project = mkdtempSync(path.join(playground, ".selfix-test-"))
  projects.push(project)
  for (const entry of ["src", "selfix.config.ts", "package.json", generated])
    cpSync(path.join(playground, entry), path.join(project, entry), { recursive: true })
  return project
}

it("accepts the actual playground with the real Nuxt UI theme and components", () => {
  expect(lint(playground)).toEqual({ status: 0, diagnostics: [] })
})

it.each([
  ["no-restyle", '<UButton class="font-bold">Invalid</UButton>'],
  ["no-restyle", "<UButton :ui=\"{ label: 'font-bold' }\">Invalid</UButton>"],
  ["prefer-ui-components", '<button type="button">Invalid</button>'],
  ["no-raw-colors", '<div class="text-red-500">Invalid</div>'],
  ["no-arbitrary-values", '<div class="p-[13px]">Invalid</div>'],
  ["no-inline-styles", '<div style="padding: 13px">Invalid</div>'],
  ["no-unknown-classes", '<div class="text-mutd">Invalid</div>'],
  ["require-static-classes", '<div :class="runtimeClass">Invalid</div>'],
])("reports %s through the installed CLI: %s", (rule, template) => {
  const project = fixture()
  const file = path.join(project, "src/App.vue")
  writeFileSync(
    file,
    `<script setup lang="ts">
import { ref } from "vue"
const runtimeClass = ref("text-primary")
</script>
<template>${template}</template>
`,
  )

  const result = lint(project)
  expect(result.status).toBe(1)
  expect(result.diagnostics).toEqual([
    expect.objectContaining({ rule, severity: "error", file, line: 5, column: expect.any(Number) }),
  ])
  const [{ message, suggestions }] = result.diagnostics
  if (rule === "no-restyle")
    expect(message).toMatch(
      /^"font-bold" is not allowed on <UButton>: the component owns its typography\. Use size \(xs, sm, md, lg, xl\), or restyle it for the whole app under ui\.button in vite\.config\.ts\.( In ui\.label\.)?$/,
    )
  if (rule === "no-raw-colors") expect(message).toContain("such as text-dimmed, text-muted")
  if (rule === "no-unknown-classes") expect(suggestions).toEqual(["text-muted"])
})

it("applies the playground contract and Nuxt UI's own colors", () => {
  const project = fixture()
  const file = path.join(project, "src/App.vue")
  writeFileSync(
    file,
    `<template>
  <UCard class="p-2 shadow-lg" :ui="{ body: 'p-0' }" />
  <LazyUModal class="rounded-xl" />
  <div class="bg-elevated text-neutral-500 border-default ring-primary/50" />
</template>
`,
  )
  expect(
    lint(project).diagnostics.map(({ rule, component, className }: Record<string, string>) => [
      rule,
      component,
      className,
    ]),
  ).toEqual([
    ["no-restyle", "UCard", "shadow-lg"],
    ["no-restyle", "LazyUModal", "rounded-xl"],
  ])
})
