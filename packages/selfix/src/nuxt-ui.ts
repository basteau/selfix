// Nuxt UI knowledge, read from the installed package and the files it generates.
// Nothing here is evaluated: component names come from filenames and themes
// from the literal objects Nuxt UI writes during `nuxt prepare` or a Vite run.
import { readdirSync, readFileSync, statSync } from "node:fs"
import path from "node:path"
import { babelParse, pascalCase } from "./vue.js"

export interface ComponentTheme {
  /** Key under `ui` in the theme configuration, such as `button` or `formField`. */
  key: string
  /** Variant props and their choices, such as `{ size: ["sm", "md"] }`. */
  variants: Record<string, string[]>
}

export interface NuxtUiComponent {
  /** Unprefixed component name, such as `Button`. */
  name: string
  theme: ComponentTheme
}

export interface NuxtUi {
  /** The generated stylesheet that `@nuxt/ui` imports as `#build/ui.css`. */
  css: string
  /** The file where an application overrides component themes. */
  themeConfig: string
  /**
   * The themed Nuxt UI component behind a template tag or import. Components
   * without a theme, such as UIcon, own no appearance and are styled by class.
   */
  component(tag: string, importSource?: string, imported?: string): NuxtUiComponent | undefined
  /** The registered tag for a component name, when this version ships it. */
  tag(name: string): string | undefined
}

const buildDirs = [".nuxt", path.join("node_modules", ".nuxt-ui")]

function isFile(file: string): boolean {
  return statSync(file, { throwIfNoEntry: false })?.isFile() ?? false
}

/** Every file below a directory, keyed by its basename without the extension. */
function filesByName(directory: string, extension: string, skip: string): Map<string, string> {
  const found = new Map<string, string>()
  const visit = (current: string) => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const file = path.join(current, entry.name)
      if (entry.isDirectory()) {
        if (entry.name !== skip) visit(file)
      } else if (entry.name.endsWith(extension) && !entry.name.includes(".d."))
        found.set(entry.name.slice(0, -extension.length), file)
    }
  }
  if (statSync(directory, { throwIfNoEntry: false })?.isDirectory()) visit(directory)
  return found
}

type Node = { type: string; [key: string]: unknown }

function objectEntries(node: unknown): [string, Node][] {
  const object = node as { type?: string; properties?: Node[] } | undefined
  if (object?.type !== "ObjectExpression") return []
  return (object.properties ?? []).flatMap((property): [string, Node][] => {
    const key = property.key as { type: string; name?: string; value?: unknown } | undefined
    if (property.type !== "ObjectProperty" || property.computed || !key) return []
    const name = key.type === "Identifier" ? key.name : key.value
    return typeof name === "string" ? [[name, property.value as Node]] : []
  })
}

const tsWrappers = new Set(["TSAsExpression", "TSSatisfiesExpression", "TSNonNullExpression"])

/** Reads the variant choices of a generated theme's default export. */
export function readTheme(source: string, key: string): ComponentTheme | undefined {
  let body: Node[]
  try {
    body = babelParse(source, { sourceType: "module", plugins: ["typescript"] }).program
      .body as unknown as Node[]
  } catch {
    return undefined
  }
  let exported = body.find((statement) => statement.type === "ExportDefaultDeclaration")
    ?.declaration as Node | undefined
  while (exported && tsWrappers.has(exported.type)) exported = exported.expression as Node
  const theme = new Map(objectEntries(exported))
  if (!theme.size) return undefined
  return {
    key,
    variants: Object.fromEntries(
      objectEntries(theme.get("variants")).map(([name, choices]) => [
        name,
        objectEntries(choices).map(([choice]) => choice),
      ]),
    ),
  }
}

/** Whether the project's own package.json lists @nuxt/ui. */
function dependsOnNuxtUi(root: string): boolean {
  try {
    const pkg = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8")) as Record<
      string,
      Record<string, unknown> | undefined
    >
    return ["dependencies", "devDependencies"].some((field) => pkg[field]?.["@nuxt/ui"])
  } catch {
    return false
  }
}

/**
 * Loads Nuxt UI for a project, or returns undefined when the project does not use it.
 * A project that depends on Nuxt UI or sets buildDir must be prepared: its generated
 * theme is the application's, and the package fallback would not be.
 */
export function loadNuxtUi(
  root: string,
  options: { buildDir?: string; prefix?: string } = {},
): NuxtUi | undefined {
  // Walk up like Node does, ignoring NODE_PATH so the answer depends on the project alone.
  let pkg: string | undefined
  for (let directory = root; !pkg; directory = path.dirname(directory)) {
    const candidate = path.join(directory, "node_modules/@nuxt/ui")
    if (isFile(path.join(candidate, "package.json"))) pkg = candidate
    else if (directory === path.dirname(directory)) break
  }
  const candidates = options.buildDir === undefined ? buildDirs : [options.buildDir]
  const buildDir = candidates
    .map((directory) => path.resolve(root, directory))
    .find((directory) => isFile(path.join(directory, "ui.css")))
  const prepare = 'Run "nuxt prepare" (Nuxt) or build once with Vite (Vue)'
  if (!pkg) {
    if (options.buildDir === undefined) return undefined
    throw new Error(`buildDir is set, but @nuxt/ui is not installed for ${root}.`)
  }
  if (!buildDir) {
    // A workspace can hoist the package above projects that do not use it.
    if (options.buildDir === undefined && !dependsOnNuxtUi(root)) return undefined
    throw new Error(
      `Nuxt UI's generated theme (ui.css) is missing from ${candidates.join(" and ")} in ${root}. ${prepare}, or set buildDir.`,
    )
  }

  const prefix = options.prefix ?? "U"
  const lazy = new RegExp(`^Lazy(?=${prefix}[A-Z])`)
  const components = filesByName(path.join(pkg, "dist/runtime/components"), ".vue", "prose")
  if (!components.size)
    throw new Error(`No Nuxt UI components found in ${pkg}. selfix supports @nuxt/ui 4.`)
  // PageCTA is themed by page-cta.ts: compare names without their word breaks.
  const themeFiles = new Map(
    [...filesByName(path.join(buildDir, "ui"), ".ts", "prose")].map(([name, file]) => [
      name.replaceAll("-", ""),
      file,
    ]),
  )
  if (!themeFiles.size)
    throw new Error(
      `Nuxt UI's generated component themes are missing from ${path.join(buildDir, "ui")}. ${prepare}.`,
    )
  const themes = new Map<string, ComponentTheme>()
  const theme = (name: string) => {
    const file = themeFiles.get(name.toLowerCase())
    if (!file) return undefined
    let found = themes.get(name)
    if (!found) {
      found = readTheme(readFileSync(file, "utf8"), name.charAt(0).toLowerCase() + name.slice(1))
      // An unreadable theme must not quietly leave its component unprotected.
      if (!found)
        throw new Error(
          `Unable to read the generated Nuxt UI theme ${file}. selfix supports @nuxt/ui 4.`,
        )
      themes.set(name, found)
    }
    return found
  }

  return {
    css: path.join(buildDir, "ui.css"),
    themeConfig: path.basename(buildDir) === ".nuxt-ui" ? "vite.config.ts" : "app.config.ts",
    component(tag, importSource, imported) {
      let name = /^(?:@nuxt\/ui|#ui)\/(?:runtime\/)?components\/(?:.+\/)?(\w+)\.vue$/.exec(
        importSource ?? "",
      )?.[1]
      if (!name) {
        // Other packages and local files are not Nuxt UI, whatever the component is called.
        if (importSource && !importSource.startsWith("#")) return undefined
        // An import from #components keeps its registered name under a local rename,
        // and Nuxt registers a Lazy variant of every component.
        const registered = pascalCase(imported ?? tag).replace(lazy, "")
        if (!registered.startsWith(prefix)) return undefined
        name = registered.slice(prefix.length)
      }
      const found = components.has(name) ? theme(name) : undefined
      return found && { name, theme: found }
    },
    tag: (name) => (components.has(name) ? prefix + name : undefined),
  }
}
