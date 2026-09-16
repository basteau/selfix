import { describe, expect, it } from "vitest"
import { collectVue } from "../src/vue.js"

describe("collectVue", () => {
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
