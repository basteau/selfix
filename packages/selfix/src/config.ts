// `sizes` and `variants` are filled for no-restyle findings on a themed Nuxt UI component.
const placeholders = [
  "component",
  "className",
  "category",
  "file",
  "rule",
  "prop",
  "slot",
  "sizes",
  "variants",
]

/** Directories that never hold application source. The CLI and stylesheet detection skip them. */
export const ignoredDirectories = new Set([
  "node_modules",
  ".git",
  "dist",
  "coverage",
  ".nuxt",
  ".output",
])

export const categories = [
  "layout",
  "color",
  "typography",
  "spacing",
  "shape",
  "effects",
  "motion",
  "unknown",
] as const

export type Category = (typeof categories)[number]

export const ruleNames = [
  "no-restricted-components",
  "prefer-ui-components",
  "no-restyle",
  "no-raw-colors",
  "no-arbitrary-values",
  "no-inline-styles",
  "no-unknown-classes",
  "require-static-classes",
] as const

export type RuleName = (typeof ruleNames)[number]
export type Severity = "off" | "warn" | "error"
export type Message = string | Partial<Record<Category | "default", string>>
export interface Contract {
  /** Regular expression matching the template component name. First match wins. */
  pattern: string
  allow?: string[]
  deny?: string[]
  message?: Message
}
export interface RuleOptions {
  allow?: string[]
  deny?: string[]
  contracts?: Contract[]
  message?: Message
}
/** An exact local or global component name, with optional correction guidance. */
export interface ComponentRestriction {
  name: string
  replacement?: string
  message?: string
}
/** An exact authored import source and exported name, with optional correction guidance. */
export interface ImportRestriction {
  source: string
  name: string
  replacement?: string
  message?: string
}
export interface RestrictedComponentOptions {
  components?: ComponentRestriction[]
  imports?: ImportRestriction[]
}
export interface PreferUiComponentsOptions {
  /** Native tags mapped to their replacement; merged over the defaults, false exempts a tag. */
  elements?: Record<string, string | false>
}
/** File overrides preserve omitted options; supplied lists/maps replace as units. */
export type RuleSetting<Options = RuleOptions> = Severity | [Severity, Options]
export type Rules = {
  [Name in RuleName]?: RuleSetting<
    Name extends "no-restricted-components"
      ? RestrictedComponentOptions
      : Name extends "prefer-ui-components"
        ? PreferUiComponentsOptions
        : RuleOptions
  >
}
export interface FileOverride {
  /** Config-relative file patterns; all matching entries apply in order. */
  files: string[]
  rules: Rules
}
/** An exact import identifying a helper with clsx-style class arguments. */
export interface ClassHelper {
  from: string
  /** Exported name, or "default" for a default import. */
  import: string
}
export interface Config {
  /** Tailwind CSS entry, relative to the project root. Detected when omitted. */
  css?: string
  /** Directory of Nuxt UI's generated files. Defaults to .nuxt, then node_modules/.nuxt-ui. */
  buildDir?: string
  /** Nuxt UI component prefix. Defaults to "U". */
  prefix?: string
  /** Regexes naming your own components to protect alongside Nuxt UI's. */
  components?: string[]
  /** Additional imported class helpers; built-in recognition remains enabled. */
  classHelpers?: ClassHelper[]
  /** Root-relative file globs the CLI skips. */
  exclude?: string[]
  /** Text appended to every finding. */
  note?: string
  rules?: Rules
  overrides?: FileOverride[]
  /** Severity for exception comments that suppress nothing; defaults to error. */
  unusedExceptions?: Severity
}

export function defineConfig(config: Config): Config {
  validateConfig(config)
  return config
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error(`${label} must be an object.`)
  return value as Record<string, unknown>
}
function keys(value: Record<string, unknown>, allowed: readonly string[], label: string) {
  for (const key of Object.keys(value))
    if (!allowed.includes(key)) throw new Error(`Unknown ${label} option: ${key}.`)
}
function strings(value: unknown, label: string) {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || !item))
    throw new Error(`${label} must be an array of non-empty strings.`)
}
function pattern(value: unknown, label: string) {
  if (typeof value !== "string" || !value)
    throw new Error(`${label} must be a non-empty regular expression.`)
  try {
    new RegExp(value)
  } catch {
    throw new Error(`Invalid regular expression in ${label}: ${value}`)
  }
}

/** A deliberately small file glob syntax, independent of filesystem traversal. */
export function filePattern(value: string): RegExp {
  const source = value.startsWith("./") ? value.slice(2) : value
  const segments = source.split("/")
  if (
    !source ||
    /^[!\\/]/.test(source) ||
    /[\\:{}[\]()]/.test(source) ||
    segments.some(
      (segment) =>
        !segment ||
        segment === "." ||
        segment === ".." ||
        (segment.includes("**") && segment !== "**"),
    )
  )
    throw new Error(
      `Invalid file pattern: ${value}. Use relative paths with *, **, or ?; ** must occupy a whole segment.`,
    )
  const regex = segments
    .map((segment, index) => {
      const last = index === segments.length - 1
      if (segment === "**") return last ? ".*" : "(?:[^/]+/)*"
      return (
        segment
          .replace(/[.+^$|]/g, "\\$&")
          .replace(/\*/g, "[^/]*")
          .replace(/\?/g, "[^/]") + (last ? "" : "/")
      )
    })
    .join("")
  return new RegExp(`^${regex}$`, "s")
}
function options(value: unknown, label: string, contract = false) {
  const obj = record(value, label)
  keys(
    obj,
    contract ? ["pattern", "allow", "deny", "message"] : ["allow", "deny", "message", "contracts"],
    label,
  )
  if (
    label.startsWith("require-static-classes") &&
    (obj.allow !== undefined || obj.deny !== undefined)
  ) {
    throw new Error(
      "require-static-classes supports messages, not allow/deny lists; unresolved classes cannot be matched safely.",
    )
  }
  if (contract) pattern(obj.pattern, `${label}.pattern`)
  for (const key of ["allow", "deny"])
    if (obj[key] !== undefined) strings(obj[key], `${label}.${key}`)
  if (obj.message !== undefined) {
    const messages =
      typeof obj.message === "string"
        ? [obj.message]
        : Object.values(record(obj.message, `${label}.message`))
    if (typeof obj.message !== "string")
      keys(obj.message as Record<string, unknown>, ["default", ...categories], `${label}.message`)
    for (const message of messages) {
      if (typeof message !== "string") throw new Error(`${label}.message values must be strings.`)
      for (const match of message.matchAll(/\{\{(.*?)\}\}/g)) {
        const field = match[1]!.split("|", 1)[0]!
        if (!placeholders.includes(field)) throw new Error(`Unknown message placeholder: ${field}.`)
      }
    }
  }
  if (obj.contracts !== undefined) {
    if (!Array.isArray(obj.contracts)) throw new Error(`${label}.contracts must be an array.`)
    obj.contracts.forEach((item, index) => options(item, `${label}.contracts[${index}]`, true))
  }
}

const removedKeys = [
  "ui",
  "componentImports",
  "ignoreImports",
  "classProps",
  "cssAliases",
  "project",
]

export function validateConfig(config: unknown): asserts config is Config {
  const obj = record(config, "config")
  for (const key of removedKeys)
    if (key in obj)
      throw new Error(
        `The ${key} option was removed. selfix recognizes Nuxt UI components, reads their ui prop, and loads the generated theme on its own; name your own components with the components option.`,
      )
  keys(
    obj,
    [
      "css",
      "buildDir",
      "prefix",
      "components",
      "classHelpers",
      "exclude",
      "note",
      "rules",
      "overrides",
      "unusedExceptions",
    ],
    "config",
  )
  for (const key of ["css", "buildDir", "note"])
    if (obj[key] !== undefined && (typeof obj[key] !== "string" || !obj[key].trim()))
      throw new Error(`${key} must be a non-empty string.`)
  if (
    obj.prefix !== undefined &&
    (typeof obj.prefix !== "string" || !/^[A-Z][A-Za-z\d]*$/.test(obj.prefix))
  )
    throw new Error('prefix must be a PascalCase component prefix such as "U".')
  if (obj.classHelpers !== undefined) {
    if (!Array.isArray(obj.classHelpers)) throw new Error("classHelpers must be an array.")
    obj.classHelpers.forEach((value, index) => {
      const label = `classHelpers[${index}]`
      const entry = record(value, label)
      keys(entry, ["from", "import"], label)
      for (const key of ["from", "import"]) {
        if (typeof entry[key] !== "string" || !entry[key].trim())
          throw new Error(`${label}.${key} must be a non-empty string.`)
      }
    })
  }
  for (const key of ["components", "exclude"]) {
    if (obj[key] === undefined) continue
    strings(obj[key], key)
    if (key === "components") (obj[key] as string[]).forEach((item) => pattern(item, key))
  }
  for (const entry of (obj.exclude ?? []) as string[]) {
    filePattern(entry)
    const clean = entry.replace(/^\.\//, "")
    if (!/[?*]/.test(clean) && !clean.endsWith(".vue")) {
      const suggestion = clean.includes("/") ? `${clean}/**` : `**/${clean}/**`
      throw new Error(
        `exclude entry "${entry}" is a directory shorthand. Use "${suggestion}" to exclude its contents.`,
      )
    }
  }
  if (
    obj.unusedExceptions !== undefined &&
    !["off", "warn", "error"].includes(obj.unusedExceptions as string)
  )
    throw new Error("unusedExceptions must be off, warn, or error.")
  if (obj.rules !== undefined) validateRules(obj.rules)
  if (obj.overrides !== undefined) {
    if (!Array.isArray(obj.overrides)) throw new Error("overrides must be an array.")
    obj.overrides.forEach((value, index) => {
      const label = `overrides[${index}]`
      const entry = record(value, label)
      keys(entry, ["files", "rules"], label)
      strings(entry.files, `${label}.files`)
      if (!(entry.files as string[]).length) throw new Error(`${label}.files must not be empty.`)
      for (const file of entry.files as string[]) filePattern(file)
      validateRules(entry.rules)
    })
  }
}

function validateRestrictionEntries(value: unknown, label: string, required: readonly string[]) {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array.`)
  value.forEach((item, index) => {
    const entryLabel = `${label}[${index}]`
    const entry = record(item, entryLabel)
    keys(entry, [...required, "replacement", "message"], entryLabel)
    for (const key of [...required, "replacement", "message"]) {
      if (!required.includes(key) && entry[key] === undefined) continue
      if (typeof entry[key] !== "string" || !(entry[key] as string).trim())
        throw new Error(`${entryLabel}.${key} must be a non-empty string.`)
    }
  })
}

function validateRules(value: unknown) {
  const rules = record(value, "rules")
  keys(rules, ruleNames, "rule")
  for (const [name, setting] of Object.entries(rules)) {
    const severity = Array.isArray(setting) ? setting[0] : setting
    if (!["off", "warn", "error"].includes(severity as string))
      throw new Error(`Invalid severity for ${name}. Use off, warn, or error.`)
    if (Array.isArray(setting)) {
      if (setting.length !== 2) throw new Error(`${name} must be [severity, options].`)
      if (name === "no-restricted-components") {
        const obj = record(setting[1], name)
        keys(obj, ["components", "imports"], name)
        if (obj.components !== undefined)
          validateRestrictionEntries(obj.components, `${name}.components`, ["name"])
        if (obj.imports !== undefined)
          validateRestrictionEntries(obj.imports, `${name}.imports`, ["source", "name"])
      } else if (name === "prefer-ui-components") {
        const obj = record(setting[1], name)
        keys(obj, ["elements"], name)
        for (const [tag, replacement] of Object.entries(
          obj.elements === undefined ? {} : record(obj.elements, `${name}.elements`),
        ))
          if (
            !/^[a-z][a-z\d-]*$/.test(tag) ||
            (replacement !== false && (typeof replacement !== "string" || !replacement.trim()))
          )
            throw new Error(
              `${name}.elements must map lowercase native tags to a component name or false.`,
            )
      } else options(setting[1], name)
    }
  }
}
