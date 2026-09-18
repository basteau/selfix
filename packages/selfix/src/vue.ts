import { createRequire } from "node:module"
import type * as VueCompilerSfc from "vue/compiler-sfc"

const {
  babelParse,
  compileTemplate,
  parse: parseSfc,
  version: vueVersion,
} = createRequire(import.meta.url)("vue/compiler-sfc") as typeof VueCompilerSfc

// Numeric node tags also work with older Vue releases without runtime enum exports.
const VueNode = {
  Element: 1,
  Attribute: 6,
  Directive: 7,
  If: 9,
  IfBranch: 10,
  For: 11,
  SimpleExpression: 4,
} as const

type SfcDescriptor = ReturnType<typeof parseSfc>["descriptor"]
type RootNode = NonNullable<ReturnType<typeof compileTemplate>["ast"]>
type TemplateNode = RootNode["children"][number]
type ElementNode = Extract<TemplateNode, { type: typeof VueNode.Element }>
type DirectiveNode = Extract<ElementNode["props"][number], { type: typeof VueNode.Directive }>
type ForNode = Extract<TemplateNode, { type: typeof VueNode.For }>
type TemplateExpression = NonNullable<DirectiveNode["exp"]>

type ProgramNode = ReturnType<typeof babelParse>["program"]
type StatementNode = ProgramNode["body"][number]
type ExpressionNode = Extract<StatementNode, { type: "ExpressionStatement" }>["expression"]
type ImportDeclarationNode = Extract<StatementNode, { type: "ImportDeclaration" }>
type VariableDeclaratorNode = Extract<
  StatementNode,
  { type: "VariableDeclaration" }
>["declarations"][number]
type ObjectPropertyNode = Extract<
  Extract<ExpressionNode, { type: "ObjectExpression" }>["properties"][number],
  { type: "ObjectProperty" }
>
type CallExpressionNode = Extract<ExpressionNode, { type: "CallExpression" }>
// Babel also permits patterns in property values and non-expression call arguments.
// They are handled as unsupported rather than assumed to be expressions.
type ExpressionInput =
  | ExpressionNode
  | ObjectPropertyNode["value"]
  | CallExpressionNode["arguments"][number]

export interface ClassSite {
  component: string
  tokens: string[]
  dynamic: boolean
  offset: number
  importSource?: string
}

export interface StyleSite {
  component: string
  offset: number
}

export interface ParseIssue {
  message: string
  offset: number
}

interface StaticBinding {
  tokens: string[]
  dynamic: boolean
}

interface ComponentAlias {
  local: string
  importSource: string
}

interface ComponentAliases {
  byTemplateName: Map<string, ComponentAlias>
  byTagName: Map<string, ComponentAlias>
}

interface TemplateContext {
  aliases: ComponentAliases
  bindings: Map<string, StaticBinding>
  helpers: ReadonlySet<string>
  shadowed: ReadonlySet<string>
  errors: ParseIssue[]
  offset: number
}

interface CollectVueOptions {
  forceCompileTemplateAst?: boolean
}

// Vue introduced same-name v-bind shorthand in 3.4. Older compilers must
// continue reporting missing expressions, including on the untransformed AST.
const supportsSameNameBinding = Number(vueVersion.split(".")[1]) >= 4

const CLASS_HELPERS = new Set(["cn", "clsx", "twMerge"])

export function collectVue(
  source: string,
  filename: string,
  options: CollectVueOptions = {},
): { sites: ClassSite[]; styles: StyleSite[]; errors: ParseIssue[]; fatal: boolean } {
  const errors: ParseIssue[] = []
  const parsed = parseSfc(source, { filename, sourceMap: false })
  for (const error of parsed.errors) {
    errors.push(issue(error, 0))
  }

  const script = parseScript(
    parsed.descriptor.script?.content,
    parsed.descriptor.script?.loc.start.offset ?? 0,
    errors,
  )
  const setup = parseScript(
    parsed.descriptor.scriptSetup?.content,
    parsed.descriptor.scriptSetup?.loc.start.offset ?? 0,
    errors,
  )
  // Parser failures invalidate the file; later collection issues leave independent sites usable.
  let fatal = errors.length > 0
  const aliases: ComponentAliases = { byTemplateName: new Map(), byTagName: new Map() }
  collectComponentAliases(script, aliases)
  collectComponentAliases(setup, aliases)

  const bindings = collectStaticBindings(setup)
  const sites: ClassSite[] = []
  const styles: StyleSite[] = []

  for (const block of parsed.descriptor.styles) {
    styles.push({
      component: "style",
      offset: source.lastIndexOf("<style", block.loc.start.offset),
    })
  }

  const template = parsed.descriptor.template
  if (!template) {
    return { sites, styles: sortStyles(styles), errors, fatal }
  }
  if (template.src) {
    errors.push({
      message: "External template src is not supported",
      offset: template.loc.start.offset,
    })
    return { sites, styles: sortStyles(styles), errors, fatal }
  }
  if (template.lang && template.lang !== "html") {
    errors.push({
      message: `Template language "${template.lang}" is not supported`,
      offset: template.loc.start.offset,
    })
    return { sites, styles: sortStyles(styles), errors, fatal }
  }
  const templateAst = options.forceCompileTemplateAst ? undefined : template.ast
  const errorsBeforeCompile = errors.length
  const ast =
    templateAst ?? compileTemplateAst(template.content, filename, template.loc.start.offset, errors)
  fatal ||= errors.length > errorsBeforeCompile
  if (!ast) {
    return { sites, styles: sortStyles(styles), errors, fatal }
  }

  walkTemplate(
    ast,
    {
      aliases,
      bindings,
      helpers: collectClassHelpers([script, setup]),
      shadowed: new Set(),
      errors,
      offset: templateAst ? 0 : template.loc.start.offset,
    },
    sites,
    styles,
  )
  return { sites, styles: sortStyles(styles), errors, fatal }
}

function compileTemplateAst(
  source: string,
  filename: string,
  offset: number,
  errors: ParseIssue[],
): RootNode | undefined {
  const result = compileTemplate({
    source,
    filename,
    id: "selfix",
    // Keep expression identifiers intact for static analysis; generated code is unused.
    compilerOptions: {
      hoistStatic: false,
      prefixIdentifiers: false,
      cacheHandlers: false,
      mode: "function",
    },
  })
  for (const error of result.errors) {
    errors.push(issue(error, offset))
  }
  if (!result.ast) {
    errors.push({ message: "Template AST was not produced", offset })
    return undefined
  }
  return result.ast
}

function walkTemplate(
  root: RootNode,
  context: TemplateContext,
  sites: ClassSite[],
  styles: StyleSite[],
): void {
  const visit = (node: TemplateNode, current: TemplateContext): void => {
    if (node.type === VueNode.Element) {
      const elementContext = shadowElementScope(node, current, "for")
      collectElement(node, elementContext, sites, styles)
      const next = shadowElementScope(node, elementContext, "slot")
      for (const child of node.children) {
        visit(child, next)
      }
      return
    }
    if (node.type === VueNode.If) {
      for (const branch of node.branches) {
        for (const child of branch.children) {
          visit(child, current)
        }
      }
      return
    }
    if (node.type === VueNode.For) {
      const next = shadowScope(current, forAliases(node), node.loc.start.offset)
      for (const child of node.children) {
        visit(child, next)
      }
      return
    }
    if (node.type === VueNode.IfBranch) {
      for (const child of node.children) {
        visit(child, current)
      }
    }
  }

  for (const child of root.children) {
    visit(child, context)
  }
}

function expressionContent(expression: TemplateExpression | undefined): string | undefined {
  // Transformed compound expressions retain the original, unevaluated source.
  return expression?.type === VueNode.SimpleExpression ? expression.content : expression?.loc.source
}

function shadowElementScope(
  node: ElementNode,
  context: TemplateContext,
  directive: "for" | "slot",
): TemplateContext {
  let next = context
  for (const prop of node.props) {
    if (prop.type !== VueNode.Directive || prop.name !== directive) {
      continue
    }
    const content = expressionContent(prop.exp)
    if (prop.name === "slot" && content) {
      next = shadowScope(next, [content], prop.loc.start.offset)
    }
    if (prop.name === "for") {
      const match = content?.match(/^([\s\S]*?)\s+(?:in|of)\s+([\s\S]+)$/u)
      const aliases = match?.[1].trim() ?? ""
      const pattern =
        aliases.startsWith("(") && aliases.endsWith(")") ? aliases.slice(1, -1) : aliases
      next = shadowScope(next, [pattern], prop.loc.start.offset)
    }
  }
  return next
}

function shadowScope(
  context: TemplateContext,
  patterns: string[],
  offset: number,
): TemplateContext {
  try {
    const names = patterns.flatMap(bindingNames)
    return { ...context, shadowed: new Set([...context.shadowed, ...names]) }
  } catch (error) {
    context.errors.push({
      message: `Invalid or unsupported template scope: ${errorMessage(error)}`,
      offset: context.offset + offset,
    })
    // Unknown local names must never resolve to setup constants or class helpers.
    return { ...context, bindings: new Map(), helpers: new Set() }
  }
}

function forAliases(node: ForNode): string[] {
  return [
    expressionContent(node.valueAlias ?? node.parseResult?.value),
    expressionContent(node.keyAlias ?? node.parseResult?.key),
    expressionContent(node.objectIndexAlias ?? node.parseResult?.index),
  ].filter((name): name is string => name !== undefined)
}

function bindingNames(content: string): string[] {
  const program = babelParse(`(${content}) => {}`, {
    sourceType: "module",
    plugins: ["typescript"],
  }).program
  const statement = program.body[0]
  if (
    program.body.length !== 1 ||
    statement?.type !== "ExpressionStatement" ||
    statement.expression.type !== "ArrowFunctionExpression" ||
    statement.expression.params.length === 0
  ) {
    throw new Error("expected binding pattern")
  }
  const names: string[] = []
  for (const param of statement.expression.params) {
    collectBindingNames(param, names)
  }
  return names
}

type BindingPattern = Extract<ExpressionNode, { type: "ArrowFunctionExpression" }>["params"][number]

function collectBindingNames(
  node: BindingPattern | ExpressionInput | VariableDeclaratorNode["id"],
  names: string[],
): void {
  switch (node.type) {
    case "Identifier":
      names.push(node.name)
      return
    case "RestElement":
      collectBindingNames(node.argument, names)
      return
    case "AssignmentPattern":
      collectBindingNames(node.left, names)
      return
    case "ArrayPattern":
      for (const element of node.elements) {
        if (element) collectBindingNames(element, names)
      }
      return
    case "ObjectPattern":
      for (const property of node.properties) {
        if (property.type === "RestElement") {
          collectBindingNames(property.argument, names)
        } else {
          collectBindingNames(property.value, names)
        }
      }
      return
    default:
      throw new Error("unsupported binding pattern")
  }
}

function collectElement(
  node: ElementNode,
  context: TemplateContext,
  sites: ClassSite[],
  styles: StyleSite[],
): void {
  const alias =
    context.aliases.byTemplateName.get(node.tag) ?? context.aliases.byTagName.get(node.tag)
  const component = alias?.local ?? (/^[A-Z]/u.test(node.tag) ? node.tag : node.tag.toLowerCase())
  const importSource = alias?.importSource

  if (isTemplateStyleElement(node)) {
    styles.push({ component: "style", offset: context.offset + node.loc.start.offset })
    context.errors.push({
      message: "Template <style> tags are not supported",
      offset: context.offset + node.loc.start.offset,
    })
  }

  for (const prop of node.props) {
    if (prop.type === VueNode.Attribute) {
      if (prop.name === "class" && prop.value) {
        sites.push(
          classSite(
            component,
            splitClasses(prop.value.content),
            false,
            context.offset + prop.loc.start.offset,
            importSource,
          ),
        )
      }
      if (prop.name === "style") {
        styles.push({ component, offset: context.offset + prop.loc.start.offset })
      }
      continue
    }

    if (isBoundAttribute(prop, "class")) {
      // A synthesized shorthand expression shares the argument's location.
      // Never parse its reserved-word identifier `class` as application JavaScript.
      const shorthand =
        supportsSameNameBinding &&
        (!prop.exp || prop.exp.loc.start.offset === prop.arg?.loc.start.offset)
      const found = shorthand
        ? { tokens: [], dynamic: true }
        : collectClassExpression(
            expressionContent(prop.exp),
            context.offset + prop.loc.start.offset,
            context,
          )
      sites.push(
        classSite(
          component,
          found.tokens,
          found.dynamic,
          context.offset + prop.loc.start.offset,
          importSource,
        ),
      )
    }
    if (isBoundAttribute(prop, "style")) {
      styles.push({ component, offset: context.offset + prop.loc.start.offset })
    }
    if (isFullBind(prop)) {
      collectSpreadAttrs(prop, component, importSource, context, sites, styles)
    }
    if (isDynamicBindArg(prop)) {
      context.errors.push({
        message: "Dynamic v-bind argument may be class or style",
        offset: context.offset + prop.loc.start.offset,
      })
    }
  }
}

function collectSpreadAttrs(
  prop: DirectiveNode,
  component: string,
  importSource: string | undefined,
  context: TemplateContext,
  sites: ClassSite[],
  styles: StyleSite[],
): void {
  const content = expressionContent(prop.exp)
  if (!content) {
    context.errors.push({
      message: "v-bind is missing an expression",
      offset: context.offset + prop.loc.start.offset,
    })
    sites.push(classSite(component, [], true, context.offset + prop.loc.start.offset, importSource))
    return
  }
  let expression: ExpressionNode
  try {
    expression = parseExpression(content)
  } catch (error) {
    context.errors.push({
      message: `Invalid v-bind expression: ${errorMessage(error)}`,
      offset: context.offset + prop.loc.start.offset,
    })
    sites.push(classSite(component, [], true, context.offset + prop.loc.start.offset, importSource))
    return
  }
  if (expression.type !== "ObjectExpression") {
    context.errors.push({
      message: "Dynamic v-bind attrs may contain class or style",
      offset: context.offset + prop.loc.start.offset,
    })
    sites.push(classSite(component, [], true, context.offset + prop.loc.start.offset, importSource))
    return
  }
  let reportedUncertainty = false
  for (const property of expression.properties) {
    if (property.type !== "ObjectProperty" || property.computed) {
      if (reportedUncertainty) continue
      reportedUncertainty = true
      context.errors.push({
        message: "Dynamic v-bind attrs may contain class or style",
        offset: context.offset + prop.loc.start.offset,
      })
      sites.push(
        classSite(component, [], true, context.offset + prop.loc.start.offset, importSource),
      )
      continue
    }
    const key = propertyKey(property)
    if (key === "class") {
      const found = collectExpression(property.value, context)
      sites.push(
        classSite(
          component,
          found.tokens,
          found.dynamic,
          context.offset + prop.loc.start.offset,
          importSource,
        ),
      )
    }
    if (key === "style") {
      styles.push({ component, offset: context.offset + prop.loc.start.offset })
    }
  }
}

function isBoundAttribute(prop: DirectiveNode, name: string): boolean {
  return (
    prop.name === "bind" &&
    prop.arg?.type === VueNode.SimpleExpression &&
    prop.arg.isStatic &&
    (prop.arg.content === name || prop.arg.loc.source === name)
  )
}

function isFullBind(prop: DirectiveNode): boolean {
  return prop.name === "bind" && !prop.arg
}

function isDynamicBindArg(prop: DirectiveNode): boolean {
  return (
    prop.name === "bind" &&
    !!prop.arg &&
    (prop.arg.type !== VueNode.SimpleExpression || !prop.arg.isStatic)
  )
}

function isTemplateStyleElement(node: ElementNode): boolean {
  return node.tag.toLowerCase() === "style"
}

function collectClassExpression(
  content: string | undefined,
  offset: number,
  context: TemplateContext,
): StaticBinding {
  if (!content?.trim()) {
    context.errors.push({ message: "Class binding is missing an expression", offset })
    return { tokens: [], dynamic: true }
  }

  try {
    const ast = parseExpression(content)
    return collectExpression(ast, context)
  } catch (error) {
    context.errors.push({
      message: `Invalid class binding expression: ${errorMessage(error)}`,
      offset,
    })
    return { tokens: [], dynamic: true }
  }
}

function collectExpression(node: ExpressionInput, context: TemplateContext): StaticBinding {
  switch (node.type) {
    case "StringLiteral":
      return { tokens: splitClasses(node.value), dynamic: false }
    case "BooleanLiteral":
    case "NullLiteral":
      return { tokens: [], dynamic: false }
    case "TemplateLiteral":
      if (node.expressions.length > 0) {
        return { tokens: [], dynamic: true }
      }
      return {
        tokens: splitClasses(
          node.quasis.map((part) => part.value.cooked ?? part.value.raw).join(""),
        ),
        dynamic: false,
      }
    case "ArrayExpression":
      return combine(
        node.elements.map((element) => {
          if (!element) {
            return { tokens: [], dynamic: false }
          }
          if (element.type === "SpreadElement") {
            return { tokens: [], dynamic: true }
          }
          return collectExpression(element, context)
        }),
      )
    case "ObjectExpression":
      return combine(
        node.properties.map((property) => {
          if (property.type !== "ObjectProperty") {
            return { tokens: [], dynamic: true }
          }
          return collectObjectProperty(property)
        }),
      )
    case "ConditionalExpression":
      return combine([
        collectExpression(node.consequent, context),
        collectExpression(node.alternate, context),
      ])
    case "LogicalExpression":
      if (node.operator === "&&") {
        return collectExpression(node.right, context)
      }
      if (node.operator === "||" || node.operator === "??") {
        return combine([
          collectExpression(node.left, context),
          collectExpression(node.right, context),
        ])
      }
      return { tokens: [], dynamic: true }
    case "CallExpression":
      return collectCallExpression(node, context)
    case "Identifier":
      if (context.shadowed.has(node.name)) {
        return { tokens: [], dynamic: true }
      }
      return context.bindings.get(node.name) ?? { tokens: [], dynamic: true }
    case "TSAsExpression":
    case "TSTypeAssertion":
    case "TSSatisfiesExpression":
    case "TSNonNullExpression":
      return collectExpression(node.expression, context)
    default:
      return { tokens: [], dynamic: true }
  }
}

function collectObjectProperty(property: ObjectPropertyNode): StaticBinding {
  if (property.computed) {
    return { tokens: [], dynamic: true }
  }
  if (property.key.type === "StringLiteral") {
    return { tokens: splitClasses(property.key.value), dynamic: false }
  }
  if (property.key.type === "Identifier") {
    return { tokens: [property.key.name], dynamic: false }
  }
  return { tokens: [], dynamic: true }
}

function collectCallExpression(node: CallExpressionNode, context: TemplateContext): StaticBinding {
  if (node.callee.type !== "Identifier") {
    return { tokens: [], dynamic: true }
  }
  if (!context.helpers.has(node.callee.name) || context.shadowed.has(node.callee.name)) {
    return { tokens: [], dynamic: true }
  }

  return combine(
    node.arguments.map((argument) => {
      if (argument.type === "SpreadElement") {
        return { tokens: [], dynamic: true }
      }
      return collectExpression(argument, context)
    }),
  )
}

function collectClassHelpers(programs: (ProgramNode | undefined)[]): ReadonlySet<string> {
  const helpers = new Set(CLASS_HELPERS)
  const visit = (statement: StatementNode, topLevel = false): void => {
    switch (statement.type) {
      case "ExportNamedDeclaration":
        if (statement.declaration) visit(statement.declaration, topLevel)
        return
      case "ExportDefaultDeclaration":
        if (
          statement.declaration.type === "FunctionDeclaration" ||
          statement.declaration.type === "ClassDeclaration" ||
          statement.declaration.type === "TSDeclareFunction"
        ) {
          visit(statement.declaration, topLevel)
        }
        return
      case "VariableDeclaration": {
        if (!topLevel && statement.kind !== "var") return
        const names: string[] = []
        for (const variable of statement.declarations) collectBindingNames(variable.id, names)
        for (const name of names) helpers.delete(name)
        return
      }
      case "FunctionDeclaration":
      case "ClassDeclaration":
      case "TSDeclareFunction":
      case "TSEnumDeclaration":
        if (topLevel && statement.id) helpers.delete(statement.id.name)
        return
      case "BlockStatement":
        for (const child of statement.body) visit(child)
        return
      case "IfStatement":
        visit(statement.consequent)
        if (statement.alternate) visit(statement.alternate)
        return
      case "ForStatement":
        if (statement.init?.type === "VariableDeclaration") visit(statement.init)
        visit(statement.body)
        return
      case "ForInStatement":
      case "ForOfStatement":
        if (statement.left.type === "VariableDeclaration") visit(statement.left)
        visit(statement.body)
        return
      case "WhileStatement":
      case "DoWhileStatement":
      case "LabeledStatement":
      case "WithStatement":
        visit(statement.body)
        return
      case "SwitchStatement":
        for (const branch of statement.cases) {
          for (const child of branch.consequent) visit(child)
        }
        return
      case "TryStatement":
        visit(statement.block)
        if (statement.handler) visit(statement.handler.body)
        if (statement.finalizer) visit(statement.finalizer)
        return
    }
  }
  for (const program of programs) {
    for (const statement of program?.body ?? []) visit(statement, true)
  }
  return helpers
}

function collectStaticBindings(program: ProgramNode | undefined): Map<string, StaticBinding> {
  const bindings = new Map<string, StaticBinding>()
  if (!program) {
    return bindings
  }

  for (const statement of program.body) {
    if (statement.type !== "VariableDeclaration" || statement.kind !== "const") {
      continue
    }
    for (const declaration of statement.declarations) {
      collectStaticDeclarator(declaration, bindings)
    }
  }
  return bindings
}

function collectStaticDeclarator(
  declaration: VariableDeclaratorNode,
  bindings: Map<string, StaticBinding>,
): void {
  if (declaration.id.type !== "Identifier" || !declaration.init) {
    return
  }

  const name = declaration.id.name
  if (typeof name !== "string") {
    return
  }
  const result = collectStaticConst(declaration.init)
  if (result) {
    bindings.set(name, result)
  }
}

function collectStaticConst(node: ExpressionNode): StaticBinding | undefined {
  if (node.type === "StringLiteral") {
    return { tokens: splitClasses(node.value), dynamic: false }
  }
  if (node.type === "TemplateLiteral" && node.expressions.length === 0) {
    return {
      tokens: splitClasses(node.quasis.map((part) => part.value.cooked ?? part.value.raw).join("")),
      dynamic: false,
    }
  }
  if (isTsWrapper(node)) {
    return collectStaticConst(node.expression)
  }
  return undefined
}

function collectComponentAliases(
  program: ProgramNode | undefined,
  aliases: ComponentAliases,
): void {
  if (!program) {
    return
  }

  for (const statement of program.body) {
    if (statement.type !== "ImportDeclaration") {
      continue
    }
    collectImportAliases(statement, aliases)
  }
}

function collectImportAliases(statement: ImportDeclarationNode, aliases: ComponentAliases): void {
  for (const specifier of statement.specifiers) {
    const local = specifier.local.name
    if (!isLikelyComponent(local)) {
      continue
    }
    const alias = { local, importSource: statement.source.value }
    aliases.byTemplateName.set(local, alias)
    aliases.byTagName.set(kebabCase(local), alias)
  }
}

function parseScript(
  script: NonNullable<SfcDescriptor["script"]>["content"] | undefined,
  offset: number,
  errors: ParseIssue[],
): ProgramNode | undefined {
  if (!script?.trim()) {
    return undefined
  }
  try {
    return babelParse(script, {
      sourceType: "module",
      plugins: ["typescript"],
    }).program
  } catch (error) {
    errors.push({ message: `Invalid script: ${errorMessage(error)}`, offset })
    return undefined
  }
}

function parseExpression(content: string): ExpressionNode {
  const program = babelParse(`(${content})`, {
    sourceType: "module",
    plugins: ["typescript"],
  }).program
  const statement = program.body[0]
  if (statement?.type !== "ExpressionStatement") {
    throw new Error("expected expression")
  }
  return statement.expression
}

function combine(items: StaticBinding[]): StaticBinding {
  return {
    tokens: dedupe(items.flatMap((item) => item.tokens)),
    dynamic: items.some((item) => item.dynamic),
  }
}

function splitClasses(value: string): string[] {
  return value.trim().split(/\s+/u).filter(Boolean)
}

function kebabCase(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/gu, "$1-$2")
    .replace(/_/gu, "-")
    .toLowerCase()
}

function isLikelyComponent(value: string): boolean {
  return /^[A-Z]/u.test(value)
}

function dedupe(values: string[]): string[] {
  return [...new Set(values)]
}

function sortStyles(styles: StyleSite[]): StyleSite[] {
  return [...styles].sort((left, right) => left.offset - right.offset)
}

function classSite(
  component: string,
  tokens: string[],
  dynamic: boolean,
  offset: number,
  importSource: string | undefined,
): ClassSite {
  const site: ClassSite = { component, tokens, dynamic, offset }
  if (importSource) {
    site.importSource = importSource
  }
  return site
}

function propertyKey(property: ObjectPropertyNode): string | undefined {
  if (property.key.type === "StringLiteral") {
    return property.key.value
  }
  if (property.key.type === "Identifier") {
    return property.key.name
  }
  return undefined
}

function isTsWrapper(node: ExpressionInput): node is Extract<
  ExpressionNode,
  {
    type: "TSAsExpression" | "TSTypeAssertion" | "TSSatisfiesExpression" | "TSNonNullExpression"
  }
> {
  return (
    node.type === "TSAsExpression" ||
    node.type === "TSTypeAssertion" ||
    node.type === "TSSatisfiesExpression" ||
    node.type === "TSNonNullExpression"
  )
}

function issue(error: SyntaxError | unknown, baseOffset: number): ParseIssue {
  if (typeof error === "object" && error && "message" in error) {
    const maybeError = error as {
      message: string
      loc?: { start?: { offset?: number }; offset?: number }
    }
    return {
      message: maybeError.message,
      offset: baseOffset + (maybeError.loc?.start?.offset ?? maybeError.loc?.offset ?? 0),
    }
  }
  return { message: String(error), offset: baseOffset }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
