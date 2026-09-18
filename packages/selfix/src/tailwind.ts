import { existsSync } from "node:fs"
import { readFile } from "node:fs/promises"
import { dirname, isAbsolute, join, resolve } from "node:path"
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

function hasLiteralColor(value: string): boolean {
  if (
    /(?:^|[\s([,:])(?:#[0-9a-f]{3,8}\b|(?:rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch|color|color-mix|light-dark)\()/i.test(
      value,
    )
  ) {
    return true
  }
  // Accept arbitrary property/type hints and declaration importance, not variable names.
  const named = /^(?:[\w-]+:)?\s*([a-z]+)\s*(?:!important)?$/i.exec(value.trim())
  return named !== null && cssNamedColors.has(named[1]!.toLowerCase())
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
): Promise<{
  inspect(token: string): InspectResult
  colors: string[]
}> {
  const loadedStylesheets: string[] = []
  const resolvedBase = resolve(base)
  const options = createLoadOptions(resolvedBase, loadedStylesheets)
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

function createLoadOptions(base: string, loadedStylesheets: string[]): LoadOptions {
  return {
    base,
    async loadStylesheet(id, from) {
      const path = resolveStylesheet(id, from)
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
  return resolveImport(id, base, stylesheetCandidates(id))
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
  return hasLiteralColor(value)
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
  const cssWithoutProperties = stripIgnoredCss(chunks.join("\n"))
  const rulePattern = /([^{}@]+)\{([^{}]*)\}/g
  let match: RegExpExecArray | null

  while ((match = rulePattern.exec(cssWithoutProperties))) {
    const selector = match[1] ?? ""
    const declarations = parseDeclarations(match[2] ?? "")
    if (declarations.length === 0) continue

    for (const className of selector.matchAll(/\.([_a-zA-Z][\w-]*)/g)) {
      const existing = customClasses.get(className[1] ?? "") ?? []
      customClasses.set(className[1] ?? "", [...existing, ...declarations])
    }
  }

  return customClasses
}

function parseDeclarations(css: string): Declaration[] {
  const cssWithoutProperties = stripIgnoredCss(css)
  const declarations: Declaration[] = []
  const declarationPattern = /([_a-zA-Z-][\w-]*)\s*:\s*([^;{}]+)(?:;|$)/g
  let match: RegExpExecArray | null

  while ((match = declarationPattern.exec(cssWithoutProperties))) {
    const property = match[1]
    const value = match[2]
    if (!property || !value) continue
    declarations.push({ property, value: value.trim() })
  }

  return declarations
}

function stripIgnoredCss(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, "").replace(/@property\s+[^{]+\{[^{}]*\}/g, "")
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

function hasRawColor(
  declarations: Declaration[],
  stockColors: Set<string>,
  includeDeclarationLiterals: boolean,
): boolean {
  return declarations.some(({ property, value }) => {
    if (!isColorDeclaration(property)) return false
    if (includeDeclarationLiterals && hasLiteralColor(value)) {
      return true
    }
    return extractColorVariables(value).some((color) => stockColors.has(color))
  })
}

function extractColorVariables(value: string): string[] {
  return Array.from(
    value.matchAll(/var\(--(?:[a-z]+-)?color-([^)]+)\)/g),
    (match) => match[1],
  ).filter(Boolean)
}
