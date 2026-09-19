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
/** File overrides preserve omitted options; supplied lists/maps replace as units. */
export type RuleSetting = Severity | [Severity, RuleOptions]
export interface FileOverride {
  /** Config-relative file patterns; all matching entries apply in order. */
  files: string[]
  rules: Partial<Record<RuleName, RuleSetting>>
}
export interface ClassProps {
  /** Regular expression matching the collected component name. First match wins. */
  pattern: string
  props: Record<string, "class" | "slot-map">
}

export function normalizePropName(name: string): string {
  return name.replace(/\B([A-Z])/g, "-$1").toLowerCase()
}

export interface ProjectOptions {
  /** Project metadata/source root; CLI resolves this relative to its config. */
  root?: string
  /** Import patterns (at most one *) mapped to local source paths. */
  aliases?: Record<string, string>
  /** Exact local/global component names mapped to Vue definitions. */
  components?: Record<string, string>
  /** Explicit tsconfig/jsconfig file, relative to root. */
  tsconfig?: string
  /** Detect Nuxt from package metadata by default; false disables it. */
  nuxt?: boolean
  /** Prepared component declarations for a nondefault Nuxt build directory. */
  nuxtComponents?: string
}

export interface Config {
  /** Optional filesystem discovery; the CLI enables it by default. */
  project?: ProjectOptions | false
  /** Additional props containing classes, scoped by component name. */
  classProps?: ClassProps[]
  /** CSS entry relative to the configuration file. Required by the CLI. */
  css?: string
  /** Exact CSS imports mapped to local files, relative to the config directory (API: root). */
  cssAliases?: Record<string, string>
  /** Import prefixes identifying design-system components. */
  ui?: string[]
  /** Regexes for additional design-system import sources. */
  componentImports?: string[]
  ignoreImports?: string[]
  /** Regexes for globally registered components without a local import. */
  components?: string[]
  /** Config-relative file globs excluded by the CLI. */
  exclude?: string[]
  note?: string
  rules?: Partial<Record<RuleName, RuleSetting>>
  overrides?: FileOverride[]
}

/** Programmatic linting policy; file selection and CSS loading belong to the caller. */
export type LinterConfig = Omit<Config, "css" | "exclude">

export function validateLinterConfig(config: unknown): asserts config is LinterConfig {
  const obj = record(config, "config")
  for (const field of ["css", "exclude"])
    if (field in obj) throw new Error(`config.${field} is only supported by the CLI.`)
  validateConfig(config)
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
        if (
          !["component", "className", "category", "file", "rule", "prop", "slot"].includes(match[1])
        )
          throw new Error(`Unknown message placeholder: ${match[1]}.`)
      }
    }
  }
  if (obj.contracts !== undefined) {
    if (!Array.isArray(obj.contracts)) throw new Error(`${label}.contracts must be an array.`)
    obj.contracts.forEach((item, index) => options(item, `${label}.contracts[${index}]`, true))
  }
}

export function validateConfig(config: unknown): asserts config is Config {
  const obj = record(config, "config")
  keys(
    obj,
    [
      "css",
      "project",
      "classProps",
      "cssAliases",
      "ui",
      "componentImports",
      "ignoreImports",
      "components",
      "exclude",
      "note",
      "rules",
      "overrides",
    ],
    "config",
  )
  if (obj.project !== undefined && obj.project !== false) {
    const project = record(obj.project, "project")
    keys(
      project,
      ["root", "aliases", "components", "tsconfig", "nuxt", "nuxtComponents"],
      "project",
    )
    const localPath = (value: unknown, label: string) => {
      if (
        typeof value !== "string" ||
        !value.trim() ||
        (/^[a-z][a-z\d+.-]*:/i.test(value) && !/^[a-z]:[\\/]/i.test(value))
      )
        throw new Error(`${label} must be a non-empty local path.`)
    }
    for (const key of ["root", "tsconfig", "nuxtComponents"])
      if (project[key] !== undefined) localPath(project[key], `project.${key}`)
    if (project.nuxt !== undefined && typeof project.nuxt !== "boolean")
      throw new Error("project.nuxt must be a boolean.")
    for (const key of ["aliases", "components"])
      if (project[key] !== undefined) {
        for (const [name, target] of Object.entries(record(project[key], `project.${key}`))) {
          if (!name.trim() || name.split("*").length > 2)
            throw new Error(`Invalid project.${key} name: ${name}`)
          localPath(target, `project.${key}.${name}`)
          if (typeof target !== "string") continue
          if (
            key === "components" &&
            (!target.endsWith(".vue") || target.includes("*") || name.includes("*"))
          )
            throw new Error("project.components must map exact names to .vue paths.")
          if (
            key === "aliases" &&
            (target.split("*").length > 2 || (target.includes("*") && !name.includes("*")))
          )
            throw new Error("project.aliases supports at most one matching wildcard.")
        }
      }
  }
  for (const key of ["css", "note"])
    if (obj[key] !== undefined && typeof obj[key] !== "string")
      throw new Error(`${key} must be a string.`)
  if (obj.classProps !== undefined) {
    if (!Array.isArray(obj.classProps)) throw new Error("classProps must be an array.")
    obj.classProps.forEach((value, index) => {
      const label = `classProps[${index}]`
      const entry = record(value, label)
      keys(entry, ["pattern", "props"], label)
      pattern(entry.pattern, `${label}.pattern`)
      const names = new Set<string>()
      for (const [name, mode] of Object.entries(record(entry.props, `${label}.props`))) {
        const normalized = normalizePropName(name)
        if (!/^[a-zA-Z][\w-]*$/.test(name) || ["class", "style"].includes(normalized))
          throw new Error(`${label}.props: ${name} must name an additional component prop.`)
        if (names.has(normalized))
          throw new Error(`${label}.props contains duplicate prop: ${normalized}.`)
        names.add(normalized)
        if (mode !== "class" && mode !== "slot-map")
          throw new Error(`${label}.props.${name} must be class or slot-map.`)
      }
    })
  }
  if (obj.cssAliases !== undefined) {
    for (const [id, target] of Object.entries(record(obj.cssAliases, "cssAliases"))) {
      if (!id.trim() || id.includes("*"))
        throw new Error("cssAliases keys must be non-empty exact import names without wildcards.")
      if (
        typeof target !== "string" ||
        !target.endsWith(".css") ||
        target.includes("*") ||
        (/^[a-z][a-z\d+.-]*:/i.test(target) && !/^[a-z]:[\\/]/i.test(target))
      )
        throw new Error(`cssAliases["${id}"] must be a local .css file path without wildcards.`)
    }
  }
  for (const key of ["ui", "componentImports", "ignoreImports", "components", "exclude"]) {
    if (obj[key] === undefined) continue
    strings(obj[key], key)
    if (["componentImports", "ignoreImports", "components"].includes(key))
      (obj[key] as string[]).forEach((item) => pattern(item, key))
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

function validateRules(value: unknown) {
  const rules = record(value, "rules")
  keys(rules, ruleNames, "rule")
  for (const [name, setting] of Object.entries(rules)) {
    const severity = Array.isArray(setting) ? setting[0] : setting
    if (!["off", "warn", "error"].includes(severity as string))
      throw new Error(`Invalid severity for ${name}. Use off, warn, or error.`)
    if (Array.isArray(setting)) {
      if (setting.length !== 2) throw new Error(`${name} must be [severity, options].`)
      options(setting[1], name)
    }
  }
}
