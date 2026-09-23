import { expect, it } from "vitest"
import { createLinter } from "../src/index.js"

const css = '@import "tailwindcss";'
it("reports classless restricted tags with guidance and original locations", async () => {
  const linter = await createLinter({
    css,
    config: {
      note: "Team policy.",
      rules: {
        "no-restricted-components": [
          "error",
          {
            components: [
              {
                name: "CustomButton",
                replacement: "UButton",
                message: "Use our standard button for consistent behavior.",
              },
            ],
          },
        ],
      },
    },
  })
  expect(
    linter.lint("<template>\n  <CustomButton />\n  <Allowed />\n</template>", "Page.vue"),
  ).toEqual([
    {
      file: "Page.vue",
      rule: "no-restricted-components",
      severity: "error",
      component: "CustomButton",
      offset: 13,
      line: 2,
      column: 3,
      message:
        "<CustomButton> is restricted. Use <UButton> instead. Use our standard button for consistent behavior. Team policy.",
    },
  ])
})

it("matches Vue names without conflating acronyms or tracking renamed exports", async () => {
  const linter = await createLinter({
    css,
    config: {
      rules: {
        "no-restricted-components": [
          "error",
          { components: [{ name: "CustomButton" }, { name: "URLButton" }] },
        ],
      },
    },
  })
  const source = `<script setup lang="ts">
import { CustomButton as OtherButton, URLButton } from 'kit'
import type { CustomButton } from 'types'
import { type Unused } from 'types'
</script><template>
<CustomButton/><custom-button/><URLButton/><u-r-l-button/><url-button/>
<OtherButton/><other-button/><div/><div v-pre><CustomButton/></div>
</template>`
  expect(linter.lint(source).map(({ component }) => component)).toEqual([
    "CustomButton",
    "custom-button",
    "URLButton",
    "URLButton",
  ])
})

it("preserves restrictions for severity overrides and replaces or clears supplied lists", async () => {
  const linter = await createLinter({
    css,
    config: {
      rules: { "no-restricted-components": ["error", { components: [{ name: "CustomButton" }] }] },
      overrides: [
        { files: ["warn.vue"], rules: { "no-restricted-components": "warn" } },
        {
          files: ["replace.vue"],
          rules: { "no-restricted-components": ["error", { components: [{ name: "Allowed" }] }] },
        },
        {
          files: ["clear.vue"],
          rules: { "no-restricted-components": ["error", { components: [] }] },
        },
        { files: ["off.vue"], rules: { "no-restricted-components": "off" } },
      ],
    },
  })
  const source = "<template><CustomButton/><Allowed/></template>"
  expect(linter.lint(source, "warn.vue")).toEqual([
    expect.objectContaining({ severity: "warn", component: "CustomButton" }),
  ])
  expect(linter.lint(source, "replace.vue")).toEqual([
    expect.objectContaining({ component: "Allowed" }),
  ])
  expect(linter.lint(source, "clear.vue")).toEqual([])
  expect(linter.lint(source, "off.vue")).toEqual([])
  expect(linter.lint(source, "default.vue")).toEqual([
    expect.objectContaining({ severity: "error", component: "CustomButton" }),
  ])
})

it("restricts a static :is import like the direct tag and still rejects unresolved forms", async () => {
  const source = `<script setup>
import CustomButton from 'kit'
</script>
<template>
<component :is="CustomButton" />
<component :is="choice" />
</template>`
  const linter = await createLinter({
    css,
    config: {
      rules: {
        "no-restricted-components": ["warn", { components: [{ name: "CustomButton" }] }],
      },
    },
  })
  expect(linter.lint(source, "Page.vue")).toEqual([
    expect.objectContaining({
      rule: "no-restricted-components",
      severity: "warn",
      component: "CustomButton",
      offset: source.indexOf('<component :is="CustomButton"'),
    }),
    expect.objectContaining({
      rule: "parse-error",
      severity: "error",
      component: "component",
      offset: source.indexOf('<component :is="choice"'),
      message: expect.stringContaining("component coverage is incomplete"),
    }),
  ])
})

it("restricts a namespace member by its written name", async () => {
  const source = `<script setup>
import * as UI from 'kit'
import { Button } from 'other'
</script>
<template>
<UI.Button />
<component :is="UI.Button" />
<Button />
</template>`
  const linter = await createLinter({
    css,
    config: {
      rules: {
        "no-restricted-components": ["error", { components: [{ name: "UI.Button" }] }],
      },
    },
  })
  expect(
    linter.lint(source, "Page.vue").map(({ rule, component, offset }) => ({
      rule,
      component,
      offset,
    })),
  ).toEqual([
    {
      rule: "no-restricted-components",
      component: "UI.Button",
      offset: source.indexOf("<UI.Button"),
    },
    {
      rule: "no-restricted-components",
      component: "UI.Button",
      offset: source.indexOf('<component :is="UI.Button"'),
    },
  ])
})

it("reports unsupported coverage as errors even when restrictions are warnings", async () => {
  const source =
    '<template>\n<component :is="name"/><UI.Button/><div is="vue:CustomButton"/>\n</template>'
  const linter = await createLinter({
    css,
    config: {
      rules: {
        "no-restricted-components": ["warn", { components: [{ name: "CustomButton" }] }],
      },
    },
  })
  expect(
    linter.lint(source).map(({ rule, severity, offset, line, column }) => ({
      rule,
      severity,
      offset,
      line,
      column,
    })),
  ).toEqual([
    { rule: "parse-error", severity: "error", offset: 11, line: 2, column: 1 },
    { rule: "parse-error", severity: "error", offset: 34, line: 2, column: 24 },
    { rule: "parse-error", severity: "error", offset: 46, line: 2, column: 36 },
  ])
  for (const setting of ["off", "warn", ["error", { components: [] }]] as const) {
    const empty = await createLinter({
      css,
      config: {
        rules: {
          "no-restricted-components": Array.isArray(setting)
            ? ["error", { components: [] }]
            : (setting as "off" | "warn"),
        },
      },
    })
    expect(empty.lint(source)).toEqual([])
  }
})

it("enforces restrictions independently of styling recognition and discovery", async () => {
  const source = `<script setup>import CustomButton from 'kit'</script><template><CustomButton class="p-4"/></template>`
  const restriction = ["error", { components: [{ name: "CustomButton" }] }] as const
  for (const recognized of [false, true]) {
    const linter = await createLinter({
      css,
      config: {
        ui: [],
        components: recognized ? ["^CustomButton$"] : [],
        componentImports: [],
        ignoreImports: recognized ? [] : [".*"],
        project: false,
        rules: {
          "no-restricted-components": [
            restriction[0],
            { components: [...restriction[1].components] },
          ],
          "no-restyle": recognized ? "error" : "off",
        },
      },
    })
    expect(linter.lint(source).map(({ rule }) => rule)).toEqual(
      recognized ? ["no-restricted-components", "no-restyle"] : ["no-restricted-components"],
    )
  }
})

it("accepts an exact kebab-case restriction for PascalCase usage", async () => {
  const linter = await createLinter({
    css,
    config: {
      rules: {
        "no-restricted-components": ["error", { components: [{ name: "custom-button" }] }],
      },
    },
  })
  expect(
    linter
      .lint("<template><CustomButton/><custom-button/></template>")
      .map(({ component }) => component),
  ).toEqual(["CustomButton", "custom-button"])
})

it.each([
  { components: null },
  { components: [null] },
  { components: [{}] },
  { components: [{ name: "" }] },
  { components: [{ name: "   " }] },
  { components: [{ name: "Button", replacement: "" }] },
  { components: [{ name: "Button", message: 1 }] },
  { components: [{ name: "Button", extra: true }] },
  { allow: ["Button"] },
  { deny: ["Button"] },
  { contracts: [] },
  { message: "No" },
])("rejects malformed restriction options %j", async (options) => {
  await expect(
    createLinter({
      css,
      config: {
        rules: {
          // @ts-expect-error Deliberately invalid runtime configuration.
          "no-restricted-components": ["error", options],
        },
      },
    }),
  ).rejects.toThrow(/no-restricted-components/)
})

it("excludes native elements and v-pre literals even when their names are restricted", async () => {
  const linter = await createLinter({
    css,
    config: {
      rules: {
        "no-restricted-components": [
          "error",
          { components: [{ name: "div" }, { name: "CustomButton" }] },
        ],
      },
    },
  })
  expect(
    linter.lint("<template><div/><CustomButton v-pre/><div v-pre><CustomButton/></div></template>"),
  ).toEqual([])
})

it("reports runtime namespace imports but excludes type-only namespace aliases", async () => {
  const linter = await createLinter({
    css,
    config: {
      rules: {
        "no-restricted-components": ["error", { components: [{ name: "CustomButton" }] }],
      },
    },
  })
  const source = `<script setup lang="ts">
import * as RuntimeUI from 'kit'
import type * as TypeUI from 'types'
</script><template><RuntimeUI/><TypeUI/></template>`
  expect(linter.lint(source)).toEqual([
    expect.objectContaining({
      rule: "parse-error",
      severity: "error",
      component: "RuntimeUI",
      offset: source.indexOf("<RuntimeUI"),
    }),
  ])
})

it("preserves distinct exact and camelized runtime bindings", async () => {
  const source = `<script setup>
import CustomButton from 'one'
import customButton from 'two'
</script><template><CustomButton/><custom-button/></template>`
  const linter = await createLinter({
    css,
    config: {
      rules: {
        "no-restricted-components": ["error", { components: [{ name: "CustomButton" }] }],
      },
    },
  })
  expect(linter.lint(source)).toEqual([
    expect.objectContaining({
      component: "CustomButton",
      offset: source.indexOf("<CustomButton"),
    }),
  ])
})

it("keeps a global PascalCase component distinct from a lowercase import", async () => {
  const source = `<script setup>import customButton from 'kit'</script><template><CustomButton/><custom-button/></template>`
  const linter = await createLinter({
    css,
    config: {
      rules: {
        "no-restricted-components": ["error", { components: [{ name: "customButton" }] }],
      },
    },
  })
  expect(linter.lint(source)).toEqual([
    expect.objectContaining({
      component: "customButton",
      offset: source.indexOf("<custom-button"),
    }),
  ])
})
