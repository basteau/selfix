import { createHash } from "node:crypto"
import type { Dirent } from "node:fs"
import { readFile, readdir, stat, glob, writeFile } from "node:fs/promises"
import path from "node:path"
import { pathToFileURL } from "node:url"
import { createLinter, type Config, type Diagnostic } from "./index.js"
import {
  applyBaseline,
  countFindings,
  formatBaseline,
  pruneBaseline,
  readBaseline,
  type Baseline,
  type UnusedEntry,
} from "./baseline.js"
import { filePattern, validateConfig } from "./config.js"

const help = `Usage: selfix [files, directories, or quoted globs] [options]

Check Vue single-file components against your Tailwind design system.
Defaults to the current directory and requires selfix.config.ts.

  --doctor              Explain component recognition and protection
  --config <file.ts>     TypeScript configuration (default: selfix.config.ts)
  --css <file>           Tailwind CSS entry (overrides config.css)
  --format text|json|gitlab
                        Output format (default: text); gitlab prints Code Quality JSON
  --max-warnings <n>    Fail when warnings exceed n
  --baseline <file>     Suppress known findings counted in a baseline file
  --update-baseline <file>
                        Write current findings to a baseline file
  --prune-baseline <file>
                        Lower baseline counts to current findings, then check
  --help                Show this help
  --version             Show the installed version

Exit codes: 0 clean (or warnings), 1 violations, 2 configuration/input failure.
`

type BaselineMode = "check" | "update" | "prune"
const baselineOptions: Record<string, BaselineMode> = {
  "--baseline": "check",
  "--update-baseline": "update",
  "--prune-baseline": "prune",
}

function within(dir: string, file: string) {
  const rel = path.relative(dir, file)
  return rel !== ".." && !rel.startsWith(`..${path.sep}`) && !path.isAbsolute(rel)
}

async function exists(file: string) {
  try {
    await stat(file)
    return true
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false
    throw error
  }
}

export async function run(
  args: string[],
  cwd = process.cwd(),
  io = {
    out: (text: string) => process.stdout.write(text),
    err: (text: string) => process.stderr.write(text),
  },
): Promise<number> {
  try {
    const inputs: string[] = []
    let configPath: string | undefined
    let cssPath: string | undefined
    let format = "text"
    let maxWarnings = Infinity
    let doctor = false
    let hasMaxWarnings = false
    let baselineMode: BaselineMode | undefined
    let baselinePath = ""
    for (let index = 0; index < args.length; index++) {
      const arg = args[index]
      if (arg === "--help" || arg === "-h") {
        io.out(help)
        return 0
      }
      if (arg === "--version") {
        const pkg = JSON.parse(
          await readFile(new URL("../package.json", import.meta.url), "utf8"),
        ) as { version: string }
        io.out(`${pkg.version}\n`)
        return 0
      }
      if (arg === "--doctor") {
        doctor = true
        continue
      }
      if (arg === "--") {
        inputs.push(...args.slice(index + 1))
        break
      }
      if (Object.hasOwn(baselineOptions, arg)) {
        const value = args[++index]
        if (!value || value.startsWith("--")) throw new Error(`Missing value for ${arg}.`)
        if (baselineMode)
          throw new Error("Use only one of --baseline, --update-baseline, or --prune-baseline.")
        baselineMode = baselineOptions[arg]
        baselinePath = path.resolve(cwd, value)
      } else if (["--config", "--css", "--format", "--max-warnings"].includes(arg)) {
        const value = args[++index]
        if (!value || value.startsWith("--")) throw new Error(`Missing value for ${arg}.`)
        if (arg === "--config") configPath = path.resolve(cwd, value)
        if (arg === "--css") cssPath = path.resolve(cwd, value)
        if (arg === "--format") format = value
        if (arg === "--max-warnings") {
          if (!/^\d+$/.test(value))
            throw new Error("--max-warnings must be a non-negative integer.")
          hasMaxWarnings = true
          maxWarnings = Number(value)
        }
      } else if (arg.startsWith("-")) throw new Error(`Unknown option: ${arg}.`)
      else inputs.push(arg)
    }
    if (!["text", "json", "gitlab"].includes(format))
      throw new Error("--format must be text, json, or gitlab.")
    if (doctor && (format !== "text" || hasMaxWarnings))
      throw new Error(
        "--doctor supports text setup reports only. Remove --format json or gitlab and --max-warnings, or run ordinary lint without --doctor.",
      )
    if (doctor && baselineMode)
      throw new Error("--doctor does not use a baseline. Remove the baseline option.")
    if (baselineMode === "update" && (format !== "text" || hasMaxWarnings))
      throw new Error(
        "--update-baseline writes a baseline and reports no findings. Remove --format json or gitlab and --max-warnings.",
      )
    let baseline: Baseline | undefined
    if (baselineMode === "check" || baselineMode === "prune")
      baseline = await readBaseline(baselinePath)
    configPath ??= path.join(cwd, "selfix.config.ts")
    if (!configPath.endsWith(".ts"))
      throw new Error("Configuration must be a .ts file exporting a default config object.")
    if (!(await exists(configPath)))
      throw new Error(
        `Configuration not found: ${configPath}. Create selfix.config.ts or use --config <file.ts>.`,
      )
    const config: Config = (await import(pathToFileURL(configPath).href)).default
    validateConfig(config)
    const configDir = path.dirname(configPath)
    const shadcn = (!cssPath && !config.css) || !config.ui ? await shadcnDefaults(configDir) : {}
    const fromShadcn: string[] = []
    if (!cssPath && config.css) cssPath = path.resolve(configDir, config.css)
    if (!cssPath && shadcn.css) {
      cssPath = path.resolve(configDir, shadcn.css)
      fromShadcn.push("css")
    }
    if (!cssPath)
      throw new Error(
        "Set css in selfix.config.ts, set tailwind.css in components.json, or provide --css <file>.",
      )
    const ui = config.ui ?? (shadcn.ui ? [shadcn.ui] : undefined)
    if (!config.ui && shadcn.ui) fromShadcn.push("ui")
    const ignored = new Set(["node_modules", ".git", "dist", "coverage", ".nuxt", ".output"])
    const exclusions = (config.exclude ?? []).map(filePattern)
    // Config-relative POSIX path, used by exclusions and baseline keys.
    const keyOf = (file: string) => path.relative(configDir, file).split(path.sep).join("/")
    const excluded = (file: string, matchFiles = true) => {
      if (
        path
          .relative(cwd, file)
          .split(path.sep)
          .some((part) => ignored.has(part))
      )
        return true
      return (
        matchFiles &&
        within(configDir, file) &&
        exclusions.some((pattern) => pattern.test(keyOf(file)))
      )
    }
    const files = new Set<string>()
    // Directories given as inputs (directly or by glob); baseline entries under them are checked.
    const roots: string[] = []
    const visit = async (file: string, entryInfo?: Dirent): Promise<void> => {
      if (excluded(file, false)) return
      const info = entryInfo ?? (await stat(file))
      if (!info.isDirectory() && excluded(file)) return
      if (info.isDirectory()) {
        if (!entryInfo) roots.push(file)
        for (const entry of await readdir(file, { withFileTypes: true })) {
          if (entry.isSymbolicLink()) continue
          if (entry.isDirectory() || entry.name.endsWith(".vue"))
            await visit(path.join(file, entry.name), entry)
        }
      } else if (file.endsWith(".vue")) files.add(file)
      else throw new Error(`Expected a .vue file or directory: ${file}`)
    }
    for (const input of inputs.length ? inputs : ["."]) {
      const absolute = path.resolve(cwd, input)
      if (await exists(absolute)) await visit(absolute)
      else {
        let matched = false
        for await (const match of glob(input, {
          cwd,
          exclude: (file) => excluded(path.resolve(cwd, file), false),
        })) {
          matched = true
          await visit(path.resolve(cwd, match))
        }
        if (!matched) throw new Error(`No files match: ${input}`)
      }
    }
    if (!files.size) throw new Error("No Vue files found. Check the paths and exclude settings.")
    const { css: _css, exclude: _exclude, ...linterConfig } = config
    if (fromShadcn.includes("css") && !(await exists(cssPath)))
      throw new Error(`components.json tailwind.css not found: ${cssPath}`)
    const linter = await createLinter({
      css: await readFile(cssPath, "utf8"),
      cssBase: path.dirname(cssPath),
      root: configDir,
      config: {
        ...linterConfig,
        ...(ui ? { ui } : {}),
        project: config.project === false ? false : (config.project ?? {}),
      },
    })
    if (doctor) {
      const reports = []
      for (const file of [...files].sort())
        reports.push({ file, ...linter.doctor(await readFile(file, "utf8"), file) })
      io.out(`Configuration: ${configPath}\nTailwind CSS loaded: ${cssPath}\n`)
      if (fromShadcn.length) io.out(`From components.json: ${fromShadcn.join(", ")}\n`)
      const usages = reports.flatMap((report) => report.usages)
      const active = usages.filter((usage) => usage.active).length
      for (const report of reports) {
        const file = path.relative(cwd, report.file)
        for (const usage of report.usages)
          io.out(
            `${file}:${usage.line}:${usage.column} <${usage.component}>: ${usage.reason}; no-restyle: ${usage.severity}; active protection: ${usage.active ? "yes" : "no"}; definition: ${usage.definition}\n`,
          )
        for (const issue of report.issues)
          io.out(
            `${file}:${issue.line}:${issue.column} error unsupported analysis: ${issue.message}\n`,
          )
      }
      io.out(
        `Scanned ${files.size} Vue file${files.size === 1 ? "" : "s"}; ${usages.length} component usage${usages.length === 1 ? "" : "s"}; ${active} actively protected.\n`,
      )
      if (!active) {
        const reasons = []
        if (!usages.length) reasons.push("no component usages collected")
        if (usages.some((usage) => !usage.recognized))
          reasons.push("usages are unrecognized or ignored")
        if (usages.some((usage) => usage.recognized && usage.severity === "off"))
          reasons.push("no-restyle is disabled for recognized usages")
        if (reports.some((report) => report.issues.length))
          reasons.push("analysis is incomplete; see errors above")
        io.out(`Advisory: zero actively protected matches: ${reasons.join("; ")}.\n`)
      }
      for (const suggestion of new Set(
        usages.flatMap((usage) => (usage.suggestion ? [usage.suggestion] : [])),
      ))
        io.out(
          `If you intend to protect components from this import, add this exact import pattern to your config: ${suggestion}\n`,
        )
      io.out(
        "Active protection describes the configured no-restyle policy; allowed classes depend on its contract. Definition discovery is separate: unavailable metadata does not disable protection. Unresolved dynamic or namespace components and wrapper tracing are unsupported; this report does not prove comprehensive coverage.\n",
      )
      return reports.some((report) => report.issues.length) ? 1 : 0
    }
    const diagnostics: Diagnostic[] = []
    for (const file of [...files].sort())
      diagnostics.push(...linter.lint(await readFile(file, "utf8"), file))
    const location = (item: Diagnostic) =>
      `${path.relative(cwd, item.file)}:${item.line}:${item.column} ${item.severity} ${item.rule} ${describe(item)}`
    // A parse error hides a file's findings, so they are never recorded or counted as fixed.
    const parseErrors = diagnostics.filter((item) => item.rule === "parse-error")
    if (baselineMode === "update") {
      if (parseErrors.length) {
        for (const item of parseErrors) io.out(`${location(item)}\n`)
        io.out("Baseline not written: fix parse errors first.\n")
        return 1
      }
      await writeFile(baselinePath, formatBaseline(countFindings(diagnostics, keyOf)))
      io.out(
        `Wrote ${diagnostics.length} finding${diagnostics.length === 1 ? "" : "s"} to ${path.relative(cwd, baselinePath)}.\n`,
      )
      return 0
    }
    let reported = diagnostics
    let suppressed = 0
    let unused: UnusedEntry[] = []
    if (baseline) {
      // An entry is checked when its file was scanned, lies in a scanned directory, or no longer
      // exists, so a partial run doesn't report entries for files outside its inputs.
      const unparsed = new Set(parseErrors.map((item) => keyOf(item.file)))
      const checked = new Set<string>()
      for (const key of Object.keys(baseline)) {
        if (unparsed.has(key)) continue
        const file = path.resolve(configDir, key)
        if (files.has(file) || roots.some((root) => within(root, file)) || !(await exists(file)))
          checked.add(key)
      }
      const inScope = (key: string) => checked.has(key)
      if (baselineMode === "prune") {
        baseline = pruneBaseline(baseline, countFindings(diagnostics, keyOf), inScope)
        await writeFile(baselinePath, formatBaseline(baseline))
      }
      ;({ reported, suppressed, unused } = applyBaseline(diagnostics, baseline, keyOf, inScope))
    }
    const stale = unused.map(
      (entry) =>
        `${path.relative(cwd, path.resolve(configDir, entry.key))}: unused baseline entry: ${entry.rule} allows ${entry.count}, found ${entry.found}.`,
    )
    const errors = reported.filter((item) => item.severity === "error").length
    const warnings = reported.length - errors
    if (format === "json")
      io.out(
        `${JSON.stringify(
          baseline
            ? {
                diagnostics: reported,
                suppressed,
                unused: unused.map(({ key, ...entry }) => ({
                  file: path.resolve(configDir, key),
                  ...entry,
                })),
              }
            : reported,
          null,
          2,
        )}\n`,
      )
    else if (format === "gitlab") {
      io.out(`${JSON.stringify(codeQuality(reported, cwd), null, 2)}\n`)
      for (const line of stale) io.err(`selfix: ${line}\n`)
    } else {
      for (const item of reported) io.out(`${location(item)}\n`)
      for (const line of stale) io.out(`${line}\n`)
      io.out(
        `Checked ${files.size} Vue file${files.size === 1 ? "" : "s"}: ${errors} error${errors === 1 ? "" : "s"}, ${warnings} warning${warnings === 1 ? "" : "s"}.\n`,
      )
      if (baseline) io.out(`Baseline: ${suppressed} suppressed, ${unused.length} unused.\n`)
    }
    return errors || warnings > maxWarnings || unused.length ? 1 : 0
  } catch (error) {
    io.err(`selfix: ${error instanceof Error ? error.message : String(error)}\n`)
    return 2
  }
}

function describe(item: Diagnostic) {
  const suggestions = item.suggestions?.map((suggestion) => JSON.stringify(suggestion))
  return suggestions?.length
    ? `${item.message} Did you mean ${suggestions.join(" or ")}?`
    : item.message
}

// GitLab Code Quality issues (a subset of the Code Climate format). Fingerprints identify a
// finding by rule, path, message, and its occurrence among identical findings in that file,
// so they stay stable when unrelated edits shift lines. Script parse errors end with the
// parser's "(line:column)", which is left out for the same reason.
function codeQuality(diagnostics: Diagnostic[], cwd: string) {
  const seen = new Map<string, number>()
  return diagnostics.map((item) => {
    const file = path.relative(cwd, item.file).split(path.sep).join("/")
    const message =
      item.rule === "parse-error" ? item.message.replace(/ \(\d+:\d+\)$/, "") : item.message
    const identity = JSON.stringify([item.rule, file, message])
    const occurrence = seen.get(identity) ?? 0
    seen.set(identity, occurrence + 1)
    return {
      description: describe(item),
      check_name: item.rule,
      fingerprint: createHash("sha256")
        .update(JSON.stringify([item.rule, file, message, occurrence]))
        .digest("hex"),
      severity: item.severity === "error" ? "major" : "minor",
      location: { path: file, lines: { begin: item.line } },
    }
  })
}

// shadcn-vue projects describe their Tailwind entry and UI import alias in components.json.
// selfix uses them only for settings the config leaves out.
async function shadcnDefaults(dir: string): Promise<{ css?: string; ui?: string }> {
  const file = path.join(dir, "components.json")
  if (!(await exists(file))) return {}
  let data: unknown
  try {
    data = JSON.parse(await readFile(file, "utf8"))
  } catch (error) {
    throw new Error(`Invalid components.json: ${(error as Error).message}`)
  }
  const object = (value: unknown, key: string) => {
    if (value === undefined) return {}
    if (!value || typeof value !== "object" || Array.isArray(value))
      throw new Error(`Invalid components.json: ${key} must be an object.`)
    return value as Record<string, unknown>
  }
  const text = (value: unknown, key: string) => {
    if (value === undefined) return undefined
    if (typeof value !== "string" || !value)
      throw new Error(`Invalid components.json: ${key} must be a non-empty string.`)
    return value
  }
  const root = object(data, "the root")
  return {
    css: text(object(root.tailwind, "tailwind").css, "tailwind.css"),
    ui: text(object(root.aliases, "aliases").ui, "aliases.ui")?.replace(/\/+$/, ""),
  }
}
