// Static source-resolution approach informed by shadcn-ui/lint (MIT).
// https://github.com/shadcn-ui/lint/tree/bf89dcb7f66a306c7ac4943065298902afdbd969/packages/lint/src/project
import { readFileSync, readdirSync, statSync, type Dirent } from "node:fs"
import path from "node:path"
import { createRequire } from "node:module"
import { babelParse, parseSfc, type ComponentAlias } from "./vue.js"
import type { ProjectOptions } from "./config.js"

type Statement = ReturnType<typeof babelParse>["program"]["body"][number]
type TypeAlias = Extract<Statement, { type: "TSTypeAliasDeclaration" }>
type Interface = Extract<Statement, { type: "TSInterfaceDeclaration" }>
type TypeNode = TypeAlias["typeAnnotation"]
type Expression = Extract<Statement, { type: "ExpressionStatement" }>["expression"]

export interface ComponentProps {
  size?: string[]
  variant?: string[]
}

/** Read only complete literal string types belonging to a top-level defineProps macro. */
export function componentProps(source: string, filename: string): ComponentProps {
  const parsed = parseSfc(source, { filename, sourceMap: false })
  if (parsed.errors.length) throw new Error(`Unable to parse component definition ${filename}`)
  const setup = parsed.descriptor.scriptSetup
  if (!setup || setup.src || (setup.lang && !["ts", "js"].includes(setup.lang))) return {}
  let body: Statement[]
  try {
    body = babelParse(setup.content, { sourceType: "module", plugins: ["typescript"] }).program.body
  } catch (error) {
    throw new Error(`Unable to parse component definition ${filename}: ${String(error)}`)
  }
  const types = new Map<string, TypeAlias | Interface | undefined>()
  const calls: Expression[] = []
  const macroNames = new Set(["defineProps", "withDefaults"])
  type Binding = Extract<Statement, { type: "VariableDeclaration" }>["declarations"][number]["id"]
  function shadows(binding: Binding): boolean {
    if (binding.type === "Identifier") return macroNames.has(binding.name)
    if (binding.type === "AssignmentPattern") return shadows(binding.left)
    if (binding.type === "RestElement") return shadows(binding.argument)
    if (binding.type === "ArrayPattern")
      return binding.elements.some((item) => item && shadows(item))
    if (binding.type === "ObjectPattern")
      return binding.properties.some((item) =>
        item.type === "RestElement" ? shadows(item.argument) : shadows(item.value as Binding),
      )
    return false
  }
  for (const statement of body) {
    const declaration =
      statement.type === "ExportNamedDeclaration" ? statement.declaration : statement
    if (!declaration) continue
    if (
      declaration.type === "TSTypeAliasDeclaration" ||
      declaration.type === "TSInterfaceDeclaration"
    )
      types.set(declaration.id.name, types.has(declaration.id.name) ? undefined : declaration)
    if (
      declaration.type === "ImportDeclaration" &&
      declaration.specifiers.some((item) => macroNames.has(item.local.name))
    )
      return {}
    if (
      (declaration.type === "FunctionDeclaration" ||
        declaration.type === "TSDeclareFunction" ||
        declaration.type === "ClassDeclaration" ||
        declaration.type === "TSEnumDeclaration") &&
      declaration.id &&
      macroNames.has(declaration.id.name)
    )
      return {}
    if (declaration.type === "VariableDeclaration") {
      for (const item of declaration.declarations) {
        if (shadows(item.id)) return {}
        if (item.init) calls.push(item.init)
      }
    }
    if (declaration.type === "ExpressionStatement") calls.push(declaration.expression)
  }
  const definitions: TypeNode[] = []
  for (let expression of calls) {
    if (expression.type !== "CallExpression" || expression.callee.type !== "Identifier") continue
    if (expression.callee.name === "withDefaults") {
      const first = expression.arguments[0]
      if (first?.type !== "CallExpression") continue
      expression = first
    }
    if (
      expression.type !== "CallExpression" ||
      expression.callee.type !== "Identifier" ||
      expression.callee.name !== "defineProps"
    )
      continue
    const params = expression.typeParameters
    if (params?.type !== "TSTypeParameterInstantiation" || params.params.length !== 1) return {}
    definitions.push(params.params[0])
  }
  if (definitions.length !== 1) return {}
  function resolve(type: TypeNode, seen = new Set<string>()): TypeNode | Interface | undefined {
    if (type.type !== "TSTypeReference") return type
    if (type.typeName.type !== "Identifier" || type.typeParameters) return undefined
    const name = type.typeName.name
    if (seen.has(name)) return undefined
    const declaration = types.get(name)
    if (!declaration || declaration.typeParameters) return undefined
    seen.add(name)
    return declaration.type === "TSTypeAliasDeclaration"
      ? resolve(declaration.typeAnnotation, seen)
      : declaration
  }
  function values(type: TypeNode, seen = new Set<string>()): string[] | undefined {
    const resolved = resolve(type, seen)
    if (resolved?.type === "TSLiteralType" && resolved.literal.type === "StringLiteral")
      return [resolved.literal.value]
    if (resolved?.type === "TSParenthesizedType") return values(resolved.typeAnnotation, seen)
    if (resolved?.type !== "TSUnionType") return undefined
    const parts = resolved.types.map((item) => values(item, new Set(seen)))
    return parts.every((part) => part !== undefined)
      ? [...new Set(parts.flat() as string[])]
      : undefined
  }
  const props = resolve(definitions[0])
  const members =
    props?.type === "TSTypeLiteral"
      ? props.members
      : props?.type === "TSInterfaceDeclaration" && !props.extends?.length
        ? props.body.body
        : undefined
  if (!members) return {}
  const result: ComponentProps = {}
  for (const name of ["size", "variant"] as const) {
    const matching = members.filter(
      (member) =>
        member.type === "TSPropertySignature" &&
        !member.computed &&
        ((member.key.type === "Identifier" && member.key.name === name) ||
          (member.key.type === "StringLiteral" && member.key.value === name)),
    )
    if (matching.length !== 1) continue
    const member = matching[0]
    if (member.type !== "TSPropertySignature" || !member.typeAnnotation) continue
    const choices = values(member.typeAnnotation.typeAnnotation)
    if (choices?.length) result[name] = choices
  }
  return result
}

interface AliasMapping {
  pattern: string
  targets: string[]
  explicit?: boolean
}

function metadataObject(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error(`Invalid project metadata ${label}: expected an object`)
  return value as Record<string, unknown>
}
function metadataJson(file: string): Record<string, unknown> {
  try {
    const source = readFileSync(file, "utf8")
    const program = babelParse(`(${source}\n)`, { sourceType: "module" }).program
    if (program.body.length !== 1 || program.body[0].type !== "ExpressionStatement")
      throw new Error("expected JSON data")
    function value(node: Expression): unknown {
      if (
        node.type === "StringLiteral" ||
        node.type === "BooleanLiteral" ||
        node.type === "NumericLiteral"
      )
        return node.value
      if (node.type === "NullLiteral") return null
      if (
        node.type === "UnaryExpression" &&
        node.operator === "-" &&
        node.argument.type === "NumericLiteral"
      )
        return -node.argument.value
      if (node.type === "ArrayExpression")
        return node.elements.map((item) => {
          if (!item || item.type === "SpreadElement") throw new Error("unsupported JSON entry")
          return value(item)
        })
      if (node.type === "ObjectExpression") {
        const entries: [string, unknown][] = []
        for (const property of node.properties) {
          if (
            property.type !== "ObjectProperty" ||
            property.computed ||
            property.key.type !== "StringLiteral"
          )
            throw new Error("unsupported JSON property")
          const key = property.key.value
          if (entries.some(([existing]) => existing === key))
            throw new Error(`duplicate JSON property ${key}`)
          entries.push([key, value(property.value as Expression)])
        }
        return Object.fromEntries(entries)
      }
      throw new Error("only JSON literal data is supported")
    }
    return metadataObject(value(program.body[0].expression), file)
  } catch (error) {
    throw new Error(`Unable to read project metadata ${file}: ${String(error)}`)
  }
}
function configAliases(
  file: string,
  chain = new Set<string>(),
): { baseUrl?: string; aliases?: AliasMapping[] } {
  if (chain.has(file)) throw new Error(`Cyclic project tsconfig extends: ${file}`)
  const nextChain = new Set(chain).add(file)
  const data = metadataJson(file)
  let inherited: { baseUrl?: string; aliases?: AliasMapping[] } = {}
  if (data.extends !== undefined) {
    const entries = Array.isArray(data.extends) ? data.extends : [data.extends]
    for (const entry of entries) {
      if (typeof entry !== "string" || !entry.trim()) throw new Error(`Invalid extends in ${file}`)
      let target: string
      if (entry.startsWith(".") || path.isAbsolute(entry)) {
        target = path.resolve(path.dirname(file), entry)
        if (!statSync(target, { throwIfNoEntry: false })?.isFile()) target += ".json"
      } else {
        try {
          target = createRequire(file).resolve(entry)
        } catch {
          throw new Error(`Unable to resolve tsconfig extends "${entry}" from ${file}`)
        }
      }
      const base = configAliases(target, nextChain)
      inherited = { ...inherited, ...base }
    }
  }
  const compiler =
    data.compilerOptions === undefined
      ? {}
      : metadataObject(data.compilerOptions, `${file} compilerOptions`)
  if (compiler.baseUrl !== undefined && typeof compiler.baseUrl !== "string")
    throw new Error(`Invalid baseUrl in ${file}`)
  const baseUrl =
    typeof compiler.baseUrl === "string"
      ? path.resolve(path.dirname(file), compiler.baseUrl)
      : inherited.baseUrl
  if (compiler.paths === undefined)
    return { ...inherited, ...(baseUrl === undefined ? {} : { baseUrl }) }
  const aliases: AliasMapping[] = []
  for (const [pattern, targets] of Object.entries(
    metadataObject(compiler.paths, `${file} paths`),
  )) {
    if (
      !pattern ||
      pattern.split("*").length > 2 ||
      !Array.isArray(targets) ||
      !targets.length ||
      targets.some(
        (target) => typeof target !== "string" || !target || target.split("*").length > 2,
      )
    )
      throw new Error(`Invalid paths mapping "${pattern}" in ${file}`)
    aliases.push({
      pattern,
      targets: targets.map((target) => path.resolve(baseUrl ?? path.dirname(file), target)),
    })
  }
  return { baseUrl, aliases }
}

function preparedComponents(file: string): Map<string, { source: string; name: string }> {
  let statements: Statement[]
  try {
    statements = babelParse(readFileSync(file, "utf8"), {
      sourceType: "module",
      plugins: [["typescript", { dts: true }]],
    }).program.body
  } catch (error) {
    throw new Error(
      `Unable to read prepared Nuxt components ${file}: ${String(error)}. Run your application's nuxt prepare command.`,
    )
  }
  const result = new Map<string, { source: string; name: string }>()
  for (const statement of statements) {
    if (
      statement.type !== "ExportNamedDeclaration" ||
      statement.declaration?.type !== "VariableDeclaration"
    )
      continue
    for (const item of statement.declaration.declarations) {
      if (item.id.type !== "Identifier" || item.id.typeAnnotation?.type !== "TSTypeAnnotation")
        continue
      const type = item.id.typeAnnotation.typeAnnotation
      if (
        type.type !== "TSIndexedAccessType" ||
        type.objectType.type !== "TSTypeQuery" ||
        type.objectType.exprName.type !== "TSImportType" ||
        type.indexType.type !== "TSLiteralType" ||
        type.indexType.literal.type !== "StringLiteral"
      )
        continue
      const imported = type.objectType.exprName.argument
      if (imported.type !== "StringLiteral") continue
      if (result.has(item.id.name))
        throw new Error(`Ambiguous prepared component ${item.id.name} in ${file}`)
      result.set(item.id.name, {
        source: path.resolve(path.dirname(file), imported.value),
        name: type.indexType.literal.value,
      })
    }
  }
  return result
}

export interface ComponentDefinition {
  file: string
  props?: ComponentProps
}

// Capture source bytes before linting so subsequent disk edits cannot mix revisions.
// Installed dependencies are reached through explicit/generated mappings, not a
// recursive scan of every package in node_modules.
export function createProject(options: ProjectOptions) {
  const root = path.resolve(options.root ?? process.cwd())
  if (!statSync(root, { throwIfNoEntry: false })?.isDirectory())
    throw new Error(`Project root must be an existing directory: ${root}`)
  const sources = new Map<string, string>()
  const ignored = new Set(["node_modules", ".git", ".nuxt", ".output", "dist", "coverage"])
  const directories = new Set<string>()
  function snapshot(file: string, entryInfo?: Dirent) {
    if (sources.has(file) || directories.has(file)) return
    const stat = entryInfo ?? statSync(file, { throwIfNoEntry: false })
    if (!stat) return
    if (stat.isDirectory()) {
      directories.add(file)
      for (const entry of readdirSync(file, { withFileTypes: true }).sort((a, b) =>
        a.name.localeCompare(b.name),
      )) {
        if (!entry.isSymbolicLink() && !ignored.has(entry.name))
          snapshot(path.join(file, entry.name), entry)
      }
    } else if (stat.isFile() && /\.(?:vue|[cm]?[jt]s)$/.test(file)) {
      sources.set(file, readFileSync(file, "utf8"))
    }
  }
  snapshot(root)
  const packageFile = path.join(root, "package.json")
  const pkg = statSync(packageFile, { throwIfNoEntry: false })?.isFile()
    ? metadataJson(packageFile)
    : {}
  const nuxtFile = path.resolve(root, options.nuxtComponents ?? ".nuxt/components.d.ts")
  const detectedNuxt = [pkg.dependencies, pkg.devDependencies, pkg.peerDependencies].some(
    (value) => value && typeof value === "object" && "nuxt" in value,
  )
  const nuxt =
    options.nuxt ??
    Boolean(options.nuxtComponents || detectedNuxt || statSync(nuxtFile, { throwIfNoEntry: false }))
  const generated = nuxt
    ? preparedComponents(nuxtFile)
    : new Map<string, { source: string; name: string }>()
  const generatedNames = new Map<string, { source: string; name: string } | undefined>()
  for (const [name, mapping] of generated) {
    // Count each declaration once, even when its exact and normalized names coincide.
    // Collisions stay ambiguous even when declarations point to the same source.
    for (const candidate of new Set([name, name.replace(/\B([A-Z])/g, "-$1").toLowerCase()]))
      generatedNames.set(candidate, generatedNames.has(candidate) ? undefined : mapping)
  }
  const config = options.tsconfig
    ? path.resolve(root, options.tsconfig)
    : ["tsconfig.json", "jsconfig.json", ...(nuxt ? [".nuxt/tsconfig.json"] : [])]
        .map((file) => path.join(root, file))
        .find((file) => statSync(file, { throwIfNoEntry: false }))
  const discovered = config ? (configAliases(config).aliases ?? []) : []
  const explicitAliases = Object.entries(options.aliases ?? {}).map(([pattern, target]) => ({
    pattern,
    targets: [path.resolve(root, target)],
    explicit: true,
  }))
  const aliases: AliasMapping[] = [
    ...explicitAliases,
    ...discovered.filter(
      (alias) => !explicitAliases.some((item) => item.pattern === alias.pattern),
    ),
  ]
  for (const { pattern, targets, explicit: required } of aliases)
    for (const target of targets) {
      const directory = target.includes("*")
        ? path.dirname(target.slice(0, target.indexOf("*")) + "_")
        : target
      if (!statSync(directory, { throwIfNoEntry: false })) {
        if (!target.includes("*") && probe(target, true) !== undefined) continue
        if (required)
          throw new Error(`Project alias "${pattern}" has a missing target: ${directory}`)
        continue
      }
      snapshot(directory)
    }
  const explicit = new Map<string, string>()
  for (const [name, target] of Object.entries(options.components ?? {})) {
    const file = path.resolve(root, target)
    if (!file.endsWith(".vue") || !statSync(file, { throwIfNoEntry: false })?.isFile())
      throw new Error(`Project component "${name}" must point to an existing .vue file: ${file}`)
    snapshot(file)
    explicit.set(name, file)
  }
  for (const [name, mapping] of generated) {
    if (explicit.has(name) || !mapping.source.endsWith(".vue") || mapping.name !== "default")
      continue
    if (!statSync(mapping.source, { throwIfNoEntry: false })?.isFile())
      throw new Error(
        `Prepared Nuxt component ${name} is missing: ${mapping.source}. Run your application's nuxt prepare command.`,
      )
    snapshot(mapping.source)
  }
  const definitions = new Map<string, ComponentDefinition>()
  function definition(
    file: string,
    input?: { file: string; source: string },
  ): ComponentDefinition | undefined {
    const source = input?.file === file ? input.source : sources.get(file)
    if (source === undefined || !file.endsWith(".vue")) return undefined
    if (input?.file === file) {
      const props = componentProps(source, file)
      return { file, ...(Object.keys(props).length ? { props } : {}) }
    }
    let found = definitions.get(file)
    if (!found) {
      const props = componentProps(source, file)
      found = { file, ...(Object.keys(props).length ? { props } : {}) }
      definitions.set(file, found)
    }
    return structuredClone(found)
  }
  function probe(target: string, capture = false): string | null | undefined {
    const present = (file: string) => {
      if (capture && statSync(file, { throwIfNoEntry: false })?.isFile()) snapshot(file)
      return sources.has(file)
    }
    if (present(target)) return target
    if (path.extname(target)) return undefined
    const extensions = [".vue", ".ts", ".js", ".mts", ".mjs", ".cts", ".cjs"]
    const files = extensions.map((extension) => target + extension).filter(present)
    if (files.length) return files.length === 1 ? files[0] : null
    const indexes = extensions
      .map((extension) => path.join(target, "index" + extension))
      .filter(present)
    return indexes.length > 1 ? null : indexes[0]
  }
  function resolveImport(source: string, importer: string, capture = false): string | undefined {
    if (source.startsWith(".") || path.isAbsolute(source))
      return probe(path.resolve(path.dirname(importer), source), capture) ?? undefined
    const matches = aliases
      .filter(({ pattern }) => {
        const star = pattern.indexOf("*")
        return star === -1
          ? source === pattern
          : source.startsWith(pattern.slice(0, star)) &&
              source.endsWith(pattern.slice(star + 1)) &&
              source.length >= pattern.length - 1
      })
      .sort((a, b) => {
        const aStar = a.pattern.indexOf("*"),
          bStar = b.pattern.indexOf("*")
        return aStar === -1
          ? -1
          : bStar === -1
            ? 1
            : bStar - aStar || b.pattern.length - a.pattern.length
      })
    const match = matches[0]
    if (!match) return undefined
    const star = match.pattern.indexOf("*")
    const wildcard =
      star === -1 ? "" : source.slice(star, source.length - (match.pattern.length - star - 1))
    for (const target of match.targets) {
      const file = probe(target.replace("*", wildcard), capture)
      if (file === null) return undefined
      if (file) return file
    }
    return undefined
  }
  const modules = new Map<string, Statement[] | undefined>()
  // Follow static imports/re-exports while constructing the snapshot, including
  // shared sources outside root. No filesystem reads occur during lint().
  for (const [file, source] of sources) {
    const scripts = file.endsWith(".vue")
      ? (() => {
          const { descriptor } = parseSfc(source, { filename: file })
          return [descriptor.script?.content, descriptor.scriptSetup?.content].filter(
            (value): value is string => value !== undefined,
          )
        })()
      : [source]
    for (const script of scripts) {
      let statements: Statement[]
      try {
        statements = babelParse(script, { sourceType: "module", plugins: ["typescript"] }).program
          .body
      } catch {
        continue
      }
      if (!file.endsWith(".vue")) modules.set(file, statements)
      for (const statement of statements) {
        if (
          (statement.type === "ImportDeclaration" && statement.importKind !== "type") ||
          (statement.type === "ExportNamedDeclaration" && statement.exportKind !== "type")
        ) {
          if (statement.source) resolveImport(statement.source.value, file, true)
        }
      }
    }
  }
  function resolveExport(
    file: string,
    name: string,
    input?: { file: string; source: string },
    seen = new Set<string>(),
  ): ComponentDefinition | undefined {
    const key = file + "\0" + name
    if (seen.has(key) || name === "*") return undefined
    seen.add(key)
    if (file.endsWith(".vue")) return name === "default" ? definition(file, input) : undefined
    if (!modules.has(file)) {
      try {
        modules.set(
          file,
          babelParse(sources.get(file)!, { sourceType: "module", plugins: ["typescript"] }).program
            .body,
        )
      } catch {
        modules.set(file, undefined)
      }
    }
    const statements = modules.get(file)
    if (!statements) return undefined
    const imports = new Map<string, { source: string; name: string }>()
    for (const statement of statements) {
      if (statement.type !== "ImportDeclaration" || statement.importKind === "type") continue
      for (const specifier of statement.specifiers) {
        if (specifier.type === "ImportSpecifier" && specifier.importKind === "type") continue
        imports.set(specifier.local.name, {
          source: statement.source.value,
          name:
            specifier.type === "ImportDefaultSpecifier"
              ? "default"
              : specifier.type === "ImportNamespaceSpecifier"
                ? "*"
                : specifier.imported.type === "Identifier"
                  ? specifier.imported.name
                  : specifier.imported.value,
        })
      }
    }
    const targets: { source: string; name: string }[] = []
    for (const statement of statements) {
      if (
        statement.type === "ExportDefaultDeclaration" &&
        name === "default" &&
        statement.declaration.type === "Identifier"
      ) {
        const target = imports.get(statement.declaration.name)
        if (target) targets.push(target)
      }
      if (statement.type !== "ExportNamedDeclaration" || statement.exportKind === "type") continue
      for (const specifier of statement.specifiers) {
        if (specifier.type !== "ExportSpecifier" || specifier.exportKind === "type") continue
        const exported =
          specifier.exported.type === "Identifier"
            ? specifier.exported.name
            : specifier.exported.value
        if (exported !== name) continue
        const local = specifier.local.name
        const target = statement.source
          ? { source: statement.source.value, name: local }
          : imports.get(local)
        if (target) targets.push(target)
      }
    }
    if (targets.length !== 1) return undefined
    const target = targets[0]
    const next = resolveImport(target.source, file)
    return next ? resolveExport(next, target.name, input, seen) : undefined
  }
  return {
    resolve(
      component: string,
      imported: ComponentAlias | undefined,
      filename: string,
      source?: string,
    ): ComponentDefinition | undefined {
      const input =
        source === undefined ? undefined : { file: path.resolve(root, filename), source }
      const mapped = explicit.get(component)
      if (mapped) return definition(mapped, input)
      if (!imported) {
        const target = generatedNames.get(component)
        return target?.name === "default" ? definition(target.source, input) : undefined
      }
      const file = resolveImport(imported.importSource, path.resolve(root, filename))
      return file ? resolveExport(file, imported.imported, input) : undefined
    },
  }
}
