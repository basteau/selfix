import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { createLinter, defineConfig, type Config } from "../src/index.js"
import { componentProps, createProject } from "../src/project.js"

describe("component prop metadata", () => {
  it("reads only the component's macro and complete same-file string types", () => {
    const source = `<script setup lang="ts">
      type Size = 'sm' | 'lg'
      interface Props { size?: Size; variant?: 'solid' | 'outline'; other?: string }
      const unrelated = { variants: { wrong: true } }
      const props = withDefaults(defineProps<Props>(), { size: 'sm' })
      throw new Error('application code must not run')
    </script><template><button /></template>`
    expect(componentProps(source, "Button.vue")).toEqual({
      size: ["sm", "lg"],
      variant: ["solid", "outline"],
    })
  })
  it.each([
    [
      "type Size = 'sm' | 'lg'; type Alias = Size; type Props = { size?: Alias; variant: ('solid' | 'outline') };",
      "Props",
      { size: ["sm", "lg"], variant: ["solid", "outline"] },
    ],
    ["", "{ size: 'sm' | string; variant: 'solid' }", { variant: ["solid"] }],
    [
      "import type { Size } from './types';",
      "{size: Size; variant:'solid'}",
      { variant: ["solid"] },
    ],
    ["interface Base { size:'sm' }; interface Props extends Base {variant:'solid'}", "Props", {}],
    ["type A = B; type B = A;", "{size:A}", {}],
    ["", "{size:'sm'} & {variant:'solid'}", {}],
    ["", "{size:'sm'} | {size:'lg'}", {}],
    ["", "{size:1 | 'sm'}", {}],
    ["type Size<T> = 'sm';", "{size:Size<string>}", {}],
  ])("extracts only complete supported type information: %s", (declarations, props, expected) => {
    expect(
      componentProps(
        `<script setup lang="ts">${declarations}; defineProps<${props}>()</script>`,
        "Button.vue",
      ),
    ).toEqual(expected)
  })

  it.each([
    "function factory() { return defineProps<{size:'wrong'}>() }",
    "const other = defineProps({ size: String })",
    "import { defineProps } from 'other'; defineProps<{size:'wrong'}>()",
    "const defineProps = () => { throw Error() }; defineProps<{size:'wrong'}>()",
    "defineProps<{size:'first'}>(); defineProps<{size:'second'}>()",
  ])("omits runtime, shadowed, unrelated, or ambiguous macros: %s", (script) => {
    expect(componentProps(`<script setup lang="ts">${script}</script>`, "Button.vue")).toEqual({})
  })
})

const roots: string[] = []
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})
function fixture() {
  const root = mkdtempSync(path.join(tmpdir(), "selfix-project-"))
  roots.push(root)
  const write = (file: string, source: string) => {
    const target = path.join(root, file)
    mkdirSync(path.dirname(target), { recursive: true })
    writeFileSync(target, source)
    return target
  }
  return { root, write }
}
const component = (size: string) =>
  `<script setup lang="ts">defineProps<{size:'${size}';variant:'solid'|'outline'}>()</script>`

it("uses supplied source for self references without changing the snapshot or leaking mutable metadata", async () => {
  const { root, write } = fixture()
  const file = write("Button.vue", component("disk"))
  const linter = await createLinter({
    css: '@import "tailwindcss";',
    config: { components: ["^Button$"], project: { root, components: { Button: "Button.vue" } } },
  })
  const source = component("editor") + '<template><Button class="p-4" /></template>'
  const first = linter.lint(source, file)[0]
  expect(first.definition?.props?.size).toEqual(["editor"])
  first.definition!.props!.size!.push("mutated")
  expect(linter.lint(source, file)[0].definition?.props?.size).toEqual(["editor"])
  expect(
    linter.lint('<template><Button class="p-4" /></template>', path.join(root, "Page.vue"))[0]
      .definition?.props?.size,
  ).toEqual(["disk"])
})

it.each([
  "const { defineProps } = something; defineProps<{size:'fake'}>()",
  "const [withDefaults] = something; withDefaults(defineProps<{size:'fake'}>(), {})",
  "class defineProps {}; defineProps<{size:'fake'}>()",
  "interface Props {size:'sm'}; interface Props {variant:'solid'}; defineProps<Props>()",
])("omits shadowed macros and merged interfaces: %s", (script) => {
  expect(componentProps(`<script setup lang="ts">${script}</script>`, "Button.vue")).toEqual({})
})

it("resolves direct and explicit component files using a per-project snapshot", () => {
  const { root, write } = fixture()
  const file = write("src/Button.vue", component("sm"))
  const project = createProject({ root })
  const imported = { local: "Action", importSource: "./Button.vue", imported: "default" }
  expect(project.resolve("Action", imported, path.join(root, "src/Page.vue"))).toEqual({
    file,
    props: { size: ["sm"], variant: ["solid", "outline"] },
  })
  write("src/Button.vue", component("lg"))
  expect(project.resolve("Action", imported, path.join(root, "src/Page.vue"))?.props?.size).toEqual(
    ["sm"],
  )
  expect(
    createProject({ root }).resolve("Action", imported, path.join(root, "src/Page.vue"))?.props
      ?.size,
  ).toEqual(["lg"])
  expect(
    createProject({ root, components: { Global: "src/Button.vue" } }).resolve(
      "Global",
      undefined,
      path.join(root, "src/Page.vue"),
    )?.file,
  ).toBe(file)
  expect(project.resolve("Missing", undefined, path.join(root, "src/Page.vue"))).toBeUndefined()
})

it("merges extends arrays without losing paths when a later base only sets unrelated options", () => {
  const { root, write } = fixture()
  const file = write("src/Button.vue", component("sm"))
  write(
    "config/paths.json",
    JSON.stringify({ compilerOptions: { paths: { "ui/*": ["../src/*"] } } }),
  )
  write("config/strict.json", JSON.stringify({ compilerOptions: { strict: true } }))
  write(
    "tsconfig.json",
    JSON.stringify({ extends: ["./config/paths.json", "./config/strict.json"] }),
  )
  expect(
    createProject({ root }).resolve(
      "Button",
      { local: "Button", importSource: "ui/Button.vue", imported: "default" },
      "Page.vue",
    )?.file,
  ).toBe(file)
})

it("keeps alias snapshots isolated between edits and projects, with ordered fallback targets", () => {
  const { root, write } = fixture()
  const other = fixture()
  const first = write("first.vue", component("first"))
  const second = write("second.vue", component("second"))
  const config = (target: string) =>
    JSON.stringify({ compilerOptions: { paths: { button: ["./missing.vue", target] } } })
  write("jsconfig.json", config("./first.vue"))
  const before = createProject({ root })
  write("jsconfig.json", config("./second.vue"))
  other.write("jsconfig.json", config("./first.vue"))
  other.write("first.vue", component("other"))
  const imported = { local: "Button", importSource: "button", imported: "default" }
  expect(before.resolve("Button", imported, "Page.vue")?.file).toBe(first)
  expect(createProject({ root }).resolve("Button", imported, "Page.vue")?.file).toBe(second)
  expect(
    createProject({ root: other.root }).resolve("Button", imported, "Page.vue")?.props?.size,
  ).toEqual(["other"])
})

it("snapshots statically imported sources outside the project root", () => {
  const { root, write } = fixture()
  const file = write("shared/Button.vue", component("sm"))
  write("app/Page.vue", `<script setup>import Button from '../shared/entry'</script><template />`)
  write("shared/entry.ts", `export {default} from './Button.vue'`)
  const project = createProject({ root: path.join(root, "app") })
  write("shared/Button.vue", component("changed"))
  expect(
    project.resolve(
      "Button",
      { local: "Button", importSource: "../shared/entry", imported: "default" },
      "Page.vue",
    ),
  ).toEqual({ file, props: { size: ["sm"], variant: ["solid", "outline"] } })
})

it("probes extensionless explicit aliases and omits ambiguous targets", () => {
  const { root, write } = fixture()
  const file = write("Button.vue", component("sm"))
  const imported = { local: "Button", importSource: "button", imported: "default" }
  expect(
    createProject({ root, aliases: { button: "./Button" } }).resolve("Button", imported, "Page.vue")
      ?.file,
  ).toBe(file)
  write("Button.ts", "export default null")
  expect(
    createProject({ root, aliases: { button: "./Button" } }).resolve(
      "Button",
      imported,
      "Page.vue",
    ),
  ).toBeUndefined()
  expect(() => createProject({ root, aliases: { button: "./Missing" } })).toThrow(/missing target/)
})

it("rejects a missing explicit root and malformed discovered config paths", () => {
  const { root, write } = fixture()
  expect(() => createProject({ root: path.join(root, "missing") })).toThrow(/project root/i)
  write("tsconfig.json/child", "")
  expect(() => createProject({ root })).toThrow(/project metadata.*tsconfig.json/)
})

it("follows renamed explicit barrel exports and alias patterns without changing local identity", () => {
  const { root, write } = fixture()
  const file = write("src/ui/Button.vue", component("sm"))
  write(
    "src/ui/inner.ts",
    "import Source from './Button.vue'; export { Source as Inner }; throw new Error('never run')",
  )
  write("src/ui/index.ts", "export { Inner as Button } from './inner';")
  const project = createProject({ root, aliases: { "@ui": "src/ui", "@ui/*": "src/ui/*" } })
  const imported = { local: "Action", importSource: "@ui", imported: "Button" }
  expect(project.resolve("Action", imported, path.join(root, "Page.vue"))?.file).toBe(file)
  expect(
    project.resolve(
      "Direct",
      { local: "Direct", importSource: "@ui/Button", imported: "default" },
      path.join(root, "Page.vue"),
    )?.file,
  ).toBe(file)
  expect(
    project.resolve("Action", { ...imported, imported: "Missing" }, path.join(root, "Page.vue")),
  ).toBeUndefined()
})

it("omits cycles, star exports, and ambiguous extension probing", () => {
  const { root, write } = fixture()
  write("A.ts", "export { Button } from './B'")
  write("B.ts", "export { Button } from './A'")
  write("Star.ts", "export * from './Button.vue'")
  write("Button.vue", component("sm"))
  write("Button.ts", "export {default} from './Other.vue'")
  write("Other.vue", component("wrong"))
  const project = createProject({ root })
  for (const [source, name] of [
    ["./A", "Button"],
    ["./Star", "Button"],
    ["./Button", "default"],
  ]) {
    expect(
      project.resolve(
        "Button",
        { local: "Button", importSource: source, imported: name },
        path.join(root, "Page.vue"),
      ),
    ).toBeUndefined()
  }
})

it("discovers JSONC tsconfig aliases, extends bases, and explicit override precedence", () => {
  const { root, write } = fixture()
  const shared = write("shared/Button.vue", component("shared"))
  const specific = write("app/specific/Button.vue", component("specific"))
  const override = write("override/Button.vue", component("override"))
  write(
    "config/base.json",
    `// comments and trailing commas are data, not code
    {"compilerOptions":{"paths":{"@/*":["../shared/*"],"@/specific/*":["../app/specific/*"],},},}`,
  )
  write("app/tsconfig.json", '{"extends":"../config/base"}')
  const imported = (source: string) => ({
    local: "Button",
    importSource: source,
    imported: "default",
  })
  const page = path.join(root, "app/Page.vue")
  const project = createProject({ root: path.join(root, "app") })
  expect(project.resolve("Button", imported("@/Button"), page)?.file).toBe(shared)
  expect(project.resolve("Button", imported("@/specific/Button"), page)?.file).toBe(specific)
  expect(
    createProject({ root: path.join(root, "app"), aliases: { "@/*": "../override/*" } }).resolve(
      "Button",
      imported("@/Button"),
      page,
    )?.file,
  ).toBe(override)
})

it("reports broken project mapping inputs without evaluating them", () => {
  const { root, write } = fixture()
  write("tsconfig.json", '{"extends":"./missing.json"}')
  expect(() => createProject({ root })).toThrow(/missing/)
  write("tsconfig.json", '{"extends":"./cycle.json"}')
  write("cycle.json", '{"extends":"./tsconfig.json"}')
  expect(() => createProject({ root })).toThrow(/cycl/i)
  write("tsconfig.json", '{"compilerOptions": {"paths": (() => {throw Error("executed")})()}}')
  expect(() => createProject({ root })).toThrow(/metadata|tsconfig/i)
})

it("discovers prepared Nuxt component paths and project aliases without evaluating app config", () => {
  const { root, write } = fixture()
  write("package.json", JSON.stringify({ dependencies: { nuxt: "4.5.2" } }))
  write("nuxt.config.ts", "throw new Error('must not run')")
  const installed = write(
    "node_modules/example/Button.vue",
    "<script setup>defineProps({size:{type:null}})</script>",
  )
  const local = write("app/components/Custom.vue", component("local"))
  write(
    ".nuxt/components.d.ts",
    `export const UButton: typeof import("../node_modules/example/Button.vue")['default'];
export const NamedCustom: typeof import("../app/components/Custom.vue")['default'];`,
  )
  write(".nuxt/tsconfig.json", '{"compilerOptions":{"paths":{"@/*":["../app/*"]}}}')
  const project = createProject({ root })
  const page = path.join(root, "app/Page.vue")
  expect(project.resolve("UButton", undefined, page)).toEqual({ file: installed })
  expect(project.resolve("NamedCustom", undefined, page)).toEqual({
    file: local,
    props: { size: ["local"], variant: ["solid", "outline"] },
  })
  expect(
    project.resolve(
      "NamedCustom",
      { local: "NamedCustom", importSource: "@/components/Custom.vue", imported: "default" },
      page,
    )?.file,
  ).toBe(local)
  expect(
    createProject({ root, components: { UButton: "app/components/Custom.vue" } }).resolve(
      "UButton",
      undefined,
      page,
    )?.file,
  ).toBe(local)
})

it("reports missing or malformed Nuxt preparation and permits explicit opt-out", () => {
  const { root, write } = fixture()
  write("package.json", '{"devDependencies":{"nuxt":"4.5.2"}}')
  expect(() => createProject({ root })).toThrow(/nuxt prepare/)
  expect(() => createProject({ root, nuxt: false })).not.toThrow()
  write(".nuxt/components.d.ts", "export const Button: !broken")
  expect(() => createProject({ root })).toThrow(/components.d.ts/)
})

it("enriches public findings without changing local policy identity or source-only calls", async () => {
  const { root, write } = fixture()
  const file = write("Button.vue", component("sm"))
  write("barrel.ts", "export {default as Button} from './Button.vue'")
  const source = `<script setup>import {Button as Action} from './barrel'</script>\n<template><Action :ui="{base:'p-4'}" /></template>`
  const config: Config = {
    components: ["^Action$"],
    classProps: [{ pattern: "^Action$", props: { ui: "slot-map" } }],
    rules: {
      "no-restyle": [
        "error",
        {
          contracts: [
            { pattern: "^Action$", allow: [] },
            { pattern: "^Button$", allow: ["*"] },
          ],
        },
      ],
    },
  }

  const linter = await createLinter({
    css: '@import "tailwindcss";',
    config: { ...config, project: { root } },
  })
  const [finding] = linter.lint(source, path.join(root, "Page.vue"))
  expect(finding).toMatchObject({
    rule: "no-restyle",
    component: "Action",
    prop: "ui",
    slot: "base",
    line: 2,
    column: 19,
    file: path.join(root, "Page.vue"),
    definition: { file, props: { size: ["sm"], variant: ["solid", "outline"] } },
  })
  expect(finding.message).toContain(file)
  expect(finding.message).toContain('"sm"')
  const sourceOnly = await createLinter({ css: '@import "tailwindcss";', config })
  expect(sourceOnly.lint(source, path.join(root, "Page.vue"))[0]).not.toHaveProperty("definition")
})

it.each([
  { project: true },
  { project: { typo: true } },
  { project: { root: 3 } },
  { project: { nuxt: "yes" } },
  { project: { components: { Button: "missing.ts" } } },
  { project: { aliases: { "@**": "src/*" } } },
])("validates project configuration: %j", (config) => {
  expect(() => defineConfig(config as never)).toThrow()
})
