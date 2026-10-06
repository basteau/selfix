import { readFile } from "node:fs/promises"
import path from "node:path"
import { ruleNames } from "./config.js"
import type { Diagnostic } from "./index.js"

// Known findings, keyed by config-relative POSIX path, then rule. Modelled on ESLint's bulk
// suppressions: counts rather than locations, so unrelated edits don't invalidate entries.
export type Baseline = Record<string, Record<string, { count: number }>>

export interface UnusedEntry {
  key: string
  rule: string
  count: number
  found: number
}

export async function readBaseline(file: string): Promise<Baseline> {
  let data: unknown
  try {
    data = JSON.parse(await readFile(file, "utf8"))
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT")
      throw new Error(`Baseline not found: ${file}. Create it with --update-baseline <file>.`)
    throw new Error(`Invalid baseline ${file}: ${(error as Error).message}`)
  }
  const invalid = (reason: string) => new Error(`Invalid baseline ${file}: ${reason}`)
  const isObject = (value: unknown): value is Record<string, unknown> =>
    !!value && typeof value === "object" && !Array.isArray(value)
  if (!isObject(data)) throw invalid("expected an object keyed by file path.")
  for (const [key, rules] of Object.entries(data)) {
    if (
      !key.endsWith(".vue") ||
      key.includes("\\") ||
      path.posix.isAbsolute(key) ||
      path.posix.normalize(key) !== key
    )
      throw invalid(`${JSON.stringify(key)} must be a config-relative .vue path with / separators.`)
    if (!isObject(rules)) throw invalid(`${key} must map rule names to counts.`)
    for (const [rule, entry] of Object.entries(rules)) {
      if (!(ruleNames as readonly string[]).includes(rule))
        throw invalid(`unknown rule ${JSON.stringify(rule)} in ${key}.`)
      const keys = isObject(entry) ? Object.keys(entry) : []
      const count = isObject(entry) ? entry.count : undefined
      if (keys.length !== 1 || !Number.isSafeInteger(count) || (count as number) < 1)
        throw invalid(`${key} ${rule} must be { "count": <positive integer> }.`)
    }
  }
  return data as Baseline
}

// Counts findings per file and rule. Parse errors and exception comment problems are never
// baselined.
export function countFindings(diagnostics: Diagnostic[], keyOf: (file: string) => string) {
  const found: Baseline = {}
  for (const item of diagnostics) {
    if (!(ruleNames as readonly string[]).includes(item.rule)) continue
    const rules = (found[keyOf(item.file)] ??= {})
    ;(rules[item.rule] ??= { count: 0 }).count++
  }
  return found
}

// Suppresses the first `count` findings of each file and rule in diagnostic order. Baselines
// contain only rule findings, so parse errors and exception problems are always reported. Entries with more room than
// findings are unused when `inScope` says their file was checked.
export function applyBaseline(
  diagnostics: Diagnostic[],
  baseline: Baseline,
  keyOf: (file: string) => string,
  inScope: (key: string) => boolean,
) {
  const seen: Baseline = {}
  const reported = diagnostics.filter((item) => {
    const key = keyOf(item.file)
    const used = ((seen[key] ??= {})[item.rule] ??= { count: 0 })
    return ++used.count > (baseline[key]?.[item.rule]?.count ?? 0)
  })
  const unused: UnusedEntry[] = []
  for (const [key, rules] of Object.entries(baseline))
    for (const [rule, { count }] of Object.entries(rules)) {
      const found = seen[key]?.[rule]?.count ?? 0
      if (found < count && inScope(key)) unused.push({ key, rule, count, found })
    }
  return { reported, suppressed: diagnostics.length - reported.length, unused }
}

// Lowers in-scope entries to their current counts without adding new ones.
export function pruneBaseline(
  baseline: Baseline,
  found: Baseline,
  inScope: (key: string) => boolean,
) {
  const pruned: Baseline = {}
  for (const [key, rules] of Object.entries(baseline))
    for (const [rule, { count }] of Object.entries(rules)) {
      const kept = inScope(key) ? Math.min(count, found[key]?.[rule]?.count ?? 0) : count
      if (kept) (pruned[key] ??= {})[rule] = { count: kept }
    }
  return pruned
}

export function formatBaseline(baseline: Baseline) {
  const sorted = <T>(object: Record<string, T>) =>
    Object.fromEntries(
      Object.keys(object)
        .sort()
        .map((key) => [key, object[key]]),
    )
  const rules = Object.entries(baseline).map(([key, entries]) => [key, sorted(entries)])
  return `${JSON.stringify(sorted(Object.fromEntries(rules)), null, 2)}\n`
}
