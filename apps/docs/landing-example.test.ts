import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import path from "node:path"
import { afterAll, expect, test } from "vitest"
import { createLinter } from "../../packages/selfix/src/index.js"
import { installNuxtUi } from "../../packages/selfix/test/nuxt-ui-fixture.js"
import { examples, rules } from "./landing-examples.js"

// A prepared Nuxt UI project with no selfix config, as in the guide and on the landing page.
const root = mkdtempSync(path.join(process.cwd(), ".selfix-test-"))
installNuxtUi(root)
writeFileSync(path.join(root, "main.css"), '@import "tailwindcss";\n@import "@nuxt/ui";\n')
afterAll(() => rmSync(root, { recursive: true, force: true }))
const file = "app/pages/example.vue"

test("the published tutorial reports the shown finding and accepts its correction", async () => {
  const guide = readFileSync(new URL("./content/getting-started.md", import.meta.url), "utf8")
  const source = guide.match(/```vue\n(<template>[\s\S]*?)\n```/)?.[1]
  const correction = guide.match(/```vue\n(<UButton [^\n]*)\n```/)?.[1]
  const shown = guide.match(/```text\n(.*)\nChecked 1 Vue file: 1 error/)?.[1]
  expect(source && correction && shown).toBeTruthy()
  const linter = await createLinter({ root })
  const [finding, ...rest] = linter.lint(source!, file)
  expect(rest).toEqual([])
  expect(
    `${file}:${finding?.line}:${finding?.column} ${finding?.severity} ${finding?.rule} ${finding?.message}`,
  ).toBe(shown)
  expect(linter.lint(source!.replace(/<UButton [^\n]*/, correction!), file)).toEqual([])
})

test.each(examples)("the $label landing example matches the linter", async (example) => {
  const linter = await createLinter({ root })
  const [finding, ...rest] = linter.lint(example.source, file)
  expect(rest).toEqual([])
  expect(finding).toMatchObject({ rule: example.rule, severity: "error" })
  expect(`${finding?.line}:${finding?.column}`).toBe(example.location)
  const shown = example.message.replace(/ …$/, "")
  expect(finding?.message.startsWith(shown)).toBe(true)
  if (example.detail) expect(finding?.message).toBe(`${shown} ${example.detail}`)
  expect(finding?.suggestions).toEqual(example.suggestion ? [example.suggestion] : undefined)
  expect(example.fixed).toContain(example.fix)
  expect(linter.lint(example.fixed, file)).toEqual([])
})

const script = `<script setup lang="ts">
defineProps<{ size: string; big: boolean }>()
</script>
`
// Turn each landing rule row into a small SFC that exercises only that rule.
function ruleSource(name: string, snippet: string) {
  if (name === "no-inline-styles" || name === "require-static-classes")
    return `${script}<template><div ${snippet} /></template>`
  if (snippet.startsWith("<")) {
    const tag = /^<([\w-]+)/.exec(snippet)![1]
    return `<template>${snippet}Save</${tag}></template>`
  }
  return `<template><div class="${snippet}" /></template>`
}

test.each(rules)("the $name landing row reports its bad case and passes its fix", async (rule) => {
  const linter = await createLinter({
    root,
    config: {
      rules: {
        "no-restricted-components": [
          "error",
          { components: [{ name: "OldButton", replacement: "UButton" }] },
        ],
      },
    },
  })
  const findings = linter.lint(ruleSource(rule.name, rule.bad), file)
  expect(findings.map((finding) => finding.rule)).toEqual([rule.name])
  expect(linter.lint(ruleSource(rule.name, rule.good), file)).toEqual([])
})
