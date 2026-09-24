import { describe, expect, it } from "vitest"
import { createLinter, defineConfig, type Config } from "../src/index.js"
import { collectVue } from "../src/vue.js"

describe("class helpers", () => {
  it("accepts configured imports and reports their literal arguments through the public API", async () => {
    const config = defineConfig({
      classHelpers: [
        { from: "@/utils", import: "cn" },
        { from: "my-classes", import: "default" },
      ],
      rules: { "no-arbitrary-values": "error", "require-static-classes": "error" },
    })
    const linter = await createLinter({ css: '@import "tailwindcss";', config })
    const source = `<script setup>
import { cn as custom } from '@/utils'
import join from 'my-classes'
</script>
<template><div :class="custom(join('p-[13px]'))" /></template>`
    expect(linter.doctor(source, "helpers.vue").issues).toEqual([])
    expect(linter.lint(source, "helpers.vue")).toEqual([
      expect.objectContaining({
        rule: "no-arbitrary-values",
        className: "p-[13px]",
        offset: source.indexOf(":class"),
        line: 5,
        column: 16,
      }),
    ])
  })

  it("reports shadowed configured calls at their original location", async () => {
    const linter = await createLinter({
      css: '@import "tailwindcss";',
      config: { classHelpers: [{ from: "@/utils", import: "cn" }] },
    })
    const source = `<script setup>import { cn as custom } from '@/utils'</script>
<template><Box v-slot="{ custom }"><div :class="custom('p-[13px]')" /></Box></template>`
    expect(linter.lint(source, "helpers.vue")).toEqual([
      expect.objectContaining({
        rule: "require-static-classes",
        offset: source.indexOf(":class"),
        line: 2,
        column: 41,
      }),
    ])
  })

  it.each([
    null,
    {},
    [{}],
    [{ from: "", import: "cn" }],
    [{ from: "x", import: " " }],
    [{ from: "x", import: "cn", name: "cx" }],
  ])("rejects invalid configuration: %j", (classHelpers) => {
    expect(() => defineConfig({ classHelpers } as Config)).toThrow(/classHelpers/)
  })
  it.each([false, true])(
    "preserves configured helper scopes and argument limits (fallback: %s)",
    (forceCompileTemplateAst) => {
      const source = `<script setup>
import { cn as custom } from '@/utils'
import join from 'my-classes'
import other from 'other'
import * as utils from '@/utils'
import { cva } from 'class-variance-authority'
import { tv } from 'tailwind-variants'
const local = () => { throw new Error('never execute') }
const alias = custom
</script><template>
<div :class="custom(join(['flex']), { hidden: active }, active ? 'p-2' : 'p-4')" />
<Box v-slot="{ custom }" :class="custom('m-2')"><div :class="custom('unsafe')" /></Box>
<div v-for="custom in rows" :class="custom('unsafe')" />
<div :class="custom('m-4', ...unknown)" />
<div :class="[other('unsafe'), utils.cn('unsafe'), local('unsafe'), alias('unsafe'), cva('unsafe'), tv({ base: 'unsafe' })]" />
<div :class="custom('m-6')" />
</template>`
      const result = collectVue(source, "helpers.vue", {
        forceCompileTemplateAst,
        classHelpers: [
          { from: "@/utils", import: "cn" },
          { from: "my-classes", import: "default" },
        ],
      })
      expect(result.errors).toEqual([])
      expect(result.sites.map(({ tokens, dynamic }) => ({ tokens, dynamic }))).toEqual([
        { tokens: ["flex", "hidden", "p-2", "p-4"], dynamic: false },
        { tokens: ["m-2"], dynamic: false },
        { tokens: [], dynamic: true },
        { tokens: [], dynamic: true },
        { tokens: ["m-4"], dynamic: true },
        { tokens: [], dynamic: true },
        { tokens: ["m-6"], dynamic: false },
      ])
    },
  )

  it.each([
    "import type { clsx as cx } from 'clsx'",
    "import { type clsx as cx } from 'clsx'",
    "import cx from 'tailwind-merge'",
    "import { different as cx } from 'clsx'",
    "import { clsx as cx } from 'other'",
    "const cx = () => { throw new Error('never execute') }",
  ])("does not infer helper identity: %s", (declaration) => {
    const result = collectVue(
      `<script setup lang="ts">${declaration}</script><template><div :class="cx('unsafe')" /></template>`,
      "helpers.vue",
      { classHelpers: [{ from: "@/utils", import: "cx" }] },
    )
    expect(result.errors).toEqual([])
    expect(result.sites[0]).toMatchObject({ tokens: [], dynamic: true })
  })

  it("local declarations in either script block override imported recognition", () => {
    const source = `<script>function cx() { throw new Error('never execute') }</script>
<script setup>import cx from 'clsx'</script><template><div :class="cx('unsafe')" /></template>`
    expect(collectVue(source, "helpers.vue").sites[0]).toMatchObject({ tokens: [], dynamic: true })
  })

  it.each([false, true])(
    "recognizes built-in import aliases (fallback: %s)",
    (forceCompileTemplateAst) => {
      const source = `<script setup>
import cx from 'clsx'
import { clsx as classes } from 'clsx'
import { twMerge as merge } from 'tailwind-merge'
</script><template><div :class="cx('flex', classes('p-2'), merge('m-4'))" /></template>`
      const result = collectVue(source, "helpers.vue", { forceCompileTemplateAst })
      expect(result.errors).toEqual([])
      expect(result.sites).toEqual([
        {
          component: "div",
          tokens: ["flex", "p-2", "m-4"],
          dynamic: false,
          offset: source.indexOf(":class"),
        },
      ])
    },
  )
})
