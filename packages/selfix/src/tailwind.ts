import { existsSync, readFileSync, realpathSync, statSync } from "node:fs"
import { readFile } from "node:fs/promises"
import { dirname, extname, isAbsolute, join, resolve } from "node:path"
import { pathToFileURL } from "node:url"
import { createRequire } from "node:module"
import { __unstable__loadDesignSystem } from "tailwindcss"

import { categories, type Category } from "./config.js"

export type { Category } from "./config.js"

type InspectResult = {
  known: boolean
  categories: Category[]
  rawColor: boolean
}

type DesignSystem = {
  theme: {
    prefix: string | null
    keysInNamespaces(themeKeys: Iterable<`--${string}`>): string[]
  }
  candidatesToCss(classes: string[]): (string | null)[]
}

type LoadOptions = {
  base?: string
  loadModule?: (
    id: string,
    base: string,
    resourceHint: "plugin" | "config",
  ) => Promise<{ path: string; base: string; module: unknown }>
  loadStylesheet?: (
    id: string,
    base: string,
  ) => Promise<{ path: string; base: string; content: string }>
}

const markerClasses = new Set(["group", "peer", "dark"])
const packageRequire = createRequire(import.meta.url)

// CSS named colors (including gray/grey aliases), plus the existing transparent contract.
const cssNamedColors = new Set(
  `aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond
  blue blueviolet brown burlywood cadetblue chartreuse chocolate coral cornflowerblue
  cornsilk crimson cyan darkblue darkcyan darkgoldenrod darkgray darkgreen darkgrey
  darkkhaki darkmagenta darkolivegreen darkorange darkorchid darkred darksalmon
  darkseagreen darkslateblue darkslategray darkslategrey darkturquoise darkviolet
  deeppink deepskyblue dimgray dimgrey dodgerblue firebrick floralwhite forestgreen
  fuchsia gainsboro ghostwhite gold goldenrod gray green greenyellow grey honeydew
  hotpink indianred indigo ivory khaki lavender lavenderblush lawngreen lemonchiffon
  lightblue lightcoral lightcyan lightgoldenrodyellow lightgray lightgreen lightgrey
  lightpink lightsalmon lightseagreen lightskyblue lightslategray lightslategrey
  lightsteelblue lightyellow lime limegreen linen magenta maroon mediumaquamarine
  mediumblue mediumorchid mediumpurple mediumseagreen mediumslateblue mediumspringgreen
  mediumturquoise mediumvioletred midnightblue mintcream mistyrose moccasin navajowhite
  navy oldlace olive olivedrab orange orangered orchid palegoldenrod palegreen
  paleturquoise palevioletred papayawhip peachpuff peru pink plum powderblue purple
  rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown seagreen seashell
  sienna silver skyblue slateblue slategray slategrey snow springgreen steelblue tan
  teal thistle tomato turquoise violet wheat white whitesmoke yellow yellowgreen
  transparent`.split(/\s+/),
)

// Ignore strings and URLs, and consume whole identifiers so names such as
// --red and red-banner cannot be mistaken for literal colors.
function colorValueTokens(value: string, arbitrary = false): string[] {
  const tokens =
    value.match(
      /"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|url\((?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\\.|[^)"'\\])*\)|--[\w-]+|#[\w-]+|[+-]?(?:\d*\.)?\d+(?:[a-z%]+)?|(?:\\.|[a-z_-])(?:\\.|[\w-])*(?:\()?|[^\s]/gi,
    ) ?? []
  return arbitrary
    ? tokens.flatMap((token) =>
        token.startsWith("--") || /^(?:["']|url\()/i.test(token)
          ? [token]
          : token.split(/(?<!\\)_/),
      )
    : tokens
}

function hasLiteralColor(value: string, arbitrary = false): boolean {
  return colorValueTokens(value, arbitrary).some(
    (token) =>
      cssNamedColors.has(token.toLowerCase()) ||
      /^#[0-9a-f]{3,8}$/i.test(token) ||
      /^(?:rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch|color)\($/i.test(token),
  )
}

const colorNamespaces = [
  "--color",
  "--tw-gradient-from",
  "--tw-gradient-via",
  "--tw-gradient-to",
  "--tw-shadow-color",
  "--tw-ring-color",
  "--tw-inset-shadow-color",
  "--tw-inset-ring-color",
]

export async function createTailwind(
  css: string,
  base: string,
  cssAliases: Record<string, string> = {},
): Promise<{
  inspect(token: string): InspectResult
  colors: string[]
}> {
  const loadedStylesheets: string[] = []
  const resolvedBase = resolve(base)
  const options = createLoadOptions(resolvedBase, loadedStylesheets, cssAliases)
  const [designSystem, stockColors] = await Promise.all([
    loadDesignSystem(css, options),
    loadStockColors(resolvedBase),
  ])
  const colors = designSystem.theme
    .keysInNamespaces(["--color"])
    .filter((color) => !stockColors.has(color))
    .sort()
  const customClasses = collectCustomClasses([css, ...loadedStylesheets])
  const cache = new Map<string, InspectResult>()

  return {
    colors,
    inspect(token: string): InspectResult {
      const cached = cache.get(token)
      if (cached) return cached

      const result = inspectToken(token, designSystem, customClasses, stockColors)
      cache.set(token, result)
      return result
    },
  }
}

async function loadDesignSystem(css: string, options: LoadOptions): Promise<DesignSystem> {
  const api = __unstable__loadDesignSystem as unknown as (
    css: string,
    options: LoadOptions,
  ) => Promise<DesignSystem>
  const designSystem = await api(css, options)

  if (typeof designSystem.candidatesToCss !== "function") {
    throw new Error(
      "Tailwind CSS design-system API is missing candidatesToCss; selfix requires Tailwind CSS 4's compiler inspection API.",
    )
  }

  return designSystem
}

function createLoadOptions(
  base: string,
  loadedStylesheets: string[],
  cssAliases: Record<string, string> = {},
): LoadOptions {
  return {
    base,
    async loadStylesheet(id, from) {
      let path: string
      if (Object.hasOwn(cssAliases, id)) {
        const target = resolve(base, cssAliases[id]!)
        try {
          path = stylesheetFile(target)
        } catch (error) {
          throw new Error(
            `Unable to load CSS alias "${id}" from "${from}" at "${target}". Check cssAliases and generate the target before running selfix (for Nuxt UI, run nuxt prepare).`,
            { cause: error },
          )
        }
      } else {
        path = resolveStylesheet(id, from)
      }
      const content = await readFile(path, "utf8").catch((error: unknown) => {
        throw new Error(`Unable to read stylesheet import "${id}" from "${from}".`, {
          cause: error,
        })
      })
      loadedStylesheets.push(content)
      return { path, base: dirname(path), content }
    },
    async loadModule(id, from) {
      const path = resolveModule(id, from)
      const imported = (await import(pathToFileURL(path).href)) as {
        default?: unknown
      }
      return {
        path,
        base: dirname(path),
        module: imported.default ?? imported,
      }
    },
  }
}

async function loadStockColors(base: string): Promise<Set<string>> {
  const path = resolveStylesheet("tailwindcss/theme.css", base)
  const themeCss = await readFile(path, "utf8")
  const designSystem = await loadDesignSystem(themeCss, createLoadOptions(dirname(path), []))
  return new Set(designSystem.theme.keysInNamespaces(["--color"]))
}

function resolveStylesheet(id: string, base: string): string {
  try {
    const candidate = stylesheetCandidates(id)[0]!
    if (isAbsolute(candidate) || candidate.startsWith(".")) {
      return stylesheetFile(resolve(base, candidate))
    }
    const match = /^(@[^/]+\/[^/]+|[^/@][^/]*)(?:\/(.+))?$/.exec(candidate)
    if (!match) throw new Error("Unsupported package import")
    const [, name, subpath] = match
    const require = createRequire(join(resolve(base), "selfix-resolver.js"))
    const searchPaths = [
      ...(require.resolve.paths(name!) ?? []),
      ...(packageRequire.resolve.paths(name!) ?? []),
    ]
    const directory = searchPaths
      .map((path) => join(path, name!))
      .find((path) => existsSync(join(path, "package.json")))
    if (!directory) throw new Error("Package not found")
    const pkg = JSON.parse(readFileSync(join(directory, "package.json"), "utf8")) as {
      exports?: unknown
      style?: unknown
      main?: unknown
    }
    let target: unknown
    if (pkg.exports !== undefined) {
      const entry = pkg.exports
      if (
        entry &&
        typeof entry === "object" &&
        !Array.isArray(entry) &&
        Object.keys(entry).some((key) => key.startsWith("."))
      ) {
        target = styleTarget((entry as Record<string, unknown>)[subpath ? `./${subpath}` : "."])
      } else if (!subpath) {
        target = styleTarget(entry)
      }
      if (
        typeof target !== "string" ||
        !target.startsWith("./") ||
        target.split("/").some((part) => part === ".." || part === "node_modules") ||
        /[\\*%?#]/.test(target)
      ) {
        throw new Error(
          "Unsupported or missing stylesheet export (expected an exact local CSS target)",
        )
      }
    } else {
      target = subpath ?? pkg.style ?? pkg.main ?? "index.css"
    }
    if (typeof target !== "string") throw new Error("Unsupported stylesheet target")
    return stylesheetFile(resolve(directory, target))
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    throw new Error(`Unable to resolve import "${id}" from "${base}": ${reason}.`, { cause: error })
  }
}

// Adapted from shadcn-ui/lint's CSS export selection (MIT).
// https://github.com/shadcn-ui/lint/blob/53de86f0e7dcc341a9cb45c383a9f2c454d1e958/packages/lint/src/tailwind/oracle.ts
function styleTarget(entry: unknown): unknown {
  if (typeof entry === "string") return entry
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) return undefined
  const conditions = entry as Record<string, unknown>
  // A declared style branch is authoritative, even when malformed or missing.
  if (Object.hasOwn(conditions, "style")) return styleTarget(conditions.style)
  return styleTarget(conditions.default)
}

function stylesheetFile(path: string): string {
  if (extname(path) !== ".css") throw new Error(`Stylesheet target must end in .css: ${path}`)
  if (!statSync(path).isFile()) throw new Error(`Stylesheet target is not a file: ${path}`)
  return realpathSync(path)
}

function resolveModule(id: string, base: string): string {
  return resolveImport(id, base, [id])
}

function resolveImport(id: string, base: string, candidates: string[]): string {
  const require = createRequire(join(resolve(base), "selfix-resolver.js"))

  for (const candidate of candidates) {
    try {
      if (isAbsolute(candidate)) {
        if (existsSync(candidate)) return candidate
        throw new Error()
      }
      if (candidate.startsWith(".")) {
        const path = resolve(base, candidate)
        if (existsSync(path)) return path
        throw new Error()
      }
      return require.resolve(candidate)
    } catch {
      try {
        if (!candidate.startsWith(".") && !isAbsolute(candidate)) {
          return packageRequire.resolve(candidate)
        }
      } catch {
        // Try the next candidate before surfacing a clear resolver error.
      }
    }
  }

  throw new Error(`Unable to resolve import "${id}" from "${base}".`)
}

function stylesheetCandidates(id: string): string[] {
  if (id === "tailwindcss") return ["tailwindcss/index.css"]
  if (id === "tailwindcss/theme" || id === "tailwindcss/theme.css") {
    return ["tailwindcss/theme.css"]
  }
  if (id === "tailwindcss/utilities" || id === "tailwindcss/utilities.css") {
    return ["tailwindcss/utilities.css"]
  }
  if (id === "tailwindcss/preflight" || id === "tailwindcss/preflight.css") {
    return ["tailwindcss/preflight.css"]
  }
  return [id]
}

function inspectToken(
  token: string,
  designSystem: DesignSystem,
  customClasses: Map<string, Declaration[]>,
  stockColors: Set<string>,
): InspectResult {
  if (isMarker(token, designSystem.theme.prefix)) {
    return { known: true, categories: ["layout"], rawColor: false }
  }

  const generated = designSystem.candidatesToCss([token])[0]
  const generatedDeclarations = generated ? parseDeclarations(generated) : []
  const customDeclarations = customClasses.get(token) ?? []
  const declarations = [...generatedDeclarations, ...customDeclarations]

  if (declarations.length === 0) {
    return { known: false, categories: ["unknown"], rawColor: false }
  }

  return {
    known: true,
    categories: categorize(declarations),
    // Semantic theme utilities can compile to literals; custom CSS literals are always checked.
    rawColor:
      hasRawColor(generatedDeclarations, stockColors, hasArbitraryColorValue(token)) ||
      hasRawColor(customDeclarations, stockColors, true),
  }
}

function isMarker(token: string, prefix: string | null): boolean {
  const bare = prefix && token.startsWith(`${prefix}:`) ? token.slice(prefix.length + 1) : token
  const marker = bare.split("/", 1)[0]
  return markerClasses.has(marker ?? "")
}

function hasArbitraryColorValue(token: string): boolean {
  const base = baseCandidate(token)
  const bracketStart = base.indexOf("[")
  const bracketEnd = base.lastIndexOf("]")
  if (bracketStart === -1 || bracketEnd <= bracketStart) return false

  const value = base.slice(bracketStart + 1, bracketEnd)
  return hasLiteralColor(value, true)
}

// Adapted from shadcn-ui/lint's bracket-aware class normalization (MIT).
// Source: https://github.com/shadcn-ui/lint/blob/main/packages/lint/src/grammar/classes.ts
export function baseCandidate(token: string): string {
  let depth = 0
  let start = 0
  let quote = ""

  for (let index = 0; index < token.length; index += 1) {
    const char = token[index]
    if (char === "\\") {
      index += 1
      continue
    }
    if (quote) {
      if (char === quote) quote = ""
      continue
    }
    if (char === "'" || char === '"') {
      quote = char
      continue
    }
    if (char === "[" || char === "(") depth += 1
    else if (char === "]" || char === ")") depth--
    else if (char === ":" && depth === 0) start = index + 1
  }

  return token.slice(start)
}

type Declaration = {
  property: string
  value: string
}

function collectCustomClasses(chunks: string[]): Map<string, Declaration[]> {
  const customClasses = new Map<string, Declaration[]>()
  for (const css of chunks) {
    scanDeclarations(css, (declaration, selector) => {
      for (const className of selector.matchAll(/\.([_a-zA-Z][\w-]*)/g)) {
        const name = className[1]!
        const existing = customClasses.get(name) ?? []
        existing.push(declaration)
        customClasses.set(name, existing)
      }
    })
  }
  return customClasses
}

function parseDeclarations(css: string): Declaration[] {
  const declarations: Declaration[] = []
  scanDeclarations(css, (declaration) => declarations.push(declaration))
  return declarations
}

// Scan structural boundaries only; Tailwind still owns CSS compilation. Unsupported
// declaration syntax fails explicitly instead of disappearing from inspection.
function scanDeclarations(
  css: string,
  visit: (declaration: Declaration, selector: string) => void,
): void {
  const blocks: { selector: string; ignored: boolean }[] = []
  const delimiters: string[] = []
  let text = ""
  let quote = ""

  function fail(reason: string): never {
    throw new Error(`Unable to inspect CSS: ${reason}.`)
  }

  function flush(): void {
    const statement = text.trim()
    text = ""
    if (!statement || statement.startsWith("@")) return
    const match = /^([_a-zA-Z-][\w-]*)\s*:\s*([\s\S]+)$/.exec(statement)
    if (!match) fail("unsupported or malformed declaration")
    const block = blocks.at(-1)
    if (!block) fail("declaration outside a rule")
    if (!block.ignored) {
      visit({ property: match[1]!, value: match[2]!.trim() }, block.selector)
    }
  }

  for (let index = 0; index < css.length; index += 1) {
    const char = css[index]!
    if (char === "\\") {
      if (index + 1 === css.length) fail("unterminated escape")
      text += char + css[++index]!
      continue
    }
    if (quote) {
      text += char
      if (char === quote) quote = ""
      continue
    }
    if (char === "'" || char === '"') {
      quote = char
      text += char
      continue
    }
    if (char === "/" && css[index + 1] === "*") {
      const end = css.indexOf("*/", index + 2)
      if (end === -1) fail("unterminated comment")
      index = end + 1
      continue
    }
    if (char === "(" || char === "[") {
      delimiters.push(char === "(" ? ")" : "]")
    } else if (char === ")" || char === "]") {
      if (delimiters.pop() !== char) fail("unmatched value delimiter")
    } else if (delimiters.length === 0) {
      if (char === "{") {
        const header = text.trim()
        if (!header) fail("missing rule header")
        if (/^--[\w-]*\s*:/.test(header)) fail("block-valued custom properties are unsupported")
        const parent = blocks.at(-1)
        blocks.push({
          selector: header.startsWith("@") ? (parent?.selector ?? "") : header,
          ignored: (parent?.ignored ?? false) || /^@property(?:\s|$)/i.test(header),
        })
        text = ""
        continue
      }
      if (char === ";" || char === "}") {
        flush()
        if (char === "}" && !blocks.pop()) fail("unmatched closing brace")
        continue
      }
    }
    text += char
  }

  if (quote) fail("unterminated string")
  if (delimiters.length) fail("unclosed value delimiter")
  if (blocks.length) fail("unclosed rule")
  flush()
}

function categorize(declarations: Declaration[]): Category[] {
  const found = new Set<Category>()

  for (const declaration of declarations) {
    found.add(categoryFor(declaration))
  }

  const ordered = categories.filter((category) => found.has(category))

  return ordered.length > 0 ? ordered : ["unknown"]
}

function categoryFor({ property }: Declaration): Category {
  if (isColorDeclaration(property)) return "color"
  if (property === "animation" || property.startsWith("transition")) return "motion"
  if (property === "--tw-duration" || property === "--tw-ease") return "motion"
  if (property === "border-radius") return "shape"
  if (
    property.startsWith("--tw-space-") ||
    property === "cursor" ||
    property === "margin-inline-start" ||
    property === "margin-inline-end"
  ) {
    return "layout"
  }
  if (property.startsWith("margin")) return "layout"
  if (
    property.startsWith("padding") ||
    property === "gap" ||
    property === "row-gap" ||
    property === "column-gap" ||
    property.startsWith("scroll-margin") ||
    property.startsWith("scroll-padding")
  ) {
    return "spacing"
  }
  if (property === "--tw-font-weight" || property === "--tw-leading") return "typography"
  if (
    property.startsWith("font") ||
    property === "line-height" ||
    property === "letter-spacing" ||
    property === "text-align" ||
    property === "text-transform" ||
    property.startsWith("text-decoration") ||
    property === "white-space" ||
    property === "word-break" ||
    property === "overflow-wrap" ||
    property.startsWith("list-style") ||
    property === "vertical-align"
  ) {
    return "typography"
  }
  if (
    property.startsWith("--tw-ring") ||
    property.startsWith("--tw-shadow") ||
    property.startsWith("--tw-inset-shadow") ||
    property.startsWith("--tw-translate-") ||
    property === "--tw-rotate-x" ||
    property === "--tw-rotate-y" ||
    property === "--tw-rotate-z" ||
    property === "rotate" ||
    property === "translate"
  ) {
    return "effects"
  }
  if (
    property === "box-shadow" ||
    property === "opacity" ||
    property.includes("filter") ||
    property === "mix-blend-mode" ||
    property === "background-image" ||
    property === "transform"
  ) {
    return "effects"
  }
  if (
    property === "display" ||
    property === "position" ||
    property === "z-index" ||
    property === "overflow" ||
    property.startsWith("overflow-") ||
    property === "visibility" ||
    property === "box-sizing" ||
    property === "aspect-ratio" ||
    property === "object-fit" ||
    property === "object-position" ||
    property === "float" ||
    property === "clear" ||
    property === "order" ||
    property === "columns" ||
    property === "width" ||
    property === "height" ||
    property.startsWith("min-") ||
    property.startsWith("max-") ||
    property.startsWith("inset") ||
    property === "top" ||
    property === "right" ||
    property === "bottom" ||
    property === "left" ||
    property.startsWith("flex") ||
    property.startsWith("grid") ||
    property.startsWith("align-") ||
    property.startsWith("justify-") ||
    property.startsWith("place-") ||
    property === "container-type" ||
    property === "container-name" ||
    property === "pointer-events"
  ) {
    return "layout"
  }
  if (property.startsWith("border") || property.startsWith("outline")) {
    return "shape"
  }

  return "unknown"
}

function isColorDeclaration(property: string): boolean {
  if (colorNamespaces.some((namespace) => property === namespace)) return true
  if (property === "color" || property.endsWith("-color")) return true
  if (property === "fill" || property === "stroke" || property === "caret-color") {
    return true
  }
  return false
}

function isCompositeColorDeclaration(property: string): boolean {
  return /^(?:background(?:-image)?|border(?:-(?:top|right|bottom|left|block|inline)(?:-(?:start|end))?)?|border-image(?:-source)?|outline|text-decoration|column-rule|box-shadow|text-shadow|filter|backdrop-filter|--tw-drop-shadow(?:-size)?|--tw-(?:inset-)?(?:shadow|ring-shadow))$/.test(
    property,
  )
}

function hasRawColor(
  declarations: Declaration[],
  stockColors: Set<string>,
  includeDeclarationLiterals: boolean,
): boolean {
  return declarations.some(({ property, value }) => {
    if (!isColorDeclaration(property) && !isCompositeColorDeclaration(property)) return false
    if (includeDeclarationLiterals && hasLiteralColor(value)) {
      return true
    }
    return extractColorVariables(value).some((color) => stockColors.has(color))
  })
}

function extractColorVariables(value: string): string[] {
  const tokens = colorValueTokens(value)
  return tokens.flatMap((token, index) => {
    if (token.toLowerCase() !== "var(") return []
    const match = /^--(?:[a-z]+-)?color-(.+)$/.exec(tokens[index + 1] ?? "")
    return match ? [match[1]!] : []
  })
}
