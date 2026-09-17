import { createRequire } from "node:module"
import type * as VueCompilerSfc from "vue/compiler-sfc"

const {
  babelParse,
  compileTemplate,
  parse: parseSfc,
} = createRequire(import.meta.url)("vue/compiler-sfc") as typeof VueCompilerSfc

const enum VueNode {
  Root = 0,
  Element = 1,
  Text = 2,
  Attribute = 6,
  Directive = 7,
  If = 9,
  IfBranch = 10,
  For = 11,
  SimpleExpression = 4,
}

type TemplateNode = ElementNode | TextNode | IfNode | IfBranchNode | ForNode

interface RootNode {
  children: TemplateNode[]
}

interface ElementNode {
  type: VueNode.Element
  tag: string
  props: Array<AttributeNode | DirectiveNode>
  children: TemplateNode[]
  loc: { start: { offset: number } }
}

interface TextNode {
  type: VueNode.Text
  content: string
  loc: { start: { offset: number } }
}

interface AttributeNode {
  type: VueNode.Attribute
  name: string
  value?: { content: string }
  loc: { start: { offset: number } }
}

interface DirectiveNode {
  type: VueNode.Directive
  name: string
  exp?: { content: string }
  arg?: { type: VueNode.SimpleExpression; isStatic: boolean; content: string }
  loc: { start: { offset: number } }
}

interface IfNode {
  type: VueNode.If
  branches: Array<{ children: TemplateNode[] }>
}

interface IfBranchNode {
  type: VueNode.IfBranch
  children: TemplateNode[]
}

interface ForNode {
  type: VueNode.For
  children: TemplateNode[]
  source?: { content: string }
  valueAlias?: { content: string }
  keyAlias?: { content: string }
  objectIndexAlias?: { content: string }
  parseResult?: {
    value?: { content: string }
    key?: { content: string }
    index?: { content: string }
    source?: { content: string }
  }
}

interface BabelFile {
  program: ProgramNode
}

interface ProgramNode {
  body: StatementNode[]
}

type StatementNode = ExpressionStatementNode | ImportDeclarationNode | VariableDeclarationNode

interface ExpressionStatementNode {
  type: "ExpressionStatement"
  expression: ExpressionNode
}

interface ImportDeclarationNode {
  type: "ImportDeclaration"
  source: { value: string }
  specifiers: Array<{ local: { name: string } }>
}

interface VariableDeclarationNode {
  type: "VariableDeclaration"
  kind: "const" | "let" | "var"
  declarations: VariableDeclaratorNode[]
}

interface VariableDeclaratorNode {
  id: { type: string; name?: string }
  init?: ExpressionNode | null
}

type ExpressionNode =
  | StringLiteralNode
  | BooleanLiteralNode
  | NullLiteralNode
  | TemplateLiteralNode
  | ArrayExpressionNode
  | ObjectExpressionNode
  | ConditionalExpressionNode
  | LogicalExpressionNode
  | CallExpressionNode
  | IdentifierNode
  | TSAsExpressionNode
  | TSSatisfiesExpressionNode
  | TSNonNullExpressionNode

interface StringLiteralNode {
  type: "StringLiteral"
  value: string
}

interface BooleanLiteralNode {
  type: "BooleanLiteral"
  value: boolean
}

interface NullLiteralNode {
  type: "NullLiteral"
}

interface TemplateLiteralNode {
  type: "TemplateLiteral"
  expressions: ExpressionNode[]
  quasis: Array<{ value: { cooked?: string; raw: string } }>
}

interface ArrayExpressionNode {
  type: "ArrayExpression"
  elements: Array<ExpressionNode | SpreadElementNode | null>
}

interface ObjectExpressionNode {
  type: "ObjectExpression"
  properties: Array<ObjectPropertyNode | SpreadElementNode>
}

interface ObjectPropertyNode {
  type: "ObjectProperty"
  computed: boolean
  key: StringLiteralNode | IdentifierNode
  value: ExpressionNode
}

interface ConditionalExpressionNode {
  type: "ConditionalExpression"
  consequent: ExpressionNode
  alternate: ExpressionNode
}

interface LogicalExpressionNode {
  type: "LogicalExpression"
  operator: "&&" | "||" | "??" | string
  left: ExpressionNode
  right: ExpressionNode
}

interface CallExpressionNode {
  type: "CallExpression"
  callee: IdentifierNode | MemberExpressionNode
  arguments: Array<ExpressionNode | SpreadElementNode>
}

interface IdentifierNode {
  type: "Identifier"
  name: string
}

interface MemberExpressionNode {
  type: "MemberExpression" | "OptionalMemberExpression"
}

interface SpreadElementNode {
  type: "SpreadElement"
}

interface TSAsExpressionNode {
  type: "TSAsExpression" | "TSTypeAssertion"
  expression: ExpressionNode
}

interface TSSatisfiesExpressionNode {
  type: "TSSatisfiesExpression"
  expression: ExpressionNode
}

interface TSNonNullExpressionNode {
  type: "TSNonNullExpression"
  expression: ExpressionNode
}

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
  shadowed: ReadonlySet<string>
  errors: ParseIssue[]
}

interface CollectVueOptions {
  forceCompileTemplateAst?: boolean
}

const CLASS_HELPERS = new Set(["cn", "clsx", "twMerge"])

export function collectVue(
  source: string,
  filename: string,
  options: CollectVueOptions = {},
): { sites: ClassSite[]; styles: StyleSite[]; errors: ParseIssue[] } {
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
    return { sites, styles: sortStyles(styles), errors }
  }
  if (template.src) {
    errors.push({
      message: "External template src is not supported",
      offset: template.loc.start.offset,
    })
    return { sites, styles: sortStyles(styles), errors }
  }
  if (template.lang && template.lang !== "html") {
    errors.push({
      message: `Template language "${template.lang}" is not supported`,
      offset: template.loc.start.offset,
    })
    return { sites, styles: sortStyles(styles), errors }
  }
  const templateAst = options.forceCompileTemplateAst
    ? undefined
    : (template.ast as unknown as RootNode | undefined)
  const ast =
    templateAst ?? compileTemplateAst(template.content, filename, template.loc.start.offset, errors)
  if (!ast) {
    return { sites, styles: sortStyles(styles), errors }
  }

  walkTemplate(ast, { aliases, bindings, shadowed: new Set(), errors }, sites, styles)
  return { sites, styles: sortStyles(styles), errors }
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
    compilerOptions: { hoistStatic: false },
  })
  for (const error of result.errors) {
    errors.push(issue(error, offset))
  }
  if (!result.ast) {
    errors.push({ message: "Template AST was not produced", offset })
    return undefined
  }
  shiftTemplateOffsets(result.ast as unknown as RootNode, offset)
  return result.ast as unknown as RootNode
}

function shiftTemplateOffsets(root: RootNode, offset: number): void {
  const visit = (node: TemplateNode): void => {
    const maybeLoc = node as { loc?: { start?: { offset?: number } } }
    if (typeof maybeLoc.loc?.start?.offset === "number") {
      maybeLoc.loc.start.offset += offset
    }
    if (node.type === VueNode.Element) {
      for (const prop of node.props) {
        prop.loc.start.offset += offset
      }
      for (const child of node.children) {
        visit(child)
      }
      return
    }
    if (node.type === VueNode.If) {
      for (const branch of node.branches) {
        for (const child of branch.children) {
          visit(child)
        }
      }
      return
    }
    if (node.type === VueNode.For || node.type === VueNode.IfBranch) {
      for (const child of node.children) {
        visit(child)
      }
    }
  }
  for (const child of root.children) {
    visit(child)
  }
}

function walkTemplate(
  root: RootNode,
  context: TemplateContext,
  sites: ClassSite[],
  styles: StyleSite[],
): void {
  const visit = (node: TemplateNode, current: TemplateContext): void => {
    if (node.type === VueNode.Element) {
      const next = shadowElementScope(node, current)
      collectElement(node, next, sites, styles)
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
      const next = withShadowed(current, forAliases(node))
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

function shadowElementScope(node: ElementNode, context: TemplateContext): TemplateContext {
  const names: string[] = []
  for (const prop of node.props) {
    if (prop.type === VueNode.Directive && prop.name === "slot" && prop.exp?.content) {
      names.push(...bindingNames(prop.exp.content))
    }
    if (prop.type === VueNode.Directive && prop.name === "for" && prop.exp?.content) {
      names.push(...bindingNames(prop.exp.content.split(/\s+(?:in|of)\s+/u)[0]))
    }
  }
  return withShadowed(context, names)
}

function withShadowed(context: TemplateContext, names: string[]): TemplateContext {
  if (names.length === 0) {
    return context
  }
  return { ...context, shadowed: new Set([...context.shadowed, ...names]) }
}

function forAliases(node: ForNode): string[] {
  return [
    node.valueAlias?.content,
    node.keyAlias?.content,
    node.objectIndexAlias?.content,
    node.parseResult?.value?.content,
    node.parseResult?.key?.content,
    node.parseResult?.index?.content,
  ].flatMap((name) => bindingNames(name))
}

function bindingNames(content: string | undefined): string[] {
  if (!content?.trim()) {
    return []
  }
  try {
    const expression = parseExpression(content)
    const names: string[] = []
    collectBindingNames(expression, names)
    return names
  } catch {
    return splitBindingPattern(content)
  }
}

function collectBindingNames(node: ExpressionNode, names: string[]): void {
  if (node.type === "Identifier") {
    names.push(node.name)
    return
  }
  if (node.type === "ArrayExpression") {
    for (const element of node.elements) {
      if (element && element.type !== "SpreadElement") {
        collectBindingNames(element, names)
      }
    }
    return
  }
  if (node.type === "ObjectExpression") {
    for (const property of node.properties) {
      if (property.type === "ObjectProperty") {
        collectBindingNames(property.value, names)
      }
    }
    return
  }
  if (isTsWrapper(node)) {
    collectBindingNames(node.expression, names)
  }
}

function splitBindingPattern(content: string): string[] {
  return content.match(/[A-Za-z_$][\w$]*/gu) ?? []
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
    styles.push({ component: "style", offset: node.loc.start.offset })
    context.errors.push({
      message: "Template <style> tags are not supported",
      offset: node.loc.start.offset,
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
            prop.loc.start.offset,
            importSource,
          ),
        )
      }
      if (prop.name === "style") {
        styles.push({ component, offset: prop.loc.start.offset })
      }
      continue
    }

    if (isBoundAttribute(prop, "class")) {
      const found = collectClassExpression(prop.exp?.content, prop.loc.start.offset, context)
      sites.push(
        classSite(component, found.tokens, found.dynamic, prop.loc.start.offset, importSource),
      )
    }
    if (isBoundAttribute(prop, "style")) {
      styles.push({ component, offset: prop.loc.start.offset })
    }
    if (isFullBind(prop)) {
      collectSpreadAttrs(prop, component, importSource, context, sites, styles)
    }
    if (isDynamicBindArg(prop)) {
      context.errors.push({
        message: "Dynamic v-bind argument may be class or style",
        offset: prop.loc.start.offset,
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
  if (!prop.exp?.content) {
    context.errors.push({
      message: "v-bind is missing an expression",
      offset: prop.loc.start.offset,
    })
    sites.push(classSite(component, [], true, prop.loc.start.offset, importSource))
    return
  }
  let expression: ExpressionNode
  try {
    expression = parseExpression(prop.exp.content)
  } catch (error) {
    context.errors.push({
      message: `Invalid v-bind expression: ${errorMessage(error)}`,
      offset: prop.loc.start.offset,
    })
    sites.push(classSite(component, [], true, prop.loc.start.offset, importSource))
    return
  }
  if (expression.type !== "ObjectExpression") {
    context.errors.push({
      message: "Dynamic v-bind attrs may contain class or style",
      offset: prop.loc.start.offset,
    })
    sites.push(classSite(component, [], true, prop.loc.start.offset, importSource))
    return
  }
  for (const property of expression.properties) {
    if (property.type === "SpreadElement" || property.computed) {
      context.errors.push({
        message: "Dynamic v-bind attrs may contain class or style",
        offset: prop.loc.start.offset,
      })
      sites.push(classSite(component, [], true, prop.loc.start.offset, importSource))
      continue
    }
    const key = propertyKey(property)
    if (key === "class") {
      const found = collectExpression(property.value, context)
      sites.push(
        classSite(component, found.tokens, found.dynamic, prop.loc.start.offset, importSource),
      )
    }
    if (key === "style") {
      styles.push({ component, offset: prop.loc.start.offset })
    }
  }
}

function isBoundAttribute(prop: DirectiveNode, name: string): boolean {
  return (
    prop.name === "bind" &&
    prop.arg?.type === VueNode.SimpleExpression &&
    prop.arg.isStatic &&
    prop.arg.content === name
  )
}

function isFullBind(prop: DirectiveNode): boolean {
  return prop.name === "bind" && !prop.arg
}

function isDynamicBindArg(prop: DirectiveNode): boolean {
  return prop.name === "bind" && !!prop.arg && !prop.arg.isStatic
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

function collectExpression(node: ExpressionNode, context: TemplateContext): StaticBinding {
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
          if (property.type === "SpreadElement") {
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
  if (!CLASS_HELPERS.has(node.callee.name)) {
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
  script: string | undefined,
  offset: number,
  errors: ParseIssue[],
): ProgramNode | undefined {
  if (!script?.trim()) {
    return undefined
  }
  try {
    return (
      babelParse(script, {
        sourceType: "module",
        plugins: ["typescript"],
      }) as BabelFile
    ).program
  } catch (error) {
    errors.push({ message: `Invalid script: ${errorMessage(error)}`, offset })
    return undefined
  }
}

function parseExpression(content: string): ExpressionNode {
  const program = (
    babelParse(`(${content})`, {
      sourceType: "module",
      plugins: ["typescript"],
    }) as BabelFile
  ).program
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

function isTsWrapper(
  node: ExpressionNode,
): node is TSAsExpressionNode | TSSatisfiesExpressionNode | TSNonNullExpressionNode {
  return (
    node.type === "TSAsExpression" ||
    node.type === "TSTypeAssertion" ||
    node.type === "TSSatisfiesExpression" ||
    node.type === "TSNonNullExpression"
  )
}

function issue(error: SyntaxError | unknown, fallbackOffset: number): ParseIssue {
  if (typeof error === "object" && error && "message" in error) {
    const maybeError = error as {
      message: string
      loc?: { start?: { offset?: number }; offset?: number }
    }
    return {
      message: maybeError.message,
      offset: maybeError.loc?.start?.offset ?? maybeError.loc?.offset ?? fallbackOffset,
    }
  }
  return { message: String(error), offset: fallbackOffset }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
