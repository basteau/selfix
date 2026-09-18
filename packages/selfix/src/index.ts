import path from "node:path"
import { createProject, type ComponentDefinition } from "./project.js"
import { baseCandidate, createTailwind, type Category } from "./tailwind.js"
import { collectVue, type ClassSite } from "./vue.js"
import {
  ruleNames,
  validateConfig,
  filePattern,
  type Config,
  type RuleName,
  type RuleOptions,
  type Severity,
} from "./config.js"

export { defineConfig, ruleNames } from "./config.js"
export type {
  ClassProps,
  FileOverride,
  ProjectOptions,
  Config,
  Contract,
  Message,
  RuleName,
  RuleOptions,
  RuleSetting,
  Severity,
} from "./config.js"
export type { ComponentDefinition, ComponentProps } from "./project.js"
export type { Category } from "./tailwind.js"

export interface Diagnostic {
  definition?: ComponentDefinition
  file: string
  rule: RuleName | "parse-error"
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
export interface LinterOptions {
  /** Full CSS source including imports and @theme. */
  css: string
  /** Directory from which CSS imports resolve. */
  base?: string
  /** Base for override patterns and relative lint filenames; defaults to cwd. */
  configBase?: string
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

function restyleMessage(
  token: string,
  component: string,
  category: Category,
  denied: boolean,
): string {
  if (denied)
    return `"${token}" is denied by the design-system policy for <${component}>. Remove this class; choose a replacement only if the component's contract permits it.`
  const reason =
    category === "unknown"
      ? "selfix could not classify all of its CSS effects"
      : `${category} changes are outside the component's contract`
  const guidance: Record<Category, string> = {
    layout:
      "Remove this override. Check the component's layout contract before changing placement or sizing.",
    spacing:
      "Remove this override. Check the component's documented spacing props and its contract before changing surrounding layout.",
    color: "Remove this override. Check the component's documented props for color choices.",
    typography: "Remove this override. Check the component's documented props for text styling.",
    shape: "Remove this override. Check the component's documented props for borders and shape.",
    effects: "Remove this override. Check the component's documented props for visual effects.",
    motion:
      "Remove this override. Check the component's documented props for animation and transitions.",
    unknown:
      "Remove this class or inspect its CSS declarations and the component's contract before choosing a replacement.",
  }
  return `"${token}" is not allowed on <${component}>: ${reason}. ${guidance[category]}`
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

export async function createLinter({
  css,
  base = process.cwd(),
  configBase = process.cwd(),
  config = {},
}: LinterOptions) {
  validateConfig(config)
  const tailwind = await createTailwind(css, base, config.cssAliases)
  const project = config.project ? createProject(config.project) : undefined
  const settings = ruleNames.map((name) => {
    const setting = config.rules?.[name] ?? "error"
    const [severity, options] = Array.isArray(setting) ? setting : [setting, {}]
    return {
      name,
      severity,
      policy: prepareOptions(options, name === "no-restyle" ? ["layout"] : []),
    }
  })
  const overrideBase = path.resolve(configBase)
  const overrides = (config.overrides ?? []).map((override) => ({
    patterns: override.files.map(filePattern),
    rules: Object.entries(override.rules).map(([name, setting]) => ({
      name,
      severity: Array.isArray(setting) ? setting[0] : setting,
      policy: Array.isArray(setting)
        ? prepareOptions(setting[1], name === "no-restyle" ? ["layout"] : [])
        : undefined,
    })),
  }))
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
      const collected = collectVue(source, filename, { classProps: config.classProps })
      const diagnostics: Diagnostic[] = []
      let positionAt: ReturnType<typeof sourcePositions> | undefined
      const emit = (
        rule: Diagnostic["rule"],
        severity: Diagnostic["severity"],
        offset: number,
        message: string,
        component?: string,
        className?: string,
        location: Pick<Diagnostic, "prop" | "slot" | "definition"> = {},
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
      for (const error of collected.errors)
        emit("parse-error", "error", error.offset, error.message)
      if (collected.fatal)
        return diagnostics.sort((a, b) => a.offset - b.offset || a.rule.localeCompare(b.rule))
      const effective = overrides.length ? settings.map((setting) => ({ ...setting })) : settings
      const relativeFile = path
        .relative(overrideBase, path.resolve(overrideBase, filename))
        .split(path.sep)
        .join("/")
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
            if (replacement.policy) selected.policy = replacement.policy
          }
        }
      }
      for (const { name, severity, policy } of effective) {
        if (severity === "off") continue
        const report = (
          site: { component: string; offset: number; prop?: string; slot?: string },
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
            prop: site.prop ?? "",
            slot: site.slot ?? "",
          }
          const message = (custom ?? fallback).replace(
            /\{\{(.*?)\}\}/g,
            (_, key: string) => fields[key] ?? "",
          )
          const context =
            site.prop === undefined
              ? ""
              : ` [prop ${JSON.stringify(site.prop)}${site.slot === undefined ? "" : `, slot ${JSON.stringify(site.slot)}`}]`
          const definition =
            name === "no-restyle"
              ? project?.resolve(
                  site.component,
                  collected.imports.get(site.component),
                  filename,
                  source,
                )
              : undefined
          const details = definition
            ? ` Definition: ${definition.file}.` +
              (["size", "variant"] as const)
                .map((name) => {
                  const values = definition.props?.[name]
                  return values
                    ? ` Accepted ${name} values: ${values.map((value) => JSON.stringify(value)).join(", ")}.`
                    : ""
                })
                .join("") +
              (definition.props
                ? " These choices do not guarantee a visual replacement for this class."
                : "")
            : ""
          emit(
            name,
            severity,
            site.offset,
            message + details + context,
            site.component,
            token || undefined,
            {
              ...(definition ? { definition } : {}),
              ...(site.prop === undefined ? {} : { prop: site.prop }),
              ...(site.slot === undefined ? {} : { slot: site.slot }),
            },
          )
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
                  restyleMessage(token, site.component, rejectedCategory, denied),
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
