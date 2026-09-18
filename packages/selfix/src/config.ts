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
export type RuleSetting = Severity | [Severity, RuleOptions]
export interface Config {
  /** CSS entry relative to the configuration file. Required by the CLI. */
  css?: string
  /** Exact CSS imports mapped to local files, relative to the config directory (API: base). */
  cssAliases?: Record<string, string>
  /** Import prefixes identifying design-system components. */
  ui?: string[]
  /** Regexes for additional design-system import sources. */
  componentImports?: string[]
  ignoreImports?: string[]
  /** Regexes for globally registered components without a local import. */
  components?: string[]
  /** Directory names or project-relative path prefixes excluded by the CLI. */
  exclude?: string[]
  note?: string
  rules?: Partial<Record<RuleName, RuleSetting>>
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
        if (!["component", "className", "category", "file", "rule"].includes(match[1]))
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
      "cssAliases",
      "ui",
      "componentImports",
      "ignoreImports",
      "components",
      "exclude",
      "note",
      "rules",
    ],
    "config",
  )
  for (const key of ["css", "note"])
    if (obj[key] !== undefined && typeof obj[key] !== "string")
      throw new Error(`${key} must be a string.`)
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
  if (obj.rules === undefined) return
  const rules = record(obj.rules, "rules")
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
