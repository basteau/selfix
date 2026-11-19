import { createHash } from "node:crypto"
import type { Dirent } from "node:fs"
import { readFile, readdir, stat, glob, writeFile } from "node:fs/promises"
import path from "node:path"
import { pathToFileURL } from "node:url"
import { createLinter, type Config, type Diagnostic, type Severity } from "./index.js"
import {
  applyBaseline,
  countFindings,
  formatBaseline,
  pruneBaseline,
  readBaseline,
  type Baseline,
  type UnusedEntry,
} from "./baseline.js"
import { filePattern, ignoredDirectories, ruleNames, validateConfig } from "./config.js"

const help = `Usage: selfix [files, directories, or quoted globs] [options]

Check Vue single-file components against your Nuxt UI design system.
Defaults to the current directory. selfix.config.ts is optional.

  --config <file.ts>    TypeScript configuration (default: selfix.config.ts)
  --format text|json|gitlab
                        Output format (default: text); gitlab prints Code Quality JSON
  --max-warnings <n>    Fail when warnings exceed n
  --unused-exceptions off|warn|error
                        Severity for exception comments that suppress nothing
                        (overrides config.unusedExceptions; default: error)
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
    let format = "text"
    let maxWarnings = Infinity
    let hasMaxWarnings = false
    let baselineMode: BaselineMode | undefined
    let baselinePath = ""
    let unusedExceptions: Severity | undefined
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
      } else if (["--config", "--format", "--max-warnings", "--unused-exceptions"].includes(arg)) {
        const value = args[++index]
        if (!value || value.startsWith("--")) throw new Error(`Missing value for ${arg}.`)
        if (arg === "--config") configPath = path.resolve(cwd, value)
        if (arg === "--format") format = value
        if (arg === "--max-warnings") {
          if (!/^\d+$/.test(value))
            throw new Error("--max-warnings must be a non-negative integer.")
          hasMaxWarnings = true
          maxWarnings = Number(value)
        }
        if (arg === "--unused-exceptions") {
          if (!["off", "warn", "error"].includes(value))
            throw new Error("--unused-exceptions must be off, warn, or error.")
          unusedExceptions = value as Severity
        }
      } else if (arg.startsWith("-")) throw new Error(`Unknown option: ${arg}.`)
      else inputs.push(arg)
    }
    if (!["text", "json", "gitlab"].includes(format))
      throw new Error("--format must be text, json, or gitlab.")
    if (baselineMode === "update" && (format !== "text" || hasMaxWarnings))
      throw new Error(
        "--update-baseline writes a baseline and reports no findings. Remove --format json or gitlab and --max-warnings.",
      )
    let baseline: Baseline | undefined
    if (baselineMode === "check" || baselineMode === "prune")
      baseline = await readBaseline(baselinePath)
    // Without a configuration file, the defaults apply and cwd is the project root.
    let config: Config = {}
    const found = configPath !== undefined || (await exists(path.join(cwd, "selfix.config.ts")))
    // A config in another module format would otherwise be ignored without a word.
    const misnamed = found
      ? undefined
      : (await readdir(cwd)).find((name) => /^selfix\.config\.(?:[cm]?js|[cm]ts|json)$/.test(name))
    if (misnamed)
      throw new Error(`Found ${misnamed}. Configuration must be named selfix.config.ts.`)
    if (found) {
      configPath ??= path.join(cwd, "selfix.config.ts")
      if (!configPath.endsWith(".ts"))
        throw new Error("Configuration must be a .ts file exporting a default config object.")
      if (!(await exists(configPath))) throw new Error(`Configuration not found: ${configPath}.`)
      config = (await import(pathToFileURL(configPath).href)).default
      validateConfig(config)
    }
    const configDir = configPath ? path.dirname(configPath) : cwd
    const ignored = ignoredDirectories
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
    const linter = await createLinter({
      root: configDir,
      config: unusedExceptions ? { ...config, unusedExceptions } : config,
    })
    if (!linter.nuxtUi)
      io.err(
        `selfix: Nuxt UI was not found in ${configDir}; only components named in the config are protected.\n`,
      )
    const diagnostics: Diagnostic[] = []
    let excepted = 0
    for (const file of [...files].sort()) {
      const result = linter.check(await readFile(file, "utf8"), file)
      diagnostics.push(...result.diagnostics)
      excepted += result.suppressed.length
    }
    const location = (item: Diagnostic) =>
      `${path.relative(cwd, item.file)}:${item.line}:${item.column} ${item.severity} ${item.rule} ${describe(item)}`
    // A parse error hides a file's findings, so they are never recorded or counted as fixed.
    const parseErrors = diagnostics.filter((item) => item.rule === "parse-error")
    if (baselineMode === "update") {
      // Parse errors and exception comment errors are fixed in the source, never recorded.
      const unrecordable = diagnostics.filter(
        (item) =>
          item.severity === "error" && !(ruleNames as readonly string[]).includes(item.rule),
      )
      if (unrecordable.length) {
        for (const item of unrecordable) io.out(`${location(item)}\n`)
        io.out(
          parseErrors.length === unrecordable.length
            ? "Baseline not written: fix parse errors first.\n"
            : "Baseline not written: fix parse errors and exception comments first.\n",
        )
        return 1
      }
      const recorded = countFindings(diagnostics, keyOf)
      const total = Object.values(recorded)
        .flatMap((rules) => Object.values(rules))
        .reduce((sum, { count }) => sum + count, 0)
      await writeFile(baselinePath, formatBaseline(recorded))
      io.out(
        `Wrote ${total} finding${total === 1 ? "" : "s"} to ${path.relative(cwd, baselinePath)}.\n`,
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
          {
            diagnostics: reported,
            suppressed: { inline: excepted, baseline: suppressed },
            unused: unused.map(({ key, ...entry }) => ({
              file: path.resolve(configDir, key),
              ...entry,
            })),
          },
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
      if (excepted) io.out(`Exceptions: ${excepted} suppressed.\n`)
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
