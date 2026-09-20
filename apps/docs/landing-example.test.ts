import { readFile } from "node:fs/promises"
import { expect, test } from "vitest"
import { createLinter } from "../../packages/selfix/src/index.js"

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
