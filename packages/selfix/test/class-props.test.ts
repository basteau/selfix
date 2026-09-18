import { describe, expect, it } from "vitest"
import { createLinter, defineConfig, type Config } from "../src/index.js"
import { collectVue } from "../src/vue.js"

const classProps: NonNullable<Config["classProps"]> = [
  { pattern: "^UButton$", props: { ui: "slot-map", contentClass: "class" } },
]

describe("configured class props", () => {
  it.each([false, true])(
    "preserves configured bindings with Vue modifiers (fallback: %s)",
    (forceCompileTemplateAst) => {
      const source = `<template><UButton :content-class.prop="'p-[13px]'" :ui.attr="{ base: 'flex' }" /></template>`
      const result = collectVue(source, "props.vue", { classProps, forceCompileTemplateAst })
      expect(result.errors).toEqual([])
      expect(result.sites).toEqual([
        {
          component: "UButton",
          prop: "content-class",
          tokens: ["p-[13px]"],
          dynamic: false,
          offset: source.indexOf(":content-class"),
        },
        {
          component: "UButton",
          prop: "ui",
          slot: "base",
          tokens: ["flex"],
          dynamic: false,
          offset: source.indexOf(":ui"),
        },
      ])
    },
  )
  it("applies component contracts to slots and reports original prop locations", async () => {
    const linter = await createLinter({
      css: '@import "tailwindcss";',
      config: {
        classProps,
        components: ["^UButton$"],
        rules: {
          "no-restyle": [
            "warn",
            {
              contracts: [
                {
                  pattern: "^UButton$",
                  deny: ["p-*"],
                  message: "Blocked {{className}} in {{prop}}/{{slot}}",
                },
              ],
            },
          ],
        },
      },
    })
    const source = `<template>\n  <UButton :ui="{ base: 'p-4', label: 'flex' }" />\n</template>`
    expect(linter.lint(source, "props.vue")).toEqual([
      {
        file: "props.vue",
        rule: "no-restyle",
        severity: "warn",
        message: 'Blocked p-4 in ui/base [prop "ui", slot "base"]',
        component: "UButton",
        className: "p-4",
        prop: "ui",
        slot: "base",
        line: 2,
        column: 12,
        offset: source.indexOf(":ui"),
      },
    ])
  })
  it("accepts component-scoped class modes and diagnostic placeholders", () => {
    expect(() =>
      defineConfig({
        classProps: [{ pattern: "^UButton$", props: { ui: "slot-map", contentClass: "class" } }],
        rules: { "no-restyle": ["error", { message: "{{prop}} {{slot}}" }] },
      }),
    ).not.toThrow()
  })

  it.each([false, true])(
    "collects literal slot values and class props (fallback: %s)",
    (forceCompileTemplateAst) => {
      const source = `<template>
  <UButton content-class="mt-4" :ui="{ base: 'p-[13px]', label: { truncate: enabled } }" :class="{ flex: enabled }" />
  <Other :ui="{ base: 'ignored' }" />
</template>`
      const result = collectVue(source, "props.vue", { classProps, forceCompileTemplateAst })
      expect(result.errors).toEqual([])
      expect(result.sites).toEqual([
        {
          component: "UButton",
          tokens: ["mt-4"],
          dynamic: false,
          prop: "content-class",
          offset: source.indexOf("content-class"),
        },
        {
          component: "UButton",
          tokens: ["p-[13px]"],
          dynamic: false,
          prop: "ui",
          slot: "base",
          offset: source.indexOf(":ui"),
        },
        {
          component: "UButton",
          tokens: ["truncate"],
          dynamic: false,
          prop: "ui",
          slot: "label",
          offset: source.indexOf(":ui"),
        },
        {
          component: "UButton",
          tokens: ["flex"],
          dynamic: false,
          offset: source.indexOf(":class"),
        },
      ])
    },
  )

  it.each([
    null,
    {},
    [{ pattern: "[", props: {} }],
    [{ pattern: "^U", props: null }],
    [{ pattern: "^U", props: { ui: "map" } }],
    [{ pattern: "^U", props: { class: "slot-map" } }],
    [{ pattern: "^U", props: { style: "class" } }],
    [{ pattern: "^U", props: { "": "class" } }],
    [{ pattern: "^U", props: { contentClass: "class", "content-class": "slot-map" } }],
    [{ pattern: "^U", props: {}, typo: true }],
  ])("rejects invalid class prop configuration: %j", (value) => {
    expect(() => defineConfig({ classProps: value } as Config)).toThrow(/classProps/)
  })

  it.each([false, true])(
    "normalizes names and reads literal v-bind objects (fallback: %s)",
    (forceCompileTemplateAst) => {
      const source = `<script setup>import { UButton } from 'example-ui'; const contentClass = 'mt-2'</script>
<template>
  <UButton :contentClass="['flex', { truncate: enabled }]" />
  <UButton :content-class="contentClass" />
  <UButton v-bind="{ contentClass: 'mt-4', 'ui': { base: 'flex' } }" />
  <UButton v-bind="{ 'content-class': 'mt-6', ui: { label: ['truncate'] } }" />
</template>`
      const result = collectVue(source, "props.vue", { classProps, forceCompileTemplateAst })
      expect(result.errors).toEqual([])
      expect(
        result.sites.map(({ prop, slot, tokens, dynamic, component, importSource }) => ({
          prop,
          slot,
          tokens,
          dynamic,
          component,
          importSource,
        })),
      ).toEqual([
        {
          prop: "content-class",
          slot: undefined,
          tokens: ["flex", "truncate"],
          dynamic: false,
          component: "UButton",
          importSource: "example-ui",
        },
        {
          prop: "content-class",
          slot: undefined,
          tokens: ["mt-2"],
          dynamic: false,
          component: "UButton",
          importSource: "example-ui",
        },
        {
          prop: "content-class",
          slot: undefined,
          tokens: ["mt-4"],
          dynamic: false,
          component: "UButton",
          importSource: "example-ui",
        },
        {
          prop: "ui",
          slot: "base",
          tokens: ["flex"],
          dynamic: false,
          component: "UButton",
          importSource: "example-ui",
        },
        {
          prop: "content-class",
          slot: undefined,
          tokens: ["mt-6"],
          dynamic: false,
          component: "UButton",
          importSource: "example-ui",
        },
        {
          prop: "ui",
          slot: "label",
          tokens: ["truncate"],
          dynamic: false,
          component: "UButton",
          importSource: "example-ui",
        },
      ])
    },
  )

  it("uses the first matching component entry without merging later props", () => {
    const result = collectVue(
      `<template><UButton ui="flex" content-class="ignored" /><Other ui="ignored" /></template>`,
      "props.vue",
      {
        classProps: [{ pattern: "^U", props: { ui: "class" } }, ...classProps],
      },
    )
    expect(result.sites.map(({ prop, tokens }) => ({ prop, tokens }))).toEqual([
      { prop: "ui", tokens: ["flex"] },
    ])
  })

  it.each([false, true])(
    "supports same-name class prop shorthand (fallback: %s)",
    (forceCompileTemplateAst) => {
      const source = `<script setup>const contentClass = 'flex'</script><template><UButton :content-class /><UButton :ui /></template>`
      const result = collectVue(source, "props.vue", { classProps, forceCompileTemplateAst })
      expect(result.errors).toEqual([])
      expect(result.sites.map(({ prop, tokens, dynamic }) => ({ prop, tokens, dynamic }))).toEqual([
        { prop: "content-class", tokens: ["flex"], dynamic: false },
        { prop: "ui", tokens: [], dynamic: true },
      ])
    },
  )

  it("matches imported local component names and normalized configured prop names", () => {
    const result = collectVue(
      `<script setup>import { Button as BaseButton } from 'example-ui'</script><template><base-button :contentClass="'flex'" /></template>`,
      "props.vue",
      {
        classProps: [{ pattern: "^BaseButton$", props: { "content-class": "class" } }],
      },
    )
    expect(result.sites).toEqual([
      expect.objectContaining({
        component: "BaseButton",
        prop: "content-class",
        tokens: ["flex"],
        dynamic: false,
        importSource: "example-ui",
      }),
    ])
  })

  it.each([false, true])(
    "preserves known slots alongside unresolved entries without executing expressions (fallback: %s)",
    (forceCompileTemplateAst) => {
      const source = `<template><UButton :ui="{
      base: 'p-[13px]',
      label: ['truncate', unknown],
      ...unknownMap,
      [key]: 'hidden',
      get icon() { throw new Error('must not execute') },
      trailing: (() => { throw new Error('must not execute') })()
    }" /></template>`
      const result = collectVue(source, "props.vue", { classProps, forceCompileTemplateAst })
      expect(result.errors).toEqual([])
      expect(
        result.sites.map(({ prop, slot, tokens, dynamic }) => ({ prop, slot, tokens, dynamic })),
      ).toEqual([
        { prop: "ui", slot: "base", tokens: ["p-[13px]"], dynamic: false },
        { prop: "ui", slot: "label", tokens: ["truncate"], dynamic: true },
        { prop: "ui", slot: undefined, tokens: [], dynamic: true },
        { prop: "ui", slot: "trailing", tokens: [], dynamic: true },
      ])
    },
  )

  it("reports unresolved maps while retaining independently readable violations", async () => {
    const linter = await createLinter({ css: '@import "tailwindcss";', config: { classProps } })
    const diagnostics = linter.lint(`<template>
      <UButton :ui="{ base: 'p-[13px]', ...unknown }" />
      <UButton :ui="mapVariable" />
      <UButton ui="not-a-map" />
      <UButton :content-class="(() => { throw new Error('must not execute') })()" />
    </template>`)
    expect(
      diagnostics.map(({ rule, prop, slot, className }) => ({ rule, prop, slot, className })),
    ).toEqual([
      { rule: "no-arbitrary-values", prop: "ui", slot: "base", className: "p-[13px]" },
      { rule: "require-static-classes", prop: "ui", slot: undefined, className: undefined },
      { rule: "require-static-classes", prop: "ui", slot: undefined, className: undefined },
      { rule: "require-static-classes", prop: "ui", slot: undefined, className: undefined },
      {
        rule: "require-static-classes",
        prop: "content-class",
        slot: undefined,
        className: undefined,
      },
    ])
    expect(diagnostics.every(({ rule }) => rule !== "no-restyle")).toBe(true)
  })

  it("honors scope shadowing for configured class expressions", () => {
    const source = `<script setup>const contentClass = 'flex'</script>
<template>
  <UButton :content-class="contentClass" :ui="{ base: contentClass }" v-slot="{ contentClass }">
    <UButton :content-class="contentClass" :ui="{ base: contentClass }" />
  </UButton>
</template>`
    const result = collectVue(source, "props.vue", { classProps })
    expect(result.sites.map(({ tokens, dynamic }) => ({ tokens, dynamic }))).toEqual([
      { tokens: ["flex"], dynamic: false },
      { tokens: ["flex"], dynamic: false },
      { tokens: [], dynamic: true },
      { tokens: [], dynamic: true },
    ])
  })
})
