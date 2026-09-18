import { readFile, readdir, stat, glob } from "node:fs/promises"
import path from "node:path"
import { pathToFileURL } from "node:url"
import { createLinter, type Config, type Diagnostic } from "./index.js"
import { validateConfig } from "./config.js"

const help = `Usage: selfix [files, directories, or quoted globs] [options]

Check Vue single-file components against your Tailwind design system.
Defaults to the current directory and requires selfix.config.ts.

  --config <file.ts>     TypeScript configuration (default: selfix.config.ts)
  --css <file>           Tailwind CSS entry (overrides config.css)
  --format text|json    Output format (default: text)
  --max-warnings <n>    Fail when warnings exceed n
  --help                Show this help
  --version             Show the installed version

Exit codes: 0 clean (or warnings), 1 violations, 2 configuration/input failure.
`

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
      if (["--config", "--css", "--format", "--max-warnings"].includes(arg)) {
        const value = args[++index]
        if (!value || value.startsWith("--")) throw new Error(`Missing value for ${arg}.`)
        if (arg === "--config") configPath = path.resolve(cwd, value)
        if (arg === "--css") cssPath = path.resolve(cwd, value)
        if (arg === "--format") format = value
        if (arg === "--max-warnings") {
          if (!/^\d+$/.test(value))
            throw new Error("--max-warnings must be a non-negative integer.")
          maxWarnings = Number(value)
        }
      } else if (arg.startsWith("-")) throw new Error(`Unknown option: ${arg}.`)
      else inputs.push(arg)
    }
    if (!["text", "json"].includes(format)) throw new Error("--format must be text or json.")
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
    if (!cssPath && config.css) cssPath = path.resolve(configDir, config.css)
    if (!cssPath) throw new Error("Set css in selfix.config.ts or provide --css <file>.")
    const ignored = new Set(["node_modules", ".git", "dist", "coverage", ".nuxt", ".output"])
    const excluded = (file: string) => {
      const rel = path.relative(configDir, file).split(path.sep).join("/")
      if (
        path
          .relative(cwd, file)
          .split(path.sep)
          .some((part) => ignored.has(part))
      )
        return true
      return (config.exclude ?? []).some((entry) => {
        const clean = entry.replace(/\\/g, "/").replace(/^\.\//, "").replace(/\/$/, "")
        return clean.includes("/")
          ? rel === clean || rel.startsWith(`${clean}/`)
          : rel.split("/").includes(clean)
      })
    }
    const files = new Set<string>()
    const visit = async (file: string): Promise<void> => {
      if (excluded(file)) return
      const info = await stat(file)
      if (info.isDirectory()) {
        for (const entry of await readdir(file, { withFileTypes: true })) {
          if (entry.isSymbolicLink()) continue
          if (entry.isDirectory() || entry.name.endsWith(".vue"))
            await visit(path.join(file, entry.name))
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
          exclude: (file) => excluded(path.resolve(cwd, file)),
        })) {
          matched = true
          await visit(path.resolve(cwd, match))
        }
        if (!matched) throw new Error(`No files match: ${input}`)
      }
    }
    if (!files.size) throw new Error("No Vue files found. Check the paths and exclude settings.")
    const linter = await createLinter({
      css: await readFile(cssPath, "utf8"),
      base: path.dirname(cssPath),
      config: {
        ...config,
        cssAliases: Object.fromEntries(
          Object.entries(config.cssAliases ?? {}).map(([id, target]) => [
            id,
            path.resolve(configDir, target),
          ]),
        ),
      },
    })
    const diagnostics: Diagnostic[] = []
    for (const file of [...files].sort())
      diagnostics.push(...linter.lint(await readFile(file, "utf8"), file))
    const errors = diagnostics.filter((item) => item.severity === "error").length
    const warnings = diagnostics.length - errors
    if (format === "json") io.out(`${JSON.stringify(diagnostics, null, 2)}\n`)
    else {
      for (const item of diagnostics)
        io.out(
          `${path.relative(cwd, item.file)}:${item.line}:${item.column} ${item.severity} ${item.rule} ${item.message}\n`,
        )
      io.out(
        `Checked ${files.size} Vue file${files.size === 1 ? "" : "s"}: ${errors} error${errors === 1 ? "" : "s"}, ${warnings} warning${warnings === 1 ? "" : "s"}.\n`,
      )
    }
    return errors || warnings > maxWarnings ? 1 : 0
  } catch (error) {
    io.err(`selfix: ${error instanceof Error ? error.message : String(error)}\n`)
    return 2
  }
}
