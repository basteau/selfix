import { readFile } from "node:fs/promises"
import { expect, test } from "vitest"
import { createLinter } from "../../packages/selfix/src/index.js"

// The contract scenarios in content/configuration.md. The test checks the page shows them.
const page = await readFile(new URL("./content/configuration.md", import.meta.url), "utf8")
const scenarios: {
  contract: { pattern: string; allow: string[]; deny?: string[] }
  component: string
  passes: string
  reported: [className: string, rule: string]
}[] = [
  {
    contract: { pattern: "^Button$", allow: ["w-full", "mt-*", "mb-*"] },
    component: "Button",
    passes: "mt-4 w-full",
    reported: ["mx-2", "no-restyle"],
  },
  {
    contract: { pattern: "^CardTitle$", allow: ["layout", "typography"], deny: ["font-*"] },
    component: "CardTitle",
    passes: "text-lg",
    reported: ["font-bold", "no-restyle"],
  },
  {
    contract: { pattern: "^CardContent$", allow: ["layout", "spacing"] },
    component: "CardContent",
    passes: "p-6 md:p-8",
    reported: ["p-[13px]", "no-arbitrary-values"],
  },
]

test.each(scenarios)("the $component contract example behaves as documented", async (scenario) => {
  const linter = await createLinter({
    css: '@import "tailwindcss";',
    config: { rules: { "no-restyle": ["error", { contracts: [scenario.contract] }] } },
  })
  const lint = (classes: string) =>
    linter.lint(
      `<script setup>import { ${scenario.component} } from "@/components/ui"</script><template><${scenario.component} class="${classes}" /></template>`,
      "Page.vue",
    )
  expect(page).toContain(`pattern: "${scenario.contract.pattern}"`)
  expect(page).toContain(`<${scenario.component} class="${scenario.passes}">`)
  expect(page).toContain(scenario.reported[0])
  expect(lint(scenario.passes)).toEqual([])
  const [className, rule] = scenario.reported
  expect(lint(className).map((finding) => [finding.className, finding.rule])).toEqual([
    [className, rule],
  ])
})
