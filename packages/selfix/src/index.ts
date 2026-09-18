import { baseCandidate, createTailwind, type Category } from "./tailwind.js"
import { collectVue, type ClassSite } from "./vue.js"
import {
  ruleNames,
  validateConfig,
  type Config,
  type RuleName,
  type RuleOptions,
  type Severity,
} from "./config.js"

export { defineConfig, ruleNames } from "./config.js"
export type {
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
  file: string
  rule: RuleName | "parse-error"
  severity: Exclude<Severity, "off">
  message: string
  line: number
  column: number
  offset: number
  component?: string
  className?: string
}
export interface LinterOptions {
  /** Full CSS source including imports and @theme. */
  css: string
  /** Directory from which CSS imports resolve. */
  base?: string
  config?: Config
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
function prepareOptions(options: RuleOptions, defaultAllow: string[]) {
  const fallback = preparePolicy(options, defaultAllow)
  const contracts = (options.contracts ?? []).map((contract) => ({
    regex: new RegExp(contract.pattern),
    selected: preparePolicy({ ...options, ...contract }, defaultAllow),
  }))
  return (component: string) =>
    contracts.find(({ regex }) => regex.test(component))?.selected ?? fallback
}

export async function createLinter({ css, base = process.cwd(), config = {} }: LinterOptions) {
  validateConfig(config)
  const tailwind = await createTailwind(css, base)
  const settings = ruleNames.map((name) => {
    const setting = config.rules?.[name] ?? "error"
    const [severity, options] = Array.isArray(setting) ? setting : [setting, {}]
    return {
      name,
      severity,
      policy: prepareOptions(options, name === "no-restyle" ? ["layout"] : []),
    }
  })
  const ignoreImports = (config.ignoreImports ?? []).map((pattern) => new RegExp(pattern))
  const components = (config.components ?? []).map((pattern) => new RegExp(pattern))
  const componentImports = (config.componentImports ?? []).map((pattern) => new RegExp(pattern))
  function isDesignComponent(site: ClassSite) {
    const source = site.importSource
    if (source && ignoreImports.some((pattern) => pattern.test(source))) return false
    return Boolean(
      components.some((pattern) => pattern.test(site.component)) ||
      (source &&
        ((config.ui ?? ["@/components/ui"]).some(
          (prefix) => source === prefix || source.startsWith(`${prefix}/`),
        ) ||
          componentImports.some((pattern) => pattern.test(source)))),
    )
  }

  return {
    lint(source: string, filename = "component.vue"): Diagnostic[] {
      const collected = collectVue(source, filename)
      const diagnostics: Diagnostic[] = []
      const emit = (
        rule: Diagnostic["rule"],
        severity: Diagnostic["severity"],
        offset: number,
        message: string,
        component?: string,
        className?: string,
      ) => {
        const position = source.slice(0, offset).split("\n")
        diagnostics.push({
          file: filename,
          rule,
          severity,
          message: config.note ? `${message} ${config.note}` : message,
          line: position.length,
          column: position.at(-1)!.length + 1,
          offset,
          ...(component ? { component } : {}),
          ...(className ? { className } : {}),
        })
      }
      for (const error of collected.errors)
        emit("parse-error", "error", error.offset, error.message)
      if (collected.fatal)
        return diagnostics.sort((a, b) => a.offset - b.offset || a.rule.localeCompare(b.rule))
      for (const { name, severity, policy } of settings) {
        if (severity === "off") continue
        const report = (
          site: { component: string; offset: number },
          selected: ReturnType<typeof preparePolicy>,
          fallback: string,
          token = "",
          category: Category = "unknown",
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
          }
          const message = (custom ?? fallback).replace(
            /\{\{(.*?)\}\}/g,
            (_, key: string) => fields[key] ?? "",
          )
          emit(name, severity, site.offset, message, site.component, token || undefined)
        }
        if (name === "no-inline-styles") {
          for (const site of collected.styles) {
            const selected = policy(site.component)
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
        for (const site of collected.sites) {
          if (name === "no-restyle" && !isDesignComponent(site)) continue
          const selected = policy(site.component)
          if (name === "require-static-classes") {
            if (site.dynamic)
              report(
                site,
                selected,
                `Use complete, statically readable class names on <${site.component}>; choose between literal classes instead of constructing them.`,
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
                  denied
                    ? `"${token}" is denied by the design-system policy for <${site.component}>. Use an approved theme utility.`
                    : `"${token}" is not allowed on <${site.component}>: the component owns its ${rejectedCategory}. Use a component variant; use margin or a parent gap for surrounding space.`,
                  token,
                  rejectedCategory,
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
            const arbitrary = /[-/]\[|^\[[^\]]+:/.test(baseClass(token))
            if (name === "no-arbitrary-values" && arbitrary)
              report(
                site,
                selected,
                `Replace "${token}" with a named theme utility instead of an arbitrary value.`,
                token,
                category,
              )
            if (name === "no-raw-colors" && info.rawColor)
              report(
                site,
                selected,
                `Replace "${token}" with a semantic theme color${tailwind.colors.length ? ` (${tailwind.colors.slice(0, 8).join(", ")})` : ""}.`,
                token,
                category,
              )
            if (name === "no-unknown-classes" && !info.known)
              report(
                site,
                selected,
                `Tailwind cannot generate "${token}". Check the spelling and the configured CSS theme.`,
                token,
                category,
              )
          }
        }
      }
      return diagnostics.sort((a, b) => a.offset - b.offset || a.rule.localeCompare(b.rule))
    },
  }
}

export async function lintSource(
  source: string,
  options: LinterOptions & { filename?: string },
): Promise<Diagnostic[]> {
  const linter = await createLinter(options)
  return linter.lint(source, options.filename)
}
