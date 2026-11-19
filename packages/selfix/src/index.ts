import { readFileSync } from "node:fs"
import path from "node:path"
import { applyExceptions } from "./exceptions.js"
import { loadNuxtUi, type ComponentTheme } from "./nuxt-ui.js"
import { baseCandidate, createTailwind, findEntry, type Category } from "./tailwind.js"
import {
  collectVue,
  pascalCase,
  resolveComponentAlias,
  type ComponentUsage,
  type NativeElement,
} from "./vue.js"
import {
  ruleNames,
  validateConfig,
  filePattern,
  type Config,
  type RuleName,
  type RuleOptions,
  type ImportRestriction,
  type PreferUiComponentsOptions,
  type RestrictedComponentOptions,
  type Severity,
} from "./config.js"

export { defineConfig, ruleNames } from "./config.js"
export type {
  ComponentRestriction,
  ImportRestriction,
  RestrictedComponentOptions,
  PreferUiComponentsOptions,
  Rules,
  ClassHelper,
  FileOverride,
  Config,
  Contract,
  Message,
  RuleName,
  RuleOptions,
  RuleSetting,
  Severity,
} from "./config.js"
export type { Category } from "./tailwind.js"

export interface Diagnostic {
  suggestions?: string[]
  file: string
  rule: RuleName | "parse-error" | "invalid-exception" | "unused-exception"
  severity: Exclude<Severity, "off">
  message: string
  line: number
  column: number
  offset: number
  component?: string
  className?: string
  prop?: string
  slot?: string
}
/** A finding hidden by a `selfix-disable-next-line` comment, with that comment's reason. */
export interface SuppressedDiagnostic extends Diagnostic {
  reason: string
}
export interface CheckResult {
  diagnostics: Diagnostic[]
  suppressed: SuppressedDiagnostic[]
}
export interface LinterOptions {
  /** Project root: where Nuxt UI is installed and config paths start. Defaults to cwd. */
  root?: string
  config?: Config
  /** Stylesheet source to lint against, instead of the file named or found through config.css. */
  css?: string
  /** Directory the imports in `css` resolve from, relative to root. Defaults to root. */
  cssBase?: string
}

type Imports = ReturnType<typeof collectVue>["imports"]
type AnyOptions = RuleOptions & RestrictedComponentOptions & PreferUiComponentsOptions

// Native elements and the Nuxt UI components that replace them.
const nativeReplacements: Record<string, string> = {
  button: "Button",
  input: "Input",
  select: "Select",
  textarea: "Textarea",
  hr: "Separator",
  kbd: "Kbd",
  progress: "Progress",
  dialog: "Modal",
}
const inputReplacements: Record<string, string | false> = {
  checkbox: "Checkbox",
  radio: "RadioGroup",
  range: "Slider",
  file: "FileUpload",
  number: "InputNumber",
  date: "InputDate",
  time: "InputTime",
  color: "ColorPicker",
  button: "Button",
  submit: "Button",
  reset: "Button",
  hidden: false,
  image: false,
}
// The props that usually answer a restyle of each category.
const variantProps: Partial<Record<Category, string[]>> = {
  color: ["color", "variant"],
  spacing: ["size"],
  typography: ["size"],
  shape: ["variant"],
  effects: ["variant"],
  unknown: ["color", "variant", "size"],
}
// Rules that judge a class token, and so decide whether a suggested class is acceptable.
const classRules = new Set<RuleName>([
  "no-restyle",
  "no-raw-colors",
  "no-arbitrary-values",
  "no-unknown-classes",
])

function matchesRestrictedName(name: string, site: ComponentUsage, imports: Imports): boolean {
  const alias = resolveComponentAlias(name, imports)
  // An imported usage matches its local binding. A written namespace
  // member such as UI.Button is not that local name, so it matches
  // only the exact configured name.
  if (alias) return alias.local === site.component && site.importSource !== undefined
  if (site.importSource !== undefined) return name === site.component
  return pascalCase(name) === pascalCase(site.component)
}

function matchesRestrictedImport(
  entry: ImportRestriction,
  site: ComponentUsage,
  imports: Imports,
): boolean {
  if (site.importSource === undefined) return false
  const alias = imports.get(site.component)
  if (!alias || alias.imported === "*" || alias.importSource !== site.importSource) return false
  return alias.importSource === entry.source && alias.imported === entry.name
}

function baseClass(token: string): string {
  return baseCandidate(token).replace(/^!|!$/g, "").replace(/^-/, "")
}
function prepareMatchers(entries: string[]) {
  return entries.map((entry) => ({
    entry,
    fullToken: entry.includes(":"),
    regex: new RegExp(`^${entry.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*")}$`),
  }))
}
function matches(
  entries: ReturnType<typeof prepareMatchers>,
  token: string,
  categories: Category[],
) {
  return entries.some(
    ({ entry, fullToken, regex }) =>
      categories.includes(entry as Category) || regex.test(fullToken ? token : baseClass(token)),
  )
}
function preparePolicy(options: RuleOptions, defaultAllow: string[]) {
  return {
    allow: prepareMatchers(options.allow ?? defaultAllow),
    deny: prepareMatchers(options.deny ?? []),
    message: options.message,
  }
}
/** Selects a rule's policy for a component: its first matching contract, or the rule itself. */
function prepareOptions(name: RuleName, options: RuleOptions) {
  const defaultAllow = name === "no-restyle" ? ["layout"] : []
  const fallback = preparePolicy(options, defaultAllow)
  const contracts = (options.contracts ?? []).map((contract) => ({
    regex: new RegExp(contract.pattern),
    selected: preparePolicy({ ...options, ...contract }, defaultAllow),
  }))
  return (component: string) =>
    contracts.find(({ regex }) => regex.test(component))?.selected ?? fallback
}

/** Says why a class is rejected and which design-system choice answers it. */
function restyleMessage(
  token: string,
  component: string,
  category: Category,
  denied: boolean,
  theme: ComponentTheme | undefined,
  themeConfig: string,
): string {
  if (denied)
    return `"${token}" is denied by the design-system policy for <${component}>. Remove this class.`
  const reason =
    category === "unknown"
      ? "selfix could not classify what this class changes"
      : `the component owns its ${category}`
  const props = (variantProps[category] ?? [])
    .filter((prop) => theme?.variants[prop]?.length)
    .map((prop) => `${prop} (${theme!.variants[prop]!.join(", ")})`)
  const guidance = theme
    ? `${props.length ? `Use ${props.join(" or ")}, or restyle` : "Restyle"} it for the whole app under ui.${theme.key} in ${themeConfig}.`
    : "Use the component's props, or widen its contract if callers need this control."
  return `"${token}" is not allowed on <${component}>: ${reason}. ${guidance}`
}

function sourcePositions(source: string) {
  const starts = [0]
  for (
    let newline = source.indexOf("\n");
    newline !== -1;
    newline = source.indexOf("\n", newline + 1)
  )
    starts.push(newline + 1)
  return (offset: number) => {
    let low = 0
    let high = starts.length
    while (low + 1 < high) {
      const middle = Math.floor((low + high) / 2)
      if (starts[middle] <= offset) low = middle
      else high = middle
    }
    return { line: low + 1, column: offset - starts[low] + 1 }
  }
}

function readStylesheet(file: string): string {
  try {
    return readFileSync(file, "utf8")
  } catch (error) {
    throw new Error(`Unable to read the Tailwind CSS entry ${file}. Check css in the config.`, {
      cause: error,
    })
  }
}

export async function createLinter(options: LinterOptions = {}) {
  const { config = {} } = options
  validateConfig(config)
  for (const key of ["root", "cssBase"] as const) {
    const value = options[key]
    if (value !== undefined && (typeof value !== "string" || !value.trim()))
      throw new Error(`${key} must be a non-empty directory path.`)
  }
  const root = path.resolve(options.root ?? process.cwd())
  const nuxtUi = loadNuxtUi(root, config)
  const entry =
    options.css === undefined
      ? config.css
        ? path.resolve(root, config.css)
        : findEntry(root)
      : undefined
  const tailwind = await createTailwind(
    entry ? readStylesheet(entry) : options.css!,
    entry ? path.dirname(entry) : path.resolve(root, options.cssBase ?? "."),
    // Without a loaded theme, a stylesheet that imports Nuxt UI fails at this path.
    { "#build/ui.css": nuxtUi?.css ?? path.resolve(root, config.buildDir ?? ".nuxt", "ui.css") },
  )
  const settings = ruleNames.map((name) => {
    const setting = config.rules?.[name] ?? "error"
    const [severity, options]: [Severity, AnyOptions] = Array.isArray(setting)
      ? setting
      : [setting, {}]
    return { name, severity, options, policy: prepareOptions(name, options) }
  })
  const overrides = (config.overrides ?? []).map((override) => ({
    patterns: override.files.map(filePattern),
    rules: Object.entries(override.rules).map(([name, setting]) => ({
      name,
      severity: Array.isArray(setting) ? setting[0] : setting,
      options: Array.isArray(setting) ? setting[1] : undefined,
    })),
  }))
  const ownComponents = (config.components ?? []).map((pattern) => new RegExp(pattern))

  /**
   * How policy sees a component. Contracts and component patterns match one name
   * however the tag is written: UCard for <UCard>, <u-card>, and <LazyUCard>.
   */
  function identify(site: { component: string; importSource?: string }, imports?: Imports) {
    const imported = site.importSource ? imports?.get(site.component)?.imported : undefined
    const component = nuxtUi?.component(
      site.component,
      site.importSource,
      imported === "default" || imported === "*" ? undefined : imported,
    )
    // Native tags are lowercase words; any other spelling is a component name. Nuxt
    // registers a Lazy variant of every component, which is the same component.
    const written = /[-A-Z]/.test(site.component)
    const name = component
      ? nuxtUi!.tag(component.name)!
      : written
        ? pascalCase(site.component).replace(/^Lazy(?=[A-Z])/, "")
        : site.component
    return {
      name,
      theme: component?.theme,
      /** Nuxt UI's themed components and the project's own are protected from restyling. */
      protected:
        component !== undefined || (written && ownComponents.some((pattern) => pattern.test(name))),
    }
  }

  function nativeReplacement(native: NativeElement, options: PreferUiComponentsOptions) {
    const specific =
      native.tag === "input" ? inputReplacements[native.type?.toLowerCase() ?? ""] : undefined
    // Hidden and image inputs have no component, whatever a project configures for input.
    if (specific === false) return undefined
    const configured = options.elements?.[native.tag]
    if (configured !== undefined) return configured || undefined
    if (!nuxtUi) return undefined
    return (specific && nuxtUi.tag(specific)) || nuxtUi.tag(nativeReplacements[native.tag] ?? "")
  }

  function effectiveSettings(filename: string) {
    const effective = overrides.length ? settings.map((setting) => ({ ...setting })) : settings
    const relativeFile = path.relative(root, path.resolve(root, filename)).split(path.sep).join("/")
    if (
      relativeFile !== ".." &&
      !relativeFile.startsWith("../") &&
      !path.isAbsolute(relativeFile)
    ) {
      for (const override of overrides) {
        if (!override.patterns.some((pattern) => pattern.test(relativeFile))) continue
        for (const replacement of override.rules) {
          const selected = effective.find((setting) => setting.name === replacement.name)!
          selected.severity = replacement.severity
          if (replacement.options) {
            selected.options = {
              ...selected.options,
              ...Object.fromEntries(
                Object.entries(replacement.options).filter(([, value]) => value !== undefined),
              ),
            }
            selected.policy = prepareOptions(selected.name, selected.options)
          }
        }
      }
    }
    return effective
  }

  const linter = {
    /** Whether Nuxt UI was found; without it only `config.components` are protected. */
    nuxtUi: nuxtUi !== undefined,
    check(source: string, filename = "component.vue"): CheckResult {
      const collected = collectVue(source, filename, { classHelpers: config.classHelpers })
      const diagnostics: Diagnostic[] = []
      let positionAt: ReturnType<typeof sourcePositions> | undefined
      const emit = (
        rule: Diagnostic["rule"],
        severity: Diagnostic["severity"],
        offset: number,
        message: string,
        component?: string,
        className?: string,
        location: Pick<Diagnostic, "prop" | "slot" | "suggestions"> = {},
      ) => {
        positionAt ??= sourcePositions(source)
        diagnostics.push({
          file: filename,
          rule,
          severity,
          message: config.note ? `${message} ${config.note}` : message,
          ...positionAt(offset),
          offset,
          ...(component ? { component } : {}),
          ...(className ? { className } : {}),
          ...location,
        })
      }
      const sorted = () =>
        diagnostics.sort((a, b) => a.offset - b.offset || a.rule.localeCompare(b.rule))
      for (const error of collected.errors)
        emit("parse-error", "error", error.offset, error.message)
      if (collected.fatal) return { diagnostics: sorted(), suppressed: [] }
      // Each class site with the component policy sees. ui is Nuxt UI's convention, so it
      // is read on protected components only; elsewhere the prop may mean anything.
      const sites = collected.sites.flatMap((site) => {
        const owner = identify(site, collected.imports)
        return site.prop && !owner.protected ? [] : [{ site, owner }]
      })
      const effective = effectiveSettings(filename)
      for (const { name, severity, policy, options } of effective) {
        if (severity === "off") continue
        if (name === "no-restricted-components") {
          const restrictions = options.components ?? []
          const importRestrictions = options.imports ?? []
          if (!restrictions.length && !importRestrictions.length) continue
          for (const site of collected.usages) {
            if (site.unsupported) {
              emit("parse-error", "error", site.offset, site.unsupported, site.component)
              continue
            }
            const restriction =
              restrictions.find((entry) =>
                matchesRestrictedName(entry.name, site, collected.imports),
              ) ??
              importRestrictions.find((entry) =>
                matchesRestrictedImport(entry, site, collected.imports),
              )
            if (!restriction) continue
            const message =
              `<${site.component}> is restricted.` +
              (restriction.replacement ? ` Use <${restriction.replacement}> instead.` : "") +
              (restriction.message ? ` ${restriction.message}` : "")
            emit(name, severity, site.offset, message, site.component)
          }
          continue
        }
        if (name === "prefer-ui-components") {
          for (const native of collected.natives) {
            const replacement = nativeReplacement(native, options)
            if (replacement)
              emit(
                name,
                severity,
                native.offset,
                `Use <${replacement}> instead of a native <${native.tag}>, so it follows the design system.`,
                native.tag,
              )
          }
          continue
        }
        const report = (
          site: { component: string; offset: number; prop?: string; slot?: string },
          selected: ReturnType<typeof preparePolicy>,
          fallback: string,
          token = "",
          category: Category = "unknown",
          suggestions: string[] = [],
          theme?: ComponentTheme,
        ) => {
          const custom =
            typeof selected.message === "string"
              ? selected.message
              : (selected.message?.[category] ?? selected.message?.default)
          const fields: Record<string, string> = {
            component: site.component,
            className: token,
            category,
            file: filename,
            rule: name,
            prop: site.prop ?? "",
            slot: site.slot ?? "",
            sizes: theme?.variants.size?.join(", ") ?? "",
            variants: theme?.variants.variant?.join(", ") ?? "",
          }
          // `{{sizes|none defined}}` falls back to the text after `|` when the field is empty.
          const message = (custom ?? fallback).replace(/\{\{(.*?)\}\}/g, (_, key: string) => {
            const bar = key.indexOf("|")
            const field = bar < 0 ? key : key.slice(0, bar)
            return fields[field] || (bar < 0 ? "" : key.slice(bar + 1))
          })
          const where =
            site.prop === "ui" ? ` In ${["ui", site.slot].filter(Boolean).join(".")}.` : ""
          emit(name, severity, site.offset, message + where, site.component, token || undefined, {
            ...(suggestions.length ? { suggestions } : {}),
            ...(site.prop === undefined ? {} : { prop: site.prop }),
            ...(site.slot === undefined ? {} : { slot: site.slot }),
          })
        }
        if (name === "no-inline-styles") {
          for (const site of collected.styles) {
            const selected = policy(identify(site, collected.imports).name)
            if (matches(selected.allow, "style", []) && !matches(selected.deny, "style", []))
              continue
            report(
              site,
              selected,
              `Use theme utilities instead of inline styles or a <style> block on <${site.component}>.`,
            )
          }
          continue
        }
        if (name === "no-raw-colors") {
          for (const site of collected.svgColors) {
            const selected = policy(identify(site).name)
            const denied = matches(selected.deny, site.prop, ["color"])
            if (!denied && matches(selected.allow, site.prop, ["color"])) continue
            if (site.value === undefined) {
              emit(
                "parse-error",
                "error",
                site.offset,
                `Cannot inspect dynamic SVG ${site.prop} on <${site.component}>; use a literal color, currentColor, or a semantic CSS variable.`,
                site.component,
                undefined,
                { prop: site.prop },
              )
            } else if (denied || tailwind.isRawColor(site.value)) {
              report(
                site,
                selected,
                denied
                  ? `SVG ${site.prop} is denied by the design-system policy for <${site.component}>.`
                  : `Replace SVG ${site.prop} color ${JSON.stringify(site.value)} with currentColor or a semantic theme variable.`,
                "",
                "color",
              )
            }
          }
        }
        for (const { site, owner } of sites) {
          if (name === "no-restyle" && !owner.protected) continue
          const selected = policy(owner.name)
          if (name === "require-static-classes") {
            if (site.dynamic)
              report(
                site,
                selected,
                site.spread
                  ? `Cannot statically inspect the v-bind spread on <${site.component}>; it may pass class or style. Bind class and style as explicit attributes, or spread a literal object.`
                  : `Use complete, statically readable class names on <${site.component}>; choose between literal classes instead of constructing them.`,
              )
            continue
          }
          for (const token of new Set(site.tokens)) {
            const info = tailwind.inspect(token)
            const denied = matches(selected.deny, token, info.categories)
            const category =
              info.categories.find((item) => selected.deny.some(({ entry }) => entry === item)) ??
              info.categories.find((item) => item !== "layout") ??
              info.categories[0] ??
              "unknown"
            if (name === "no-restyle") {
              // A utility may affect multiple categories. Opening layout cannot also open color.
              const disallowedCategory = info.categories.find(
                (item) => !matches(selected.allow, token, [item]),
              )
              const rejectedCategory = denied ? category : (disallowedCategory ?? category)
              if (denied || disallowedCategory)
                report(
                  site,
                  selected,
                  restyleMessage(
                    token,
                    site.component,
                    rejectedCategory,
                    denied,
                    owner.theme,
                    nuxtUi?.themeConfig ?? "",
                  ),
                  token,
                  rejectedCategory,
                  [],
                  owner.theme,
                )
              continue
            }
            if (!denied && matches(selected.allow, token, info.categories)) continue
            if (denied) {
              report(
                site,
                selected,
                `"${token}" is denied by the design-system policy for <${site.component}>. Use an approved theme utility.`,
                token,
                category,
              )
              continue
            }
            // A suggestion must pass every enabled class rule that applies at this site.
            const permitted = (candidate: string) => {
              const replacement = tailwind.inspect(candidate)
              return effective.every(({ name: rule, severity, policy }) => {
                if (severity === "off" || !classRules.has(rule)) return true
                if (rule === "no-restyle" && !owner.protected) return true
                const selected = policy(owner.name)
                if (matches(selected.deny, candidate, replacement.categories)) return false
                if (rule === "no-restyle")
                  return replacement.categories.every((category) =>
                    matches(selected.allow, candidate, [category]),
                  )
                if (matches(selected.allow, candidate, replacement.categories)) return true
                if (rule === "no-raw-colors") return !replacement.rawColor
                if (rule === "no-arbitrary-values")
                  return !/[-/]\[|^\[[^\]]+:/.test(baseClass(candidate))
                return replacement.known
              })
            }
            const arbitrary = /[-/]\[|^\[[^\]]+:/.test(baseClass(token))
            if (name === "no-arbitrary-values" && arbitrary) {
              const canonical = tailwind.themeMatch(token)
              report(
                site,
                selected,
                `Replace "${token}" with a named theme utility instead of an arbitrary value.`,
                token,
                category,
                canonical && permitted(canonical) ? [canonical] : [],
              )
            }
            if (name === "no-raw-colors" && info.rawColor) {
              const colors = tailwind.themeColors(token).slice(0, 8)
              report(
                site,
                selected,
                `Replace "${token}" with a theme color${colors.length ? ` such as ${colors.join(", ")}` : ""}.`,
                token,
                category,
              )
            }
            if (name === "no-unknown-classes" && !info.known) {
              const candidates = tailwind.suggest(token).filter(permitted)
              report(
                site,
                selected,
                `Tailwind cannot generate "${token}". Check the spelling and the configured CSS theme.`,
                token,
                category,
                candidates.length === 1 ? candidates : [],
              )
            }
          }
        }
      }
      const template = collected.templateComments
      if (!template?.comments.length) return { diagnostics: sorted(), suppressed: [] }
      const lineAt = (offset: number) => (positionAt ??= sourcePositions(source))(offset).line
      const { kept, suppressed, problems } = applyExceptions(
        sorted(),
        template,
        lineAt,
        config.unusedExceptions ?? "error",
      )
      diagnostics.splice(0, diagnostics.length, ...kept)
      for (const problem of problems)
        emit(problem.rule, problem.severity, problem.offset, problem.message)
      return { diagnostics: sorted(), suppressed }
    },
    lint(source: string, filename = "component.vue"): Diagnostic[] {
      return linter.check(source, filename).diagnostics
    },
  }
  return linter
}

export async function lintSource(
  source: string,
  options: LinterOptions & { filename?: string } = {},
): Promise<Diagnostic[]> {
  const linter = await createLinter(options)
  return linter.lint(source, options.filename)
}
