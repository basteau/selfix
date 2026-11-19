import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import path from "node:path"
import { afterAll, expect, test } from "vitest"
import { createLinter } from "../../packages/selfix/src/index.js"
import { installNuxtUi } from "../../packages/selfix/test/nuxt-ui-fixture.js"

const root = mkdtempSync(path.join(process.cwd(), ".selfix-test-"))
installNuxtUi(root)
writeFileSync(path.join(root, "main.css"), '@import "tailwindcss";\n@import "@nuxt/ui";\n')
afterAll(() => rmSync(root, { recursive: true, force: true }))

// The contract scenarios in content/configuration.md. The test checks the page shows them.
const page = readFileSync(new URL("./content/configuration.md", import.meta.url), "utf8")
const scenarios: {
  contract: { pattern: string; allow: string[]; deny?: string[] }
  component: string
  passes: string
  reported: [className: string, rule: string]
}[] = [
  {
    contract: { pattern: "^UButton$", allow: ["w-full", "mt-*", "mb-*"] },
    component: "UButton",
    passes: "mt-4 w-full",
    reported: ["mx-2", "no-restyle"],
  },
  {
    contract: { pattern: "^UFormField$", allow: ["layout", "typography"], deny: ["font-*"] },
    component: "UFormField",
    passes: "text-lg",
    reported: ["font-bold", "no-restyle"],
  },
  {
    contract: { pattern: "^UCard$", allow: ["layout", "spacing"] },
    component: "UCard",
    passes: "p-6 md:p-8",
    reported: ["p-[13px]", "no-arbitrary-values"],
  },
]

test.each(scenarios)("the $component contract example behaves as documented", async (scenario) => {
  const linter = await createLinter({
    root,
    config: { rules: { "no-restyle": ["error", { contracts: [scenario.contract] }] } },
  })
  const lint = (classes: string) =>
    linter.lint(`<template><${scenario.component} class="${classes}" /></template>`, "Page.vue")
  expect(page).toContain(`pattern: "${scenario.contract.pattern}"`)
  expect(page).toContain(`<${scenario.component} class="${scenario.passes}">`)
  expect(page).toContain(scenario.reported[0])
  expect(lint(scenario.passes)).toEqual([])
  const [className, rule] = scenario.reported
  expect(lint(className).map((finding) => [finding.className, finding.rule])).toEqual([
    [className, rule],
  ])
})

test("the documented examples for ui slots, custom messages, and the example config hold", async () => {
  const card = await createLinter({
    root,
    config: {
      rules: {
        "no-restyle": [
          "error",
          { contracts: [{ pattern: "^UCard$", allow: ["layout", "spacing"] }] },
        ],
      },
    },
  })
  expect(page).toContain(`:ui="{ body: 'p-0' }"`)
  expect(
    card.lint(`<template><LazyUCard :ui="{ body: 'p-0' }" /><u-card class="p-2" /></template>`),
  ).toEqual([])

  const message = "Use a {{component}} size instead of {{className}}: {{sizes|none defined}}."
  expect(page).toContain(`message: "${message}"`)
  expect(page).toContain("`Use a UButton size instead of p-4: xs, sm, md, lg, xl.`")
  const custom = await createLinter({
    root,
    config: { rules: { "no-restyle": ["error", { message }] } },
  })
  expect(custom.lint('<template><UButton class="p-4" /></template>')[0]?.message).toBe(
    "Use a UButton size instead of p-4: xs, sm, md, lg, xl.",
  )

  // The annotated config at the top of the page is valid as written.
  const example = page.match(/```ts\n(import \{ defineConfig \} from "selfix"[\s\S]*?)\n```/)?.[1]
  expect(example).toBeDefined()
  const config = new Function(
    "defineConfig",
    example!.replace(/^import .*\n/, "").replace("export default", "return"),
  )((value: unknown) => value)
  await expect(createLinter({ root, config })).resolves.toMatchObject({ nuxtUi: true })
})
