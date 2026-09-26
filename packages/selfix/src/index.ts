import path from "node:path"
import { createProject, type ComponentDefinition } from "./project.js"
import { baseCandidate, createTailwind, type Category } from "./tailwind.js"
import {
  collectVue,
  forwardsClass,
  parseSfc,
  resolveComponentAlias,
  type ComponentUsage,
} from "./vue.js"
import {
  ruleNames,
  validateLinterConfig,
  filePattern,
  type LinterConfig,
  type RuleName,
  type RuleOptions,
  type ImportRestriction,
  type RestrictedComponentOptions,
  type Severity,
} from "./config.js"

export { defineConfig, ruleNames } from "./config.js"
export type {
  ComponentRestriction,
  ImportRestriction,
  RestrictedComponentOptions,
  Rules,
  ClassProps,
  ClassHelper,
  FileOverride,
  ProjectOptions,
  Config,
  LinterConfig,
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
  suggestions?: string[]
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
  /** Project root for overrides, CSS aliases, and relative filenames; defaults to cwd. */
  root?: string
  /** Origin for stylesheet imports, relative to root; defaults to root. */
  cssBase?: string
  config?: LinterConfig
}

function componentName(name: string): string {
  const camel = name.replace(/-(\w)/gu, (_, letter: string) => letter.toUpperCase())
  return camel.charAt(0).toUpperCase() + camel.slice(1)
}

function matchesRestrictedName(
  name: string,
  site: ComponentUsage,
  imports: ReturnType<typeof collectVue>["imports"],
): boolean {
  const alias = resolveComponentAlias(name, imports)
  // An imported usage matches its local binding. A written namespace
  // member such as UI.Button is not that local name, so it matches
  // only the exact configured name.
  if (alias) return alias.local === site.component && site.importSource !== undefined
  if (site.importSource !== undefined) return name === site.component
  return componentName(name) === componentName(site.component)
}

function matchesRestrictedImport(
  entry: ImportRestriction,
  site: ComponentUsage,
  imports: ReturnType<typeof collectVue>["imports"],
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

export async function createLinter(options: LinterOptions) {
  if ("base" in options)
    throw new Error(
      "The base option was removed. Use cssBase for stylesheet imports and root for project paths.",
    )
  if ("configBase" in options)
    throw new Error("The configBase option was removed. Use root for project paths.")
  const { css, config = {} } = options
  for (const key of ["root", "cssBase"] as const) {
    const value = options[key]
    if (value !== undefined && (typeof value !== "string" || !value.trim()))
      throw new Error(`${key} must be a non-empty directory path.`)
  }
  const root = path.resolve(options.root ?? process.cwd())
  const cssBase = path.resolve(root, options.cssBase ?? ".")
  validateLinterConfig(config)
  const cssAliases = Object.fromEntries(
    Object.entries(config.cssAliases ?? {}).map(([id, target]) => [id, path.resolve(root, target)]),
  )
  const tailwind = await createTailwind(css, cssBase, cssAliases)
  const project = config.project
    ? createProject({ ...config.project, root: path.resolve(root, config.project.root ?? ".") })
    : undefined
  const settings = ruleNames.map((name) => {
    const setting = config.rules?.[name] ?? "error"
    const [severity, options]: [Severity, RuleOptions & RestrictedComponentOptions] = Array.isArray(
      setting,
    )
      ? setting
      : [setting, {}]
    return {
      name,
      severity,
      options,
      policy: prepareOptions(options, name === "no-restyle" ? ["layout"] : []),
    }
  })
  const overrides = (config.overrides ?? []).map((override) => ({
    patterns: override.files.map(filePattern),
    rules: Object.entries(override.rules).map(([name, setting]) => ({
      name,
      severity: Array.isArray(setting) ? setting[0] : setting,
      options: Array.isArray(setting) ? setting[1] : undefined,
    })),
  }))
  const ignoreImports = (config.ignoreImports ?? []).map((pattern) => new RegExp(pattern))
  const components = (config.components ?? []).map((pattern) => new RegExp(pattern))
  const componentImports = (config.componentImports ?? []).map((pattern) => new RegExp(pattern))
  function recognition(site: Pick<ComponentUsage, "component" | "importSource">) {
    const source = site.importSource
    const ignored = source && ignoreImports.find((pattern) => pattern.test(source))
    if (ignored)
      return {
        recognized: false,
        reason: `ignored by ignoreImports ${JSON.stringify(ignored.source)}`,
      }
    const component = components.find((pattern) => pattern.test(site.component))
    if (component)
      return {
        recognized: true,
        reason: `recognized by components ${JSON.stringify(component.source)}`,
      }
    const prefix = source
      ? (config.ui ?? ["@/components/ui"]).find(
          (prefix) => source === prefix || source.startsWith(`${prefix}/`),
        )
      : undefined
    if (prefix !== undefined)
      return { recognized: true, reason: `recognized by ui ${JSON.stringify(prefix)}` }
    const imported = source && componentImports.find((pattern) => pattern.test(source))
    if (imported)
      return {
        recognized: true,
        reason: `recognized by componentImports ${JSON.stringify(imported.source)}`,
      }
    return { recognized: false, reason: "unrecognized (no recognition setting matches)" }
  }

  // One level of wrapper tracing. A component whose template has a single root that is a
  // recognized component, and that keeps Vue's attribute fallthrough, passes its caller's
  // class to that component. Needs component source discovery to read the wrapper.
  const wrappers = new Map<string, ComponentUsage | undefined>()
  function wrappedBy(file: string): ComponentUsage | undefined {
    if (wrappers.has(file)) return wrappers.get(file)
    let target: ComponentUsage | undefined
    const source = project?.read(file)
    if (source !== undefined) {
      const { descriptor } = parseSfc(source, { filename: file, sourceMap: false })
      const roots = (descriptor.template?.ast?.children ?? []).filter(
        (node) => node.type !== 3 && !(node.type === 2 && !node.content.trim()),
      )
      const root = roots.length === 1 && roots[0]!.type === 1 ? roots[0]! : undefined
      // A v-for root renders a fragment, which receives no fallthrough attributes.
      const repeated = root?.props.some((prop) => prop.type === 7 && prop.name === "for")
      if (
        root &&
        !repeated &&
        forwardsClass([descriptor.script?.content, descriptor.scriptSetup?.content])
      ) {
        const inner = collectVue(source, file, {
          classProps: config.classProps,
          classHelpers: config.classHelpers,
        })
        const usage = inner.fatal
          ? undefined
          : inner.usages.find((item) => item.offset === root.loc.start.offset)
        if (usage && !usage.unsupported && recognition(usage).recognized) target = usage
      }
    }
    wrappers.set(file, target)
    return target
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
            selected.policy = prepareOptions(
              selected.options,
              selected.name === "no-restyle" ? ["layout"] : [],
            )
          }
        }
      }
    }
    return effective
  }

  return {
    doctor(source: string, filename: string) {
      const collected = collectVue(source, filename, {
        classProps: config.classProps,
        classHelpers: config.classHelpers,
      })
      const positionAt = sourcePositions(source)
      const severity = effectiveSettings(filename).find(
        (setting) => setting.name === "no-restyle",
      )!.severity
      const issues = collected.errors.map((error) => ({ ...error, ...positionAt(error.offset) }))
      if (!collected.fatal) {
        for (const site of collected.sites) {
          if (site.dynamic)
            issues.push({
              message: `Cannot statically inspect class input on <${site.component}>; enforcement coverage is incomplete.`,
              offset: site.offset,
              ...positionAt(site.offset),
            })
        }
      }
      const usages = (collected.fatal ? [] : collected.usages).map((site) => {
        if (site.unsupported)
          issues.push({
            message: site.unsupported,
            offset: site.offset,
            ...positionAt(site.offset),
          })
        const definition = site.unsupported
          ? undefined
          : project?.resolve(
              site.component,
              collected.imports.get(site.component),
              path.resolve(root, filename),
              source,
            )
        let match = recognition(site)
        const inner = !match.recognized && definition ? wrappedBy(definition.file) : undefined
        if (inner)
          match = {
            recognized: true,
            reason: `wraps <${inner.component}>, which is ${recognition(inner).reason}`,
          }
        return {
          ...site,
          ...positionAt(site.offset),
          ...match,
          severity,
          active: !site.unsupported && match.recognized && severity !== "off",
          definition: project ? (definition?.file ?? "unavailable") : "disabled",
          suggestion:
            !site.unsupported &&
            !match.recognized &&
            match.reason.startsWith("unrecognized") &&
            site.importSource
              ? `componentImports: [${JSON.stringify("^" + site.importSource.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "$")}]`
              : undefined,
        }
      })
      return { usages, issues: issues.sort((a, b) => a.offset - b.offset) }
    },
    lint(source: string, filename = "component.vue"): Diagnostic[] {
      const collected = collectVue(source, filename, {
        classProps: config.classProps,
        classHelpers: config.classHelpers,
      })
      const diagnostics: Diagnostic[] = []
      let positionAt: ReturnType<typeof sourcePositions> | undefined
      const emit = (
        rule: Diagnostic["rule"],
        severity: Diagnostic["severity"],
        offset: number,
        message: string,
        component?: string,
        className?: string,
        location: Pick<Diagnostic, "prop" | "slot" | "definition" | "suggestions"> = {},
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
      // Source, filename, and import bindings are fixed for this invocation.
      const definitions = new Map<string, ComponentDefinition | undefined>()
      const definitionFor = (component: string) => {
        if (!definitions.has(component))
          definitions.set(
            component,
            project?.resolve(
              component,
              collected.imports.get(component),
              path.resolve(root, filename),
              source,
            ),
          )
        return definitions.get(component)
      }
      // The component whose no-restyle contract applies to a class site, if any.
      const restyled = (site: (typeof collected.sites)[number]) => {
        if (recognition(site).recognized) return { component: site.component, via: undefined }
        if (site.prop !== undefined) return undefined
        const definition = definitionFor(site.component)
        const inner = definition && wrappedBy(definition.file)
        return inner ? { component: inner.component, via: site.component } : undefined
      }
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
        const report = (
          site: { component: string; offset: number; prop?: string; slot?: string },
          selected: ReturnType<typeof preparePolicy>,
          fallback: string,
          token = "",
          category: Category = "unknown",
          suggestions: string[] = [],
          wrapped?: { component: string; via: string },
        ) => {
          const custom =
            typeof selected.message === "string"
              ? selected.message
              : (selected.message?.[category] ?? selected.message?.default)
          const definition = name === "no-restyle" ? definitionFor(site.component) : undefined
          const fields: Record<string, string> = {
            component: wrapped?.component ?? site.component,
            className: token,
            category,
            file: filename,
            rule: name,
            prop: site.prop ?? "",
            slot: site.slot ?? "",
            sizes: definition?.props?.size?.join(", ") ?? "",
            variants: definition?.props?.variant?.join(", ") ?? "",
          }
          // `{{sizes|none defined}}` falls back to the text after `|` when the field is empty.
          const message = (custom ?? fallback).replace(/\{\{(.*?)\}\}/g, (_, key: string) => {
            const bar = key.indexOf("|")
            const field = bar < 0 ? key : key.slice(0, bar)
            return fields[field] || (bar < 0 ? "" : key.slice(bar + 1))
          })
          const through = wrapped
            ? ` <${wrapped.via}> passes its class to <${wrapped.component}>.`
            : ""
          const context =
            site.prop === undefined
              ? ""
              : ` [prop ${JSON.stringify(site.prop)}${site.slot === undefined ? "" : `, slot ${JSON.stringify(site.slot)}`}]`
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
            message + through + details + context,
            site.component,
            token || undefined,
            {
              ...(suggestions.length ? { suggestions } : {}),
              ...(definition ? { definition: structuredClone(definition) } : {}),
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
        if (name === "no-raw-colors") {
          for (const site of collected.svgColors) {
            const selected = policy(site.component)
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
        for (const site of collected.sites) {
          const target = restyled(site)
          if (name === "no-restyle" && !target) continue
          const selected = policy(name === "no-restyle" ? target!.component : site.component)
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
                  restyleMessage(token, target!.component, rejectedCategory, denied),
                  token,
                  rejectedCategory,
                  [],
                  target!.via ? { component: target!.component, via: target!.via } : undefined,
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
                if (
                  severity === "off" ||
                  rule === "no-inline-styles" ||
                  rule === "require-static-classes" ||
                  rule === "no-restricted-components"
                )
                  return true
                if (rule === "no-restyle" && !target) return true
                const selected = policy(rule === "no-restyle" ? target!.component : site.component)
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
              const canonical = tailwind.canonical(token)
              report(
                site,
                selected,
                `Replace "${token}" with a named theme utility instead of an arbitrary value.`,
                token,
                category,
                canonical && permitted(canonical) ? [canonical] : [],
              )
            }
            if (name === "no-raw-colors" && info.rawColor)
              report(
                site,
                selected,
                `Replace "${token}" with a semantic theme color${tailwind.colors.length ? ` (${tailwind.colors.slice(0, 8).join(", ")})` : ""}.`,
                token,
                category,
              )
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
