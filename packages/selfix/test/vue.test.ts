import { describe, expect, it } from "vitest"
import { collectVue } from "../src/vue.js"

describe("collectVue", () => {
  it.each([false, true])(
    "preserves decoded expressions in slot scopes (fallback: %s)",
    (forceCompileTemplateAst) => {
      const source = `<script setup>const local = 'p-2';</script>
<template>
  <Box v-slot="{ local = &quot;m-2&quot; }" :class="local">
    <div :class="local" />
    <div :class="&quot;gap-2&quot;" />
    <div v-bind="{ class: &quot;p-4&quot; }" />
  </Box>
</template>`
      const result = collectVue(source, "entities.vue", { forceCompileTemplateAst })
      expect(result.errors).toEqual([])
      expect(result.sites.map(({ tokens, dynamic }) => ({ tokens, dynamic }))).toEqual([
        { tokens: ["p-2"], dynamic: false },
        { tokens: [], dynamic: true },
        { tokens: ["gap-2"], dynamic: false },
        { tokens: ["p-4"], dynamic: false },
      ])
      expect(result.sites.map(({ offset }) => offset)).toEqual(
        [...source.matchAll(/:class=|v-bind=/gu)].map((match) => match.index),
      )
    },
  )

  it.each([false, true])(
    "preserves nested slot and loop boundaries (fallback: %s)",
    (forceCompileTemplateAst) => {
      const source = `<script setup>
const outer = 'p-2'; const inner = 'm-2'; const loop = 'gap-2';
</script>
<template>
  <section :class="outer">
    <Box v-slot="{ value: [outer] }" :class="outer">
      <Box v-slot="{ inner = (() => { throw new Error('never run') })() }" :class="[outer, inner]">
        <div :class="[outer, inner]" />
      </Box>
      <div :class="inner" />
      <Box v-slot="{ inner }" v-for="loop in rows" :class="[loop, inner]">
        <div :class="[loop, inner]" />
      </Box>
      <div :class="loop" />
    </Box>
    <div :class="[outer, inner, loop]" />
  </section>
</template>`
      const result = collectVue(source, "nested-scopes.vue", { forceCompileTemplateAst })
      expect(result.errors).toEqual([])
      expect(result.sites.map(({ tokens, dynamic }) => ({ tokens, dynamic }))).toEqual([
        { tokens: ["p-2"], dynamic: false },
        { tokens: ["p-2"], dynamic: false },
        { tokens: ["m-2"], dynamic: true },
        { tokens: [], dynamic: true },
        { tokens: ["m-2"], dynamic: false },
        { tokens: ["m-2"], dynamic: true },
        { tokens: [], dynamic: true },
        { tokens: ["gap-2"], dynamic: false },
        { tokens: ["p-2", "m-2", "gap-2"], dynamic: false },
      ])
      expect(result.sites.map(({ offset }) => offset)).toEqual(
        [...source.matchAll(/:class=/gu)].map((match) => match.index),
      )
    },
  )

  it.each([false, true])(
    "keeps slot bindings out of owner attributes (fallback: %s)",
    (forceCompileTemplateAst) => {
      const source = `<script setup>const local = 'p-2';</script>
<template>
  <Box v-slot="{ local, cn }" :class="[local, cn('m-2')]">
    <div :class="[local, cn('m-2')]" />
  </Box>
  <div :class="[local, cn('m-2')]" />
</template>`
      const result = collectVue(source, "slot-owner.vue", { forceCompileTemplateAst })
      expect(result.errors).toEqual([])
      expect(result.sites.map(({ tokens, dynamic }) => ({ tokens, dynamic }))).toEqual([
        { tokens: ["p-2", "m-2"], dynamic: false },
        { tokens: [], dynamic: true },
        { tokens: ["p-2", "m-2"], dynamic: false },
      ])
      expect(result.sites.map(({ offset }) => offset)).toEqual(
        [...source.matchAll(/:class=/gu)].map((match) => match.index),
      )
    },
  )

  it.each([false, true])(
    "respects helper template scopes (fallback: %s)",
    (forceCompileTemplateAst) => {
      const source = `<template>
  <Box v-slot="{ cn = (() => { throw new Error('never run') })() }">
    <div :class="cn('p-2')" />
    <div :class="clsx('m-2')" />
  </Box>
  <div v-for="(twMerge, clsx) in rows" :class="[twMerge('p-2'), clsx('p-4')]" />
  <Box v-slot="{ clsx: other }"><div :class="clsx('m-4')" /></Box>
  <div :class="[cn('p-2'), clsx('p-4'), twMerge('p-6')]" />
</template>`
      const result = collectVue(source, "helper-scopes.vue", { forceCompileTemplateAst })
      expect(result.errors).toEqual([])
      expect(result.sites.map(({ tokens, dynamic }) => ({ tokens, dynamic }))).toEqual([
        { tokens: [], dynamic: true },
        { tokens: ["m-2"], dynamic: false },
        { tokens: [], dynamic: true },
        { tokens: ["m-4"], dynamic: false },
        { tokens: ["p-2", "p-4", "p-6"], dynamic: false },
      ])
      expect(result.sites.map(({ offset }) => offset)).toEqual(
        [...source.matchAll(/:class=/gu)].map((match) => match.index),
      )
    },
  )

  it.each([
    "const cn = () => { throw new Error('never run') }",
    "function cn() { throw new Error('never run') }",
    "let cn = replacement",
    "var cn",
    "if (true) { var cn = () => { throw new Error('never run') } }",
    "for (var cn of helpers) {}",
    "const { helper: cn = (() => { throw new Error('never run') })() } = helpers",
    "const [cn] = helpers",
    "class cn {}",
  ])("treats a locally declared helper as dynamic: %s", (declaration) => {
    const source = `<script setup>${declaration}</script>
<template><div :class="cn('p-2')" /><div :class="clsx('m-2')" /></template>`
    const result = collectVue(source, "local-helper.vue")
    expect(result.errors).toEqual([])
    expect(result.sites).toEqual([
      { component: "div", tokens: [], dynamic: true, offset: source.indexOf(":class=") },
      { component: "div", tokens: ["m-2"], dynamic: false, offset: source.lastIndexOf(":class=") },
    ])
  })

  it("preserves imported helpers and ignores declarations in unrelated function scopes", () => {
    const source = `<script setup>
import { cn } from './helpers';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';
function unrelated() { var cn = () => { throw new Error('never run') } }
if (true) { const cn = () => { throw new Error('never run') } }
</script>
<template><div :class="cn('p-2', clsx('m-2'), twMerge('p-4'))" /></template>`
    const result = collectVue(source, "imported-helpers.vue")
    expect(result.errors).toEqual([])
    expect(result.sites).toEqual([
      {
        component: "div",
        tokens: ["p-2", "m-2", "p-4"],
        dynamic: false,
        offset: source.indexOf(":class="),
      },
    ])
  })

  it("rejects helper declarations in normal scripts and preserves primitive constants", () => {
    const source = `<script>export function cn() { throw new Error('never run') }</script>
<script setup>const clsx = 'm-2'</script>
<template><div :class="[cn('p-2'), clsx('p-4'), clsx]" /></template>`
    const result = collectVue(source, "script-helpers.vue")
    expect(result.errors).toEqual([])
    expect(result.sites).toEqual([
      { component: "div", tokens: ["m-2"], dynamic: true, offset: source.indexOf(":class=") },
    ])
  })

  it("collects static classes, class helpers, component aliases, and style sites", () => {
    const source = `<script setup lang="ts">
import BaseButton from "./button.vue";
const panel = ["rounded-md", { "border-red-500": danger }];
</script>

<template>
  <BaseButton class="inline-flex px-2" :class="cn(panel, active ? 'bg-blue-500' : 'bg-gray-500', { hidden: isHidden })" :style="{ color }" />
  <base-button :class="['mt-2', twMerge('text-sm', maybe && 'font-medium')]" style="display: block" />
</template>

<style scoped>
.x { color: red; }
</style>`

    const result = collectVue(source, "button.vue")

    expect(result.errors).toEqual([])
    expect(result.sites).toEqual([
      {
        component: "BaseButton",
        tokens: ["inline-flex", "px-2"],
        dynamic: false,
        offset: source.indexOf('class="inline-flex'),
        importSource: "./button.vue",
      },
      {
        component: "BaseButton",
        tokens: ["bg-blue-500", "bg-gray-500", "hidden"],
        dynamic: true,
        offset: source.indexOf(':class="cn'),
        importSource: "./button.vue",
      },
      {
        component: "BaseButton",
        tokens: ["mt-2", "text-sm", "font-medium"],
        dynamic: false,
        offset: source.indexOf(":class=\"['mt-2'"),
        importSource: "./button.vue",
      },
    ])
    expect(result.styles).toEqual([
      { component: "BaseButton", offset: source.indexOf(':style="') },
      { component: "BaseButton", offset: source.indexOf('style="display') },
      { component: "style", offset: source.indexOf("<style scoped>") },
    ])
  })

  it("reports a malformed setup script once", () => {
    const source = `<script setup lang="ts">
const broken = ;
</script>
<template><div class="p-2" /></template>`

    const result = collectVue(source, "invalid-setup.vue")

    expect(result.errors).toEqual([
      {
        message: expect.stringContaining("Invalid script:"),
        offset: source.indexOf(">") + 1,
      },
    ])
    expect(result.sites[0]?.tokens).toEqual(["p-2"])
  })

  it("lets setup imports override normal script imports", () => {
    const source = `<script>
import BaseButton from "./normal.vue";
</script>
<script setup>
import { Button as BaseButton } from "./setup.vue";
</script>
<template>
  <BaseButton class="p-2" />
  <base-button class="p-2" />
  <Button class="p-2" />
</template>`

    const result = collectVue(source, "override.vue")

    expect(result.errors).toEqual([])
    expect(
      result.sites.map(({ component, importSource }) => ({ component, importSource })),
    ).toEqual([
      { component: "BaseButton", importSource: "./setup.vue" },
      { component: "BaseButton", importSource: "./setup.vue" },
      { component: "Button", importSource: undefined },
    ])
  })

  it.each([false, true])(
    "prefers exact aliases over colliding kebab aliases (setup: %s)",
    (setup) => {
      const source = `<script>
import BaseButton from "./exact.vue";
${setup ? "</script><script setup>" : ""}
import Base_Button from "./collision.vue";
</script>
<template>
  <BaseButton class="p-2" />
  <Base_Button class="p-2" />
  <base-button class="p-2" />
</template>`

      const result = collectVue(source, "collision.vue")

      expect(result.errors).toEqual([])
      expect(
        result.sites.map(({ component, importSource }) => ({ component, importSource })),
      ).toEqual([
        { component: "BaseButton", importSource: "./exact.vue" },
        { component: "Base_Button", importSource: "./collision.vue" },
        { component: "Base_Button", importSource: "./collision.vue" },
      ])
    },
  )

  it("resolves only local setup constants without following references", () => {
    const source = `<script>
const normal = "normal";
</script>
<script setup>
import imported from "./classes";
const local = "local";
const reference = local;
</script>
<template><div :class="[normal, imported, local, reference]" /></template>`

    const result = collectVue(source, "local-constants.vue")

    expect(result.errors).toEqual([])
    expect(result.sites).toEqual([
      {
        component: "div",
        tokens: ["local"],
        dynamic: true,
        offset: source.indexOf(':class="'),
      },
    ])
  })

  it("marks unknown expressions and computed object keys as dynamic without evaluating conditions", () => {
    const source = `<script setup>
const fromCall = getClasses();
</script>
<template>
  <div :class="[enabled && 'p-4', fromCall, { [name]: ok, selected: isSelected }]"></div>
</template>`

    const result = collectVue(source, "dynamic.vue")

    expect(result.errors).toEqual([])
    expect(result.sites).toEqual([
      {
        component: "div",
        tokens: ["p-4", "selected"],
        dynamic: true,
        offset: source.indexOf(':class="[enabled'),
      },
    ])
  })

  it("reports unsupported templates, external templates, and invalid binding expressions", () => {
    const pug = collectVue(`<template lang="pug">div.foo</template>`, "pug.vue")
    const external = collectVue(`<template src="./view.html"></template>`, "external.vue")
    const invalid = collectVue(`<template><div :class="["></div></template>`, "invalid.vue")

    expect(pug.errors[0]?.message).toContain("not supported")
    expect(external.errors[0]?.message).toContain("External template src")
    expect(invalid.errors.length).toBeGreaterThan(0)
    expect(invalid.sites[0]).toMatchObject({ component: "div", tokens: [], dynamic: true })
  })

  it("uses compileTemplate as an AST fallback", () => {
    const source = `<template><div class="fallback"></div></template>`
    const result = collectVue(source, "fallback.vue", { forceCompileTemplateAst: true })

    expect(result.errors).toEqual([])
    expect(result.sites).toEqual([
      {
        component: "div",
        tokens: ["fallback"],
        dynamic: false,
        offset: source.indexOf('class="fallback'),
      },
    ])
  })

  it("does not reuse script constants shadowed by template scopes", () => {
    const source = `<script setup>
const itemClass = "from-script";
</script>
<template>
  <div v-for="itemClass in rows" :class="itemClass"></div>
  <slot v-slot="{ itemClass }"><span :class="itemClass"></span></slot>
</template>`

    const result = collectVue(source, "scopes.vue")

    expect(result.errors).toEqual([])
    expect(result.sites).toEqual([
      { component: "div", tokens: [], dynamic: true, offset: source.indexOf(':class="itemClass') },
      {
        component: "span",
        tokens: [],
        dynamic: true,
        offset: source.lastIndexOf(':class="itemClass'),
      },
    ])
  })

  it.each([false, true])(
    "shadows binding patterns without treating keys or defaults as bindings (fallback: %s)",
    (forceCompileTemplateAst) => {
      const source = `<script setup>
const rest = 'from-script';
const local = 'from-script';
const index = 'from-script';
const key = 'key-class';
const fallback = 'default-class';
</script>
<template>
  <Box v-slot="{ ...rest }"><div :class="rest" /></Box>
  <Box v-slot="{ key: [local = fallback, ...rest] }">
    <div :class="[local, rest, key, fallback]" />
  </Box>
  <Box v-slot="{ local = (() => { throw new Error('never run') })() }">
    <div :class="local" />
  </Box>
  <div v-for="({ key: local = fallback, ...rest }, index) in rows" :class="[local, rest, index, key, fallback]" />
  <div v-for="[local, ...rest] of rows" :class="[local, rest]" />
  <div :class="[rest, local, index]" />
</template>`
      const result = collectVue(source, "patterns.vue", { forceCompileTemplateAst })
      expect(result.errors).toEqual([])
      expect(result.sites.map(({ tokens, dynamic }) => ({ tokens, dynamic }))).toEqual([
        { tokens: [], dynamic: true },
        { tokens: ["key-class", "default-class"], dynamic: true },
        { tokens: [], dynamic: true },
        { tokens: ["key-class", "default-class"], dynamic: true },
        { tokens: [], dynamic: true },
        { tokens: ["from-script"], dynamic: false },
      ])
      expect(result.sites.map(({ offset }) => offset)).toEqual(
        [...source.matchAll(/:class=/gu)].map((match) => match.index),
      )
    },
  )

  it.each(["{ ...rest, }", "local.member", "{ local: }"])(
    "fails closed for invalid or unsupported slot scope %s",
    (pattern) => {
      const source = `<script setup>const local = 'unsafe'; const rest = 'unsafe';</script>
<template><Box v-slot="${pattern}"><div :class="[local, rest, cn('unsafe')]" /></Box></template>`
      for (const forceCompileTemplateAst of [false, true]) {
        const result = collectVue(source, "invalid-scope.vue", { forceCompileTemplateAst })
        expect(result.errors.length).toBeGreaterThan(0)
        expect(result.sites[0]).toMatchObject({ tokens: [], dynamic: true })
        expect(result.errors).toContainEqual({
          message: expect.stringContaining("Invalid or unsupported template scope:"),
          offset: source.indexOf("v-slot="),
        })
      }
    },
  )

  it.each(["(local in rows", "local) in rows", "local.member in rows", ""])(
    "rejects malformed v-for scopes: %s",
    (scope) => {
      const source = `<script setup>const local = 'unsafe';</script>
<template><div v-for="${scope}" :class="local" /></template>`
      const result = collectVue(source, "invalid-for.vue")
      expect(result.errors.length).toBeGreaterThan(0)
      // Older Vue uses the compiler fallback, which may remove invalid directives.
      // In either path a malformed scope must never yield a clean result.
    },
  )

  it("preserves original offsets across normal and transformed template collection", () => {
    const source = `<script setup>const local = 'outside';</script>
<template>
  <div v-if="ok" class="p-2" style="color:red" />
  <div v-else :class="'m-2'" :style="style" />
  <div v-for="(local, index) in rows" :class="local" v-bind="{ class: 'p-4', style: null }" />
  <div v-bind="attrs" :[key]="value" />
</template>
<style>.outside {}</style>`
    const normal = collectVue(source, "offsets.vue")
    const fallback = collectVue(source, "offsets.vue", { forceCompileTemplateAst: true })
    expect(fallback).toEqual(normal)
    expect(normal.styles.map(({ offset }) => offset)).toEqual([
      source.indexOf('style="'),
      source.indexOf(':style="'),
      source.indexOf('v-bind="{'),
      source.indexOf("<style>"),
    ])
    expect(normal.errors.map(({ offset }) => offset)).toEqual([
      source.indexOf('v-bind="attrs'),
      source.indexOf(":[key]"),
    ])
  })

  it("locates fallback template style compiler diagnostics in the original SFC", () => {
    const source = `<script setup>const unused = 'prefix';</script>
<template><div style="color:red" /><style>.bad {}</style></template>`
    const normal = collectVue(source, "template-style.vue")
    const fallback = collectVue(source, "template-style.vue", { forceCompileTemplateAst: true })
    expect(normal.errors).toContainEqual({
      message: "Template <style> tags are not supported",
      offset: source.indexOf("<style>"),
    })
    // The compiler removes side-effect tags; its diagnostic still reports that site.
    expect(fallback.errors).toContainEqual({
      message: expect.stringContaining("side effect"),
      offset: source.indexOf("<style>"),
    })
    expect(fallback.styles).toEqual([{ component: "div", offset: source.indexOf('style="') }])
  })

  it("limits script constants to primitive immutable class shapes", () => {
    const source = `<script setup>
const one = "one";
const many = ["two", "three"];
const maybe = { four: ok };
</script>
<template>
  <div :class="[one, many, maybe]"></div>
</template>`

    const result = collectVue(source, "consts.vue")

    expect(result.sites).toEqual([
      {
        component: "div",
        tokens: ["one"],
        dynamic: true,
        offset: source.indexOf(':class="[one'),
      },
    ])
  })

  it("supports static v-bind object attrs and reports unresolved dynamic attrs", () => {
    const source = `<template>
  <div v-bind="{ class: 'spread-class', style: { color: red } }"></div>
  <div v-bind="attrs"></div>
  <div :[key]="'value'"></div>
</template>`

    const result = collectVue(source, "bind.vue")

    expect(result.sites).toEqual([
      {
        component: "div",
        tokens: ["spread-class"],
        dynamic: false,
        offset: source.indexOf('v-bind="{ class'),
      },
      {
        component: "div",
        tokens: [],
        dynamic: true,
        offset: source.indexOf('v-bind="attrs'),
      },
    ])
    expect(result.styles).toEqual([{ component: "div", offset: source.indexOf('v-bind="{ class') }])
    expect(result.errors.map((error) => error.message)).toEqual([
      "Dynamic v-bind attrs may contain class or style",
      "Dynamic v-bind argument may be class or style",
    ])
  })

  it.each([false, true])(
    "handles object methods and non-literal props conservatively (fallback: %s)",
    (forceCompileTemplateAst) => {
      const source = `<template>
  <div :class="{ safe: ok, method() { throw new Error('never run') }, get getter() { throw new Error('never run') }, 42: true, [key]: true }" />
  <div v-bind="{ class() { throw new Error('never run') }, get style() { throw new Error('never run') }, [key]: value, ...attrs, id: 'ignored' }" />
  <div v-bind="{ class: () => 'not-static', style: null }" />
</template>`
      const result = collectVue(source, "object-shapes.vue", { forceCompileTemplateAst })
      const spreadOffset = source.indexOf('v-bind="{ class()')
      const literalOffset = source.indexOf('v-bind="{ class:')

      expect(result.sites).toEqual([
        { component: "div", tokens: ["safe"], dynamic: true, offset: source.indexOf(':class="') },
        ...Array.from({ length: 4 }, () => ({
          component: "div",
          tokens: [],
          dynamic: true,
          offset: spreadOffset,
        })),
        { component: "div", tokens: [], dynamic: true, offset: literalOffset },
      ])
      expect(result.errors).toEqual(
        Array.from({ length: 4 }, () => ({
          message: "Dynamic v-bind attrs may contain class or style",
          offset: spreadOffset,
        })),
      )
      expect(result.styles).toEqual([{ component: "div", offset: literalOffset }])
    },
  )

  it("treats cva factories as dynamic unless the factory call is resolved", () => {
    const source = `<script setup>
const button = cva("base", { variants: { tone: { danger: "danger" } } });
</script>
<template>
  <div :class="[cva('inline-base'), button({ tone: 'danger' })]"></div>
</template>`

    const result = collectVue(source, "cva.vue")

    expect(result.sites).toEqual([
      {
        component: "div",
        tokens: [],
        dynamic: true,
        offset: source.indexOf(':class="[cva'),
      },
    ])
  })

  it("reports template style tags separately from SFC style blocks", () => {
    const source = `<template><style>.bad {}</style></template><style>.ok {}</style>`
    const result = collectVue(source, "style.vue")

    expect(result.styles).toEqual([
      { component: "style", offset: source.indexOf("<style>.bad") },
      { component: "style", offset: source.indexOf("<style>.ok") },
    ])
    expect(result.errors[0]?.message).toContain("Template <style>")
  })
})
