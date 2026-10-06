import { ruleNames, type RuleName, type Severity } from "./config.js"
import type { Diagnostic, SuppressedDiagnostic } from "./index.js"
import type { TemplateComments } from "./vue.js"

const usage = '"selfix-disable-next-line <rule>[, <rule>] -- <reason>"'

/** A problem with an exception comment, reported at the comment. */
export interface ExceptionProblem {
  rule: "invalid-exception" | "unused-exception"
  severity: Exclude<Severity, "off">
  offset: number
  message: string
}

/**
 * Applies `selfix-disable-next-line` comments to a file's sorted diagnostics. A valid comment
 * suppresses the findings of its rules that start on the following line inside the template.
 * Invalid comments, and comment rules that suppress nothing, become problems at the comment.
 */
export function applyExceptions(
  diagnostics: Diagnostic[],
  template: TemplateComments,
  lineAt: (offset: number) => number,
  unusedSeverity: Severity,
): { kept: Diagnostic[]; suppressed: SuppressedDiagnostic[]; problems: ExceptionProblem[] } {
  const problems: ExceptionProblem[] = []
  const directives = template.comments.flatMap((comment) => {
    const parsed = parseException(comment.text)
    if (!parsed) return []
    if ("error" in parsed) {
      problems.push({
        rule: "invalid-exception",
        severity: "error",
        offset: comment.offset,
        message: parsed.error,
      })
      return []
    }
    const line = lineAt(comment.end - 1) + 1
    return [{ ...parsed, offset: comment.offset, line, used: new Set<string>() }]
  })
  const suppressed: SuppressedDiagnostic[] = []
  const kept = diagnostics.filter((item) => {
    if (item.offset < template.start || item.offset >= template.end) return true
    const directive = directives.find(
      ({ line, rules }) => line === item.line && (rules as string[]).includes(item.rule),
    )
    if (!directive) return true
    directive.used.add(item.rule)
    suppressed.push({ ...item, reason: directive.reason })
    return false
  })
  for (const directive of directives) {
    const unused = directive.rules.filter((rule) => !directive.used.has(rule))
    if (unusedSeverity === "off" || !unused.length) continue
    problems.push({
      rule: "unused-exception",
      severity: unusedSeverity,
      offset: directive.offset,
      message:
        `Unused exception: ${unused.join(", ")} reported nothing on the next line. ` +
        (unused.length === directive.rules.length
          ? "Remove the comment."
          : `Remove ${unused.length === 1 ? "this rule" : "these rules"} from the comment.`),
    })
  }
  return { kept, suppressed, problems }
}

// Reads one `selfix-` comment: the rules and reason of a valid directive, an error for a
// malformed or unsupported one, or undefined for any other comment.
function parseException(
  text: string,
): { rules: RuleName[]; reason: string } | { error: string } | undefined {
  const directive = /^selfix-disable-next-line(?=\s|$)([\s\S]*)$/.exec(text)
  if (!directive)
    return /^selfix-(?:disable|enable)/.test(text)
      ? {
          error: `Unsupported exception comment. Write ${usage} above the line, or use overrides for whole files.`,
        }
      : undefined
  const body = directive[1]!
  const separator = body.indexOf("--")
  const names = (separator < 0 ? body : body.slice(0, separator))
    .split(",")
    .map((name) => name.trim())
  const reason =
    separator < 0
      ? ""
      : body
          .slice(separator + 2)
          .trim()
          .replace(/\s+/g, " ")
  if (names.every((name) => !name))
    return { error: `Exception comment names no rule. Write ${usage}.` }
  const seen = new Set<string>()
  for (const name of names) {
    if (!name) return { error: "Exception comment has an empty rule name between commas." }
    if (name === "parse-error")
      return { error: "Parse errors cannot be suppressed. Fix the reported syntax instead." }
    if (!(ruleNames as readonly string[]).includes(name))
      return {
        error: `Exception comment names unknown rule ${JSON.stringify(name)}. Separate rule names with commas; rules are ${ruleNames.join(", ")}.`,
      }
    if (seen.has(name)) return { error: `Exception comment names ${name} twice.` }
    seen.add(name)
  }
  if (!reason)
    return { error: 'Exception comment needs a reason. Add "-- <reason>" after the rule names.' }
  return { rules: names as RuleName[], reason }
}
