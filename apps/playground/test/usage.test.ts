import { spawnSync } from "node:child_process"
import { cpSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { afterEach, expect, it } from "vitest"

const playground = fileURLToPath(new URL("../", import.meta.url))
const bin = path.join(playground, "node_modules/.bin/selfix")
const projects: string[] = []

afterEach(() => {
  for (const project of projects.splice(0)) rmSync(project, { recursive: true, force: true })
})

function lint(cwd: string) {
  const result = spawnSync(bin, ["src", "--format", "json"], { cwd, encoding: "utf8" })
  expect(result.error).toBeUndefined()
  expect(result.stderr).toBe("")
  return { status: result.status, diagnostics: JSON.parse(result.stdout) }
}

function fixture() {
  const project = mkdtempSync(path.join(playground, ".selfix-test-"))
  projects.push(project)
  for (const entry of ["src", "selfix.config.ts", "package.json"])
    cpSync(path.join(playground, entry), path.join(project, entry), { recursive: true })
  return project
}

it("accepts the actual playground with its theme, variants, and TypeScript config", () => {
  expect(lint(playground)).toEqual({ status: 0, diagnostics: [] })
})

it.each([
  ["no-restyle", '<Button class="p-8">Invalid</Button>'],
  ["no-raw-colors", '<div class="text-red-500">Invalid</div>'],
  ["no-arbitrary-values", '<div class="p-[13px]">Invalid</div>'],
  ["no-inline-styles", '<div style="padding: 13px">Invalid</div>'],
  ["no-unknown-classes", '<div class="not-a-tailwind-class">Invalid</div>'],
  ["require-static-classes", '<div :class="runtimeClass">Invalid</div>'],
])("reports %s through the installed CLI and playground config", (rule, template) => {
  const project = fixture()
  const file = path.join(project, "src/App.vue")
  writeFileSync(
    file,
    `<script setup lang="ts">
import { ref } from "vue"
import Button from "./components/ui/Button.vue"
const runtimeClass = ref("text-primary")
</script>
<template>${template}</template>
`,
  )

  const result = lint(project)
  expect(result.status).toBe(1)
  expect(result.diagnostics).toEqual([
    expect.objectContaining({ rule, severity: "error", file, line: 6, column: expect.any(Number) }),
  ])
  if (rule === "no-restyle") {
    const definition = path.join(project, "src/components/ui/Button.vue")
    expect(result.diagnostics[0].message).toBe(
      "Button owns its appearance. Use its variant prop; keep only layout classes here." +
        ` Definition: ${definition}. Accepted variant values: "primary", "secondary".` +
        " These choices do not guarantee a visual replacement for this class.",
    )
    expect(result.diagnostics[0].definition).toEqual({
      file: definition,
      props: { variant: ["primary", "secondary"] },
    })
  }
})

it("keeps author vocabulary and consumer policy checks active through a corrected adoption workflow", () => {
  const project = fixture()
  const author = path.join(project, "src/components/ui/Authored.vue")
  const consumer = path.join(project, "src/App.vue")
  const component = (classes: string) => `<script setup lang="ts">
import Button from './Button.vue'
</script>
<template><Button class="p-8" /><div class="${classes}" /></template>
<style scoped>div { padding: 1rem; }</style>\n`
  writeFileSync(author, component("text-red-500 missing-token"))
  writeFileSync(
    consumer,
    `<script setup lang="ts">
import Button from './components/ui/Button.vue'
</script>
<template><Button class="p-8" /><div :style="{ '--progress': 0.5 }" /></template>\n`,
  )
  const failing = lint(project)
  expect(failing.status).toBe(1)
  expect(
    failing.diagnostics.map(({ rule, file }: { rule: string; file: string }) => ({ rule, file })),
  ).toEqual([
    { rule: "no-restyle", file: consumer },
    { rule: "no-inline-styles", file: consumer },
    { rule: "no-raw-colors", file: author },
    { rule: "no-unknown-classes", file: author },
  ])
  // Corrections use known tokens and the component API; keep author styling in place.
  writeFileSync(author, component("text-primary p-4"))
  writeFileSync(
    consumer,
    `<script setup lang="ts">
import Button from './components/ui/Button.vue'
</script><template><Button variant="secondary" class="mt-4" /><div class="w-full" /></template>`,
  )
  expect(lint(project)).toEqual({ status: 0, diagnostics: [] })
})
