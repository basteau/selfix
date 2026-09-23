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

it("restricts a renamed runtime import by its authored source and export", async () => {
  const source = `<script setup>
import { CustomButton as LegacyButton } from "some-ui"
</script>
<template>
  <LegacyButton />
</template>`
  const linter = await createLinter({
    css,
    config: {
      note: "Team policy.",
      rules: {
        "no-restricted-components": [
          "error",
          {
            imports: [
              {
                source: "some-ui",
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
  expect(linter.lint(source, "Page.vue")).toEqual([
    {
      file: "Page.vue",
      rule: "no-restricted-components",
      severity: "error",
      component: "LegacyButton",
      offset: source.indexOf("<LegacyButton"),
      line: 5,
      column: 3,
      message:
        "<LegacyButton> is restricted. Use <UButton> instead. Use our standard button for consistent behavior. Team policy.",
    },
  ])
})

it("treats default as the export name, including a renamed default", async () => {
  const source = `<script setup>
import LegacyButton from "some-ui"
import { default as OtherButton } from "some-ui"
import { CustomButton as Renamed } from "some-ui"
</script>
<template><LegacyButton/><OtherButton/><Renamed/></template>`
  const linter = await createLinter({
    css,
    config: {
      rules: {
        "no-restricted-components": [
          "error",
          { imports: [{ source: "some-ui", name: "default", replacement: "UButton" }] },
        ],
      },
    },
  })
  expect(linter.lint(source).map(({ component, message }) => ({ component, message }))).toEqual([
    {
      component: "LegacyButton",
      message: "<LegacyButton> is restricted. Use <UButton> instead.",
    },
    {
      component: "OtherButton",
      message: "<OtherButton> is restricted. Use <UButton> instead.",
    },
  ])
})

it("ignores type-only imports, other exports, other sources, natives, and shadowed bindings", async () => {
  const source = `<script setup lang="ts">
import { CustomButton as LegacyButton, OtherButton } from "some-ui"
import { CustomButton as ForeignButton } from "other-ui"
import { type CustomButton as TypedButton } from "some-ui"
import type { CustomButton as TypeOnlyButton } from "some-ui"
import { "custom-button" as QuotedButton } from "some-ui"
import * as UI from "some-ui"
</script>
<template>
<LegacyButton/>
<legacy-button/>
<OtherButton/>
<ForeignButton/>
<TypedButton/>
<TypeOnlyButton/>
<QuotedButton/>
<UI.Button/>
<div/>
<div v-for="LegacyButton in items"><component :is="LegacyButton"/><LegacyButton/></div>
</template>`
  const linter = await createLinter({
    css,
    config: {
      rules: {
        "no-restricted-components": [
          "error",
          { imports: [{ source: "some-ui", name: "CustomButton" }] },
        ],
      },
    },
  })
  expect(
    linter.lint(source).map(({ rule, component, offset }) => ({ rule, component, offset })),
  ).toEqual([
    {
      rule: "no-restricted-components",
      component: "LegacyButton",
      offset: source.indexOf("<LegacyButton"),
    },
    {
      rule: "no-restricted-components",
      component: "LegacyButton",
      offset: source.indexOf("<legacy-button"),
    },
    {
      rule: "parse-error",
      component: "component",
      offset: source.indexOf('<component :is="LegacyButton"'),
    },
    {
      rule: "no-restricted-components",
      component: "LegacyButton",
      offset: source.lastIndexOf("<LegacyButton"),
    },
  ])
})

it("restricts an unshadowed static :is binding by the imported export", async () => {
  const source = `<script setup>
import { CustomButton as LegacyButton } from "some-ui"
import { CustomButton } from "some-ui"
</script>
<template>
<component :is="LegacyButton" />
<CustomButton />
<component :is="choice" />
</template>`
  const linter = await createLinter({
    css,
    config: {
      rules: {
        "no-restricted-components": [
          "error",
          { imports: [{ source: "some-ui", name: "CustomButton", replacement: "UButton" }] },
        ],
      },
    },
  })
  expect(
    linter.lint(source).map(({ rule, component, offset, message }) => ({
      rule,
      component,
      offset,
      message,
    })),
  ).toEqual([
    {
      rule: "no-restricted-components",
      component: "LegacyButton",
      offset: source.indexOf('<component :is="LegacyButton"'),
      message: "<LegacyButton> is restricted. Use <UButton> instead.",
    },
    {
      rule: "no-restricted-components",
      component: "CustomButton",
      offset: source.indexOf("<CustomButton"),
      message: "<CustomButton> is restricted. Use <UButton> instead.",
    },
    {
      rule: "parse-error",
      component: "component",
      offset: source.indexOf('<component :is="choice"'),
      message: expect.stringContaining("component coverage is incomplete"),
    },
  ])
})

it("uses the first name restriction, then the first import restriction", async () => {
  const source = `<script setup>
import { CustomButton as LegacyButton } from "some-ui"
import { OtherButton as ForeignButton } from "other-ui"
</script>
<template><LegacyButton/><ForeignButton/></template>`
  const both = await createLinter({
    css,
    config: {
      rules: {
        "no-restricted-components": [
          "error",
          {
            components: [{ name: "LegacyButton", message: "Name guidance." }],
            imports: [
              { source: "some-ui", name: "CustomButton", message: "First import." },
              { source: "some-ui", name: "CustomButton", message: "Second import." },
              { source: "other-ui", name: "OtherButton", message: "Other source." },
            ],
          },
        ],
      },
    },
  })
  expect(both.lint(source).map(({ component, message }) => ({ component, message }))).toEqual([
    { component: "LegacyButton", message: "<LegacyButton> is restricted. Name guidance." },
    { component: "ForeignButton", message: "<ForeignButton> is restricted. Other source." },
  ])
  const importsOnly = await createLinter({
    css,
    config: {
      rules: {
        "no-restricted-components": [
          "error",
          {
            imports: [
              { source: "some-ui", name: "CustomButton", message: "First import." },
              { source: "some-ui", name: "CustomButton", message: "Second import." },
            ],
          },
        ],
      },
    },
  })
  expect(importsOnly.lint(source).map(({ message }) => message)).toEqual([
    "<LegacyButton> is restricted. First import.",
  ])
})

it("matches only the authored import string, not a prefix, alias, or barrel", async () => {
  const source = `<script setup>
import { CustomButton as KitButton } from "some-ui"
import { CustomButton as NestedButton } from "some-ui/button"
import { CustomButton as AliasButton } from "@/some-ui"
import { CustomButton as BarrelButton } from "./barrel"
import CustomButton from "some-ui"
import { "custom-button" as QuotedButton } from "some-ui"
</script>
<template><KitButton/><NestedButton/><AliasButton/><BarrelButton/><CustomButton/><QuotedButton/></template>`
  const exact = await createLinter({
    css,
    config: {
      rules: {
        "no-restricted-components": [
          "error",
          { imports: [{ source: "some-ui", name: "CustomButton" }] },
        ],
      },
    },
  })
  expect(exact.lint(source).map(({ component }) => component)).toEqual(["KitButton"])
  const quoted = await createLinter({
    css,
    config: {
      rules: {
        "no-restricted-components": [
          "error",
          { imports: [{ source: "some-ui", name: "custom-button" }] },
        ],
      },
    },
  })
  expect(quoted.lint(source).map(({ component }) => component)).toEqual(["QuotedButton"])
  const global = await createLinter({
    css,
    config: {
      rules: {
        "no-restricted-components": [
          "error",
          { imports: [{ source: "some-ui", name: "CustomButton" }] },
        ],
      },
    },
  })
  expect(global.lint("<template><CustomButton/></template>")).toEqual([])
})

it("replaces import and name lists independently in file overrides", async () => {
  const source = `<script setup>
import { CustomButton as LegacyButton } from "some-ui"
</script>
<template><CustomButton/><LegacyButton/></template>`
  const linter = await createLinter({
    css,
    config: {
      rules: {
        "no-restricted-components": [
          "error",
          {
            components: [{ name: "CustomButton", message: "By name." }],
            imports: [{ source: "some-ui", name: "CustomButton", message: "By import." }],
          },
        ],
      },
      overrides: [
        { files: ["warn.vue"], rules: { "no-restricted-components": "warn" } },
        {
          files: ["names.vue"],
          rules: {
            "no-restricted-components": ["error", { components: [{ name: "Allowed" }] }],
          },
        },
        {
          files: ["clear-imports.vue"],
          rules: { "no-restricted-components": ["error", { imports: [] }] },
        },
        {
          files: ["imports.vue"],
          rules: {
            "no-restricted-components": [
              "error",
              { imports: [{ source: "other-ui", name: "CustomButton", message: "Replaced." }] },
            ],
          },
        },
      ],
    },
  })
  const messages = (filename: string) =>
    linter.lint(source, filename).map(({ severity, component, message }) => ({
      severity,
      component,
      message,
    }))
  expect(messages("default.vue")).toEqual([
    {
      severity: "error",
      component: "CustomButton",
      message: "<CustomButton> is restricted. By name.",
    },
    {
      severity: "error",
      component: "LegacyButton",
      message: "<LegacyButton> is restricted. By import.",
    },
  ])
  expect(messages("warn.vue")).toEqual([
    {
      severity: "warn",
      component: "CustomButton",
      message: "<CustomButton> is restricted. By name.",
    },
    {
      severity: "warn",
      component: "LegacyButton",
      message: "<LegacyButton> is restricted. By import.",
    },
  ])
  expect(messages("names.vue")).toEqual([
    {
      severity: "error",
      component: "LegacyButton",
      message: "<LegacyButton> is restricted. By import.",
    },
  ])
  expect(messages("clear-imports.vue")).toEqual([
    {
      severity: "error",
      component: "CustomButton",
      message: "<CustomButton> is restricted. By name.",
    },
  ])
  expect(messages("imports.vue")).toEqual([
    {
      severity: "error",
      component: "CustomButton",
      message: "<CustomButton> is restricted. By name.",
    },
  ])
})

it("requires coverage for unresolved components when only import restrictions are configured", async () => {
  const source = '<template><component :is="choice"/></template>'
  const active = await createLinter({
    css,
    config: {
      rules: {
        "no-restricted-components": [
          "warn",
          { imports: [{ source: "some-ui", name: "CustomButton" }] },
        ],
      },
    },
  })
  expect(active.lint(source)).toEqual([
    expect.objectContaining({
      rule: "parse-error",
      severity: "error",
      component: "component",
      message: expect.stringContaining("component coverage is incomplete"),
    }),
  ])
  const empty = await createLinter({
    css,
    config: {
      rules: { "no-restricted-components": ["error", { imports: [] }] },
    },
  })
  expect(empty.lint(source)).toEqual([])
  expect(
    empty.lint(`<script setup>
import { CustomButton as LegacyButton } from "some-ui"
</script><template><LegacyButton/></template>`),
  ).toEqual([])
})

it("enforces import restrictions independently of styling recognition", async () => {
  const source = `<script setup>import { CustomButton as LegacyButton } from "kit"</script><template><LegacyButton class="p-4"/></template>`
  for (const recognized of [false, true]) {
    const linter = await createLinter({
      css,
      config: {
        ui: [],
        components: recognized ? ["^LegacyButton$"] : [],
        componentImports: [],
        ignoreImports: recognized ? [] : [".*"],
        project: false,
        rules: {
          "no-restricted-components": [
            "error",
            { imports: [{ source: "kit", name: "CustomButton" }] },
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
  { imports: null },
  { imports: [null] },
  { imports: [{}] },
  { imports: [{ source: "some-ui" }] },
  { imports: [{ name: "Button" }] },
  { imports: [{ source: "", name: "Button" }] },
  { imports: [{ source: " ", name: "Button" }] },
  { imports: [{ source: "some-ui", name: "" }] },
  { imports: [{ source: "some-ui", name: "Button", replacement: "" }] },
  { imports: [{ source: "some-ui", name: "Button", extra: true }] },
  { imports: "some-ui" },
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
