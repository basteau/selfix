import { readFile } from "node:fs/promises"
import { expect, test } from "vitest"
import { createLinter } from "../../packages/selfix/src/index.js"
import { examples, rules, theme } from "./landing-examples.js"

test("the published tutorial reports the shown location and accepts its correction", async () => {
  const guide = await readFile(new URL("./content/getting-started.md", import.meta.url), "utf8")
  const source = guide.match(/```vue\n(<script setup[\s\S]*?)\n```/)?.[1]
  expect(source).toBeDefined()
  const linter = await createLinter({
    css: '@import "tailwindcss";',
    config: { ui: ["./components/ui"] },
  })
  const findings = linter.lint(source!, "src/Example.vue")
  expect(findings).toHaveLength(1)
  expect(findings[0]).toMatchObject({ rule: "no-restyle", severity: "error", line: 6, column: 11 })
  expect(findings[0]?.message).toContain('"p-4" is not allowed on <Button>')
  expect(
    linter.lint(source!.replace('class="p-4"', 'class="mt-4 w-full"'), "src/Example.vue"),
  ).toEqual([])
})

test.each(examples)("the $label landing example matches the linter", async (example) => {
  const linter = await createLinter({ css: theme })
  const [finding, ...rest] = linter.lint(example.source, "src/Example.vue")
  expect(rest).toEqual([])
  expect(finding).toMatchObject({ rule: example.rule, severity: "error" })
  expect(`${finding?.line}:${finding?.column}`).toBe(example.location)
  const shown = example.message.replace(/ …$/, "")
  expect(finding?.message.startsWith(shown)).toBe(true)
  if (example.detail) expect(finding?.message).toBe(`${shown} ${example.detail}`)
  expect(finding?.suggestions).toEqual(example.suggestion ? [example.suggestion] : undefined)
  expect(example.fixed).toContain(example.fix)
  expect(linter.lint(example.fixed, "src/Example.vue")).toEqual([])
})

const script = `<script setup lang="ts">
import { Button } from "@/components/ui"
defineProps<{ size: string; big: boolean }>()
</script>
`
// Turn each landing rule row into a small SFC that exercises only that rule.
function ruleSource(name: string, snippet: string) {
  if (name === "no-restyle") return `${script}<template>${snippet}Save</Button></template>`
  if (name === "no-inline-styles" || name === "require-static-classes")
    return `${script}<template><div ${snippet} /></template>`
  if (name === "no-restricted-components")
    return `<template>${snippet}Save</${snippet.slice(1, -1)}></template>`
  return `<template><div class="${snippet}" /></template>`
}

test.each(rules)("the $name landing row reports its bad case and passes its fix", async (rule) => {
  const linter = await createLinter({
    css: theme,
    config: {
      rules: {
        "no-restricted-components": [
          "error",
          { components: [{ name: "OldButton", replacement: "Button" }] },
        ],
      },
    },
  })
  const findings = linter.lint(ruleSource(rule.name, rule.bad), "src/Example.vue")
  expect(findings.map((finding) => finding.rule)).toEqual([rule.name])
  expect(linter.lint(ruleSource(rule.name, rule.good), "src/Example.vue")).toEqual([])
})
