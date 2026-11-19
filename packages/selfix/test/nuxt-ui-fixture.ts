import { mkdirSync, writeFileSync } from "node:fs"
import path from "node:path"

const aliases = ["primary", "secondary", "success", "info", "warning", "error"]
const tokens = (namespace: string, variable: string, names: string[]) =>
  names.map(
    (name) =>
      `  --${namespace}-color-${name}: var(--ui-${variable}${name === "default" ? "" : `-${name}`});`,
  )

/** The shape of Nuxt UI's generated stylesheet, with its semantic tokens and a few shades. */
export const uiCss = `@theme default inline {
  --color-primary-500: var(--ui-color-primary-500);
  --color-neutral-500: var(--ui-color-neutral-500);
${aliases.map((name) => `  --color-${name}: var(--ui-${name});`).join("\n")}
${[
  ...tokens("text", "text", ["dimmed", "muted", "toned", "default", "highlighted", "inverted"]),
  ...tokens("background", "bg", ["default", "muted", "elevated", "accented", "inverted"]),
  ...tokens("border", "border", ["default", "muted", "accented", "inverted"]),
].join("\n")}
}
`

const list = (names: string[]) => `{ ${names.map((name) => `"${name}": ""`).join(", ")} }`
const buttonTheme = `const color = ${JSON.stringify([...aliases, "neutral"])} as const
const size = ["xs", "sm", "md", "lg", "xl"] as const

export default {
  "slots": { "base": "rounded-md font-medium", "label": "truncate", "leadingIcon": "shrink-0" },
  "variants": {
    "color": ${list([...aliases, "neutral"])},
    "variant": ${list(["solid", "outline", "soft", "subtle", "ghost", "link"])},
    "size": {
      "xs": { "base": "px-2 py-1" }, "sm": { "base": "px-2.5 py-1.5" }, "md": { "base": "px-2.5 py-1.5" },
      "lg": { "base": "px-3 py-2" }, "xl": { "base": "px-3 py-2" }
    },
    "block": { "true": { "base": "w-full" } }
  },
  "compoundVariants": [
    { "color": "primary" as typeof color[number], "variant": "solid", "class": "bg-primary" }
  ],
  "defaultVariants": { "color": "primary" as typeof color[number], "size": "md" as typeof size[number] }
}
`

const themes: Record<string, string> = {
  "button.ts": buttonTheme,
  "card.ts": `export default {
  "slots": { "root": "rounded-lg", "header": "p-4", "body": "p-4" },
  "variants": { "variant": { "solid": { "root": "bg-inverted" }, "outline": {}, "soft": {}, "subtle": {} } }
}
`,
  "form-field.ts": 'export default { "slots": { "root": "", "label": "block" } }\n',
  "container.ts": 'export default { "base": "w-full mx-auto" }\n',
  "page-cta.ts":
    'export default { "slots": { "root": "" }, "variants": { "variant": { "solid": "" } } }\n',
  "index.ts": "export { default as button } from './button'\n",
  "prose/h1.ts": 'export default { "base": "text-4xl" }\n',
}

const components = [
  "Button",
  "Card",
  "Checkbox",
  "Container",
  "FormField",
  "Icon",
  "Input",
  "InputNumber",
  "Modal",
  "PageCTA",
  "Select",
  "Separator",
  "Textarea",
  "color-mode/ColorModeButton",
  "prose/H1",
]

function write(file: string, content: string) {
  mkdirSync(path.dirname(file), { recursive: true })
  writeFileSync(file, content)
}

/** Installs a minimal stand-in for @nuxt/ui and its generated files in a project. */
export function installNuxtUi(root: string, buildDir = ".nuxt") {
  const pkg = path.join(root, "node_modules/@nuxt/ui")
  write(
    path.join(pkg, "package.json"),
    JSON.stringify({
      name: "@nuxt/ui",
      version: "4.13.0",
      exports: { ".": { style: "./dist/runtime/index.css", import: "./dist/module.mjs" } },
    }),
  )
  write(path.join(pkg, "dist/runtime/index.css"), '@import "#build/ui.css";\n')
  for (const component of components) {
    write(path.join(pkg, "dist/runtime/components", `${component}.vue`), "<template />\n")
    write(path.join(pkg, "dist/runtime/components", `${component}.vue.d.ts`), "export {}\n")
  }
  write(path.join(root, buildDir, "ui.css"), uiCss)
  for (const [file, source] of Object.entries(themes))
    write(path.join(root, buildDir, "ui", file), source)
}
